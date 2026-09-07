import 'server-only';
import { supabaseAdmin } from '../supabase/admin';
import { isSupabaseConfigured } from '../env';
import { demoData, demoNewId } from '../demo/store';
import { deleteAssetFile, uploadAsset } from '../images';
import { shapeAdminAsset, shapeGuestAsset } from './shape';
import type { AdminAsset, AssetLibrary, AssetRow, AssetType, CelebrationEvent } from '../types';

const demo = () => !isSupabaseConfigured();

/** event assets + the shared default library, in display order. */
function demoAssetsFor(eventId: string, includeGlobal: boolean): AssetRow[] {
  return demoData()
    .assets.filter(
      (asset) => asset.event_id === eventId || (includeGlobal && asset.event_id === null),
    )
    .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at));
}

/**
 * The picker a guest sees: the shared Laya & Bee default library (event_id NULL)
 * plus anything the organiser uploaded for this specific celebration.
 */
export async function getGuestAssets(event: CelebrationEvent): Promise<AssetLibrary> {
  if (demo()) {
    const rows = demoAssetsFor(event.id, event.settings.useDefaultAssets).filter((a) => a.enabled);
    const pick = (type: AssetType) => rows.filter((row) => row.type === type).map(shapeGuestAsset);
    return { stickers: pick('sticker'), gifs: pick('gif'), memes: pick('meme') };
  }

  const filter = event.settings.useDefaultAssets
    ? `event_id.eq.${event.id},event_id.is.null`
    : `event_id.eq.${event.id}`;

  const { data, error } = await supabaseAdmin()
    .from('assets')
    .select('*')
    .or(filter)
    .eq('enabled', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AssetRow[];
  const pick = (type: AssetType) => rows.filter((row) => row.type === type).map(shapeGuestAsset);

  return { stickers: pick('sticker'), gifs: pick('gif'), memes: pick('meme') };
}

/** Everything the organiser can manage for this event, including the shared library. */
export async function listAssets(eventId: string): Promise<AdminAsset[]> {
  if (demo()) return demoAssetsFor(eventId, true).map(shapeAdminAsset);

  const { data, error } = await supabaseAdmin()
    .from('assets')
    .select('*')
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as AssetRow[]).map(shapeAdminAsset);
}

export interface CreateAssetInput {
  type: AssetType;
  name?: string;
  emoji?: string | null;
  /** Base64 data URL from the organiser's file picker. */
  file?: string | null;
  sortOrder?: number;
}

export async function createAsset(eventId: string, input: CreateAssetInput): Promise<AdminAsset> {
  if (demo()) {
    const row: AssetRow = {
      id: demoNewId(),
      event_id: eventId,
      type: input.type,
      // Demo mode has no storage, so the data URL is kept inline.
      url: input.file ?? null,
      emoji: input.emoji || null,
      name: (input.name ?? '').trim().slice(0, 80),
      enabled: true,
      sort_order: input.sortOrder ?? 0,
      created_at: new Date().toISOString(),
    };
    demoData().assets.push(row);
    return shapeAdminAsset(row);
  }

  let url: string | null = null;
  if (input.file) url = await uploadAsset(eventId, input.file, input.type);

  const { data, error } = await supabaseAdmin()
    .from('assets')
    .insert({
      event_id: eventId,
      type: input.type,
      url,
      emoji: input.emoji || null,
      name: (input.name ?? '').trim().slice(0, 80),
      sort_order: input.sortOrder ?? 0,
    })
    .select('*')
    .single<AssetRow>();

  if (error) {
    if (url) await deleteAssetFile(url);
    throw new Error(error.message);
  }
  return shapeAdminAsset(data);
}

export async function updateAsset(
  assetId: string,
  patch: { enabled?: boolean; name?: string; sortOrder?: number },
): Promise<AdminAsset | null> {
  const update: Record<string, unknown> = {};
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.name !== undefined) update.name = patch.name.trim().slice(0, 80);
  if (patch.sortOrder !== undefined) update.sort_order = patch.sortOrder;
  if (!Object.keys(update).length) return null;

  if (demo()) {
    const row = demoData().assets.find((asset) => asset.id === assetId);
    if (!row) return null;
    Object.assign(row, update);
    return shapeAdminAsset(row);
  }

  const { data, error } = await supabaseAdmin()
    .from('assets')
    .update(update)
    .eq('id', assetId)
    .select('*')
    .maybeSingle<AssetRow>();

  if (error) throw new Error(error.message);
  return data ? shapeAdminAsset(data) : null;
}

export async function deleteAsset(assetId: string): Promise<void> {
  if (demo()) {
    const store = demoData();
    const row = store.assets.find((asset) => asset.id === assetId);
    if (!row) return;
    if (row.event_id === null) throw new Error('Default library items can be disabled, but not deleted');
    store.assets = store.assets.filter((asset) => asset.id !== assetId);
    return;
  }

  const { data } = await supabaseAdmin()
    .from('assets')
    .select('*')
    .eq('id', assetId)
    .maybeSingle<AssetRow>();

  if (!data) return;
  if (data.event_id === null) {
    throw new Error('Default library items can be disabled, but not deleted');
  }
  if (data.url) await deleteAssetFile(data.url);

  const { error } = await supabaseAdmin().from('assets').delete().eq('id', assetId);
  if (error) throw new Error(error.message);
}

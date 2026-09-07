import 'server-only';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin, ASSET_BUCKET, MEMORY_BUCKET } from './supabase/admin';
import { LIMITS } from './env';

interface DecodedImage {
  buffer: Buffer;
  mime: string;
  ext: string;
}

const SIGNATURES: Record<string, { ext: string; matches: (b: Buffer) => boolean }> = {
  'image/png': {
    ext: 'png',
    matches: (b) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  'image/jpeg': {
    ext: 'jpg',
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/gif': {
    ext: 'gif',
    matches: (b) => b.length > 6 && b.subarray(0, 4).toString('latin1') === 'GIF8',
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

export class ImageError extends Error {
  status = 400;
}

/**
 * Decodes a base64 data URL and checks the bytes actually match the declared
 * type, so a renamed file or a disguised payload cannot slip through.
 */
export function decodeDataUrl(dataUrl: string, maxBytes: number): DecodedImage {
  const match = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([\s\S]+)$/i.exec(dataUrl);
  if (!match) throw new ImageError('That image could not be read');

  const mime = match[1].toLowerCase();
  const signature = SIGNATURES[mime];
  if (!signature) throw new ImageError('Only PNG, JPEG, WebP and GIF images are allowed');

  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length) throw new ImageError('That image was empty');
  if (buffer.length > maxBytes) {
    throw new ImageError(`That image is too large (max ${Math.round(maxBytes / 1024 / 1024)}MB)`);
  }
  if (!signature.matches(buffer)) throw new ImageError('That file does not look like a real image');

  return { buffer, mime, ext: signature.ext };
}

/** Uploads a guest selfie to the PRIVATE memories bucket. Returns the object path. */
export async function uploadSelfie(eventId: string, dataUrl: string): Promise<string> {
  const image = decodeDataUrl(dataUrl, LIMITS.selfieBytes);
  if (image.mime === 'image/gif') throw new ImageError('Selfies must be a photo, not a GIF');

  const path = `${eventId}/${randomUUID()}.${image.ext}`;
  const { error } = await supabaseAdmin()
    .storage.from(MEMORY_BUCKET)
    .upload(path, image.buffer, { contentType: image.mime, cacheControl: '31536000', upsert: false });

  if (error) throw new Error(`Could not save that selfie: ${error.message}`);
  return path;
}

/** Uploads an organiser asset to the public bucket. Returns a public URL. */
export async function uploadAsset(
  eventId: string,
  dataUrl: string,
  kind: 'sticker' | 'gif' | 'meme' | 'branding',
): Promise<string> {
  const image = decodeDataUrl(dataUrl, LIMITS.assetBytes);
  const path = `${eventId}/${kind}/${randomUUID()}.${image.ext}`;

  const { error } = await supabaseAdmin()
    .storage.from(ASSET_BUCKET)
    .upload(path, image.buffer, { contentType: image.mime, cacheControl: '31536000', upsert: false });

  if (error) throw new Error(`Could not save that asset: ${error.message}`);

  const { data } = supabaseAdmin().storage.from(ASSET_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Time-limited link so only the organiser's dashboard can view a selfie. */
export async function signSelfie(path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(MEMORY_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function signSelfies(paths: string[], expiresIn = 60 * 60): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return new Map();

  const { data, error } = await supabaseAdmin()
    .storage.from(MEMORY_BUCKET)
    .createSignedUrls(unique, expiresIn);

  const map = new Map<string, string>();
  if (error || !data) return map;
  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  });
  return map;
}

export async function deleteSelfie(path: string): Promise<void> {
  await supabaseAdmin().storage.from(MEMORY_BUCKET).remove([path]);
}

/** Removes a stored asset given its public URL. Ignores anything we do not own. */
export async function deleteAssetFile(url: string): Promise<void> {
  const marker = `/storage/v1/object/public/${ASSET_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index < 0) return;
  const path = decodeURIComponent(url.slice(index + marker.length));
  if (!path) return;
  await supabaseAdmin().storage.from(ASSET_BUCKET).remove([path]);
}

import { beforeEach, describe, expect, it } from 'vitest';
import { getEvent, updateEvent } from '@/lib/data/events';
import { updateEventSchema } from '@/lib/validation';
import type { UpdateEventInput } from '@/lib/data/events';
import { freshStore, EVENT_IDS } from './helpers';

beforeEach(() => freshStore());

const apply = async (input: unknown) =>
  updateEvent(EVENT_IDS.wedding, updateEventSchema.parse(input) as UpdateEventInput);

describe('changing one thing about an event', () => {
  it('archives it without touching its names, words or theme', async () => {
    const before = (await getEvent(EVENT_IDS.wedding))!;
    const after = (await apply({ archived: true }))!;

    expect(after.archived).toBe(true);
    expect(after.hosts).toBe(before.hosts);
    expect(after.description).toBe(before.description);
    expect(after.welcomeMessage).toBe(before.welcomeMessage);
    expect(after.themeId).toBe(before.themeId);
  });

  it('unarchives it the same way', async () => {
    await apply({ archived: true });
    const after = (await apply({ archived: false }))!;
    expect(after.archived).toBe(false);
    expect(after.hosts).toBeTruthy();
  });

  it('hides the live wall QR code and leaves every other setting as it was', async () => {
    const before = (await getEvent(EVENT_IDS.wedding))!;
    const after = (await apply({ settings: { liveQr: 'hidden' } }))!;

    expect(after.settings.liveQr).toBe('hidden');
    expect({ ...after.settings, liveQr: before.settings.liveQr }).toEqual(before.settings);
    expect(after.hosts).toBe(before.hosts);
  });
});

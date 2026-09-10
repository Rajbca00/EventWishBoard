// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  savePendingWish,
  loadPendingWish,
  clearPendingWish,
  isRetryable,
  retryDelay,
  MAX_SERVER_RETRIES,
} from '@/lib/pending-wish';
import { approxDataUrlBytes, formatBytes, SELFIE_DEFAULTS } from '@/lib/image-client';
import { LIMITS } from '@/lib/env';
import type { WishDraft } from '@/lib/types';

const draft: WishDraft = {
  message: 'Wishing you both every happiness',
  guestName: 'Meera',
  isAnonymous: false,
  stickers: ['🎊', '🌸'],
  gifs: ['/library/gifs/hearts.svg'],
  memes: [],
  selfie: null,
  selfiePublic: false,
};

beforeEach(() => localStorage.clear());

/*
 * Venues have famously bad connectivity. Without this, a failed request loses
 * the guest's message outright — they see an error, the queue behind them grows,
 * and they walk away. The draft has to survive a dropped connection, a locked
 * phone and a browser restart.
 */
describe('a wish that could not be sent', () => {
  it('comes back after a reload, whole', () => {
    savePendingWish('event-1', draft);
    const pending = loadPendingWish('event-1');

    expect(pending?.draft.message).toBe(draft.message);
    expect(pending?.draft.stickers).toEqual(['🎊', '🌸']);
    expect(pending?.draft.gifs).toEqual(['/library/gifs/hearts.svg']);
  });

  it('belongs to one event only', () => {
    savePendingWish('event-1', draft);
    expect(loadPendingWish('event-2')).toBeNull();
  });

  it('remembers how many times it has been tried', () => {
    savePendingWish('event-1', draft, 2);
    expect(loadPendingWish('event-1')?.attempts).toBe(2);
  });

  it('keeps the moment the guest first pressed Send across retries', () => {
    savePendingWish('event-1', draft, 0);
    const first = loadPendingWish('event-1')!.createdAt;
    savePendingWish('event-1', { ...draft, message: 'edited' }, 1);
    expect(loadPendingWish('event-1')!.createdAt).toBe(first);
  });

  it('is gone once it has been accepted', () => {
    savePendingWish('event-1', draft);
    clearPendingWish('event-1');
    expect(loadPendingWish('event-1')).toBeNull();
  });

  it('is forgotten once the celebration has moved on', () => {
    savePendingWish('event-1', draft);
    const raw = JSON.parse(localStorage.getItem('lb-pending-wish:event-1')!);
    raw.createdAt = Date.now() - 13 * 60 * 60 * 1000;
    localStorage.setItem('lb-pending-wish:event-1', JSON.stringify(raw));

    expect(loadPendingWish('event-1')).toBeNull();
  });

  it('ignores a stored value that has been corrupted rather than throwing', () => {
    localStorage.setItem('lb-pending-wish:event-1', 'not json at all');
    expect(loadPendingWish('event-1')).toBeNull();
  });

  it('ignores a stored draft with no message in it', () => {
    localStorage.setItem(
      'lb-pending-wish:event-1',
      JSON.stringify({ draft: { message: '' }, createdAt: Date.now(), attempts: 0 }),
    );
    expect(loadPendingWish('event-1')).toBeNull();
  });

  it('does not throw when storage refuses to write, as in private browsing', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(() => savePendingWish('event-1', draft)).not.toThrow();
    Storage.prototype.setItem = original;
  });
});

describe('deciding whether to try again', () => {
  it('retries a server fault or a lost connection', () => {
    expect(isRetryable(500)).toBe(true);
    expect(isRetryable(502)).toBe(true);
    expect(isRetryable(null)).toBe(true);
  });

  it('does not retry something the guest has to change', () => {
    // A message that was refused will be refused again.
    expect(isRetryable(400)).toBe(false);
    expect(isRetryable(404)).toBe(false);
    expect(isRetryable(410)).toBe(false);
  });

  it('backs off further each time rather than hammering a struggling server', () => {
    const delays = Array.from({ length: MAX_SERVER_RETRIES }, (_, i) => retryDelay(i));
    expect(delays).toEqual([...delays].sort((a, b) => a - b));
    expect(delays[0]).toBeGreaterThan(0);
  });
});

describe('measuring a compressed photo', () => {
  it('reports the decoded size of a data URL', () => {
    const bytes = 3000;
    const url = `data:image/jpeg;base64,${Buffer.alloc(bytes, 1).toString('base64')}`;
    expect(approxDataUrlBytes(url)).toBe(bytes);
  });

  it('accounts for base64 padding rather than over-reporting', () => {
    for (const size of [1, 2, 3, 4, 5, 100, 999]) {
      const url = `data:image/png;base64,${Buffer.alloc(size, 1).toString('base64')}`;
      expect(approxDataUrlBytes(url)).toBe(size);
    }
  });

  it('reads back in units a guest understands', () => {
    expect(formatBytes(240 * 1024)).toBe('240 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

/*
 * The compression itself needs a real canvas, which jsdom does not provide — it
 * is measured in a browser instead. What is worth pinning here is the policy,
 * because these numbers are a product decision rather than an implementation
 * detail, and a careless edit to any of them changes what every guest uploads.
 */
describe('the photo policy', () => {
  it('fits inside 1200 x 1200', () => {
    expect(SELFIE_DEFAULTS.maxEdge).toBe(1200);
  });

  it('encodes at 70-80% quality, stepping no lower than a sensible floor', () => {
    expect(SELFIE_DEFAULTS.quality).toBeGreaterThanOrEqual(0.7);
    expect(SELFIE_DEFAULTS.quality).toBeLessThanOrEqual(0.8);
    expect(SELFIE_DEFAULTS.minQuality).toBeLessThan(SELFIE_DEFAULTS.quality);
    expect(SELFIE_DEFAULTS.minQuality).toBeGreaterThanOrEqual(0.5);
  });

  it('caps a processed photo at about a megabyte', () => {
    expect(SELFIE_DEFAULTS.maxBytes).toBe(1_000_000);
  });

  it('writes JPEG, which every print shop accepts', () => {
    expect(SELFIE_DEFAULTS.mimeType).toBe('image/jpeg');
  });

  it('leaves the server room to accept what the browser produces', () => {
    expect(LIMITS.selfieBytes).toBeGreaterThan(SELFIE_DEFAULTS.maxBytes);
  });
});

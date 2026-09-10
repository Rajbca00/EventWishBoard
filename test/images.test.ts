import { describe, expect, it } from 'vitest';
import { decodeDataUrl, ImageError } from '@/lib/images';
import { LIMITS } from '@/lib/env';

/*
 * This is the last gate before a guest's bytes reach storage. The browser
 * compresses and checks first, but a request can be made by hand, so nothing
 * here may take the declared type on trust.
 */

const MAGIC = {
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  jpeg: [0xff, 0xd8, 0xff, 0xe0],
  gif: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
};

function dataUrl(mime: string, header: number[], padding = 64): string {
  const body = Buffer.concat([Buffer.from(header), Buffer.alloc(padding, 7)]);
  return `data:${mime};base64,${body.toString('base64')}`;
}

const webp = (padding = 64) => {
  const body = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.alloc(4, 0),
    Buffer.from('WEBP', 'latin1'),
    Buffer.alloc(padding, 7),
  ]);
  return `data:image/webp;base64,${body.toString('base64')}`;
};

describe('accepting a genuine image', () => {
  it('takes a JPEG', () => {
    const image = decodeDataUrl(dataUrl('image/jpeg', MAGIC.jpeg), LIMITS.selfieBytes);
    expect(image.ext).toBe('jpg');
    expect(image.mime).toBe('image/jpeg');
  });

  it('takes a PNG', () => {
    expect(decodeDataUrl(dataUrl('image/png', MAGIC.png), LIMITS.selfieBytes).ext).toBe('png');
  });

  it('takes a WebP', () => {
    expect(decodeDataUrl(webp(), LIMITS.selfieBytes).ext).toBe('webp');
  });

  it('takes a GIF', () => {
    expect(decodeDataUrl(dataUrl('image/gif', MAGIC.gif), LIMITS.assetBytes).ext).toBe('gif');
  });

  it('is not upset by line breaks inside the base64 payload', () => {
    // Some clients wrap long base64 at a fixed column.
    const clean = dataUrl('image/png', MAGIC.png);
    const [prefix, payload] = clean.split(',');
    const wrapped = `${prefix},${payload!.replace(/(.{20})/g, '$1\n')}`;
    expect(() => decodeDataUrl(wrapped, LIMITS.selfieBytes)).not.toThrow();
  });
});

describe('refusing what is not what it claims to be', () => {
  it('refuses a file whose bytes do not match its declared type', () => {
    // A PNG header wearing a JPEG label.
    expect(() => decodeDataUrl(dataUrl('image/jpeg', MAGIC.png), LIMITS.selfieBytes)).toThrow(
      /does not look like a real image/,
    );
  });

  it('refuses a type we do not serve', () => {
    expect(() => decodeDataUrl(dataUrl('image/svg+xml', MAGIC.png), LIMITS.selfieBytes)).toThrow(
      /PNG, JPEG, WebP and GIF/,
    );
  });

  it('refuses anything that is not a data URL at all', () => {
    expect(() => decodeDataUrl('https://example.com/x.jpg', LIMITS.selfieBytes)).toThrow(ImageError);
    expect(() => decodeDataUrl('', LIMITS.selfieBytes)).toThrow(ImageError);
    expect(() => decodeDataUrl('data:image/png;base64,', LIMITS.selfieBytes)).toThrow(ImageError);
  });

  it('refuses an empty payload', () => {
    expect(() => decodeDataUrl('data:image/png;base64,IA==', LIMITS.selfieBytes)).toThrow(
      ImageError,
    );
  });
});

describe('the size ceiling', () => {
  it('accepts a photo just under it', () => {
    const url = dataUrl('image/jpeg', MAGIC.jpeg, LIMITS.selfieBytes - 1000);
    expect(() => decodeDataUrl(url, LIMITS.selfieBytes)).not.toThrow();
  });

  it('refuses one over it, and says how big is allowed', () => {
    const url = dataUrl('image/jpeg', MAGIC.jpeg, LIMITS.selfieBytes + 1000);
    expect(() => decodeDataUrl(url, LIMITS.selfieBytes)).toThrow(/too large/);
  });

  it('is tighter for a guest photo than for an organiser asset', () => {
    expect(LIMITS.selfieBytes).toBeLessThan(LIMITS.assetBytes);
  });

  it('keeps a guest photo near the megabyte the browser aims for', () => {
    expect(LIMITS.selfieBytes).toBeGreaterThanOrEqual(1_000_000);
    expect(LIMITS.selfieBytes).toBeLessThanOrEqual(2 * 1024 * 1024);
  });
});

describe('errors a guest could act on', () => {
  it('are the kind the API is allowed to show, not internal detail', () => {
    try {
      decodeDataUrl('nonsense', LIMITS.selfieBytes);
      throw new Error('should have thrown');
    } catch (caught) {
      expect(caught).toBeInstanceOf(ImageError);
      expect((caught as ImageError).status).toBe(400);
      expect((caught as ImageError).message).not.toMatch(/undefined|null|stack/i);
    }
  });
});

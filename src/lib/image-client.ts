'use client';

/**
 * Every photo is resized and re-encoded in the guest's browser before it
 * touches the network. Venue wifi at a wedding is usually one bar of shared
 * 4G, so a 6 MB phone photo has to come down before it goes up.
 *
 * The rules, in order of priority:
 *
 *   1. Never exceed `maxBytes`. This is a hard ceiling, not a hope — the
 *      encoder is re-run at lower quality, and then at smaller dimensions,
 *      until the result actually fits.
 *   2. Fit inside `maxEdge` × `maxEdge`, keeping the original aspect ratio.
 *      No cropping: a portrait selfie squashed into a square ruins the face.
 *   3. Encode at `quality`, and leave the result alone if it already fits.
 *      A photo that lands at 200 KB is not padded up to some target — fewer
 *      bytes at the same visible quality is strictly better for the guest's
 *      upload, our storage, and the venue wall's bandwidth.
 */

export interface CompressOptions {
  /** Longest edge in pixels. The result fits inside maxEdge × maxEdge. */
  maxEdge?: number;
  /** Starting encoder quality, 0–1. */
  quality?: number;
  /** How far quality may fall before we start reducing pixels instead. */
  minQuality?: number;
  /** Hard ceiling on the encoded result, in decoded bytes. */
  maxBytes?: number;
  mimeType?: 'image/jpeg' | 'image/webp';
}

export interface CompressResult {
  dataUrl: string;
  /** Decoded size of the encoded image. */
  bytes: number;
  width: number;
  height: number;
  mimeType: string;
  /** The quality the result was actually encoded at. */
  quality: number;
}

/* Guest selfies. 1200px is comfortably past what any screen the wall runs on
 * will show, and leaves enough detail to print a 4×6. JPEG rather than WebP:
 * the archive is a keepsake people take to a print shop, and every print shop
 * on earth accepts a .jpg. */
const SELFIE_DEFAULTS: Required<Omit<CompressOptions, 'mimeType'>> & { mimeType: 'image/jpeg' } = {
  maxEdge: 1200,
  quality: 0.8,
  minQuality: 0.62,
  maxBytes: 1_000_000,
  mimeType: 'image/jpeg',
};

/** Refuse obvious nonsense before spending time decoding it. */
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export async function processImage(
  file: File | Blob,
  options: CompressOptions = {},
): Promise<CompressResult> {
  const { maxEdge, quality, minQuality, maxBytes, mimeType } = { ...SELFIE_DEFAULTS, ...options };

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That photo is enormous. Try one straight from your camera roll.');
  }
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('That file is not a photo');
  }

  const bitmap = await loadBitmap(file);
  try {
    let canvas = drawScaled(bitmap, maxEdge);
    let attempt = encode(canvas, mimeType, quality);

    // Step quality down first — it costs less visible detail than throwing
    // away pixels does.
    let q = quality;
    while (attempt.bytes > maxBytes && q > minQuality) {
      q = Math.max(minQuality, q - 0.07);
      attempt = encode(canvas, mimeType, q);
    }

    // Still too big? Now shrink. Busy, high-detail photos land here.
    let edge = Math.max(canvas.width, canvas.height);
    while (attempt.bytes > maxBytes && edge > 480) {
      edge = Math.round(edge * 0.82);
      canvas = drawScaled(bitmap, edge);
      attempt = encode(canvas, mimeType, q);
    }

    if (attempt.bytes > maxBytes) {
      throw new Error('That photo could not be compressed enough. Try a different one.');
    }

    return {
      dataUrl: attempt.dataUrl,
      bytes: attempt.bytes,
      width: canvas.width,
      height: canvas.height,
      mimeType: attempt.mimeType,
      quality: q,
    };
  } finally {
    if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
  }
}

/** Convenience wrapper for the callers that only want the data URL. */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {},
): Promise<string> {
  return (await processImage(file, options)).dataUrl;
}

/* ------------------------------------------------------------------ internals */

type Source = ImageBitmap | HTMLImageElement;

function sourceSize(source: Source): { width: number; height: number } {
  return 'naturalWidth' in source
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/**
 * Draws the image at the target size, halving repeatedly on the way down.
 *
 * A single drawImage from 4000px to 1200px makes the browser skip most source
 * pixels, which shows up as jagged edges in hair and text on a cake. Stepping
 * down by halves averages them instead.
 */
function drawScaled(source: Source, maxEdge: number): HTMLCanvasElement {
  const { width: sw, height: sh } = sourceSize(source);
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const targetW = Math.max(1, Math.round(sw * scale));
  const targetH = Math.max(1, Math.round(sh * scale));

  let current = paint(source, sw, sh);
  let w = sw;
  let h = sh;

  while (w / 2 >= targetW && h / 2 >= targetH) {
    w = Math.max(targetW, Math.round(w / 2));
    h = Math.max(targetH, Math.round(h / 2));
    current = paint(current, w, h);
  }

  return w === targetW && h === targetH ? current : paint(current, targetW, targetH);
}

function paint(source: Source | HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that photo');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

/**
 * Encodes, and verifies we got the format we asked for.
 *
 * `toDataURL` silently returns a PNG when the browser cannot encode the type
 * requested — Safari could not write WebP until 16. A PNG selfie is several
 * megabytes and ignores the quality argument entirely, so an unnoticed
 * fallback would defeat the whole point. If it happens, fall back to JPEG,
 * which every canvas implementation supports.
 */
function encode(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): { dataUrl: string; bytes: number; mimeType: string } {
  let dataUrl = canvas.toDataURL(mimeType, quality);
  let produced = /^data:([^;]+)/.exec(dataUrl)?.[1] ?? 'image/png';

  if (produced !== mimeType && mimeType !== 'image/jpeg') {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    produced = 'image/jpeg';
  }

  return { dataUrl, bytes: approxDataUrlBytes(dataUrl), mimeType: produced };
}

export function approxDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.round((base64.length * 3) / 4) - padding;
}

/** A readable size for the guest, e.g. "240 KB". */
export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

async function loadBitmap(file: File | Blob): Promise<Source> {
  if ('createImageBitmap' in window) {
    try {
      // Honours the EXIF orientation phones write into portrait photos.
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Fall through to the <img> path below.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That photo could not be opened'));
    };
    img.src = url;
  });
}

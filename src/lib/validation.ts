import { z } from 'zod';
import { LIMITS } from './env';

/**
 * Base64 costs a third more characters than the bytes it carries, so the
 * character cap is the byte cap plus that overhead plus a little slack. It is
 * only a cheap first gate: `decodeDataUrl` checks the real decoded size.
 */
const maxDataUrlChars = Math.ceil((LIMITS.assetBytes * 4) / 3) + 512;

const dataUrl = z
  .string()
  .max(maxDataUrlChars, 'That image is too large')
  .regex(
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i,
    'Image must be a PNG, JPEG, WebP or GIF data URL',
  );

/** The selfie slot is tighter than an organiser asset, and there is only one. */
const selfieDataUrl = dataUrl.max(
  Math.ceil((LIMITS.selfieBytes * 4) / 3) + 512,
  'That photo is too large',
);

const decoration = z.string().trim().min(1).max(400);

const decorationList = (max: number) =>
  z
    .array(decoration)
    .max(max)
    // The same sticker twice is a mis-tap, not a choice.
    .transform((values) => [...new Set(values)])
    .optional()
    .default([]);

/**
 * What a guest submits from the wish composer.
 *
 * The singular `sticker`/`gif`/`meme` fields are still accepted. A wish that
 * failed to send is kept on the device and retried later, so a draft saved
 * before multi-select shipped can still arrive days afterwards — dropping the
 * fields would quietly discard exactly the wishes this app went out of its way
 * to save.
 */
export const wishSubmissionSchema = z
  .object({
    message: z.string().trim().min(1, 'Write a little something first').max(LIMITS.wishChars),
    guestName: z.string().trim().max(LIMITS.nameChars).optional().default(''),
    isAnonymous: z.boolean().optional().default(false),
    stickers: decorationList(LIMITS.maxStickers),
    gifs: decorationList(LIMITS.maxGifs),
    memes: decorationList(LIMITS.maxMemes),
    sticker: decoration.nullable().optional(),
    gif: decoration.nullable().optional(),
    meme: decoration.nullable().optional(),
    /** Exactly one photo per wish, or none. */
    selfie: selfieDataUrl.nullable().optional(),
    selfiePublic: z.boolean().optional().default(false),
  })
  .transform((value) => {
    const merge = (list: string[], one: string | null | undefined, max: number) =>
      [...new Set(one ? [...list, one] : list)].slice(0, max);

    return {
      ...value,
      stickers: merge(value.stickers, value.sticker, LIMITS.maxStickers),
      gifs: merge(value.gifs, value.gif, LIMITS.maxGifs),
      memes: merge(value.memes, value.meme, LIMITS.maxMemes),
    };
  });

export type WishSubmission = z.infer<typeof wishSubmissionSchema>;

/** One generated test wish. Same caps as a real one; the marker is set server-side. */
export const seedWishSchema = z.object({
  message: z.string().trim().min(1).max(LIMITS.wishChars),
  guestName: z.string().trim().max(LIMITS.nameChars).nullable().optional(),
  isAnonymous: z.boolean().optional().default(false),
  stickers: decorationList(LIMITS.maxStickers),
  gifs: decorationList(LIMITS.maxGifs),
  memes: decorationList(LIMITS.maxMemes),
  selfie: selfieDataUrl.nullable().optional(),
  selfiePublic: z.boolean().optional().default(false),
  featured: z.boolean().optional().default(false),
  status: z.enum(['pending', 'approved', 'hidden']).optional().default('approved'),
});

/**
 * Batches are capped at ten so that one request never has to carry more than a
 * few megabytes of photos, whatever the organiser typed into the count box.
 */
export const seedBatchSchema = z.object({
  wishes: z.array(seedWishSchema).min(1).max(10),
});

export const eventSettingsSchema = z.object({
  selfieEnabled: z.boolean(),
  wallEnabled: z.boolean(),
  publicSelfies: z.boolean(),
  moderation: z.enum(['auto', 'manual']),
  charLimit: z.number().int().min(50).max(LIMITS.wishChars),
  maxWishes: z.number().int().min(0).max(100_000),
  wallLimit: z.number().int().min(1).max(100),
  useDefaultAssets: z.boolean(),
  showInstagram: z.boolean(),
  showReview: z.boolean(),
});

export const createEventSchema = z.object({
  name: z.string().trim().min(1, 'Give the event a name').max(120),
  hosts: z.string().trim().max(120).optional().default(''),
  slug: z.string().trim().max(60).optional(),
  eventDate: z.string().trim().max(40).nullable().optional(),
  expiryDate: z.string().trim().max(40).nullable().optional(),
  description: z.string().trim().max(600).optional().default(''),
  theme: z.enum(['wedding', 'birthday', 'engagement', 'celebration', 'chocolate']).optional().default('wedding'),
  welcomeMessage: z.string().trim().max(300).optional().default(''),
  logoUrl: z.string().max(500).nullable().optional(),
  background: z.string().max(500).nullable().optional(),
  settings: eventSettingsSchema.partial().optional(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const preloadedWishSchema = z.object({
  message: z.string().trim().min(1).max(LIMITS.wishChars),
  guestName: z.string().trim().max(LIMITS.nameChars).optional().default(''),
  isAnonymous: z.boolean().optional().default(true),
  sticker: decoration.nullable().optional(),
  stickers: decorationList(LIMITS.maxStickers),
});

export const assetUploadSchema = z
  .object({
    type: z.enum(['sticker', 'gif', 'meme']),
    name: z.string().trim().max(80).optional().default(''),
    emoji: z.string().trim().max(16).nullable().optional(),
    file: dataUrl.nullable().optional(),
    sortOrder: z.number().int().min(0).max(9999).optional().default(0),
  })
  .refine((value) => Boolean(value.emoji || value.file), {
    message: 'Upload an image or choose an emoji',
  });

export const assetPatchSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().max(80).optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const wishPatchSchema = z.object({
  status: z.enum(['pending', 'approved', 'hidden']).optional(),
  featured: z.boolean().optional(),
  message: z.string().trim().min(1).max(LIMITS.wishChars).optional(),
});

/** Turns a ZodError into a single readable sentence for the guest UI. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Something in that submission looked off';
}

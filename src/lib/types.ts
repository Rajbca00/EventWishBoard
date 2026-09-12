export type WishStatus = 'pending' | 'approved' | 'hidden';
export type AssetType = 'sticker' | 'gif' | 'meme';
export type ThemeId = 'wedding' | 'birthday' | 'engagement' | 'celebration' | 'chocolate';
export type EventStatus = 'open' | 'closed' | 'full';

/** Feature flags stored on `events.settings`. */
export interface EventSettings {
  selfieEnabled: boolean;
  wallEnabled: boolean;
  /** Guest selfies stay private to the organiser unless this is turned on. */
  publicSelfies: boolean;
  moderation: 'auto' | 'manual';
  charLimit: number;
  /** 0 means unlimited. */
  maxWishes: number;
  /** How many of the newest wishes are shown on the live wall at once. */
  wallLimit: number;
  useDefaultAssets: boolean;
  showInstagram: boolean;
  showReview: boolean;
}

export const DEFAULT_SETTINGS: EventSettings = {
  selfieEnabled: true,
  wallEnabled: true,
  publicSelfies: false,
  moderation: 'auto',
  charLimit: 300,
  maxWishes: 0,
  wallLimit: 16,
  useDefaultAssets: true,
  showInstagram: true,
  showReview: true,
};

export interface EventRow {
  id: string;
  name: string;
  hosts: string;
  event_date: string | null;
  expiry_date: string | null;
  description: string;
  theme: string;
  background: string | null;
  welcome_message: string;
  logo_url: string | null;
  settings: Partial<EventSettings> | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface WishRow {
  id: string;
  event_id: string;
  message: string;
  guest_name: string | null;
  is_anonymous: boolean;
  /**
   * Kept in sync with the first element of the matching list below, so that a
   * build running against a database without migration 0004 still works.
   */
  sticker: string | null;
  gif: string | null;
  meme: string | null;
  /** Optional: absent on a database that has not had 0004 applied. */
  stickers?: string[] | null;
  gifs?: string[] | null;
  memes?: string[] | null;
  selfie_path: string | null;
  /** The guest chose to show this photo on the public wall. */
  selfie_public: boolean;
  status: WishStatus;
  is_featured: boolean;
  is_preloaded: boolean;
  ip_hash: string | null;
  created_at: string;
}

export interface AssetRow {
  id: string;
  event_id: string | null;
  type: AssetType;
  url: string | null;
  emoji: string | null;
  name: string;
  enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface EventStatsRow {
  event_id: string;
  total_wishes: number;
  guest_wishes: number;
  wishes_today: number;
  selfies: number;
  pending: number;
  hidden: number;
  featured: number;
  scans: number;
}

/* ------------------------------------------------------------------ shaped domain objects */

export interface CelebrationEvent {
  id: string;
  name: string;
  hosts: string;
  eventDate: string | null;
  expiryDate: string | null;
  description: string;
  themeId: ThemeId;
  background: string | null;
  welcomeMessage: string;
  logoUrl: string | null;
  settings: EventSettings;
  archived: boolean;
  expired: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A wish as shown on the public Wish Wall — never carries a private selfie URL. */
export interface PublicWish {
  id: string;
  message: string;
  name: string | null;
  /** Emoji or image URLs, in the order the guest picked them. */
  stickers: string[];
  gifs: string[];
  memes: string[];
  selfieUrl: string | null;
  featured: boolean;
  createdAt: string;
}

/** A wish as shown in the organiser dashboard. */
export interface AdminWish extends PublicWish {
  eventId: string;
  guestName: string | null;
  isAnonymous: boolean;
  status: WishStatus;
  preloaded: boolean;
  hasSelfie: boolean;
  selfiePublic: boolean;
}

export interface GuestAsset {
  id: string;
  type: AssetType;
  url: string | null;
  emoji: string | null;
  name: string;
}

export interface AssetLibrary {
  stickers: GuestAsset[];
  gifs: GuestAsset[];
  memes: GuestAsset[];
}

export interface AdminAsset extends GuestAsset {
  eventId: string | null;
  enabled: boolean;
  global: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface EventStats {
  totalWishes: number;
  guestWishes: number;
  today: number;
  selfies: number;
  pending: number;
  hidden: number;
  featured: number;
  scans: number;
  /** Percentage of QR scans that became a wish. */
  submissionRate: number;
}

export interface Memory {
  wishId: string;
  selfieUrl: string;
  name: string;
  message: string;
  status: WishStatus;
  /** The guest chose to show this photo on the public wall. */
  isPublic: boolean;
  createdAt: string;
}

/** Everything the guest app needs, delivered in one request. */
export interface GuestPayload {
  event: {
    id: string;
    name: string;
    hosts: string;
    eventDate: string | null;
    description: string;
    welcomeMessage: string;
    logoUrl: string | null;
    background: string | null;
    themeId: ThemeId;
    settings: Pick<
      EventSettings,
      | 'selfieEnabled'
      | 'wallEnabled'
      | 'charLimit'
      | 'showInstagram'
      | 'showReview'
      | 'publicSelfies'
    >;
    status: EventStatus;
  };
  assets: AssetLibrary;
  wall: PublicWish[];
}

/** What the guest sends when submitting. */
export interface WishDraft {
  message: string;
  guestName: string;
  isAnonymous: boolean;
  stickers: string[];
  gifs: string[];
  memes: string[];
  /** Base64 data URL, compressed in the browser before it is sent. */
  selfie: string | null;
  /** Guest's choice: show the photo on the wall, or keep it for the hosts. */
  selfiePublic: boolean;
}

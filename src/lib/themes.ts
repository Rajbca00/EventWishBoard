import type { ThemeId } from './types';

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  /** Injected as CSS custom properties on the guest page wrapper. */
  tokens: Record<string, string>;
  confetti: string[];
  /** Decorative elements the Wish Wall scatters through the scene. */
  decor: string[];
}

/**
 * Themes are data, not code. A new celebration style is a new entry here —
 * no component changes required.
 */
export const THEMES: Record<ThemeId, Theme> = {
  wedding: {
    id: 'wedding',
    label: 'Wedding',
    emoji: '💍',
    tokens: {
      '--bg-1': '#fff7f3',
      '--bg-2': '#ffe9ef',
      '--bg-3': '#f4e7ff',
      '--ink': '#4a2c33',
      '--ink-soft': '#8d6d75',
      '--accent': '#d4738f',
      '--accent-2': '#b8577a',
      '--accent-soft': '#ffd9e4',
      '--gold': '#d8a657',
      '--card': 'rgba(255,255,255,0.74)',
      '--card-line': 'rgba(212,115,143,0.22)',
      '--wall-1': '#fce3ec',
      '--wall-2': '#e8dcff',
      '--wall-3': '#fff2e4',
    },
    confetti: ['#d4738f', '#d8a657', '#ffffff', '#f6c8d6', '#c9a7e8'],
    decor: ['balloon', 'petal', 'heart', 'sparkle', 'ring'],
  },
  birthday: {
    id: 'birthday',
    label: 'Birthday',
    emoji: '🎂',
    tokens: {
      '--bg-1': '#fff9f0',
      '--bg-2': '#ffe8e0',
      '--bg-3': '#e6f2ff',
      '--ink': '#43303f',
      '--ink-soft': '#856e7d',
      '--accent': '#e07a5f',
      '--accent-2': '#c85f6f',
      '--accent-soft': '#ffe0d4',
      '--gold': '#e8b04b',
      '--card': 'rgba(255,255,255,0.76)',
      '--card-line': 'rgba(224,122,95,0.22)',
      '--wall-1': '#ffe3d6',
      '--wall-2': '#dceeff',
      '--wall-3': '#fff3d9',
    },
    confetti: ['#e07a5f', '#e8b04b', '#7fb2e5', '#ffffff', '#f2a1c0'],
    decor: ['balloon', 'confetti', 'star', 'sparkle', 'cake'],
  },
  engagement: {
    id: 'engagement',
    label: 'Engagement',
    emoji: '💐',
    tokens: {
      '--bg-1': '#fdf4f8',
      '--bg-2': '#f4e6f7',
      '--bg-3': '#eeeaff',
      '--ink': '#443049',
      '--ink-soft': '#806b89',
      '--accent': '#b56ea8',
      '--accent-2': '#93548f',
      '--accent-soft': '#f4dcf1',
      '--gold': '#d9ab5e',
      '--card': 'rgba(255,255,255,0.75)',
      '--card-line': 'rgba(181,110,168,0.22)',
      '--wall-1': '#f3e0f2',
      '--wall-2': '#e4defb',
      '--wall-3': '#fdeff3',
    },
    confetti: ['#b56ea8', '#d9ab5e', '#ffffff', '#e8c9e6', '#a99bea'],
    decor: ['petal', 'ring', 'heart', 'sparkle', 'balloon'],
  },
  celebration: {
    id: 'celebration',
    label: 'Other Celebrations',
    emoji: '🎉',
    tokens: {
      '--bg-1': '#fff8f1',
      '--bg-2': '#ffeadf',
      '--bg-3': '#f0e9ff',
      '--ink': '#40323d',
      '--ink-soft': '#7e6d79',
      '--accent': '#c97b62',
      '--accent-2': '#a95f6e',
      '--accent-soft': '#ffe2d6',
      '--gold': '#dfae5c',
      '--card': 'rgba(255,255,255,0.75)',
      '--card-line': 'rgba(201,123,98,0.22)',
      '--wall-1': '#ffe6d8',
      '--wall-2': '#ece2ff',
      '--wall-3': '#fff2e0',
    },
    confetti: ['#c97b62', '#dfae5c', '#ffffff', '#f0bdb0', '#b6a5e8'],
    decor: ['balloon', 'confetti', 'sparkle', 'star', 'gift'],
  },
};

export const DEFAULT_THEME: ThemeId = 'wedding';

export const THEME_LIST = Object.values(THEMES);

export function resolveTheme(id: string | null | undefined): Theme {
  return THEMES[(id ?? '') as ThemeId] ?? THEMES[DEFAULT_THEME];
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEMES;
}

/** Turns a theme into an inline `style` object of CSS custom properties. */
export function themeStyle(theme: Theme): React.CSSProperties {
  return theme.tokens as unknown as React.CSSProperties;
}

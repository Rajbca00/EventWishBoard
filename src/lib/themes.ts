import type { ThemeId } from './types';

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  /** A dark ground: form controls and scrollbars follow it. */
  dark?: boolean;
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
/*
 * The one dark theme. Deep chocolate ground, cream type and caramel accents —
 * built for a dessert-table screen in a dimmed reception hall, where a bright
 * cream wall is the brightest thing in the room.
 *
 * Contrast, checked: cream is 12:1 on the cards, the latte secondary text
 * 7.8:1. The caramel accent reads at 7.5:1 as text on chocolate but only
 * 2.4:1 under white button text, so filled buttons use a toffee
 * --accent-fill instead (4.8:1, deepening to 6.6:1), and error text has its
 * own brighter caramel.
 */
const CHOCOLATE: Theme = {
  id: 'chocolate',
  label: 'Chocolate',
  emoji: '🍫',
  dark: true,
  tokens: {
    '--bg-1': '#21140e',
    '--bg-2': '#2b1a12',
    '--bg-3': '#382218',
    '--ink': '#f7e8d5',
    '--ink-soft': '#d6b999',
    '--accent': '#d99a5f',
    '--accent-2': '#8f4a20',
    // White button text on a filled surface: 4.8:1 here, 6.6:1 at --accent-2.
    '--accent-fill': '#aa5f2c',
    '--accent-soft': '#4a2c1e',
    '--gold': '#e3b56c',
    '--card': 'rgba(56,34,24,0.86)',
    '--card-solid': '#3a2419',
    '--card-line': 'rgba(240,208,170,0.16)',
    '--wall-1': '#3d2419',
    '--wall-2': '#301c13',
    '--wall-3': '#4a2c1d',
    '--tint': 'rgba(255,236,214,0.07)',
    '--tint-strong': 'rgba(255,236,214,0.14)',
    '--sweep': 'rgba(255,190,130,0.07)',
    '--notice': '#eaa56c',
  },
  confetti: ['#e3b56c', '#d99a5f', '#f7e8d5', '#8a5635', '#f0c9a0'],
  decor: ['choc', 'brownie', 'cupcake', 'macaron', 'cake', 'sparkle', 'heart', 'balloon', 'slice', 'cookie'],
};

export const THEMES: Record<ThemeId, Theme> = {
  wedding: {
    id: 'wedding',
    label: 'Wedding',
    emoji: '💍',
    tokens: {
      '--bg-1': '#f9f1df',
      '--bg-2': '#f3e4d1',
      '--bg-3': '#f8efe5',
      '--ink': '#3f220f',
      '--ink-soft': '#7e5c46',
      '--accent': '#ba5d5d',
      '--accent-2': '#8d4327',
      '--accent-soft': '#f6e2cb',
      '--gold': '#d7a14a',
      '--card': 'rgba(255,250,244,0.82)',
      '--card-solid': '#fffdf9',
      '--card-line': 'rgba(106,68,40,0.18)',
      '--wall-1': '#f6ebdd',
      '--wall-2': '#f3e2d5',
      '--wall-3': '#f9f2e5',
    },
    confetti: ['#8d4327', '#d7a14a', '#f5d9a0', '#fffaf2', '#c0825a'],
    decor: ['balloon', 'balloon', 'brownie', 'cupcake', 'cake', 'petal', 'heart', 'sparkle', 'ring', 'macaron', 'slice', 'choc'],
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
      '--ink-soft': '#816b79',
      '--accent': '#e07a5f',
      '--accent-2': '#c85f6f',
      // Error and notice text: the accent, deepened until it reads at AA.
      '--notice': '#b05462',
      '--accent-soft': '#ffe0d4',
      '--gold': '#e8b04b',
      '--card': 'rgba(255,253,248,0.82)',
      '--card-solid': '#fffdf8',
      '--card-line': 'rgba(186,124,102,0.20)',
      '--wall-1': '#ffe3d6',
      '--wall-2': '#dceeff',
      '--wall-3': '#fff3d9',
    },
    confetti: ['#e07a5f', '#e8b04b', '#7fb2e5', '#ffffff', '#f2a1c0'],
    decor: ['balloon', 'balloon', 'cupcake', 'cake', 'brownie', 'confetti', 'star', 'sparkle', 'donut', 'cookie', 'slice'],
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
      '--ink-soft': '#7c6885',
      '--accent': '#b56ea8',
      '--accent-2': '#93548f',
      '--accent-soft': '#f4dcf1',
      '--gold': '#d9ab5e',
      '--card': 'rgba(255,252,254,0.81)',
      '--card-solid': '#fffcfe',
      '--card-line': 'rgba(150,110,142,0.20)',
      '--wall-1': '#f3e0f2',
      '--wall-2': '#e4defb',
      '--wall-3': '#fdeff3',
    },
    confetti: ['#b56ea8', '#d9ab5e', '#ffffff', '#e8c9e6', '#a99bea'],
    decor: ['petal', 'ring', 'heart', 'sparkle', 'balloon', 'balloon', 'cupcake', 'brownie', 'macaron', 'donut', 'choc'],
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
      '--ink-soft': '#7a6a75',
      '--accent': '#c97b62',
      '--accent-2': '#a95f6e',
      // Error and notice text: the accent, deepened until it reads at AA.
      '--notice': '#a25b6a',
      '--accent-soft': '#ffe2d6',
      '--gold': '#dfae5c',
      '--card': 'rgba(255,252,247,0.81)',
      '--card-solid': '#fffcf7',
      '--card-line': 'rgba(170,124,106,0.20)',
      '--wall-1': '#ffe6d8',
      '--wall-2': '#ece2ff',
      '--wall-3': '#fff2e0',
    },
    confetti: ['#c97b62', '#dfae5c', '#ffffff', '#f0bdb0', '#b6a5e8'],
    decor: ['balloon', 'balloon', 'cupcake', 'brownie', 'confetti', 'sparkle', 'star', 'gift', 'cake', 'cookie', 'choc'],
  },
  chocolate: CHOCOLATE,
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
  return {
    ...(theme.tokens as unknown as React.CSSProperties),
    colorScheme: theme.dark ? 'dark' : 'light',
  };
}

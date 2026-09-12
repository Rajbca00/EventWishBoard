import { describe, expect, it } from 'vitest';
import { THEMES, THEME_LIST, resolveTheme, themeStyle } from '@/lib/themes';

/*
 * Every theme is read from a few feet away on a venue screen and up close on a
 * guest's phone, so its colours are checked here rather than trusted by eye.
 * These are WCAG 2 contrast ratios; 4.5:1 is the AA line for body text.
 */

const channel = (hex: string, index: number) => parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) =>
  0.2126 * linear(channel(hex, 0)) + 0.7152 * linear(channel(hex, 1)) + 0.0722 * linear(channel(hex, 2));
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

describe('every theme', () => {
  for (const theme of THEME_LIST) {
    const t = theme.tokens;

    describe(theme.label, () => {
      it('sets wish text clearly on its cards and its ground', () => {
        expect(contrast(t['--ink']!, t['--card-solid']!)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(t['--ink']!, t['--bg-1']!)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps secondary text — names, captions — readable on its cards', () => {
        expect(contrast(t['--ink-soft']!, t['--card-solid']!)).toBeGreaterThanOrEqual(4.5);
      });

      it('keeps error and notice text readable on its ground', () => {
        const notice = t['--notice'] ?? t['--accent-2']!;
        expect(contrast(notice, t['--bg-1']!)).toBeGreaterThanOrEqual(4.5);
      });

      it('defines every colour the pages read', () => {
        for (const key of ['--bg-1', '--bg-2', '--bg-3', '--ink', '--ink-soft', '--accent', '--accent-2', '--gold', '--card', '--card-solid', '--card-line', '--wall-1', '--wall-2', '--wall-3']) {
          expect(t[key], `${theme.id} is missing ${key}`).toBeTruthy();
        }
      });
    });
  }
});

describe('the chocolate theme', () => {
  const chocolate = THEMES.chocolate;

  it('exists and is dark', () => {
    expect(chocolate.dark).toBe(true);
    expect(luminance(chocolate.tokens['--bg-1']!)).toBeLessThan(0.05);
  });

  it('holds white button text across the whole filled gradient', () => {
    // Buttons run from --accent-fill to --accent-2 with white text on top.
    expect(contrast('#ffffff', chocolate.tokens['--accent-fill']!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', chocolate.tokens['--accent-2']!)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps its caramel accent readable as text on the ground', () => {
    expect(contrast(chocolate.tokens['--accent']!, chocolate.tokens['--bg-1']!)).toBeGreaterThanOrEqual(4.5);
  });

  /*
   * The washes, hovers and chips used to be hard-coded white. On a chocolate
   * ground that glares and puts cream text on a near-white patch, so the dark
   * theme has to supply its own.
   */
  it('supplies its own washes instead of inheriting the white ones', () => {
    for (const key of ['--tint', '--tint-strong', '--sweep']) {
      expect(chocolate.tokens[key], `chocolate is missing ${key}`).toBeTruthy();
      expect(chocolate.tokens[key]).not.toMatch(/255,\s*255,\s*255/);
    }
  });

  it('tells form controls and scrollbars to go dark too', () => {
    expect(themeStyle(chocolate).colorScheme).toBe('dark');
    expect(themeStyle(THEMES.wedding).colorScheme).toBe('light');
  });

  it('resolves by id, and anything unknown falls back to the wedding theme', () => {
    expect(resolveTheme('chocolate').id).toBe('chocolate');
    expect(resolveTheme('nonsense').id).toBe('wedding');
  });
});

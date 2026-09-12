import { afterEach, describe, expect, it } from 'vitest';
import { flagEnabled, isRateLimitDisabled } from '@/lib/env';

const original = process.env.DISABLE_WISH_RATE_LIMIT;
afterEach(() => {
  if (original === undefined) delete process.env.DISABLE_WISH_RATE_LIMIT;
  else process.env.DISABLE_WISH_RATE_LIMIT = original;
});

describe('reading an on/off flag', () => {
  it('turns on for the usual ways of saying yes, in any case', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'On', ' on ']) expect(flagEnabled(value)).toBe(true);
  });

  it('stays off for anything else, including a typo', () => {
    for (const value of [undefined, '', '0', 'false', 'off', 'no', 'disabled', 'ture']) {
      expect(flagEnabled(value)).toBe(false);
    }
  });
});

/*
 * Left on at a real event, this would let one phone flood the wall — so it
 * must be off unless someone deliberately set it, and it must follow the
 * environment without a restart of the module.
 */
describe('the wish rate-limit switch', () => {
  it('is on only when the variable says so', () => {
    delete process.env.DISABLE_WISH_RATE_LIMIT;
    expect(isRateLimitDisabled()).toBe(false);

    process.env.DISABLE_WISH_RATE_LIMIT = '1';
    expect(isRateLimitDisabled()).toBe(true);

    process.env.DISABLE_WISH_RATE_LIMIT = '0';
    expect(isRateLimitDisabled()).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { formatPhone } from '@/lib/utils';
import { BRAND } from '@/lib/env';

describe('a phone number on the wall', () => {
  it('groups ten digits into two fives, the way it is read aloud', () => {
    expect(formatPhone('8438186676')).toBe('84381 86676');
  });

  it('keeps a +91 prefix and tidies spacing already there', () => {
    expect(formatPhone('+91 84381-86676')).toBe('+91 84381 86676');
  });

  it('leaves anything else as it was rather than guess', () => {
    expect(formatPhone('0422 123 456')).toBe('0422 123 456');
    expect(formatPhone('12345')).toBe('12345');
  });

  it("shows Laya & Bee's own number grouped", () => {
    expect(formatPhone(BRAND.phone)).toBe('84381 86676');
    expect(BRAND.instagramHandle).toBe('layaNbee_cakes');
  });
});

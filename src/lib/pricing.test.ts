import { describe, expect, it } from 'vitest';
import { calculatePrice } from './pricing';

const AFTER_DEADLINE = new Date('2026-07-17T12:00:00+01:00');

describe('calculatePrice', () => {
  it.each([
    ['virtual-student', 11000],
    ['virtual-junior-doctor', 30000],
    ['virtual-senior-doctor', 50000],
  ] as const)('does not apply a late fee to %s', (category, baseFee) => {
    expect(calculatePrice(category, AFTER_DEADLINE)).toMatchObject({
      baseFee,
      lateFee: 0,
      total: baseFee,
      isLateRegistration: false,
    });
  });

  it('still applies the flat late fee to in-person registrations', () => {
    expect(calculatePrice('senior-doctor', AFTER_DEADLINE)).toMatchObject({
      baseFee: 50000,
      lateFee: 10000,
      total: 60000,
      isLateRegistration: true,
    });
  });
});

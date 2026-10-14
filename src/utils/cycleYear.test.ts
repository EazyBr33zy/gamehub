import { describe, it, expect } from 'vitest';
import { getCurrentCycleYear } from './cycleYear';

describe('cycleYear utility', () => {
  it('returns current year dynamically from a default Date', () => {
    const year = getCurrentCycleYear();
    expect(year).toBe(new Date().getFullYear());
  });

  it('correctly calculates simulated year for 2027 and other future years', () => {
    const date2027 = new Date('2027-06-15T12:00:00Z');
    expect(getCurrentCycleYear(date2027)).toBe(2027);

    const date2028 = new Date('2028-01-01T00:00:00Z');
    expect(getCurrentCycleYear(date2028)).toBe(2028);
  });
});

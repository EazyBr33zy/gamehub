import { describe, it, expect } from 'vitest';

export function validateAnnualGoal(input: string | number): { valid: boolean; value?: number; error?: string } {
  const parsed = typeof input === 'number' ? input : parseInt(String(input).trim(), 10);
  if (isNaN(parsed)) {
    return { valid: false, error: 'A meta deve ser um número válido.' };
  }
  if (parsed < 1 || parsed > 500) {
    return { valid: false, error: 'A meta deve ser entre 1 e 500 jogos.' };
  }
  return { valid: true, value: parsed };
}

describe('Annual Goal Validation', () => {
  it('accepts valid goals like 60, 24, 1, 500', () => {
    expect(validateAnnualGoal('60')).toEqual({ valid: true, value: 60 });
    expect(validateAnnualGoal(24)).toEqual({ valid: true, value: 24 });
    expect(validateAnnualGoal('1')).toEqual({ valid: true, value: 1 });
    expect(validateAnnualGoal('500')).toEqual({ valid: true, value: 500 });
  });

  it('rejects values out of range (0, negative, > 500)', () => {
    expect(validateAnnualGoal('0').valid).toBe(false);
    expect(validateAnnualGoal('-5').valid).toBe(false);
    expect(validateAnnualGoal('501').valid).toBe(false);
    expect(validateAnnualGoal('1000').valid).toBe(false);
  });

  it('rejects empty or non-numeric strings', () => {
    expect(validateAnnualGoal('').valid).toBe(false);
    expect(validateAnnualGoal('abc').valid).toBe(false);
  });
});

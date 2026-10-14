import { describe, it, expect } from 'vitest';
import { stripUndefined } from './stripUndefined';

describe('stripUndefined', () => {
  it('removes undefined fields from flat objects', () => {
    const input = { a: 1, b: undefined, c: 'hello', d: null };
    expect(stripUndefined(input)).toEqual({ a: 1, c: 'hello', d: null });
  });

  it('removes undefined fields from deeply nested objects', () => {
    const input = {
      title: 'Game',
      rubric: {
        jogabilidade: 10,
        historia: undefined,
      },
      sessoes: [
        {
          data: '2026-03-01',
          totalMinutos: 60,
          intervalos: [
            { inicio: '10:00', fim: undefined, minutos: 60 },
          ],
        },
      ],
    };

    const expected = {
      title: 'Game',
      rubric: {
        jogabilidade: 10,
      },
      sessoes: [
        {
          data: '2026-03-01',
          totalMinutos: 60,
          intervalos: [
            { inicio: '10:00', minutos: 60 },
          ],
        },
      ],
    };

    expect(stripUndefined(input)).toEqual(expected);
  });

  it('handles primitive values and nulls gracefully', () => {
    expect(stripUndefined(null)).toBeNull();
    expect(stripUndefined('text')).toBe('text');
    expect(stripUndefined(123)).toBe(123);
    expect(stripUndefined(undefined)).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import {
  calculateIntervalDuration,
  checkIntervalOverlap,
  formatMinutesToHMM,
  calculateSessionTotalMinutes,
  getGameEffectiveTime,
  getGameEffectiveScore,
  formatDateBRToISO,
  formatISOToDateBR,
  sortSessionsDescending,
} from './gameCalculations';
import { GameItem, GameplayDaySession, GameReviewRubric } from '../types/game';

describe('gameCalculations', () => {
  describe('calculateIntervalDuration', () => {
    it('calculates duration within the same day', () => {
      const res = calculateIntervalDuration('14:00', '15:30');
      expect(res.minutos).toBe(90);
      expect(res.crossesMidnight).toBe(false);
      expect(res.isValid).toBe(true);
    });

    it('handles midnight crossing as next day', () => {
      const res = calculateIntervalDuration('23:00', '01:15');
      expect(res.minutos).toBe(135); // 1h before midnight + 1h15 after
      expect(res.crossesMidnight).toBe(true);
      expect(res.isValid).toBe(true);
    });

    it('returns 0 for identical start and end', () => {
      const res = calculateIntervalDuration('14:00', '14:00');
      expect(res.minutos).toBe(0);
      expect(res.crossesMidnight).toBe(false);
    });
  });

  describe('checkIntervalOverlap', () => {
    it('detects overlapping intervals within the same day', () => {
      const intervals = [
        { inicio: '14:00', fim: '15:00' },
        { inicio: '14:30', fim: '16:00' },
      ];
      const res = checkIntervalOverlap(intervals);
      expect(res.hasOverlap).toBe(true);
    });

    it('allows contiguous intervals touching at endpoints', () => {
      const intervals = [
        { inicio: '14:00', fim: '15:00' },
        { inicio: '15:00', fim: '16:00' },
      ];
      const res = checkIntervalOverlap(intervals);
      expect(res.hasOverlap).toBe(false);
    });

    it('detects overlap with interval crossing midnight', () => {
      const intervals = [
        { inicio: '23:30', fim: '01:30' },
        { inicio: '00:30', fim: '02:00' },
      ];
      const res = checkIntervalOverlap(intervals);
      expect(res.hasOverlap).toBe(true);
    });
  });

  describe('formatMinutesToHMM', () => {
    it('formats minutes into h:mm', () => {
      expect(formatMinutesToHMM(0)).toBe('0:00');
      expect(formatMinutesToHMM(45)).toBe('0:45');
      expect(formatMinutesToHMM(60)).toBe('1:00');
      expect(formatMinutesToHMM(125)).toBe('2:05');
      expect(formatMinutesToHMM(600)).toBe('10:00');
    });
  });

  describe('calculateSessionTotalMinutes', () => {
    it('sums intervals if present', () => {
      const session: GameplayDaySession = {
        data: '10/05/2026',
        totalMinutos: 0,
        intervalos: [
          { inicio: '10:00', fim: '11:00', minutos: 60 },
          { inicio: '14:00', fim: '15:15', minutos: 75 },
        ],
      };
      expect(calculateSessionTotalMinutes(session)).toBe(135);
    });

    it('calculates from inicio and fim if minutos is missing in intervals', () => {
      const session: GameplayDaySession = {
        data: '10/05/2026',
        totalMinutos: 0,
        intervalos: [
          { inicio: '10:00', fim: '11:30', minutos: 0 },
        ],
      };
      expect(calculateSessionTotalMinutes(session)).toBe(90);
    });

    it('falls back to totalMinutos if intervals are empty', () => {
      const session: GameplayDaySession = {
        data: '10/05/2026',
        totalMinutos: 150,
        intervalos: [],
      };
      expect(calculateSessionTotalMinutes(session)).toBe(150);
    });
  });

  describe('getGameEffectiveTime', () => {
    it('calculates time from sessions when present', () => {
      const game: Partial<GameItem> = {
        tempo: '5:00',
        tempoMinutos: 300,
        sessoes: [
          {
            data: '01/01/2026',
            totalMinutos: 60,
            intervalos: [{ inicio: '10:00', fim: '11:00', minutos: 60 }],
          },
          {
            data: '02/01/2026',
            totalMinutos: 45,
            intervalos: [{ inicio: '12:00', fim: '12:45', minutos: 45 }],
          },
        ],
      };

      const res = getGameEffectiveTime(game);
      expect(res.hasSessions).toBe(true);
      expect(res.tempoMinutos).toBe(105);
      expect(res.tempo).toBe('1:45');
    });

    it('uses saved tempo when game has no sessions', () => {
      const game: Partial<GameItem> = {
        tempo: '14:30',
        tempoMinutos: 870,
        sessoes: [],
      };

      const res = getGameEffectiveTime(game);
      expect(res.hasSessions).toBe(false);
      expect(res.tempo).toBe('14:30');
      expect(res.tempoMinutos).toBe(870);
    });
  });

  describe('getGameEffectiveScore', () => {
    it('calculates score from rubric when rubric is present', () => {
      const sampleRubric: GameReviewRubric = {
        controles: 10,
        dificuldade: 10,
        levelDesign: 10,
        mecanicas: 10,
        estiloVisual: 10,
        animacoes: 10,
        paletaCores: 10,
        detalhes: 10,
        musicasMemoraveis: 10,
        adequacao: 10,
        variedade: 10,
        efeitosSonoros: 10,
        querContinuarJogando: 10,
        satisfacao: 10,
        rejogabilidade: 10,
        interesse: 10,
      };

      const game: Partial<GameItem> = {
        nota: 7.0, // Different saved note
        rubric: sampleRubric,
      };

      const res = getGameEffectiveScore(game);
      expect(res.hasRubric).toBe(true);
      expect(res.nota).toBe(10);
    });

    it('uses saved note when no rubric exists', () => {
      const game: Partial<GameItem> = {
        nota: 8.5,
      };

      const res = getGameEffectiveScore(game);
      expect(res.hasRubric).toBe(false);
      expect(res.nota).toBe(8.5);
    });

    it('returns undefined when neither rubric nor nota exist', () => {
      const game: Partial<GameItem> = {};
      const res = getGameEffectiveScore(game);
      expect(res.hasRubric).toBe(false);
      expect(res.nota).toBeUndefined();
    });
  });

  describe('date helpers', () => {
    it('converts DD/MM/YYYY to YYYY-MM-DD and back', () => {
      const br = '24/09/2024';
      const iso = formatDateBRToISO(br);
      expect(iso).toBe('2024-09-24');
      expect(formatISOToDateBR(iso)).toBe(br);
    });

    it('sorts sessions descending by date', () => {
      const sessions: GameplayDaySession[] = [
        { data: '05/01/2024', totalMinutos: 30, intervalos: [] },
        { data: '20/03/2024', totalMinutos: 60, intervalos: [] },
        { data: '12/02/2024', totalMinutos: 45, intervalos: [] },
      ];

      const sorted = sortSessionsDescending(sessions);
      expect(sorted[0].data).toBe('20/03/2024');
      expect(sorted[1].data).toBe('12/02/2024');
      expect(sorted[2].data).toBe('05/01/2024');
    });
  });
});

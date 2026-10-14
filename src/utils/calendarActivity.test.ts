import { describe, it, expect } from 'vitest';
import {
  parseSessionDateToLocal,
  buildPlayDaysMap,
  getAvailableSessionYears,
  getCalendarMonthGrid,
  computeMonthSummary,
  formatPlayTimeShort,
  formatPlayTimeFull,
  formatFullCalendarDate,
} from './calendarActivity';
import { GameItem } from '../types/game';

function createMockGame(id: string, title: string, sessoes: any[] = [], extra: Partial<GameItem> = {}): GameItem {
  return {
    id,
    title,
    fileName: `${title}.md`,
    console: 'SNES',
    genero: 'Ação',
    capa: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${id}.jpg`,
    status: 'jogando',
    sessoes,
    ...extra,
  };
}

describe('calendarActivity utils', () => {
  describe('parseSessionDateToLocal with 3 date formats and DD/MM without year', () => {
    it('correctly parses DD/MM/YYYY format', () => {
      const parsed = parseSessionDateToLocal('06/10/2026');
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(2026);
      expect(parsed?.month).toBe(9); // October is index 9
      expect(parsed?.day).toBe(6);
      expect(parsed?.key).toBe('2026-10-06');
    });

    it('correctly parses YYYY-MM-DD format', () => {
      const parsed = parseSessionDateToLocal('2026-10-06');
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(2026);
      expect(parsed?.month).toBe(9);
      expect(parsed?.day).toBe(6);
      expect(parsed?.key).toBe('2026-10-06');
    });

    it('correctly parses DD/MM without year using game context fallback', () => {
      const parsed = parseSessionDateToLocal('15/03', {
        data_inicio: '2025-01-10',
      });
      expect(parsed).not.toBeNull();
      expect(parsed?.year).toBe(2025);
      expect(parsed?.month).toBe(2); // March is index 2
      expect(parsed?.day).toBe(15);
      expect(parsed?.key).toBe('2025-03-15');
    });

    it('correctly parses DD/MM without game context using nearest past year', () => {
      const parsed = parseSessionDateToLocal('01/01');
      expect(parsed).not.toBeNull();
      expect(parsed?.month).toBe(0); // January
      expect(parsed?.day).toBe(1);
    });
  });

  describe('buildPlayDaysMap', () => {
    it('groups sessions of two games on the same day and sums total minutes', () => {
      const game1 = createMockGame('g1', 'Road Rash II', [
        {
          data: '01/10/2026',
          totalMinutos: 15,
          intervalos: [{ inicio: '18:00', fim: '18:15', minutos: 15 }],
        },
      ]);

      const game2 = createMockGame('g2', 'Max Payne 3', [
        {
          data: '01/10/2026',
          totalMinutos: 45,
          intervalos: [{ inicio: '20:00', fim: '20:45', minutos: 45 }],
        },
      ]);

      const map = buildPlayDaysMap([game1, game2]);
      const dayData = map.get('2026-10-01');

      expect(dayData).toBeDefined();
      expect(dayData?.totalMinutes).toBe(60); // 15 + 45
      expect(dayData?.items.length).toBe(2);
      // Top game should be game2 (45 min > 15 min)
      expect(dayData?.topGame.id).toBe('g2');
      expect(dayData?.otherGamesCount).toBe(1);
    });

    it('handles interval sum when totalMinutos is not provided', () => {
      const game = createMockGame('g3', 'The Flintstones', [
        {
          data: '06/10/2026',
          intervalos: [
            { inicio: '10:00', fim: '10:30', minutos: 30 },
            { inicio: '15:00', fim: '15:26', minutos: 26 },
          ],
        },
      ]);

      const map = buildPlayDaysMap([game]);
      const dayData = map.get('2026-10-06');

      expect(dayData).toBeDefined();
      expect(dayData?.totalMinutes).toBe(56);
      expect(dayData?.topGame.id).toBe('g3');
    });
  });

  describe('getCalendarMonthGrid', () => {
    it('correctly calculates total days for months with 28, 29, 30, and 31 days', () => {
      const map = new Map();
      // Feb 2025 (non-leap: 28 days)
      const feb2025 = getCalendarMonthGrid(2025, 1, map);
      expect(feb2025.totalDays).toBe(28);

      // Feb 2024 (leap: 29 days)
      const feb2024 = getCalendarMonthGrid(2024, 1, map);
      expect(feb2024.totalDays).toBe(29);

      // Apr 2026 (30 days)
      const apr2026 = getCalendarMonthGrid(2026, 3, map);
      expect(apr2026.totalDays).toBe(30);

      // Oct 2026 (31 days)
      const oct2026 = getCalendarMonthGrid(2026, 9, map);
      expect(oct2026.totalDays).toBe(31);
    });

    it('correctly aligns the first week for October 2026 (starts on Thursday, QUI = index 4)', () => {
      const map = new Map();
      const oct2026 = getCalendarMonthGrid(2026, 9, map);
      expect(oct2026.firstDayWeekday).toBe(4); // 0=DOM, 1=SEG, 2=TER, 3=QUA, 4=QUI
      expect(oct2026.paddingBefore).toBe(4);
      expect(oct2026.days.length).toBe(31);
      expect(oct2026.days[0].dayNumber).toBe(1);
      expect(oct2026.days[30].dayNumber).toBe(31);
    });

    it('handles year with no sessions gracefully', () => {
      const emptyMap = new Map();
      const grid = getCalendarMonthGrid(2023, 5, emptyMap);
      expect(grid.activeDaysCount).toBe(0);
      expect(grid.totalMonthMinutes).toBe(0);
      expect(grid.days.every((d) => !d.hasSession)).toBe(true);
    });
  });

  describe('formatting helpers', () => {
    it('formats short play times accurately for badges', () => {
      expect(formatPlayTimeShort(15)).toBe('15m');
      expect(formatPlayTimeShort(56)).toBe('56m');
      expect(formatPlayTimeShort(60)).toBe('1h');
      expect(formatPlayTimeShort(75)).toBe('1h 15m');
      expect(formatPlayTimeShort(120)).toBe('2h');
    });

    it('formats full play time for monthly header', () => {
      expect(formatPlayTimeFull(181)).toBe('3h 01m');
      expect(formatPlayTimeFull(56)).toBe('0h 56m');
      expect(formatPlayTimeFull(0)).toBe('0h 00m');
    });

    it('formats full calendar date string in Portuguese', () => {
      // 6 de outubro de 2026 is a Tuesday
      const formatted = formatFullCalendarDate(2026, 9, 6);
      expect(formatted).toBe('Terça-feira, 6 de outubro de 2026');
    });
  });

  describe('getAvailableSessionYears', () => {
    it('extracts unique years from game sessions and includes current year', () => {
      const game1 = createMockGame('g1', 'Game 1', [{ data: '10/05/2024' }]);
      const game2 = createMockGame('g2', 'Game 2', [{ data: '12/12/2025' }]);
      const years = getAvailableSessionYears([game1, game2]);

      expect(years).toContain(2024);
      expect(years).toContain(2025);
      expect(years).toContain(new Date().getFullYear());
      // Should be in descending order
      for (let i = 0; i < years.length - 1; i++) {
        expect(years[i]).toBeGreaterThanOrEqual(years[i + 1]);
      }
    });
  });

  describe('computeMonthSummary', () => {
    it('aggregates days, total time, average per day, top 3 games and recent sessions with multiple games on the same day and across 3 date formats', () => {
      const g1 = createMockGame('g1', 'Chrono Trigger', [
        { data: '02/10/2026', totalMinutos: 90 }, // DD/MM/YYYY
        { data: '2026-10-10', totalMinutos: 60 }, // YYYY-MM-DD
      ]);

      const g2 = createMockGame('g2', 'Super Mario World', [
        { data: '02/10/2026', totalMinutos: 30 }, // Same day as g1 (02/10)
        { data: '15/10', totalMinutos: 45 }, // DD/MM with context fallback
      ], { data_inicio: '2026-01-01' });

      const g3 = createMockGame('g3', 'Zelda ALTTP', [
        { data: '2026-10-20', totalMinutos: 120 },
      ]);

      const g4 = createMockGame('g4', 'Mega Man X', [
        { data: '2026-10-25', totalMinutos: 20 },
      ]);

      const map = buildPlayDaysMap([g1, g2, g3, g4]);
      const summary = computeMonthSummary(2026, 9, map); // October 2026

      expect(summary.hasActivity).toBe(true);
      expect(summary.activeDaysCount).toBe(5); // Oct 2, 10, 15, 20, 25
      // Total minutes: g1(150) + g2(75) + g3(120) + g4(20) = 365
      expect(summary.totalMonthMinutes).toBe(365);
      // Avg per active day: 365 / 5 = 73
      expect(summary.avgMinutesPerActiveDay).toBe(73);

      // Top 3 games:
      // g1: 150m, g3: 120m, g2: 75m
      expect(summary.topGames.length).toBe(3);
      expect(summary.topGames[0].game.title).toBe('Chrono Trigger');
      expect(summary.topGames[0].minutes).toBe(150);
      expect(summary.topGames[1].game.title).toBe('Zelda ALTTP');
      expect(summary.topGames[1].minutes).toBe(120);
      expect(summary.topGames[2].game.title).toBe('Super Mario World');
      expect(summary.topGames[2].minutes).toBe(75);
      expect(summary.otherGamesCount).toBe(1); // g4 is the 4th game

      // Recent sessions (up to 3 descending by day):
      // Oct 25 (20m, Mega Man X)
      // Oct 20 (120m, Zelda ALTTP)
      // Oct 15 (45m, Super Mario World)
      expect(summary.recentSessions.length).toBe(3);
      expect(summary.recentSessions[0].day).toBe(25);
      expect(summary.recentSessions[0].topGame.title).toBe('Mega Man X');
      expect(summary.recentSessions[1].day).toBe(20);
      expect(summary.recentSessions[1].topGame.title).toBe('Zelda ALTTP');
      expect(summary.recentSessions[2].day).toBe(15);
      expect(summary.recentSessions[2].topGame.title).toBe('Super Mario World');
    });

    it('handles empty month with zero sessions cleanly', () => {
      const emptyMap = new Map();
      const summary = computeMonthSummary(2026, 0, emptyMap); // January 2026

      expect(summary.hasActivity).toBe(false);
      expect(summary.activeDaysCount).toBe(0);
      expect(summary.totalMonthMinutes).toBe(0);
      expect(summary.avgMinutesPerActiveDay).toBe(0);
      expect(summary.topGames).toEqual([]);
      expect(summary.recentSessions).toEqual([]);
      expect(summary.otherGamesCount).toBe(0);
    });
  });
});

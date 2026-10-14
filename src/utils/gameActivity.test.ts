import { describe, it, expect } from 'vitest';
import { 
  parseFlexibleDate, 
  getSessionTimestamp, 
  getLastSessionTimestamp, 
  sortByLastSession 
} from './gameActivity';
import { GameItem, GameplayDaySession } from '../types/game';

function mockSession(data: string, fim?: string): GameplayDaySession {
  return {
    data,
    totalMinutos: fim ? 60 : 0,
    intervalos: fim ? [{ inicio: '10:00', fim, minutos: 60 }] : [],
  };
}

function mockGame(overrides: Partial<GameItem>): GameItem {
  return {
    id: 'g_' + Math.random().toString(36).substring(2, 7),
    title: 'Test Game',
    fileName: 'Test Game.md',
    status: 'jogando',
    console: 'PC',
    genero: 'Ação',
    capa: 'https://images.igdb.com/test.jpg',
    ...overrides,
  };
}

describe('gameActivity - Session Sorting and Date Parsing', () => {
  describe('parseFlexibleDate', () => {
    it('parses YYYY-MM-DD correctly', () => {
      const res = parseFlexibleDate('2026-04-15');
      expect(res).toEqual({ year: 2026, month: 3, day: 15 });
    });

    it('parses DD/MM/YYYY correctly', () => {
      const res = parseFlexibleDate('28/09/2026');
      expect(res).toEqual({ year: 2026, month: 8, day: 28 });
    });

    it('parses DD/MM assuming the nearest year without future dates', () => {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Past date within this year (or current month)
      const res = parseFlexibleDate('15/01');
      expect(res?.month).toBe(0);
      expect(res?.day).toBe(15);
      // The year should never place the date in the future
      const parsedTs = new Date(res!.year, res!.month, res!.day, 23, 59, 59).getTime();
      expect(parsedTs).toBeLessThanOrEqual(now.getTime() + 86400000);
    });

    it('returns null for empty or invalid dates', () => {
      expect(parseFlexibleDate('')).toBeNull();
      expect(parseFlexibleDate(undefined)).toBeNull();
      expect(parseFlexibleDate(null)).toBeNull();
    });
  });

  describe('getSessionTimestamp', () => {
    it('uses end time of last interval when present', () => {
      const session: GameplayDaySession = {
        data: '2026-05-10',
        totalMinutos: 165,
        intervalos: [
          { inicio: '10:00', fim: '11:00', minutos: 60 },
          { inicio: '18:00', fim: '19:45', minutos: 105 },
        ],
      };
      const ts = getSessionTimestamp(session);
      const expected = new Date(2026, 4, 10, 19, 45, 0, 0).getTime();
      expect(ts).toBe(expected);
    });

    it('uses end of day (23:59:59) when session has no intervals or clock times', () => {
      const session: GameplayDaySession = {
        data: '2026-05-10',
        totalMinutos: 0,
        intervalos: [],
      };
      const ts = getSessionTimestamp(session);
      const expected = new Date(2026, 4, 10, 23, 59, 59, 0).getTime();
      expect(ts).toBe(expected);
    });
  });

  describe('getLastSessionTimestamp', () => {
    it('finds the highest timestamp even if sessions are unordered in the array', () => {
      const game = mockGame({
        id: 'g1',
        title: 'Chronos',
        sessoes: [
          mockSession('2026-05-01', '13:00'),
          mockSession('2026-05-20', '13:00'), // Latest!
          mockSession('2026-05-10', '13:00'),
        ],
      });

      const ts = getLastSessionTimestamp(game);
      const expected = new Date(2026, 4, 20, 13, 0, 0, 0).getTime();
      expect(ts).toBe(expected);
    });

    it('returns 0 when game has no sessions', () => {
      const game = mockGame({
        id: 'g2',
        title: 'Empty',
        sessoes: [],
      });
      expect(getLastSessionTimestamp(game)).toBe(0);
    });
  });

  describe('sortByLastSession', () => {
    it('places games with sessions today ahead of games with sessions yesterday', () => {
      const gameYesterday = mockGame({
        id: 'g_yesterday',
        title: 'Yesterday Game',
        sessoes: [mockSession('2026-06-01', '15:00')],
      });

      const gameToday = mockGame({
        id: 'g_today',
        title: 'Today Game',
        sessoes: [mockSession('2026-06-02', '11:00')],
      });

      const sorted = sortByLastSession([gameYesterday, gameToday]);
      expect(sorted[0].id).toBe('g_today');
      expect(sorted[1].id).toBe('g_yesterday');
    });

    it('correctly compares different date formats (DD/MM/YYYY vs DD/MM vs YYYY-MM-DD)', () => {
      const gameSlashFull = mockGame({
        id: 'g_slash_full',
        title: 'Full Date Game',
        sessoes: [mockSession('10/05/2026', '11:00')],
      });

      const gameIso = mockGame({
        id: 'g_iso',
        title: 'ISO Date Game',
        sessoes: [mockSession('2026-05-15', '11:00')],
      });

      const gameSlashShort = mockGame({
        id: 'g_slash_short',
        title: 'Short Date Game',
        sessoes: [mockSession('20/05', '11:00')],
      });

      const sorted = sortByLastSession([gameSlashFull, gameSlashShort, gameIso]);
      expect(sorted[0].id).toBe('g_slash_short'); // 20/05
      expect(sorted[1].id).toBe('g_iso');         // 15/05 (2026-05-15)
      expect(sorted[2].id).toBe('g_slash_full');  // 10/05 (10/05/2026)
    });

    it('orders by interval end time when sessions are on the same day', () => {
      const afternoonGame = mockGame({
        id: 'g_afternoon',
        title: 'Afternoon Play',
        sessoes: [mockSession('2026-06-10', '16:00')],
      });

      const nightGame = mockGame({
        id: 'g_night',
        title: 'Night Play',
        sessoes: [mockSession('2026-06-10', '22:30')],
      });

      const sorted = sortByLastSession([afternoonGame, nightGame]);
      expect(sorted[0].id).toBe('g_night');
      expect(sorted[1].id).toBe('g_afternoon');
    });

    it('places games without sessions after games with sessions', () => {
      const withSession = mockGame({
        id: 'with_sess',
        title: 'Active Play',
        sessoes: [mockSession('2026-01-01')],
      });

      const noSession = mockGame({
        id: 'no_sess',
        title: 'New Game No Sessions',
        data_inicio: '2026-06-01',
      });

      const sorted = sortByLastSession([noSession, withSession]);
      expect(sorted[0].id).toBe('with_sess');
      expect(sorted[1].id).toBe('no_sess');
    });

    it('tie-breaks by data_inicio (most recent first) and then by title alphabetically', () => {
      const gameA = mockGame({
        id: 'g_a',
        title: 'Zelda',
        data_inicio: '2026-03-01',
      });

      const gameB = mockGame({
        id: 'g_b',
        title: 'Metroid',
        data_inicio: '2026-04-01', // newer data_inicio
      });

      const gameC = mockGame({
        id: 'g_c',
        title: 'Castlevania',
        data_inicio: '2026-03-01', // same date as Zelda, but 'Castlevania' < 'Zelda' alphabetically
      });

      const sorted = sortByLastSession([gameA, gameB, gameC]);
      expect(sorted[0].id).toBe('g_b'); // Metroid (2026-04-01)
      expect(sorted[1].id).toBe('g_c'); // Castlevania (2026-03-01, C comes before Z)
      expect(sorted[2].id).toBe('g_a'); // Zelda (2026-03-01)
    });
  });
});

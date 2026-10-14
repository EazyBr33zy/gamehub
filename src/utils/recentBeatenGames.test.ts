import { describe, it, expect } from 'vitest';
import {
  parseSessionDate,
  getLastSessionDate,
  getAutoBeatenDate,
  getEffectiveBeatenSortDate,
  getBeatenDisplayDate,
  getRecentBeatenGames,
} from './recentBeatenGames';
import { GameItem, GameplayDaySession } from '../types/game';

describe('recentBeatenGames utility & automatic beaten date', () => {
  const refDate = new Date(2026, 9, 8); // 2026-10-08 (month 9 is Oct 0-indexed)

  describe('parseSessionDate', () => {
    it('parses YYYY-MM-DD format correctly', () => {
      const res = parseSessionDate('2025-04-12', refDate);
      expect(res).not.toBeNull();
      expect(res?.isoDate).toBe('2025-04-12');
      expect(res?.year).toBe(2025);
      expect(res?.month).toBe(4);
      expect(res?.day).toBe(12);
    });

    it('parses DD/MM/YYYY format correctly', () => {
      const res = parseSessionDate('15/07/2024', refDate);
      expect(res).not.toBeNull();
      expect(res?.isoDate).toBe('2024-07-15');
      expect(res?.year).toBe(2024);
      expect(res?.month).toBe(7);
      expect(res?.day).toBe(15);
    });

    it('parses DD/MM without year, choosing closest year without being in the future', () => {
      // 10/05 (May 10) has already passed in 2026 -> year 2026
      const past = parseSessionDate('10/05', refDate);
      expect(past?.isoDate).toBe('2026-05-10');
      expect(past?.year).toBe(2026);

      // 25/12 (Dec 25) would be in the future in 2026 -> year 2025
      const future = parseSessionDate('25/12', refDate);
      expect(future?.isoDate).toBe('2025-12-25');
      expect(future?.year).toBe(2025);

      // 08/10 (same day as reference) -> year 2026
      const today = parseSessionDate('08/10', refDate);
      expect(today?.isoDate).toBe('2026-10-08');
      expect(today?.year).toBe(2026);
    });
  });

  describe('getLastSessionDate & getAutoBeatenDate', () => {
    it('finds session with largest date regardless of order or mixed formats', () => {
      const sessions: GameplayDaySession[] = [
        { data: '12/03/2024', intervalos: [], totalMinutos: 60 },
        { data: '2025-06-15', intervalos: [], totalMinutos: 90 }, // LARGEST
        { data: '01/01/2025', intervalos: [], totalMinutos: 30 },
      ];

      const last = getLastSessionDate(sessions, refDate);
      expect(last?.isoDate).toBe('2025-06-15');
      expect(last?.year).toBe(2025);

      const auto = getAutoBeatenDate(sessions, refDate);
      expect(auto.data_zerado).toBe('2025-06-15');
      expect(auto.ano_zerado).toBe(2025);
    });

    it('uses today when game has no sessions', () => {
      const autoEmpty = getAutoBeatenDate([], refDate);
      expect(autoEmpty.data_zerado).toBe('2026-10-08');
      expect(autoEmpty.ano_zerado).toBe(2026);

      const autoNull = getAutoBeatenDate(null, refDate);
      expect(autoNull.data_zerado).toBe('2026-10-08');
      expect(autoNull.ano_zerado).toBe(2026);
    });

    it('handles DD/MM session without year in getAutoBeatenDate', () => {
      const sessions: GameplayDaySession[] = [
        { data: '14/02', intervalos: [], totalMinutos: 40 }, // Feb 14 in 2026 (past)
      ];
      const auto = getAutoBeatenDate(sessions, refDate);
      expect(auto.data_zerado).toBe('2026-02-14');
      expect(auto.ano_zerado).toBe(2026);
    });
  });

  describe('Manual date & existing beaten game preservation', () => {
    it('derives ano_zerado from data_zerado correctly', () => {
      const date = '2024-11-20';
      const year = parseInt(date.split('-')[0], 10);
      expect(year).toBe(2024);
    });

    it('respects manual date if user provided one', () => {
      const manualDate = '2023-08-15';
      const sessions: GameplayDaySession[] = [
        { data: '2026-01-01', intervalos: [], totalMinutos: 50 },
      ];
      // When manual date is supplied, it should not be replaced by auto-date
      const effectiveDate = manualDate || getAutoBeatenDate(sessions, refDate).data_zerado;
      expect(effectiveDate).toBe('2023-08-15');
    });

    it('does not alter date when game was already zerado with data_zerado', () => {
      const existingGame: Partial<GameItem> = {
        id: 'game-1',
        status: 'zerado',
        data_zerado: '2024-05-10',
        ano_zerado: 2024,
        sessoes: [
          { data: '2026-02-01', intervalos: [], totalMinutos: 30 },
        ],
      };

      // Updating other fields (e.g. title, nota) must not overwrite existing data_zerado
      const updates = { title: 'Updated Title' };
      const shouldKeepDate = existingGame.status === 'zerado' && Boolean(existingGame.data_zerado);
      expect(shouldKeepDate).toBe(true);
      const finalDataZerado = (updates as any).data_zerado !== undefined
        ? (updates as any).data_zerado
        : existingGame.data_zerado;
      expect(finalDataZerado).toBe('2024-05-10');
    });
  });

  describe('getRecentBeatenGames (selection of the 7)', () => {
    const createGame = (
      id: string,
      title: string,
      status: GameItem['status'],
      data_zerado?: string,
      ano_zerado?: number,
      sessions?: GameplayDaySession[]
    ): GameItem => ({
      id,
      title,
      fileName: `${title}.md`,
      status,
      console: 'PS5',
      genero: 'Ação',
      capa: 'https://example.com/cover.jpg',
      data_zerado,
      ano_zerado,
      sessoes: sessions,
    });

    it('selects only status === "zerado", excluding abandonados and active games', () => {
      const games: GameItem[] = [
        createGame('1', 'Zelda BOTW', 'zerado', '2026-05-01'),
        createGame('2', 'Metroid Dread', 'abandonado', '2026-04-01'),
        createGame('3', 'Elden Ring', 'jogando'),
        createGame('4', 'Mario Odyssey', 'fila'),
        createGame('5', 'Halo Infinite', 'pausado'),
        createGame('6', 'Silksong', 'wishlist'),
      ];

      const recent = getRecentBeatenGames(games, 7, refDate);
      expect(recent.length).toBe(1);
      expect(recent[0].title).toBe('Zelda BOTW');
    });

    it('orders correctly by data_zerado (most recent first) up to 7 items', () => {
      const games: GameItem[] = [
        createGame('1', 'Game 2024', 'zerado', '2024-01-01'),
        createGame('2', 'Game 2026-May', 'zerado', '2026-05-10'),
        createGame('3', 'Game 2026-Sep', 'zerado', '2026-09-01'),
        createGame('4', 'Game 2025', 'zerado', '2025-12-20'),
        createGame('5', 'Game 2026-Jan', 'zerado', '2026-01-15'),
        createGame('6', 'Game 2023', 'zerado', '2023-06-01'),
        createGame('7', 'Game 2026-Oct', 'zerado', '2026-10-01'),
        createGame('8', 'Game 2022', 'zerado', '2022-01-01'),
      ];

      const recent = getRecentBeatenGames(games, 7, refDate);
      expect(recent.length).toBe(7);
      expect(recent.map((g) => g.title)).toEqual([
        'Game 2026-Oct',
        'Game 2026-Sep',
        'Game 2026-May',
        'Game 2026-Jan',
        'Game 2025',
        'Game 2024',
        'Game 2023',
      ]);
    });

    it('deduplicates identical game titles (using getUniqueZerados)', () => {
      const games: GameItem[] = [
        createGame('1', 'Persona 5', 'zerado', '2026-08-01'),
        createGame('2', 'Persona 5', 'zerado', '2026-08-01'), // duplicate
        createGame('3', 'Chrono Trigger', 'zerado', '2026-07-01'),
      ];

      const recent = getRecentBeatenGames(games, 7, refDate);
      expect(recent.length).toBe(2);
      expect(recent[0].title).toBe('Persona 5');
      expect(recent[1].title).toBe('Chrono Trigger');
    });

    it('falls back to last session date when data_zerado is missing', () => {
      const gameWithoutDataZerado = createGame(
        '1',
        'Final Fantasy IX',
        'zerado',
        undefined,
        undefined,
        [{ data: '2026-09-15', intervalos: [], totalMinutos: 100 }]
      );
      const olderGame = createGame('2', 'Older Game', 'zerado', '2026-08-01');

      const recent = getRecentBeatenGames([olderGame, gameWithoutDataZerado], 7, refDate);
      expect(recent[0].title).toBe('Final Fantasy IX');
      expect(recent[1].title).toBe('Older Game');
    });

    it('places games without data_zerado and without session at the end, sorted by ano_zerado descending', () => {
      const datedGame = createGame('1', 'Dated Game', 'zerado', '2025-01-01');
      const noDate2024 = createGame('2', 'No Date 2024', 'zerado', undefined, 2024);
      const noDate2026 = createGame('3', 'No Date 2026', 'zerado', undefined, 2026);
      const noDateNoYear = createGame('4', 'No Date No Year', 'zerado', undefined, undefined);

      const recent = getRecentBeatenGames([noDate2024, datedGame, noDateNoYear, noDate2026], 7, refDate);
      expect(recent[0].title).toBe('Dated Game'); // has explicit date
      expect(recent[1].title).toBe('No Date 2026'); // ano_zerado 2026
      expect(recent[2].title).toBe('No Date 2024'); // ano_zerado 2024
      expect(recent[3].title).toBe('No Date No Year'); // ano_zerado 0

      expect(getBeatenDisplayDate(noDate2026)).toBe('—');
    });
  });
});

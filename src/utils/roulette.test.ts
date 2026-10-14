import { describe, it, expect } from 'vitest';
import {
  getUpcomingGames,
  isRouletteEligible,
  getRouletteEligibleGames,
  pickRandomRouletteGame,
} from './roulette';
import { GameItem } from '../types/game';

function createMockGame(id: string, title: string, extra: Partial<GameItem> = {}): GameItem {
  return {
    id,
    title,
    fileName: `${title}.md`,
    console: 'SNES',
    genero: 'Ação',
    capa: `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${id}.jpg`,
    status: 'fila',
    ...extra,
  };
}

describe('Upcoming Games & Roulette utilities', () => {
  describe('getUpcomingGames', () => {
    it('only selects games with prioridade=true and status in fila, wishlist, or pausado', () => {
      const gFila = createMockGame('1', 'Fila Game', { status: 'fila', prioridade: true, prioridadeEm: 100 });
      const gWish = createMockGame('2', 'Wish Game', { status: 'wishlist', prioridade: true, prioridadeEm: 200 });
      const gPausado = createMockGame('3', 'Pausado Game', { status: 'pausado', prioridade: true, prioridadeEm: 300 });
      const gNoPrioridade = createMockGame('4', 'No Priority', { status: 'fila', prioridade: false });
      const gJogando = createMockGame('5', 'Playing Game', { status: 'jogando', prioridade: true });
      const gZerado = createMockGame('6', 'Beaten Game', { status: 'zerado', prioridade: true });
      const gAbandonado = createMockGame('7', 'Abandoned Game', { status: 'abandonado', prioridade: true });

      const upcoming = getUpcomingGames([
        gFila,
        gWish,
        gPausado,
        gNoPrioridade,
        gJogando,
        gZerado,
        gAbandonado,
      ]);

      expect(upcoming.map((g) => g.id)).toEqual(['1', '2', '3']);
    });

    it('orders games by prioridadeEm ascending, placing games without prioridadeEm last', () => {
      const g1 = createMockGame('1', 'Marked Third', { prioridade: true, prioridadeEm: 3000 });
      const g2 = createMockGame('2', 'Marked First', { prioridade: true, prioridadeEm: 1000 });
      const g3 = createMockGame('3', 'Marked Second', { prioridade: true, prioridadeEm: 2000 });
      const g4 = createMockGame('4', 'No Timestamp', { prioridade: true });

      const upcoming = getUpcomingGames([g1, g2, g3, g4]);
      expect(upcoming.map((g) => g.id)).toEqual(['2', '3', '1', '4']);
    });

    it('automatically excludes a game once its status changes to zerado, jogando, or abandonado', () => {
      const g = createMockGame('1', 'Game', { status: 'fila', prioridade: true, prioridadeEm: 1000 });
      expect(getUpcomingGames([g]).length).toBe(1);

      // Now changed to zerado
      expect(getUpcomingGames([{ ...g, status: 'zerado' }]).length).toBe(0);

      // Now changed to jogando
      expect(getUpcomingGames([{ ...g, status: 'jogando' }]).length).toBe(0);

      // Now changed to abandonado
      expect(getUpcomingGames([{ ...g, status: 'abandonado' }]).length).toBe(0);
    });
  });

  describe('isRouletteEligible and getRouletteEligibleGames', () => {
    it('accepts clean fila games with no sessions and no playtime', () => {
      const g = createMockGame('1', 'Untouched Backlog Game', { status: 'fila' });
      expect(isRouletteEligible(g)).toBe(true);
    });

    it('rejects games with sessions or playtime', () => {
      const gWithSessions = createMockGame('1', 'Game With Sessions', {
        status: 'fila',
        sessoes: [{ data: '01/01/2026', totalMinutos: 30, intervalos: [] }],
      });
      expect(isRouletteEligible(gWithSessions)).toBe(false);

      const gWithMinutes = createMockGame('2', 'Game With Minutes', {
        status: 'fila',
        tempoMinutos: 15,
      });
      expect(isRouletteEligible(gWithMinutes)).toBe(false);

      const gWithTempoString = createMockGame('3', 'Game With String Time', {
        status: 'fila',
        tempo: '1h 30m',
      });
      expect(isRouletteEligible(gWithTempoString)).toBe(false);
    });

    it('rejects non-fila statuses (jogando, pausado, wishlist, zerado, abandonado)', () => {
      expect(isRouletteEligible(createMockGame('1', 'J', { status: 'jogando' }))).toBe(false);
      expect(isRouletteEligible(createMockGame('2', 'P', { status: 'pausado' }))).toBe(false);
      expect(isRouletteEligible(createMockGame('3', 'W', { status: 'wishlist' }))).toBe(false);
      expect(isRouletteEligible(createMockGame('4', 'Z', { status: 'zerado' }))).toBe(false);
      expect(isRouletteEligible(createMockGame('5', 'A', { status: 'abandonado' }))).toBe(false);
    });
  });

  describe('pickRandomRouletteGame', () => {
    it('picks an item from eligible list and avoids repeating lastSelectedId when pool > 1', () => {
      const games = [
        createMockGame('1', 'Game 1'),
        createMockGame('2', 'Game 2'),
        createMockGame('3', 'Game 3'),
      ];

      for (let i = 0; i < 20; i++) {
        const picked = pickRandomRouletteGame(games, '1');
        expect(picked).not.toBeNull();
        expect(picked?.id).not.toBe('1');
        expect(['2', '3']).toContain(picked?.id);
      }
    });

    it('handles single item pool gracefully', () => {
      const singleGame = [createMockGame('1', 'Only One')];
      const picked = pickRandomRouletteGame(singleGame, '1');
      expect(picked?.id).toBe('1');
    });

    it('returns null for empty pool', () => {
      expect(pickRandomRouletteGame([])).toBeNull();
    });
  });
});

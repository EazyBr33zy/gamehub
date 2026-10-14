import { GameItem } from '../types/game';
import { parseToMinutes } from './markdownParser';

/**
 * Returns games marked with prioridade === true whose status is 'fila', 'wishlist', or 'pausado'.
 * Sorted by prioridadeEm ascending (earliest first; missing timestamps last).
 */
export function getUpcomingGames(games: GameItem[]): GameItem[] {
  const allowedStatuses = new Set(['fila', 'wishlist', 'pausado']);

  return games
    .filter((g) => g.prioridade === true && allowedStatuses.has(g.status))
    .sort((a, b) => {
      const timeA = typeof a.prioridadeEm === 'number' ? a.prioridadeEm : Infinity;
      const timeB = typeof b.prioridadeEm === 'number' ? b.prioridadeEm : Infinity;
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.title.localeCompare(b.title);
    });
}

/**
 * Checks if a game is eligible for Backlog Roulette:
 * Status must be 'fila' AND have 0 sessions AND 0 playtime.
 */
export function isRouletteEligible(game: GameItem): boolean {
  if (game.status !== 'fila') return false;

  // No sessions registered
  if (Array.isArray(game.sessoes) && game.sessoes.length > 0) {
    return false;
  }

  // No played time
  const mins = typeof game.tempoMinutos === 'number' ? game.tempoMinutos : parseToMinutes(game.tempo);
  if (mins > 0) {
    return false;
  }

  return true;
}

/**
 * Returns all roulette eligible games.
 */
export function getRouletteEligibleGames(games: GameItem[]): GameItem[] {
  return games.filter(isRouletteEligible);
}

/**
 * Picks a random game fairly using Math.random / crypto, avoiding repeating the last selected game if pool > 1.
 */
export function pickRandomRouletteGame(eligible: GameItem[], lastSelectedId?: string): GameItem | null {
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0];

  const pool = lastSelectedId ? eligible.filter((g) => g.id !== lastSelectedId) : eligible;
  const candidates = pool.length > 0 ? pool : eligible;

  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}

import { GameItem } from '../types/game';
import { normalizeTitleKey } from './markdownParser';

/** Nota máxima especial do site (11 = favorito). */
export const NOTA_MAX = 11;
/** Nota que identifica um jogo favorito. */
export const FAVORITE_NOTA = 11;
/** Máximo de favoritos permitidos. */
export const MAX_FAVORITES = 5;

export function isFavoriteNota(nota: number | undefined | null): boolean {
  return typeof nota === 'number' && !isNaN(nota) && nota >= FAVORITE_NOTA;
}

/** Retorna o jogo marcado como favorito (nota 11), ou undefined. */
export function getFavoriteGame(games: GameItem[], gameId: string): GameItem | undefined {
  return games.find((g) => g.id === gameId && isFavoriteNota(g.nota));
}

/** Todos os jogos favoritos (nota 11). */
export function getFavoriteGames(games: GameItem[]): GameItem[] {
  return games.filter((g) => isFavoriteNota(g.nota));
}

/**
 * Ordem de exibição dos favoritos no hero:
 * - por `favoritoEm` crescente (o primeiro escolhido aparece primeiro);
 * - sem `favoritoEm`, vêm depois, ordenados por título.
 */
export function sortFavorites(games: GameItem[]): GameItem[] {
  return [...games].sort((a, b) => {
    const aTs = typeof a.favoritoEm === 'number' ? a.favoritoEm : null;
    const bTs = typeof b.favoritoEm === 'number' ? b.favoritoEm : null;

    if (aTs !== null && bTs !== null) return aTs - bTs;
    if (aTs !== null) return -1;
    if (bTs !== null) return 1;
    return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
  });
}

/**
 * Marca `gameId` como favorito (nota 11). Se já existirem MAX_FAVORITES favoritos,
 * `substituteId` é obrigatório: o substituído volta à sua nota anterior
 * (ou perde a nota, se não havia) e o novo vira 11.
 */
export function buildFavoriteUpdates(
  games: GameItem[],
  gameId: string,
  substituteId?: string | null,
  now: number = Date.now()
): Array<{ id: string; updates: Partial<GameItem> }> {
  const target = games.find((g) => g.id === gameId);
  if (!target || isFavoriteNota(target.nota)) return [];

  const favorites = getFavoriteGames(games);
  const needsSubstitution = favorites.length >= MAX_FAVORITES;

  if (needsSubstitution && !substituteId) {
    // Limite atingido sem escolha de substituto: nada é alterado.
    return [];
  }

  const ops: Array<{ id: string; updates: Partial<GameItem> }> = [
    {
      id: gameId,
      updates: {
        nota: FAVORITE_NOTA,
        notaAnterior: target.nota ?? null,
        favoritoEm: now,
      },
    },
  ];

  if (needsSubstitution && substituteId) {
    const sub = games.find((g) => g.id === substituteId);
    if (sub && isFavoriteNota(sub.nota)) {
      const restoreNota =
        typeof sub.notaAnterior === 'number' && !isNaN(sub.notaAnterior)
          ? sub.notaAnterior
          : null; // null => remove o campo nota (jogo voltará a "não avaliado")
      ops.push({
        id: sub.id,
        updates: {
          nota: restoreNota as unknown as number | undefined,
          notaAnterior: undefined,
          favoritoEm: undefined,
        },
      });
    }
  }

  return ops;
}

/**
 * Desmarca o favorito: restaura a nota anterior (se houver) e apaga
 * notaAnterior/favoritoEm (null => deleteField no contexto do Firestore).
 */
export function buildUnfavoriteUpdates(game: GameItem): { id: string; updates: Partial<GameItem> } {
  const restoreNota =
    typeof game.notaAnterior === 'number' && !isNaN(game.notaAnterior)
      ? game.notaAnterior
      : null;
  return {
    id: game.id,
    updates: {
      nota: restoreNota as unknown as number | undefined,
      notaAnterior: undefined,
      favoritoEm: undefined,
    },
  };
}

/** Lista de jogos para o seletor de favoritos: zerados primeiro, depois por nota decrescente e título. */
export function favoritePickerSort(games: GameItem[]): GameItem[] {
  return [...games].sort((a, b) => {
    const aZerado = a.status === 'zerado' ? 0 : 1;
    const bZerado = b.status === 'zerado' ? 0 : 1;
    if (aZerado !== bZerado) return aZerado - bZerado;

    const aNota = typeof a.nota === 'number' && !isNaN(a.nota) ? a.nota : -1;
    const bNota = typeof b.nota === 'number' && !isNaN(b.nota) ? b.nota : -1;
    if (aNota !== bNota) return bNota - aNota;

    return a.title.localeCompare(b.title, 'pt-BR', { sensitivity: 'base' });
  });
}

/** Busca simples por título (case/acento-insensitive) para o seletor. */
export function filterGamesByTitle(games: GameItem[], query: string): GameItem[] {
  const q = normalizeTitleKey(query || '');
  if (!q) return games;
  return games.filter((g) => normalizeTitleKey(g.title).includes(q));
}

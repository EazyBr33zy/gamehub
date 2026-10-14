import React, { useMemo, useState } from 'react';
import { Star, Plus, Search, X } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { useIsOwner } from '../hooks/useIsOwner';
import { GameCover } from './GameCover';
import { Modal } from './Modal';
import {
  MAX_FAVORITES,
  getFavoriteGames,
  sortFavorites,
  buildFavoriteUpdates,
  favoritePickerSort,
  filterGamesByTitle,
} from '../utils/favorites';

/**
 * Fileira "JOGOS FAVORITOS" do hero do Painel.
 * - Jogos com nota === FAVORITE_NOTA (11), máx. 5, ordenados por favoritoEm.
 * - Slots vazios: caixas tracejadas; para o dono, "+" abre o seletor de favoritos.
 */
export const FavoriteGamesRow: React.FC = () => {
  const { games, updateGame } = useGame();
  const isOwner = useIsOwner();

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  // Pedido pendente quando o limite de 5 já foi atingido: aguarda escolha de substituto.
  const [pendingAdd, setPendingAdd] = useState<{ id: string } | null>(null);

  const favorites = useMemo(
    () => sortFavorites(getFavoriteGames(games)).slice(0, MAX_FAVORITES),
    [games]
  );

  const pickerList = useMemo(() => {
    const nonFavs = games.filter((g) => !favorites.some((f) => f.id === g.id));
    return favoritePickerSort(filterGamesByTitle(nonFavs, search)).slice(0, 60);
  }, [games, favorites, search]);

  const applyFavorite = (gameId: string, substituteId?: string | null) => {
    const ops = buildFavoriteUpdates(games, gameId, substituteId);
    ops.forEach((op) => updateGame(op.id, op.updates));
  };

  const handlePick = (gameId: string) => {
    if (favorites.length >= MAX_FAVORITES) {
      // Limite atingido: perguntar qual dos 5 substituir.
      setPendingAdd({ id: gameId });
    } else {
      applyFavorite(gameId, null);
      setIsPickerOpen(false);
      setSearch('');
    }
  };

  const confirmSubstitute = (substituteId: string) => {
    if (!pendingAdd) return;
    applyFavorite(pendingAdd.id, substituteId);
    setPendingAdd(null);
    setIsPickerOpen(false);
    setSearch('');
  };

  const pendingGame = pendingAdd ? games.find((g) => g.id === pendingAdd.id) : null;

  return (
    <div className="mt-auto">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#c9d1d9]">
          <Star className="h-3.5 w-3.5 fill-[#fbbf24] text-[#fbbf24]" aria-hidden="true" />
          <span>Jogos Favoritos</span>
        </p>
        <span className="font-mono text-xs tabular-nums text-[#9aa4b2]">
          {favorites.length}/{MAX_FAVORITES} escolhidos
        </span>
      </div>

      {favorites.length === 0 ? (
        <div className="mt-3 flex min-h-[72px] items-center justify-center rounded-xl border border-dashed border-[#30363d] px-4 py-4 text-center">
          <p className="text-sm text-[#9aa4b2]">Dê nota 11 aos seus 5 jogos favoritos</p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:gap-3">
          {Array.from({ length: MAX_FAVORITES }).map((_, i) => {
            const g = favorites[i];
            if (!g) {
              // Slot vazio
              return (
                <div key={`empty-${i}`} className="min-w-0">
                  {isOwner ? (
                    <button
                      type="button"
                      onClick={() => setIsPickerOpen(true)}
                      className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-[#30363d] bg-transparent text-[#9aa4b2] transition-colors hover:border-[#fbbf24]/60 hover:text-[#fbbf24] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus:outline-none min-h-[44px]"
                      aria-label="Escolher jogo favorito"
                      title="Escolher jogo favorito"
                    >
                      <Plus className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : (
                    <div
                      className="aspect-[3/4] w-full rounded-lg border border-dashed border-[#30363d]"
                      aria-hidden="true"
                    />
                  )}
                </div>
              );
            }
            return (
              <a
                key={g.id}
                href={`#/jogo/${g.id}`}
                className="group relative block min-w-0 rounded-lg focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus:outline-none"
                aria-label={`${g.title} — favorito`}
                title={g.title}
              >
                <GameCover
                  src={g.capa}
                  title={g.title}
                  consoleName={g.console}
                  size="lg"
                  className="!rounded-lg border border-[#30363d] shadow-md shadow-black/30 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:border-[#fbbf24]/50"
                />
                {/* Selo dourado ★ 11 */}
                <span className="absolute right-1 top-1 z-10 flex items-center gap-0.5 rounded-md border border-[#fbbf24]/50 bg-[#0d1117]/90 px-1 py-0.5 font-mono text-[11px] font-black leading-none text-[#fbbf24] shadow">
                  <Star className="h-2.5 w-2.5 fill-[#fbbf24]" aria-hidden="true" />
                  <span>11</span>
                </span>
                {/* Nome (só ≥768px), máx. 2 linhas */}
                <p
                  className="mt-1.5 hidden text-xs leading-tight text-[#c9d1d9] line-clamp-2 md:block"
                  title={g.title}
                >
                  {g.title}
                </p>
              </a>
            );
          })}
        </div>
      )}

      {/* ── SELETOR DE FAVORITOS (somente dono) ── */}
      {isOwner && (
        <Modal
          isOpen={isPickerOpen}
          onClose={() => {
            setIsPickerOpen(false);
            setPendingAdd(null);
            setSearch('');
          }}
          title={pendingAdd ? 'Seus 5 favoritos já estão escolhidos' : 'Escolher jogo favorito'}
          description={
            pendingAdd
              ? `Qual você quer substituir para "${pendingGame?.title ?? ''}" entrar na lista?`
              : 'Busque um jogo para dar nota 11 e colocá-lo nos seus favoritos.'
          }
          icon={<Star className="h-5 w-5 text-[#fbbf24]" aria-hidden="true" />}
          maxWidth="max-w-2xl"
        >
          {pendingAdd ? (
            /* Escolha do substituto */
            <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
              {favorites.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => confirmSubstitute(f.id)}
                    className="flex w-full items-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] p-2 text-left transition-colors hover:border-[#fbbf24]/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus:outline-none min-h-[44px]"
                  >
                    <div className="w-10 shrink-0">
                      <GameCover src={f.capa} title={f.title} consoleName={f.console} size="thumb" />
                    </div>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#f0f6fc]" title={f.title}>
                      {f.title}
                    </span>
                    <span className="shrink-0 text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
                      Substituir
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <>
              {/* Busca */}
              <label className="relative mb-3 block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa4b2]" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título…"
                  className="h-11 w-full rounded-xl border border-[#30363d] bg-[#0d1117] pl-9 pr-9 text-sm text-[#f0f6fc] placeholder:text-[#9aa4b2]/60 focus:border-[#fbbf24]/60 focus:outline-none"
                  aria-label="Buscar jogo por título"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#9aa4b2] hover:bg-white/5 cursor-pointer"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </label>

              {/* Lista de jogos */}
              <ul className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {pickerList.length === 0 && (
                  <li className="py-6 text-center text-sm text-[#9aa4b2]">Nenhum jogo encontrado.</li>
                )}
                {pickerList.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(g.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#30363d] bg-[#161b22] p-2 text-left transition-colors hover:border-[#fbbf24]/60 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#fbbf24] focus:outline-none min-h-[44px]"
                    >
                      <div className="w-10 shrink-0">
                        <GameCover src={g.capa} title={g.title} consoleName={g.console} size="thumb" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#f0f6fc]" title={g.title}>
                          {g.title}
                        </p>
                        <p className="truncate text-xs text-[#9aa4b2]">{g.console}</p>
                      </div>
                      {typeof g.nota === 'number' && !isNaN(g.nota) && (
                        <span className="shrink-0 font-mono text-xs tabular-nums text-[#9aa4b2]">
                          nota {g.nota}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

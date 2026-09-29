import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  LayoutGrid,
  List,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Star,
  Clock,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Game, GameStatus } from '../types';
import { GameCover } from './GameCover';
import { ConsoleIcon } from './ConsoleIcon';
import { formatMinutes, formatDateBR } from '../utils/storage';

interface BacklogViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onQuickPlay: (game: Game) => void;
  onQuickFinish: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
  onOpenAddModal: () => void;
}

export const BacklogView: React.FC<BacklogViewProps> = ({
  games,
  onSelectGame,
  onQuickPlay,
  onQuickFinish,
  onDeleteGame,
  onOpenAddModal,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [consoleFilter, setConsoleFilter] = useState<string>('todos');
  const [genreFilter, setGenreFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [groupBy, setGroupBy] = useState<'none' | 'console' | 'genero'>('console');
  // Grupos abertos/fechados pelo usuário. Sem escolha, só o grupo com mais jogos fica aberto.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Lista única de consoles e gêneros para os filtros
  const uniqueConsoles = useMemo(() => {
    return Array.from(new Set(games.map((g) => g.console).filter(Boolean))).sort();
  }, [games]);

  const uniqueGenres = useMemo(() => {
    return Array.from(new Set(games.map((g) => g.genero).filter(Boolean))).sort();
  }, [games]);

  // Filtragem dos jogos
  const filteredGames = useMemo(() => {
    const q = search.trim().toLowerCase();
    return games.filter((g) => {
      // A biblioteca mostra apenas jogos que quero jogar e zerados
      if (g.status !== 'backlog' && g.status !== 'zerado') return false;
      // Busca textual
      if (q) {
        const matchesName = g.nome.toLowerCase().includes(q);
        const matchesConsole = (g.console || '').toLowerCase().includes(q);
        const matchesGenre = (g.genero || '').toLowerCase().includes(q);
        const matchesYear = String(g.ano || '').includes(q);
        if (!matchesName && !matchesConsole && !matchesGenre && !matchesYear) {
          return false;
        }
      }
      // Filtro de status
      if (statusFilter !== 'todos' && g.status !== statusFilter) {
        return false;
      }
      // Filtro de console
      if (consoleFilter !== 'todos' && g.console !== consoleFilter) {
        return false;
      }
      // Filtro de gênero
      if (genreFilter !== 'todos' && g.genero !== genreFilter) {
        return false;
      }
      return true;
    });
  }, [games, search, statusFilter, consoleFilter, genreFilter]);

  // Agrupamento dos jogos
  const groupedGames = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Todos os Jogos': filteredGames };
    }
    const groups: Record<string, Game[]> = {};
    filteredGames.forEach((g) => {
      const key = (groupBy === 'console' ? g.console : g.genero) || 'Outros';
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    });
    return groups;
  }, [filteredGames, groupBy]);

  // Grupos ordenados: o que tem mais jogos vem primeiro (e é o único aberto por padrão)
  const groupEntries = useMemo(
    () => Object.entries(groupedGames).sort((a, b) => b[1].length - a[1].length),
    [groupedGames]
  );
  const biggestGroup = groupEntries[0]?.[0];

  const isGroupOpen = (key: string) => (openGroups[key] !== undefined ? openGroups[key] : key === biggestGroup);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !isGroupOpen(key) }));
  };

  const getStatusLabel = (status: GameStatus) => {
    switch (status) {
      case 'backlog':
        return 'Quero Jogar';
      case 'jogando':
        return 'Jogando';
      case 'pausado':
        return 'Pausado';
      case 'zerado':
        return 'Zerado';
      case 'abandonado':
        return 'Abandonado';
      default:
        return status;
    }
  };

  const getStatusColor = (status: GameStatus) => {
    switch (status) {
      case 'backlog':
        return 'text-slate-400';
      case 'jogando':
        return 'text-emerald-400';
      case 'pausado':
        return 'text-amber-400';
      case 'zerado':
        return 'text-cyan-400';
      case 'abandonado':
        return 'text-rose-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* HEADER & FILTERS */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Backlog & Biblioteca de Jogos
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {filteredGames.length} {filteredGames.length === 1 ? 'jogo encontrado' : 'jogos encontrados'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode buttons */}
            <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Grade com Capas"
                aria-label="Modo Grade"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-slate-800 text-cyan-400 shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="Modo Tabela Técnica"
                aria-label="Modo Tabela"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Novo Jogo</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar título, console, gênero ou ano..."
              className="w-full rounded-lg bg-slate-900/90 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="todos">Status: Quero jogar + Zerados</option>
              <option value="backlog">Quero Jogar</option>
              <option value="zerado">Zerados</option>
            </select>
          </div>

          {/* Console Filter */}
          <div>
            <select
              value={consoleFilter}
              onChange={(e) => setConsoleFilter(e.target.value)}
              className="w-full rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="todos">Console: Todos</option>
              {uniqueConsoles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Grouping Filter */}
          <div>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="w-full rounded-lg bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              <option value="console">Agrupar por Console</option>
              <option value="genero">Agrupar por Gênero</option>
              <option value="none">Sem Agrupamento</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CONTENT LIST / GROUPS */}
      {/* ========================================================================= */}
      {filteredGames.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <Layers className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="font-display text-base font-semibold text-white">Nenhum jogo encontrado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros ou o termo de busca digitado.'
              : 'Seu catálogo está vazio. Adicione seu primeiro jogo para começar a rastrear!'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Adicionar Novo Jogo</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupEntries.map(([groupTitle, list]) => {
            const isCollapsed = !isGroupOpen(groupTitle);
            const zeradosCount = list.filter((g) => g.status === 'zerado').length;
            const completionRate = Math.round((zeradosCount / list.length) * 100);

            return (
              <div
                key={groupTitle}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 sm:p-5 overflow-hidden"
              >
                {/* Group Summary Accordion Header */}
                <div
                  onClick={() => toggleGroup(groupTitle)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-800/60 cursor-pointer select-none group"
                >
                  <div className="flex items-center gap-2.5">
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    ) : (
                      <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                    )}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
                      {groupBy === 'console' ? (
                        <ConsoleIcon name={groupTitle} className="h-4 w-4" />
                      ) : (
                        <Layers className="h-4 w-4" />
                      )}
                    </span>
                    <h2 className="font-display text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {groupTitle}
                    </h2>
                    <span className="text-xs text-slate-400">
                      ({list.length} {list.length === 1 ? 'jogo' : 'jogos'})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{zeradosCount} zerados</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-cyan-400">{completionRate}%</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-1.5 w-20 rounded-full bg-slate-950 overflow-hidden hidden xs:block">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Group Content (Grid or Table) */}
                {!isCollapsed && (
                  <div className="pt-4">
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                        {list.map((game) => (
                          <div
                            key={game.id}
                            className="group flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/60 p-2.5 transition-all hover:border-slate-700 hover:bg-slate-900"
                          >
                            <div
                              onClick={() => onSelectGame(game)}
                              className="cursor-pointer"
                            >
                              <div className="relative">
                                <GameCover
                                  capa={game.capa}
                                  nome={game.nome}
                                  genero={game.genero}
                                  consoleName={game.console}
                                  aspect="portrait"
                                />

                                {/* Finished overlay ribbon */}
                                {game.status === 'zerado' && (
                                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1 rounded bg-slate-950/90 border border-cyan-500/40 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 backdrop-blur-sm">
                                    <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                                    <span>Zerado</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2.5">
                                <h3 className="text-xs font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                                  {game.nome}
                                </h3>

                                {/* Unboxed clean metadata (anti-slop) */}
                                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 truncate">
                                  <span>{game.genero}</span>
                                  {game.ano && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{game.ano}</span>
                                    </>
                                  )}
                                </div>

                                <div className="mt-1 flex items-center justify-between text-[11px]">
                                  <span className={`font-medium ${getStatusColor(game.status)}`}>
                                    {getStatusLabel(game.status)}
                                  </span>
                                  <span className="text-slate-400 tabular-nums">
                                    {formatMinutes(game.tempo)}
                                  </span>
                                </div>

                                {game.nota !== null && typeof game.nota === 'number' && (
                                  <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-300 font-medium">
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                    <span>{game.nota.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Card action footer */}
                            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/60">
                              {game.status === 'backlog' ? (
                                <button
                                  onClick={() => onQuickPlay(game)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/40 rounded transition-colors"
                                >
                                  <Play className="h-3 w-3" />
                                  <span>Jogar</span>
                                </button>
                              ) : game.status === 'jogando' ? (
                                <button
                                  onClick={() => onQuickFinish(game)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 rounded transition-colors"
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Zerei</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-500">
                                  {formatDateBR(game.fim || game.inicio)}
                                </span>
                              )}

                              <button
                                onClick={() => onDeleteGame(game.id)}
                                className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                                title={`Excluir ${game.nome}`}
                                aria-label={`Excluir ${game.nome}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Technical Table Mode with Tabular Numerals */
                      <div className="overflow-x-auto rounded-lg border border-slate-800">
                        <table className="w-full text-left text-xs text-slate-300">
                          <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Jogo</th>
                              <th className="py-2.5 px-3">Console</th>
                              <th className="py-2.5 px-3">Gênero</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Tempo</th>
                              <th className="py-2.5 px-3">Nota</th>
                              <th className="py-2.5 px-3">Conclusão</th>
                              <th className="py-2.5 px-3 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {list.map((game) => (
                              <tr
                                key={game.id}
                                className="hover:bg-slate-800/40 transition-colors"
                              >
                                <td
                                  onClick={() => onSelectGame(game)}
                                  className="py-2.5 px-3 font-medium text-white cursor-pointer hover:text-cyan-400"
                                >
                                  {game.nome}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">{game.console}</td>
                                <td className="py-2.5 px-3 text-slate-400">{game.genero}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`font-medium ${getStatusColor(game.status)}`}>
                                    {getStatusLabel(game.status)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 tabular-nums font-mono">
                                  {formatMinutes(game.tempo)}
                                </td>
                                <td className="py-2.5 px-3 tabular-nums">
                                  {typeof game.nota === 'number' ? `${game.nota.toFixed(1)}/10` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400">
                                  {formatDateBR(game.fim)}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {game.status === 'backlog' && (
                                      <button
                                        onClick={() => onQuickPlay(game)}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 rounded"
                                      >
                                        Jogar
                                      </button>
                                    )}
                                    {game.status === 'jogando' && (
                                      <button
                                        onClick={() => onQuickFinish(game)}
                                        className="px-2 py-0.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 rounded"
                                      >
                                        Zerei
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onDeleteGame(game.id)}
                                      className="p-1 text-slate-500 hover:text-rose-400"
                                      title="Excluir"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { 
  Layers, 
  Search, 
  FileUp, 
  FileDown, 
  FileJson, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  ChevronDown,
  AlertTriangle,
  CopyCheck,
  Gamepad2,
  X,
  Star,
  XCircle
} from 'lucide-react';
import { GameItem } from '../types/game';
import { getPlatformStyle, getScoreColor } from '../utils/platformStyles';
import { formatTempoDisplay, deduplicateGames, normalizeConsoleName, cleanTitle } from '../utils/markdownParser';
import { useIsOwner } from '../hooks/useIsOwner';
import { Modal } from './Modal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { GameCover } from './GameCover';

export const BacklogView: React.FC = () => {
  const { 
    games, 
    exportGameMarkdown,
    exportAllMarkdown,
    exportBackupJSON,
    deleteGame,
    clearAllGames,
    openEditModal,
    setIsNewGameModalOpen,
    setIsImportModalOpen,
    setIsDuplicatesModalOpen,
    isInitialLoading
  } = useGame();

  const { navigate, query, setQueryParams } = useHashRoute();
  const isOwner = useIsOwner();

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('TODAS');
  const [filterStatus, setFilterStatus] = useState('TODAS'); // 'TODAS' | 'quero_jogar' | 'zerado' | 'abandonado'
  const [filterGenre, setFilterGenre] = useState('TODOS');
  const [filterPrioridade, setFilterPrioridade] = useState(() => {
    return query.prioridade === '1' || query.prioridade === 'true';
  });
  const [expandedConsoles, setExpandedConsoles] = useState<Record<string, boolean>>({});

  // Sync with URL query params
  useEffect(() => {
    if (query.prioridade === '1' || query.prioridade === 'true') {
      setFilterPrioridade(true);
    } else if (query.prioridade === '0' || query.prioridade === 'false') {
      setFilterPrioridade(false);
    }
    if (query.status) {
      setFilterStatus(query.status);
    }
  }, [query.prioridade, query.status]);

  // Danger Zone States
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearConfirmWord, setClearConfirmWord] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<GameItem | null>(null);

  // Deduplicate games and consoles
  const { dedupedGames }: { dedupedGames: GameItem[] } = useMemo(() => {
    return deduplicateGames(games);
  }, [games]);

  // Extract platforms and genres dynamically
  const availablePlatforms: string[] = useMemo(() => {
    const map = new Map<string, string>();
    dedupedGames.forEach((g: GameItem) => {
      const norm = normalizeConsoleName(g.console);
      if (norm) {
        const key = norm.toLowerCase();
        if (!map.has(key)) {
          map.set(key, norm);
        }
      }
    });
    const list = Array.from(map.values()).sort((a, b) => a.localeCompare(b));
    return ['TODAS', ...list];
  }, [dedupedGames]);

  const availableGenres: string[] = useMemo(() => {
    const list = Array.from(new Set(dedupedGames.map((g: GameItem) => g.genero).filter(Boolean))).sort() as string[];
    return ['TODOS', ...list];
  }, [dedupedGames]);

  // Stats calculation
  const stats = useMemo(() => {
    const totalJogos = dedupedGames.length;
    const zeradosCount = dedupedGames.filter((g: GameItem) => g.status === 'zerado').length;
    const abandonadosCount = dedupedGames.filter((g: GameItem) => g.status === 'abandonado').length;
    const backlogCount = dedupedGames.filter((g: GameItem) => g.status !== 'zerado' && g.status !== 'abandonado').length;
    const prioridadeCount = dedupedGames.filter((g: GameItem) => Boolean(g.prioridade)).length;
    const uniqueConsoles = new Set(
      dedupedGames.map((g: GameItem) => normalizeConsoleName(g.console).toLowerCase()).filter(Boolean)
    ).size;
    const uniqueGenres = new Set(dedupedGames.map((g: GameItem) => g.genero).filter(Boolean)).size;

    return {
      totalJogos,
      zeradosCount,
      abandonadosCount,
      backlogCount,
      prioridadeCount,
      uniqueConsoles,
      uniqueGenres
    };
  }, [dedupedGames]);

  // Canonical consoles list
  const consoleNames: string[] = useMemo(() => {
    const map = new Map<string, string>();
    dedupedGames.forEach((g: GameItem) => {
      const norm = normalizeConsoleName(g.console);
      if (norm) {
        const key = norm.toLowerCase();
        if (!map.has(key)) {
          map.set(key, norm);
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [dedupedGames]);

  // Consoles data with games grouped
  const consolesData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return consoleNames.map((consoleName: string) => {
      const allInConsole = dedupedGames.filter((g: GameItem) => normalizeConsoleName(g.console).toLowerCase() === consoleName.toLowerCase());
      const totalGames = allInConsole.length;
      const zeradosCount = allInConsole.filter((g: GameItem) => g.status === 'zerado').length;
      const progressPercent = totalGames > 0 ? Math.round((zeradosCount / totalGames) * 100) : 0;
      const pStyle = getPlatformStyle(consoleName);

      // Filtered games inside console
      const filteredInConsole = allInConsole.filter((g: GameItem) => {
        // Search query
        if (q) {
          const matchTitle = g.title.toLowerCase().includes(q);
          const matchConsole = normalizeConsoleName(g.console).toLowerCase().includes(q);
          const matchGenre = (g.genero || '').toLowerCase().includes(q);
          if (!matchTitle && !matchConsole && !matchGenre) return false;
        }

        // Platform filter
        if (filterPlatform !== 'TODAS') {
          if (normalizeConsoleName(g.console).toLowerCase() !== filterPlatform.toLowerCase()) return false;
        }

        // Status filter
        if (filterStatus === 'quero_jogar' && (g.status === 'zerado' || g.status === 'abandonado')) return false;
        if (filterStatus === 'zerado' && g.status !== 'zerado') return false;
        if (filterStatus === 'abandonado' && g.status !== 'abandonado') return false;

        // Priority filter
        if (filterPrioridade && !g.prioridade) return false;

        // Genre filter
        if (filterGenre !== 'TODOS') {
          if ((g.genero || '').toLowerCase() !== filterGenre.toLowerCase()) return false;
        }

        return true;
      });

      return {
        consoleName,
        totalGames,
        zeradosCount,
        progressPercent,
        pStyle,
        games: filteredInConsole
      };
    });
  }, [dedupedGames, consoleNames, searchQuery, filterPlatform, filterStatus, filterGenre, filterPrioridade]);

  // Consoles that have games matching filters
  const visibleConsoles = useMemo(() => {
    return consolesData.filter(c => c.games.length > 0);
  }, [consolesData]);

  // Check if any filter or search is active
  const isFiltering = Boolean(
    searchQuery.trim() ||
    filterPlatform !== 'TODAS' ||
    filterStatus !== 'TODAS' ||
    filterGenre !== 'TODOS' ||
    filterPrioridade
  );

  // Return all consoles to closed state when filters are cleared
  const wasFilteringRef = useRef(false);
  useEffect(() => {
    if (wasFilteringRef.current && !isFiltering) {
      setExpandedConsoles({});
    }
    wasFilteringRef.current = isFiltering;
  }, [isFiltering]);

  const toggleConsole = (cName: string) => {
    setExpandedConsoles(prev => {
      const currentVal = prev[cName] !== undefined ? prev[cName] : (isFiltering ? true : false);
      return {
        ...prev,
        [cName]: !currentVal
      };
    });
  };

  const handleCardClick = (game: GameItem) => {
    navigate(`#/jogo/${encodeURIComponent(game.id)}`);
  };

  const handleDeleteGame = (e: React.MouseEvent, game: GameItem) => {
    e.stopPropagation();
    if (!isOwner) return;
    setGameToDelete(game);
  };

  const handleEditGame = (e: React.MouseEvent, game: GameItem) => {
    e.stopPropagation();
    if (!isOwner) return;
    openEditModal(game);
  };

  const handleConfirmClearAll = async () => {
    if (clearConfirmWord.trim().toUpperCase() !== 'APAGAR') return;
    setIsClearing(true);
    try {
      await clearAllGames();
      setShowClearConfirmModal(false);
      setClearConfirmWord('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 font-sans">
      {/* ── CONTAINER PRINCIPAL ── */}
      <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 md:p-7 shadow-xl space-y-5 sm:space-y-6">
        {/* ── 1. HEADER & AÇÕES ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d]/60 pb-4 sm:pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#22d3ee] shrink-0">
              <Layers className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-heading text-2xl sm:text-[26px] font-extrabold uppercase tracking-wide text-white">
                BACKLOG
              </h1>
              <p className="text-xs sm:text-sm text-[#9aa4b2]">
                {isInitialLoading ? (
                  <span className="inline-block h-4 w-28 animate-pulse rounded bg-white/10" />
                ) : (
                  `${dedupedGames.length} jogos catalogados no acervo`
                )}
              </p>
            </div>
          </div>

          {/* Botões de Ação do Dono (grid 2x2 no mobile, linha no desktop) */}
          {isOwner && (
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold whitespace-nowrap text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none sm:w-auto sm:px-4"
              >
                <FileUp className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Importar .md</span>
              </button>

              <button
                type="button"
                onClick={exportAllMarkdown}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs font-semibold whitespace-nowrap text-slate-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none sm:w-auto sm:px-4"
                title="Exportar todos os jogos como arquivos .md para seu Obsidian"
              >
                <FileDown className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>Exportar Vault</span>
              </button>

              {dedupedGames.length > 0 && (
                <button
                  type="button"
                  onClick={exportBackupJSON}
                  className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold whitespace-nowrap text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none sm:w-auto sm:px-4"
                  title="Baixar Backup Completo (.json)"
                >
                  <FileJson className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Backup (.json)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsNewGameModalOpen(true)}
                className="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#22d3ee] px-3 py-2 text-xs font-black uppercase whitespace-nowrap text-[#0d1117] shadow-lg shadow-[#22d3ee]/25 hover:bg-[#06b6d4] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none sm:w-auto sm:px-5"
              >
                <Plus className="h-4 w-4 stroke-[3] flex-shrink-0" aria-hidden="true" />
                <span>NOVO JOGO</span>
              </button>
            </div>
          )}
        </div>

        {/* ── 2. BARRA DE ESTATÍSTICAS ORIGINAL (GRID UNIFORME DE 5 STATS) ── */}
        <div className="grid grid-cols-6 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
          {/* TOTAL */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 px-2 sm:px-3 text-center shadow-md">
            <div className="font-heading text-xl sm:text-2xl font-extrabold text-[#f43f5e] font-mono leading-none">
              {isInitialLoading ? '—' : stats.totalJogos}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2] mt-1.5">
              TOTAL
            </div>
          </div>

          {/* QUERO JOGAR */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 px-2 sm:px-3 text-center shadow-md">
            <div className="font-heading text-xl sm:text-2xl font-extrabold text-[#38bdf8] font-mono leading-none">
              {isInitialLoading ? '—' : stats.backlogCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2] mt-1.5 truncate">
              QUERO JOGAR
            </div>
          </div>

          {/* ZERADOS */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 px-2 sm:px-3 text-center shadow-md">
            <div className="font-heading text-xl sm:text-2xl font-extrabold text-[#06b6d4] font-mono leading-none">
              {isInitialLoading ? '—' : stats.zeradosCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2] mt-1.5">
              ZERADOS
            </div>
          </div>

          {/* CONSOLES */}
          <div className="col-span-3 sm:col-span-1 rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 px-2 sm:px-3 text-center shadow-md">
            <div className="font-heading text-xl sm:text-2xl font-extrabold text-[#facc15] font-mono leading-none">
              {isInitialLoading ? '—' : stats.uniqueConsoles}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2] mt-1.5">
              CONSOLES
            </div>
          </div>

          {/* GÊNEROS */}
          <div className="col-span-3 sm:col-span-1 rounded-xl border border-[#30363d] bg-[#0d1117] py-2.5 px-2 sm:px-3 text-center shadow-md">
            <div className="font-heading text-xl sm:text-2xl font-extrabold text-[#c084fc] font-mono leading-none">
              {isInitialLoading ? '—' : stats.uniqueGenres}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2] mt-1.5">
              GÊNEROS
            </div>
          </div>
        </div>

        {/* ── 3. FILTROS & BUSCA (B1 Desktop: grid-template-columns: minmax(260px, 1fr) repeat(3, minmax(160px, 200px)); gap: 12px; align-items: center) ── */}
        <div className="backlog-filters-bar flex flex-col sm:flex-row lg:grid lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(160px,200px))] items-stretch sm:items-center gap-2 sm:gap-2.5 lg:gap-3 pt-1">
          {/* Campo de Busca (Linha 1 no Mobile / Coluna 1 no Desktop) */}
          <div className="relative w-full sm:flex-1 lg:w-full min-w-0">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa4b2] pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar jogo no acervo por título, plataforma..."
              aria-label="Buscar jogo no acervo"
              className="w-full h-11 rounded-xl border border-[#30363d] bg-[#0d1117] py-2 pl-10 pr-10 text-sm text-white placeholder-[#9aa4b2] focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa4b2] hover:text-white cursor-pointer p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-[#22d3ee]"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Selects de Plataforma & Status (Linha 2 no Mobile: lado a lado em 2 colunas iguais / Colunas 2 e 3 no Desktop via subgrid/contents) */}
          <div className="grid grid-cols-2 gap-2 w-full sm:contents lg:contents">
            <select
              value={filterPlatform}
              onChange={(e) => setFilterPlatform(e.target.value)}
              aria-label="Filtrar por plataforma"
              className="w-full h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todas Plataformas</option>
              {availablePlatforms.filter(p => p !== 'TODAS').map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => {
                const val = e.target.value;
                setFilterStatus(val);
                setQueryParams({ status: val !== 'TODAS' ? val : null });
              }}
              aria-label="Filtrar por status"
              className="w-full h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none cursor-pointer"
            >
              <option value="TODAS">Todos Status</option>
              <option value="quero_jogar">Quero Jogar</option>
              <option value="zerado">Zerados</option>
              <option value="abandonado">Abandonados</option>
            </select>
          </div>

          {/* Select de Gênero (Linha 3 no Mobile / Coluna 4 no Desktop) */}
          <select
            value={filterGenre}
            onChange={(e) => setFilterGenre(e.target.value)}
            aria-label="Filtrar por gênero"
            className="w-full h-11 rounded-xl border border-[#30363d] bg-[#0d1117] px-3 text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos Gêneros</option>
            {availableGenres.filter(g => g !== 'TODOS').map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* ── 3b. CHIPS DE FILTRO RÁPIDO (STATUS & PRIORIDADE) ── */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => {
              setFilterStatus('TODAS');
              setQueryParams({ status: null });
            }}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterStatus === 'TODAS'
                ? 'bg-[#22d3ee]/20 text-[#22d3ee] border-[#22d3ee]/50 shadow-sm'
                : 'bg-[#0d1117] text-[#9aa4b2] border-[#30363d] hover:text-white hover:bg-white/5'
            }`}
          >
            Todos ({stats.totalJogos})
          </button>

          <button
            type="button"
            onClick={() => {
              const next = filterStatus === 'quero_jogar' ? 'TODAS' : 'quero_jogar';
              setFilterStatus(next);
              setQueryParams({ status: next !== 'TODAS' ? next : null });
            }}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterStatus === 'quero_jogar'
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm'
                : 'bg-[#0d1117] text-[#9aa4b2] border-[#30363d] hover:text-white hover:bg-white/5'
            }`}
          >
            Quero Jogar ({stats.backlogCount})
          </button>

          <button
            type="button"
            onClick={() => {
              const next = filterStatus === 'zerado' ? 'TODAS' : 'zerado';
              setFilterStatus(next);
              setQueryParams({ status: next !== 'TODAS' ? next : null });
            }}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterStatus === 'zerado'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                : 'bg-[#0d1117] text-[#9aa4b2] border-[#30363d] hover:text-white hover:bg-white/5'
            }`}
          >
            Zerados ({stats.zeradosCount})
          </button>

          <button
            type="button"
            onClick={() => {
              const next = filterStatus === 'abandonado' ? 'TODAS' : 'abandonado';
              setFilterStatus(next);
              setQueryParams({ status: next !== 'TODAS' ? next : null });
            }}
            className={`min-h-[38px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              filterStatus === 'abandonado'
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-sm'
                : 'bg-[#0d1117] text-[#9aa4b2] border-[#30363d] hover:text-white hover:bg-white/5'
            }`}
          >
            Abandonados ({stats.abandonadosCount})
          </button>

          <div className="h-5 w-px bg-[#30363d] mx-1 hidden sm:block" />

          {/* Chip Prioridade */}
          <button
            type="button"
            onClick={() => {
              const next = !filterPrioridade;
              setFilterPrioridade(next);
              setQueryParams({ prioridade: next ? '1' : null });
            }}
            className={`min-h-[38px] px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              filterPrioridade
                ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm shadow-amber-500/15'
                : 'bg-[#0d1117] text-[#9aa4b2] border-[#30363d] hover:text-white hover:bg-white/5'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${filterPrioridade ? 'fill-amber-400 text-amber-400' : 'text-amber-400/80'}`} aria-hidden="true" />
            <span>Prioridade ({stats.prioridadeCount})</span>
          </button>
        </div>

        {/* ── 4. SKELETON ENQUANTO CARREGA ── */}
        {isInitialLoading && (
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 space-y-3 animate-pulse">
                <div className="h-6 w-48 rounded bg-white/10" />
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="aspect-[3/4] rounded-xl bg-white/5" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 5. ESTADO VAZIO: NENHUM JOGO ENCONTRADO ── */}
        {!isInitialLoading && visibleConsoles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#30363d] p-8 sm:p-12 text-center space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-[#30363d] mx-auto text-[#9aa4b2]">
              <Search className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading text-lg font-bold text-white">
                Nenhum jogo encontrado
              </h3>
              <p className="text-xs text-[#9aa4b2] leading-relaxed">
                Nenhum título corresponde aos filtros de busca ou plataformas selecionadas.
              </p>
            </div>
          </div>
        )}

        {/* ── 6. LISTAGEM AGRUPADA POR CONSOLE / PLATAFORMA ── */}
        {!isInitialLoading && visibleConsoles.length > 0 && (
          <div className="space-y-4">
            {visibleConsoles.map((item) => {
              const isExpanded = expandedConsoles[item.consoleName] !== undefined
                ? expandedConsoles[item.consoleName]
                : (isFiltering ? true : false);

              return (
                <div
                  key={item.consoleName}
                  className="overflow-hidden rounded-2xl border border-[#30363d] bg-[#0d1117] shadow-lg transition-all"
                >
                  {/* Accordion Console Header */}
                  <button
                    type="button"
                    onClick={() => toggleConsole(item.consoleName)}
                    className="w-full flex items-center justify-between py-2.5 px-3.5 sm:p-4 min-h-[52px] h-[64px] sm:h-auto text-left hover:bg-white/[0.02] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-[#22d3ee]/10 border border-[#22d3ee]/30 text-[#22d3ee] shadow shrink-0"
                      >
                        <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="font-heading text-sm sm:text-base font-bold text-white truncate">
                          {item.consoleName}
                        </h2>
                        <span className="text-xs text-[#9aa4b2] font-mono whitespace-nowrap">
                          {item.games.length} {item.games.length === 1 ? 'jogo' : 'jogos'}
                          <span className="sm:hidden font-bold text-emerald-400">
                            {' '}· {item.zeradosCount} zerados
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.zeradosCount > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-xs font-mono font-bold">
                          ✓ {item.zeradosCount} zerados ({item.progressPercent}%)
                        </span>
                      )}
                      <ChevronDown
                        className={`h-5 w-5 text-[#9aa4b2] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-white' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </button>

                  {/* Grid de Capas: 3 colunas no mobile (>=340px), 4 tablet, 5 desktop */}
                  {isExpanded && (
                    <div className="p-2.5 sm:p-4 border-t border-[#30363d]/60 bg-black/30">
                      <div className="grid grid-cols-2 min-[340px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 min-[380px]:gap-2 sm:gap-3.5">
                        {item.games.map((game) => {
                          const scoreColor = getScoreColor(game.nota);

                          return (
                            <div
                              key={game.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleCardClick(game)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleCardClick(game);
                                }
                              }}
                              className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#30363d] bg-[#0d1117] transition-all duration-200 hover:-translate-y-1 hover:border-[#22d3ee]/60 hover:shadow-xl hover:shadow-[#22d3ee]/10 active:scale-[0.98] cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
                              aria-label={`Ver detalhes do jogo ${cleanTitle(game.title)}`}
                            >
                              {/* Capa com GameCover Component */}
                              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-xl bg-black/60">
                                <GameCover
                                  src={game.capa}
                                  title={game.title}
                                  consoleName={game.console}
                                  size="lg"
                                  grayscale={game.status === 'zerado'}
                                />

                                {/* Tag ZERADO em vermelho (canto superior) */}
                                {game.status === 'zerado' && (
                                  <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-20 flex items-center gap-1 rounded bg-[#f43f5e]/25 text-[#fda4af] border border-[#f43f5e]/40 px-1.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm">
                                    <Check className="h-3 w-3 stroke-[3] text-[#fda4af]" aria-hidden="true" />
                                    <span>ZERADO</span>
                                  </div>
                                )}

                                {/* Tag ABANDONADO em âmbar (canto superior) */}
                                {game.status === 'abandonado' && (
                                  <div className="absolute top-1 left-1 sm:top-1.5 sm:left-1.5 z-20 flex items-center gap-1 rounded bg-[#f59e0b]/25 text-[#fde68a] border border-[#f59e0b]/50 px-1.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-sm backdrop-blur-sm">
                                    <XCircle className="h-3 w-3 stroke-[3] text-[#fde68a]" aria-hidden="true" />
                                    <span>ABANDONADO</span>
                                  </div>
                                )}

                                {/* Score badge */}
                                {game.nota !== undefined && !isNaN(game.nota) && (
                                  <div 
                                    className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 rounded bg-black/90 px-1.5 py-0.5 font-heading text-xs font-black shadow z-20"
                                    style={{ color: scoreColor }}
                                  >
                                    ★ {game.nota.toFixed(1)}
                                  </div>
                                )}

                                {/* Status badge JOGANDO */}
                                {game.status === 'jogando' && (
                                  <div className="absolute bottom-1 left-1 sm:bottom-1.5 sm:left-1.5 z-20 flex items-center gap-1 rounded bg-[#22d3ee]/30 px-1.5 py-0.5 text-xs font-bold text-[#22d3ee] border border-[#22d3ee]/50 shadow backdrop-blur-sm">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee] animate-ping" aria-hidden="true" />
                                    JOGANDO
                                  </div>
                                )}

                                {/* Estrelinha discreta de prioridade */}
                                {game.prioridade && (
                                  <div
                                    className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 z-20 flex items-center justify-center rounded-md bg-black/80 px-1 py-1 text-amber-400 border border-amber-400/40 shadow-xs backdrop-blur-xs"
                                    title="Jogo prioritário"
                                    aria-label="Prioritário"
                                  >
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                                  </div>
                                )}
                              </div>

                              {/* Título & Metadados */}
                              <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-1 w-full">
                                <div>
                                  <h3 
                                    className="font-heading text-xs leading-snug font-bold text-white group-hover:text-[#22d3ee] transition-colors line-clamp-2 lg:text-[13px] lg:font-semibold"
                                    title={cleanTitle(game.title)}
                                  >
                                    {cleanTitle(game.title)}
                                  </h3>
                                  <div className="text-xs text-[#9aa4b2] mt-0.5 line-clamp-1 lg:text-[12px]">
                                    {game.genero}
                                  </div>
                                </div>

                                {/* Rodapé com tempo e ações de toque acessíveis */}
                                <div className="mt-2 pt-1.5 border-t border-[#30363d]/50 flex items-center justify-between text-xs text-[#9aa4b2] font-mono lg:text-[12px]">
                                  <span 
                                    className={`truncate max-w-[75px] ${(!game.tempo || game.tempo === '0h00') ? 'opacity-50' : ''}`} 
                                    title={game.tempo ? formatTempoDisplay(game.tempo) : '0h00'}
                                  >
                                    {game.tempo ? `⏱ ${formatTempoDisplay(game.tempo)}` : '⏱ 0h00'}
                                  </span>
                                  
                                  <div className="flex items-center gap-0.5 lg:gap-2" onClick={(e) => e.stopPropagation()}>
                                    {/* Editar jogo */}
                                    {isOwner && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleEditGame(e, game)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#22d3ee] hover:bg-white/5 active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
                                        title="Editar Informações do Jogo"
                                        aria-label={`Editar ${cleanTitle(game.title)}`}
                                      >
                                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    )}

                                    {/* Exportar Markdown (somente dono) */}
                                    {isOwner && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          exportGameMarkdown(game);
                                        }}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#a855f7] hover:bg-white/5 active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
                                        title="Baixar arquivo .md"
                                        aria-label={`Baixar arquivo .md de ${cleanTitle(game.title)}`}
                                      >
                                        <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    )}

                                    {/* Deletar jogo */}
                                    {isOwner && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteGame(e, game)}
                                        className="h-8 w-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-red-400 hover:bg-white/5 active:scale-90 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-red-400 focus:outline-none"
                                        title="Excluir Jogo do Backlog"
                                        aria-label={`Excluir ${cleanTitle(game.title)}`}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ZONA DE PERIGO (DONO) COM ACESSO A VERIFICAR REPETIDOS & LIMPAR TUDO ── */}
      {isOwner && dedupedGames.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/10 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-heading font-black text-sm uppercase tracking-wider">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" aria-hidden="true" />
                <span>Zona de Perigo</span>
              </div>
              <p className="text-xs text-[#9aa4b2] max-w-xl leading-relaxed">
                Gerencie títulos duplicados para mesclagem ou apague permanentemente o banco de dados. Um backup JSON de segurança é baixado antes de qualquer alteração destrutiva.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setIsDuplicatesModalOpen(true)}
                className="min-h-[44px] flex items-center gap-2 rounded-xl border border-[#22d3ee]/40 bg-[#22d3ee]/10 px-4 py-2.5 text-xs font-bold text-[#22d3ee] hover:bg-[#22d3ee]/20 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
              >
                <CopyCheck className="h-4 w-4" aria-hidden="true" />
                <span>Verificar Repetidos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setClearConfirmWord('');
                  setShowClearConfirmModal(true);
                }}
                className="min-h-[44px] flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-red-400 focus:outline-none"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Limpar Tudo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAR LIMPEZA ── */}
      <Modal
        isOpen={showClearConfirmModal && isOwner}
        onClose={() => {
          setShowClearConfirmModal(false);
          setClearConfirmWord('');
        }}
        title={
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>Zona de Perigo: Limpar Tudo</span>
          </div>
        }
        description="Ação destrutiva irreversível"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setShowClearConfirmModal(false);
                setClearConfirmWord('');
              }}
              disabled={isClearing}
              className="min-h-[44px] rounded-xl border border-[#30363d] px-4 py-2 text-xs font-bold text-[#9aa4b2] hover:text-white transition-all disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmClearAll}
              disabled={clearConfirmWord.trim().toUpperCase() !== 'APAGAR' || isClearing}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-black uppercase text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
            >
              {isClearing ? 'Limpando Firestore...' : 'Confirmar e Apagar'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            Você está prestes a apagar todos os <strong className="text-white">{dedupedGames.length} jogos</strong> do Firestore e do armazenamento local. Um backup em arquivo JSON será baixado automaticamente antes da limpeza.
          </p>

          <div className="space-y-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5">
            <label htmlFor="confirm-apagar-input" className="block text-xs font-bold uppercase tracking-wider text-red-300">
              Digite <span className="font-mono text-white bg-red-500/30 px-1 py-0.5 rounded">APAGAR</span> para confirmar:
            </label>
            <input
              id="confirm-apagar-input"
              type="text"
              value={clearConfirmWord}
              onChange={(e) => setClearConfirmWord(e.target.value)}
              placeholder="APAGAR"
              className="w-full min-h-[44px] rounded-lg border border-red-500/40 bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-red-400 font-mono tracking-wider"
            />
          </div>
        </div>
      </Modal>

      {/* ── MODAL: CONFIRMAR EXCLUSÃO INDIVIDUAL ── */}
      <DeleteConfirmModal
        isOpen={!!gameToDelete}
        gameTitle={gameToDelete?.title || ''}
        onCancel={() => setGameToDelete(null)}
        onConfirm={() => {
          if (gameToDelete) {
            deleteGame(gameToDelete.id);
            setGameToDelete(null);
          }
        }}
      />
    </div>
  );
};

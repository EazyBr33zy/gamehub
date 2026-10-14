import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { 
  Clock, 
  Trophy, 
  Layers, 
  Flame, 
  Plus, 
  ArrowRight, 
  ChevronLeft, 
  ChevronRight, 
  Gamepad2, 
  Activity, 
  Pencil 
} from 'lucide-react';
import { GameItem } from '../types/game';
import { 
  cleanTitle, 
  parseDateParts, 
  parseTime, 
  parseToMinutes,
  formatMinutes,
  formatTempoDisplay, 
  getUniqueZerados, 
  sortActiveGames 
} from '../utils/markdownParser';
import { getPlatformStyle } from '../utils/platformStyles';
import { useIsOwner } from '../hooks/useIsOwner';
import { PROFILE_NAME } from '../config/profile';
import { ProfileAvatar } from './ProfileAvatar';
import { Modal } from './Modal';
import { GameCover } from './GameCover';
import { PlayDaysCalendar } from './PlayDaysCalendar';
import { UpcomingGamesSection } from './UpcomingGamesSection';
import { RecentBeatenSection } from './RecentBeatenSection';
import { StatCard } from './StatCard';
import { FavoriteGamesRow } from './FavoriteGamesRow';

interface PlatformSlice {
  name: string;
  count: number;
  percentage: number;
  exactPercentage: number;
  totalMinutes: number;
  hoursText: string;
  color: string;
}

interface EditGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number;
  currentCycleYear: number;
  onSave: (newGoal: number) => void;
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({
  isOpen,
  onClose,
  currentGoal,
  currentCycleYear,
  onSave,
}) => {
  const [goalInput, setGoalInput] = useState(String(currentGoal));

  useEffect(() => {
    if (isOpen) {
      setGoalInput(String(currentGoal));
    }
  }, [isOpen, currentGoal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(goalInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 500) {
      onSave(parsed);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-[#06b6d4]">
          <Trophy className="h-5 w-5 text-[#06b6d4]" />
          <span>Definir Meta Anual ({currentCycleYear})</span>
        </div>
      }
      description="Salva no Firestore (settings/site) e atualiza a telemetria do ciclo"
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <p className="text-xs text-[#8b949e] leading-relaxed">
          Quantos jogos você tem como meta para zerar durante o ano de {currentCycleYear}?
        </p>

        <div className="space-y-1">
          <label htmlFor="dashboard-goal-input-field" className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Meta de Jogos Zerados (1 a 500)
          </label>
          <input
            id="dashboard-goal-input-field"
            type="number"
            min="1"
            max="500"
            inputMode="numeric"
            required
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="w-full min-h-[48px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-2 text-[16px] sm:text-xl font-heading font-black text-[#06b6d4] text-center focus:border-[#06b6d4] focus-visible:ring-2 focus-visible:ring-[#06b6d4] focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#30363d]/50">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-[#30363d] text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-[#06b6d4] text-xs font-black text-[#0d1117] uppercase hover:brightness-110 cursor-pointer"
          >
            Salvar Meta
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const DashboardView: React.FC = () => {
  const { 
    games, 
    uniqueZerados, 
    totalZerados2026, 
    setIsNewGameModalOpen, 
    annualGoal, 
    updateAnnualGoal, 
    currentUser
  } = useGame();

  const { navigate } = useHashRoute();
  const isOwner = useIsOwner();

  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeChartMonth, setActiveChartMonth] = useState<number | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const currentCycleYear = 2026;
  const currentGoal = annualGoal && annualGoal >= 1 && annualGoal <= 500 ? annualGoal : 24;

  // ── 1. ACTIVE GAMES: SORTED BY LATEST SESSION (WITH DATA_INICIO & TITLE FALLBACK) ──
  const activeGamesList = useMemo(() => {
    const playing = games.filter((g) => g.status === 'jogando');
    return sortActiveGames(playing);
  }, [games]);

  const slideGames = useMemo(() => {
    return activeGamesList.length > 0 ? activeGamesList : games.slice(0, 10);
  }, [activeGamesList, games]);

  const safeSlideIndex = activeSlideIndex >= slideGames.length ? 0 : activeSlideIndex;
  const currentFeaturedGame: GameItem | undefined = slideGames[safeSlideIndex];

  // Other active games for the right column ("Em Andamento") - Showing up to 4 games
  const otherActiveGames = useMemo(() => {
    if (!currentFeaturedGame) return [];
    const list = slideGames.filter((g) => g.id !== currentFeaturedGame.id);
    if (list.length >= 4) return list.slice(0, 4);
    const fallbackList = games.filter((g) => g.id !== currentFeaturedGame.id && !list.some(item => item.id === g.id));
    return [...list, ...fallbackList].slice(0, 4);
  }, [slideGames, currentFeaturedGame, games]);

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev === 0 ? slideGames.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev === slideGames.length - 1 ? 0 : prev + 1));
  };

  // ── 2. TEMPO INVESTIDO (CICLO 2026) ──
  const cycleBeatenGames = useMemo(() => {
    return getUniqueZerados(games, currentCycleYear);
  }, [games, currentCycleYear]);

  const cycleInvestedTime = useMemo(() => {
    let totalMinutes = 0;
    let semTempoCount = 0;

    cycleBeatenGames.forEach((g) => {
      let mins = 0;
      let hasLoggedTime = false;

      if (typeof g.tempoMinutos === 'number' && g.tempoMinutos > 0) {
        mins = g.tempoMinutos;
        hasLoggedTime = true;
      } else if (g.tempo && g.tempo !== '0:00' && g.tempo !== '0h00') {
        const parsedHours = parseTime(g.tempo);
        const parsedMins = Math.round(parsedHours * 60);
        if (parsedMins > 0) {
          mins = parsedMins;
          hasLoggedTime = true;
        }
      }

      if (hasLoggedTime) {
        totalMinutes += mins;
      } else {
        semTempoCount++;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    const formatted = `${hours}h ${String(remainingMins).padStart(2, '0')}m`;

    return {
      totalMinutes,
      formatted,
      beatenCount: cycleBeatenGames.length,
      semTempoCount,
    };
  }, [cycleBeatenGames]);

  // ── 3. MONTHLY RHYTHM (12 MONTHS OF CURRENT YEAR) ──
  const monthlyRhythm = useMemo(() => {
    const monthCounts = new Array(12).fill(0);
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthLabels = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

    uniqueZerados.forEach((g) => {
      if (g.ano_zerado === currentCycleYear && g.data_zerado) {
        const parts = parseDateParts(g.data_zerado);
        if (parts && parts.month >= 0 && parts.month < 12) {
          monthCounts[parts.month]++;
        }
      }
    });

    const maxCount = Math.max(...monthCounts, 1);
    const totalBeaten = monthCounts.reduce((a, b) => a + b, 0);
    const avgPerMonth = (totalBeaten / 12).toFixed(1);

    let peakMonthIndex = 0;
    let peakCount = 0;
    monthCounts.forEach((c, idx) => {
      if (c > peakCount) {
        peakCount = c;
        peakMonthIndex = idx;
      }
    });

    return {
      months: monthCounts.map((count, index) => ({
        key: index,
        name: monthNames[index],
        label: monthLabels[index],
        count,
      })),
      maxCount,
      totalBeaten: totalBeaten || totalZerados2026,
      avgPerMonth,
      peakMonth: {
        name: monthNames[peakMonthIndex],
        count: peakCount,
      },
    };
  }, [uniqueZerados, totalZerados2026, currentCycleYear]);

  // ── 4. PLATFORM DONUT CHART DATA (TOP 5 + OUTROS SUMMING TO 100%) ──
  const platformDonutData = useMemo(() => {
    const platformMap = new Map<string, { count: number; totalMinutes: number; color: string }>();

    games.forEach((g) => {
      // Normalize console using getPlatformStyle (handles PS5/PlayStation 5, PC/Steam, Deck, etc.)
      const style = getPlatformStyle(g.console);
      const name = style.name || 'Outros';
      const color = name === 'Outros' ? '#64748b' : style.color || '#22d3ee';

      const mins = typeof g.tempoMinutos === 'number' && g.tempoMinutos > 0
        ? g.tempoMinutos 
        : (g.tempo && g.tempo !== '0:00' && g.tempo !== '0h00' ? Math.round(parseTime(g.tempo) * 60) : 0);

      const existing = platformMap.get(name) || { count: 0, totalMinutes: 0, color };
      existing.count += 1;
      existing.totalMinutes += mins;
      if (color !== '#64748b') existing.color = color;
      platformMap.set(name, existing);
    });

    const totalGames = games.length;
    if (totalGames === 0) return { slices: [], totalGames: 0 };

    const sortedEntries = Array.from(platformMap.entries()).sort((a, b) => b[1].count - a[1].count);

    const top5 = sortedEntries.slice(0, 5);
    const rest = sortedEntries.slice(5);

    let rawSlices: PlatformSlice[] = [];

    top5.forEach(([name, data]) => {
      const hours = Math.floor(data.totalMinutes / 60);
      const m = data.totalMinutes % 60;
      const hoursText = data.totalMinutes > 0 
        ? (m > 0 ? `${hours}h ${m}m` : `${hours}h`)
        : '0h';

      rawSlices.push({
        name,
        count: data.count,
        percentage: 0,
        exactPercentage: (data.count / totalGames) * 100,
        totalMinutes: data.totalMinutes,
        hoursText,
        color: data.color,
      });
    });

    if (rest.length > 0) {
      const restCount = rest.reduce((sum, [, d]) => sum + d.count, 0);
      const restMins = rest.reduce((sum, [, d]) => sum + d.totalMinutes, 0);
      const hours = Math.floor(restMins / 60);
      const m = restMins % 60;
      const hoursText = restMins > 0 
        ? (m > 0 ? `${hours}h ${m}m` : `${hours}h`)
        : '0h';

      rawSlices.push({
        name: 'Outros',
        count: restCount,
        percentage: 0,
        exactPercentage: (restCount / totalGames) * 100,
        totalMinutes: restMins,
        hoursText,
        color: '#64748b',
      });
    }

    // Largest Remainder Method: guarantees percentages sum to exactly 100%
    let sumFloor = 0;
    const withRemainders = rawSlices.map((s) => {
      const floorVal = Math.floor(s.exactPercentage);
      const rem = s.exactPercentage - floorVal;
      sumFloor += floorVal;
      return { slice: s, floorVal, rem };
    });

    let diff = 100 - sumFloor;
    withRemainders.sort((a, b) => b.rem - a.rem);
    for (let i = 0; i < diff && i < withRemainders.length; i++) {
      withRemainders[i].floorVal += 1;
    }

    const slices = rawSlices.map((s) => {
      const match = withRemainders.find((item) => item.slice.name === s.name);
      return {
        ...s,
        percentage: match ? match.floorVal : Math.round(s.exactPercentage),
      };
    });

    return { slices, totalGames };
  }, [games]);

  // Selected slice data for center of Donut
  const activeSelectedSlice = useMemo(() => {
    if (!selectedPlatform) return null;
    return platformDonutData.slices.find((s) => s.name === selectedPlatform) || null;
  }, [selectedPlatform, platformDonutData.slices]);

  // ── GOAL RING (SVG) ──
  const goalPercentRaw = currentGoal > 0 ? (totalZerados2026 / currentGoal) * 100 : 0;
  const goalPercent = Math.min(100, Math.round(goalPercentRaw));
  const goalRemaining = Math.max(0, currentGoal - totalZerados2026);

  return (
    <div className="dashboard-page space-y-4 sm:space-y-6 pb-16 font-sans">
      {/* ── 1. HERO PANEL: IDENTIDADE, AÇÕES & TELEMETRIA ── */}
      <section
        className="hero-glow cyber-grid dashboard-hero animate-fade-up rounded-3xl border-0 bg-transparent sm:border sm:border-[#30363d] sm:bg-gradient-to-br sm:from-[#161b22] sm:via-[#131a22] sm:to-[#0d1117] p-0 sm:p-6 md:p-8 shadow-2xl"
        aria-label="Visão geral do painel"
      >
        {/* Top Badges + Ações Rápidas */}
        <div className="dashboard-topbar flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            <div className="flex items-center gap-1.5 rounded-full bg-[#f97316]/10 border border-[#f97316]/40 px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#fb923c]">
              <Flame className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#f97316]" aria-hidden="true" />
              <span>Ciclo {currentCycleYear}</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/40 px-2.5 py-1 sm:px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#34d399]">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
              </span>
              <span>{games.length} jogos registrados</span>
            </div>

            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/40 px-3 py-1 font-bold uppercase tracking-wider text-[#67e8f9] font-mono">
              <Activity className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{goalRemaining > 0 ? `faltam ${goalRemaining} para a meta` : 'meta batida 🏆'}</span>
            </div>
          </div>

          {/* Ações Rápidas Hero */}
          <div className="dashboard-actions flex flex-wrap items-center gap-2 sm:gap-3">
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsNewGameModalOpen(true)}
                className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] px-5 py-2.5 text-xs sm:text-sm font-black uppercase tracking-wider text-[#0d1117] shadow-lg shadow-[#22d3ee]/25 transition-all hover:-translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus:outline-none"
              >
                <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
                <span>Novo Jogo</span>
              </button>
            )}

            <a
              href="#/backlog"
              className="min-h-[44px] h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#30363d] bg-[#0d1117]/80 hover:border-[#22d3ee]/60 hover:bg-white/5 px-3 py-2.5 text-[13px] sm:text-sm font-bold uppercase tracking-normal sm:tracking-wider text-slate-200 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
            >
              <Layers className="h-4 w-4 text-[#22d3ee]" aria-hidden="true" />
              <span>Explorar Acervo</span>
            </a>
          </div>
        </div>

        {/* Linha Principal: identidade (esquerda) + cartões de dados (direita) */}
        <div className="dashboard-main-grid mt-5 grid gap-3 sm:mt-6 lg:grid-cols-[minmax(0,1fr)_clamp(280px,24vw,320px)] xl:grid-cols-[minmax(0,1fr)_clamp(300px,25vw,320px)] lg:items-stretch">
          {/* COLUNA ESQUERDA — cartão de identidade + favoritos */}
          <div className="dashboard-profile-card flex h-full flex-col rounded-2xl border border-[#30363d] bg-[#0d1117]/60 p-4 sm:p-5 lg:p-6">
            <div className="mt-3 flex items-center gap-4 sm:gap-6 lg:mt-0">
              <ProfileAvatar
                googlePhotoUrl={currentUser?.photoURL ?? null}
                editable={isOwner}
                className="h-[104px] w-[104px] shrink-0 sm:h-36 sm:w-36 lg:h-44 lg:w-44"
              />
              <div className="min-w-0">
                <h1 className="font-heading text-[clamp(1.75rem,5vw,2.25rem)] font-extrabold uppercase tracking-tight text-[#f0f6fc] text-glow-accent leading-[0.95] sm:text-[clamp(2.5rem,4vw,3.75rem)]">
                  Bem-vindo,{' '}
                  <span className="block bg-gradient-to-r from-[#22d3ee] via-[#67e8f9] to-[#a855f7] bg-clip-text text-transparent">
                    {PROFILE_NAME}.
                  </span>
                </h1>
                <p className="mt-2 text-[15px] text-[#9aa4b2] sm:text-base">Santuário e backlog de games</p>
              </div>
            </div>

            {/* Linha divisória fina */}
            <hr className="my-4 border-0 border-t border-[#30363d]" aria-hidden="true" />

            {/* JOGOS FAVORITOS (empurrada para o fundo do cartão) */}
            <FavoriteGamesRow />
          </div>

          {/* ── TELEMETRIA: COLUNA DIREITA COM OS 4 CARTÕES (META · ANDAMENTO · ACERVO · TEMPO) ── */}
          <div className="dashboard-stats-grid grid content-start gap-2.5 sm:grid-cols-2 lg:flex lg:flex-col lg:justify-between lg:gap-3">
          {/* META ANUAL — mais alto por causa da barra de progresso */}
          <StatCard
            label="Meta Anual"
            description={`${currentCycleYear} · ${goalRemaining > 0 ? `faltam ${goalRemaining}` : 'meta alcançada'}`}
            icon={<Trophy className="h-5 w-5" aria-hidden="true" />}
            accent="cyan"
            value={
              <>
                {totalZerados2026}
                <span className="text-base font-bold text-[#9aa4b2]">/ {currentGoal}</span>
              </>
            }
            progress={goalPercent}
            progressLabel={`${goalPercent}%`}
            action={isOwner ? (
              <button
                type="button"
                onClick={() => setIsEditingGoal(true)}
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#22d3ee] transition-colors hover:bg-white/5 hover:text-[#06b6d4] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
                aria-label="Editar meta anual"
                title="Editar meta anual"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : undefined}
          />

          {/* EM ANDAMENTO */}
          <StatCard
            label="Em Andamento"
            description="jogando agora"
            icon={<Layers className="h-5 w-5" aria-hidden="true" />}
            accent="purple"
            value={activeGamesList.length}
          />

          {/* ACERVO TOTAL */}
          <StatCard
            label="Acervo Total"
            description={`${uniqueZerados.length} zerados · ${Math.max(0, games.length - uniqueZerados.length)} na fila`}
            icon={<Gamepad2 className="h-5 w-5" aria-hidden="true" />}
            accent="blue"
            value={games.length}
          />

          {/* TEMPO INVESTIDO */}
          <StatCard
            label="Tempo Investido"
            description={`em ${cycleInvestedTime.beatenCount} zerados em ${currentCycleYear}${cycleInvestedTime.semTempoCount > 0 ? ` · ${cycleInvestedTime.semTempoCount} sem tempo` : ''}`}
            icon={<Clock className="h-5 w-5" aria-hidden="true" />}
            accent="amber"
            value={(() => {
              const t = cycleInvestedTime.formatted;
              const iH = t.indexOf('h');
              const iM = t.indexOf('m');
              if (iH === -1 || iM === -1) return t;
              const hours = t.slice(0, iH);
              const mins = t.slice(iH + 1, iM);
              return (
                <>
                  {hours}
                  <span className="text-base text-[#9aa4b2]">h</span>
                  {mins}
                  <span className="text-base text-[#9aa4b2]">m</span>
                </>
              );
            })()}
          />
          </div>
        </div>
      </section>

      {/* ── 2. CONTAINER UNIFICADO: JOGANDO AGORA & EM ANDAMENTO ── */}
      {currentFeaturedGame && (
        <section className="hero-glow animate-fade-up rounded-3xl border border-[#a855f7]/40 bg-gradient-to-br from-[#1c1330] via-[#161b22] to-[#0d1117] p-3 sm:p-5 md:p-6 shadow-[0_0_40px_rgba(168,85,247,0.15)] relative overflow-hidden" style={{ animationDelay: '80ms' }} aria-label="Jogando agora">
          {/* Glow decorativo no canto */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-[#22d3ee]/10 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-[#a855f7]/10 blur-3xl" aria-hidden="true" />

          <div className="relative flex items-center justify-between border-b border-[#a855f7]/30 pb-2 mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f97316] shadow-[0_0_10px_#f97316]" />
              </span>
              <h2 className="text-sm sm:text-xl font-black uppercase tracking-wide bg-gradient-to-r from-[#fb923c] via-[#f472b6] to-[#a855f7] bg-clip-text text-transparent">
                Jogando Agora
              </h2>
              <Flame className="hidden sm:block h-4 w-4 text-[#fb923c]" aria-hidden="true" />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="rounded-full border border-[#f472b6]/40 bg-[#f472b6]/10 px-3 py-1 text-xs font-mono font-bold text-[#f472b6]">
                {safeSlideIndex + 1} / {slideGames.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg border border-[#a855f7]/40 bg-[#0d1117] hover:border-[#f472b6] hover:bg-[#f472b6]/10 text-[#9aa4b2] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Jogo Anterior"
                  aria-label="Jogo anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="h-9 w-9 sm:h-8 sm:w-8 rounded-lg border border-[#a855f7]/40 bg-[#0d1117] hover:border-[#f472b6] hover:bg-[#f472b6]/10 text-[#9aa4b2] hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Próximo Jogo"
                  aria-label="Próximo jogo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 items-stretch">
            {/* CARD PRINCIPAL DO JOGO (FEATURED) */}
            <div className="lg:col-span-8 rounded-2xl border border-[#a855f7]/30 bg-gradient-to-b from-[#0d1117]/90 to-[#0d1117]/60 p-3 sm:p-5 flex flex-col justify-between h-full shadow-inner backdrop-blur-sm">
              <div className="flex flex-col md:flex-row gap-4 sm:gap-6 items-center">
                {/* Capa */}
                <div className="w-full md:w-60 shrink-0 max-w-[260px] mx-auto">
                  <div className="rounded-xl bg-gradient-to-br from-[#f97316]/40 via-[#a855f7]/40 to-[#22d3ee]/40 p-[2px] shadow-[0_0_28px_rgba(168,85,247,0.35)] transition-transform duration-300 hover:scale-[1.02]">
                    <GameCover
                      src={currentFeaturedGame.capa}
                      title={currentFeaturedGame.title}
                      consoleName={currentFeaturedGame.console}
                      size="hero"
                      className="rounded-[10px]"
                    />
                  </div>
                </div>

                {/* Detalhes */}
                <div className="flex-1 w-full flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="rounded-md bg-[#0c2238] border border-[#0284c7]/70 px-2.5 py-1 text-xs font-bold font-mono text-[#38bdf8]">
                        {currentFeaturedGame.console || 'Steam Deck'}
                      </span>
                      <span className="rounded-md bg-[#a855f7]/15 border border-[#a855f7]/30 px-2.5 py-1 text-xs font-medium text-[#d8b4fe]">
                        {currentFeaturedGame.genero || 'Geral'}
                      </span>
                      {currentFeaturedGame.nota !== undefined && (
                        <span className="rounded-md bg-[#ffd700]/20 border border-[#ffd700]/40 px-2 py-0.5 text-xs font-black text-[#ffd700] shadow-[0_0_10px_rgba(255,215,0,0.25)]">
                          ★ {currentFeaturedGame.nota.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <a
                      href={`#/jogo/${encodeURIComponent(currentFeaturedGame.id)}`}
                      className="font-heading text-xl sm:text-2xl md:text-3xl font-extrabold text-white hover:text-[#22d3ee] transition-colors block leading-tight"
                    >
                      {cleanTitle(currentFeaturedGame.title)}
                    </a>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#30363d]/50 text-xs">
                    <div className="bg-black/30 p-2.5 rounded-lg border border-[#22d3ee]/25 flex flex-col justify-between">
                      <div className="text-[#9aa4b2] uppercase font-bold text-xs min-h-[32px] sm:min-h-0 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-[#22d3ee] shrink-0" />
                        <span>TEMPO REGISTRADO</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-[#67e8f9] mt-0.5 font-mono drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]">
                        {currentFeaturedGame.tempo ? formatTempoDisplay(currentFeaturedGame.tempo) : '0h00'}
                      </div>
                    </div>

                    <div className="bg-black/30 p-2.5 rounded-lg border border-emerald-400/25 flex flex-col justify-between">
                      <div className="text-[#9aa4b2] uppercase font-bold text-xs min-h-[32px] sm:min-h-0 flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        <span>STATUS</span>
                      </div>
                      <div className="text-base sm:text-lg font-bold text-emerald-400 mt-0.5 uppercase">
                        {currentFeaturedGame.status}
                      </div>
                    </div>
                  </div>

                  {/* ── BARRA DE PROGRESSO: HORAS JOGADAS vs HLTB ── */}
                  {(() => {
                    const playedMin = parseToMinutes(currentFeaturedGame.tempo);
                    const hltbMin = parseToMinutes(currentFeaturedGame.hltb);
                    const pct = hltbMin > 0 ? Math.round((playedMin / hltbMin) * 100) : 0;
                    const remainingMin = Math.max(0, hltbMin - playedMin);

                    return (
                      <div className="rounded-xl bg-black/40 border border-[#a855f7]/25 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#9aa4b2]">
                            <span className="h-2 w-2 rounded-full bg-[#f97316] shadow-[0_0_6px_#f97316]" aria-hidden="true" />
                            <span>PROGRESSO HLTB</span>
                          </div>
                          <div className="font-mono font-bold text-xs">
                            {hltbMin > 0 ? (
                              <span className={pct >= 100 ? 'text-emerald-400' : 'text-[#22d3ee]'}>
                                {pct}% CONCLUÍDO
                              </span>
                            ) : (
                              <span className="text-[#9aa4b2] text-xs font-normal">HLTB não definido</span>
                            )}
                          </div>
                        </div>

                        {/* Barra Visual */}
                        <div className="relative h-2.5 w-full rounded-full bg-[#161b22] border border-[#30363d]/60 overflow-hidden p-0.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              pct >= 100
                                ? 'bg-gradient-to-r from-[#22d3ee] to-emerald-400'
                                : 'bg-gradient-to-r from-[#0284c7] via-[#22d3ee] to-[#a855f7]'
                            }`}
                            style={{
                              width: `${hltbMin > 0 ? Math.min(100, Math.max(playedMin > 0 ? 3 : 0, pct)) : 0}%`,
                            }}
                          />
                        </div>

                        <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between gap-1 text-[11px] sm:text-xs font-mono text-[#9aa4b2]">
                          <span>
                            Jogado: <strong className="text-white">{formatTempoDisplay(currentFeaturedGame.tempo)}</strong>
                          </span>
                          <span>
                            Meta HLTB:{' '}
                            <strong className="text-[#22d3ee]">
                              {currentFeaturedGame.hltb ? formatTempoDisplay(currentFeaturedGame.hltb) : '—'}
                            </strong>
                            {hltbMin > 0 && remainingMin > 0 && (
                              <span className="text-[#9aa4b2] ml-1 inline-block sm:inline">
                                (~{formatMinutes(remainingMin)} restante)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Botão Ficha do Jogo */}
                  <div className="pt-1">
                    <a
                      href={`#/jogo/${encodeURIComponent(currentFeaturedGame.id)}`}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] py-2.5 px-4 text-xs sm:text-sm font-black uppercase tracking-wider text-[#0d1117] transition-all shadow-lg shadow-[#22d3ee]/20 cursor-pointer focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                      <span>Ver Ficha Completa & Sessões</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* LISTA EM ANDAMENTO (COLUNA DIREITA) - ORDENADO POR SESSÃO RECENTE */}
            <div className="dashboard-others-panel lg:col-span-4 relative rounded-xl border border-[#22d3ee]/25 bg-[#0d1117]/70 overflow-hidden min-h-[300px] lg:min-h-0">
              <div className="p-3 sm:p-4 lg:absolute lg:inset-0 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-[#22d3ee]/25 pb-2 mb-2.5 shrink-0">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <span className="text-[#f97316]" aria-hidden="true">≡</span>
                    <span>OUTROS EM ANDAMENTO</span>
                  </h3>
                  <span className="rounded-md bg-[#a855f7]/15 border border-[#a855f7]/30 px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#d8b4fe]">
                    {activeGamesList.length} ATIVOS
                  </span>
                </div>

                <div className="dashboard-others-list space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col justify-between">
                  {otherActiveGames.map((g, gi) => {
                    const pStyle = getPlatformStyle(g.console);
                    const gPlayedMin = parseToMinutes(g.tempo);
                    const gHltbMin = parseToMinutes(g.hltb);
                    const gPercent = gHltbMin > 0 ? Math.round((gPlayedMin / gHltbMin) * 100) : 0;
                    // Paleta rotativa para dar personalidade a cada item da lista
                    const accents = [
                      { ring: 'hover:border-[#22d3ee]', bar: 'bg-gradient-to-r from-[#22d3ee] to-[#a855f7]', pct: 'text-[#22d3ee]' },
                      { ring: 'hover:border-[#f97316]', bar: 'bg-gradient-to-r from-[#f97316] to-[#fbbf24]', pct: 'text-[#fb923c]' },
                      { ring: 'hover:border-[#a855f7]', bar: 'bg-gradient-to-r from-[#a855f7] to-[#f472b6]', pct: 'text-[#d8b4fe]' },
                      { ring: 'hover:border-emerald-400', bar: 'bg-gradient-to-r from-emerald-400 to-[#22d3ee]', pct: 'text-emerald-400' },
                      { ring: 'hover:border-[#f472b6]', bar: 'bg-gradient-to-r from-[#f472b6] to-[#a855f7]', pct: 'text-[#f472b6]' },
                    ];
                    const accent = accents[gi % accents.length];
                    return (
                      <a
                        key={g.id}
                        href={`#/jogo/${encodeURIComponent(g.id)}`}
                        className={`flex items-center gap-3 py-[10px] px-3 rounded-xl border border-[#30363d] bg-[#161b22] ${accent.ring} transition-all group cursor-pointer`}
                      >
                        <div className="h-[58px] w-[42px] min-w-[42px] max-w-[42px] aspect-[2/3] rounded-lg overflow-hidden shrink-0 border border-[#30363d] group-hover:border-transparent group-hover:shadow-[0_0_10px_rgba(34,211,238,0.35)]">
                          <GameCover
                            src={g.capa}
                            title={g.title}
                            consoleName={g.console}
                            size="thumb"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-mono font-bold text-[#9aa4b2] group-hover:text-white/80 transition-colors">
                            {pStyle.name}
                          </div>
                          <div className="font-heading text-[14px] font-semibold text-white group-hover:text-[#22d3ee] truncate">
                            {cleanTitle(g.title)}
                          </div>
                          <div className="text-[12px] text-[#9aa4b2] font-mono mt-0.5 flex items-center justify-between">
                            <span>⏱ {g.tempo ? formatTempoDisplay(g.tempo) : '0h00'}</span>
                            {gHltbMin > 0 && (
                              <span className={`${gPercent >= 100 ? 'text-emerald-400' : accent.pct} font-bold text-[12px]`}>
                                {gPercent}% HLTB
                              </span>
                            )}
                          </div>
                          {gHltbMin > 0 && (
                            <div className="h-1 w-full rounded-full bg-black/60 overflow-hidden mt-1">
                              <div
                                className={`h-full rounded-full ${gPercent >= 100 ? 'bg-emerald-400' : accent.bar}`}
                                style={{ width: `${Math.min(100, Math.max(gPlayedMin > 0 ? 5 : 0, gPercent))}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── RECÉM ZERADOS (7 JOGOS MAIS RECENTES) ── */}
      <RecentBeatenSection games={games} />

      {/* ── 2. DIAS QUE JOGUEI (CALENDÁRIO MENSAL) ── */}
      <PlayDaysCalendar games={games} />

      {/* ── 3. PRÓXIMOS JOGOS (PRIORIDADE) ── */}
      <UpcomingGamesSection games={games} />

      {/* ── 4. ANALYTICS & TELEMETRIA DO CICLO ── */}
      <section className="animate-fade-up rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6 shadow-xl" style={{ animationDelay: '160ms' }} aria-label="Analytics e telemetria do ciclo">
        <div className="flex items-center justify-between gap-3 border-b border-[#30363d]/60 pb-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] shrink-0">
              <Activity className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading text-sm min-[390px]:text-base sm:text-xl font-black uppercase text-white tracking-tight break-words sm:truncate leading-tight">
                ANALYTICS & RITMO DE CONCLUÍDOS ({currentCycleYear})
              </h2>
              <p className="text-xs text-[#9aa4b2] truncate">
                Evolução mês a mês e distribuição por plataformas
              </p>
            </div>
          </div>

          <a
            href="#/wrapup"
            className="min-h-[44px] min-w-[44px] px-2.5 flex items-center justify-center text-xs font-bold text-[#f59e0b] hover:text-[#fbbf24] cursor-pointer transition-colors shrink-0 rounded-lg hover:bg-white/5"
            aria-label="Ver Wrap-Up completo"
          >
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 items-stretch">
          {/* RITMO MÊS A MÊS */}
          <div className="rounded-xl border border-[#30363d]/80 bg-[#0d1117]/70 p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex-1 min-h-0 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 text-xs shrink-0">
                <span className="font-bold text-white uppercase">Ritmo de Zeramentos</span>
                <span className="font-mono text-[#06b6d4] font-bold">Média: {monthlyRhythm.avgPerMonth} jogos/mês</span>
              </div>

              {/* Gráfico 12 Barras Interativo */}
              <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end flex-1 min-h-[160px] h-32 sm:h-40 lg:h-auto pt-3">
                {monthlyRhythm.months.map((m) => {
                  const heightPercent = m.count > 0 
                    ? Math.max(22, Math.round((m.count / monthlyRhythm.maxCount) * 100))
                    : 6;
                  const isCurrent = m.key === new Date().getMonth();

                  return (
                    <div
                      key={m.key}
                      tabIndex={0}
                      role="button"
                      aria-label={`${m.name}: ${m.count} ${m.count === 1 ? 'jogo zerado' : 'jogos zerados'}`}
                      onClick={() => setActiveChartMonth(prev => prev === m.key ? null : m.key)}
                      onFocus={() => setActiveChartMonth(m.key)}
                      onBlur={() => setActiveChartMonth(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setActiveChartMonth(prev => prev === m.key ? null : m.key);
                        }
                      }}
                      className="flex flex-col items-center gap-1 h-full justify-end group relative cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#06b6d4] rounded"
                    >
                      {/* Tooltip on Hover, Focus or Tap */}
                      <div className={`absolute -top-9 z-30 flex-col items-center pointer-events-none transition-opacity ${
                        activeChartMonth === m.key ? 'flex opacity-100' : 'hidden group-hover:flex group-focus-visible:flex'
                      }`}>
                        <div className="bg-[#161b22] border border-[#30363d] px-2 py-1 rounded text-xs font-mono text-white shadow-xl whitespace-nowrap">
                          <span className="font-bold text-[#06b6d4]">{m.name}:</span> {m.count} {m.count === 1 ? 'jogo' : 'jogos'}
                        </div>
                        <div className="w-1.5 h-1.5 bg-[#161b22] border-r border-b border-[#30363d] rotate-45 -mt-1" />
                      </div>

                      {/* Número acima da barra */}
                      <span className={`text-xs font-mono font-bold ${
                        isCurrent 
                          ? 'text-[#f59e0b] font-black' 
                          : m.count > 0 
                            ? 'text-[#06b6d4]' 
                            : 'text-[#9aa4b2]/50'
                      }`}>
                        {m.count > 0 ? m.count : '0'}
                      </span>

                      {/* Barra */}
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 group-hover:brightness-125 ${
                          isCurrent
                            ? 'bg-gradient-to-t from-[#d97706] to-[#f59e0b] shadow-[0_0_12px_#f59e0b]/50'
                            : m.count > 0
                              ? 'bg-gradient-to-t from-[#0891b2] to-[#06b6d4] shadow-[0_0_8px_#06b6d4]/30'
                              : 'bg-[#21262d]/50 group-hover:bg-[#30363d]'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />

                      {/* Sigla do Mês */}
                      <span className={`text-xs font-mono tracking-wider ${
                        isCurrent ? 'font-bold text-[#f59e0b]' : m.count > 0 ? 'text-white font-semibold' : 'text-[#9aa4b2]'
                      }`}>
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#30363d]/50 pt-3 mt-4 flex items-center justify-between text-xs text-[#9aa4b2] font-mono">
              <span>Pico Anual: <strong className="text-white">{monthlyRhythm.peakMonth.name} ({monthlyRhythm.peakMonth.count} zerados)</strong></span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold uppercase text-xs">
                EM RITMO
              </span>
            </div>
          </div>

          {/* ── DISTRIBUIÇÃO POR PLATAFORMA — BIBLIOTECA TOTAL (GRÁFICO DE PIZZA / DONUT SVG) ── */}
          <div className="gd-platform-card rounded-xl border border-[#30363d]/80 bg-[#0d1117]/70 p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-bold text-white uppercase text-xs sm:text-sm tracking-wide">
                    Distribuição por Plataforma
                  </h3>
                  <span className="text-xs font-mono text-[#22d3ee] font-bold">
                    BIBLIOTECA TOTAL
                  </span>
                </div>

                {selectedPlatform && (
                  <button
                    type="button"
                    onClick={() => setSelectedPlatform(null)}
                    className="text-xs text-[#9aa4b2] hover:text-white underline cursor-pointer"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>

              {/* GRÁFICO DE PIZZA (DONUT) SVG + LEGENDA */}
              <div className="flex flex-col lg:flex-row items-center justify-center gap-5 sm:gap-8 lg:gap-[40px] py-2">
                {/* SVG DONUT CHART (CENTRALIZADO COM 200-240PX NO MOBILE) */}
                <div className="w-[210px] h-[210px] sm:w-[230px] sm:h-[230px] shrink-0 mx-auto relative flex items-center justify-center">
                  <svg
                    viewBox="0 0 200 200"
                    role="img"
                    aria-label={`Gráfico de pizza com distribuição de jogos por plataforma na biblioteca total. ${platformDonutData.slices.map(s => `${s.name}: ${s.percentage}%`).join(', ')}`}
                    className="w-full h-full transform -rotate-90 select-none overflow-visible"
                  >
                    {(() => {
                      if (platformDonutData.slices.length === 0) {
                        return (
                          <circle
                            cx="100"
                            cy="100"
                            r="66"
                            fill="transparent"
                            stroke="#30363d"
                            strokeWidth="28"
                          />
                        );
                      }

                      // If single slice = 100%
                      if (platformDonutData.slices.length === 1) {
                        const s = platformDonutData.slices[0];
                        const isSelected = selectedPlatform === s.name;
                        return (
                          <circle
                            cx="100"
                            cy="100"
                            r="66"
                            fill="transparent"
                            stroke={s.color}
                            strokeWidth={isSelected ? 32 : 28}
                            className="cursor-pointer transition-all duration-300"
                            onClick={() => setSelectedPlatform(prev => prev === s.name ? null : s.name)}
                          />
                        );
                      }

                      // Multiple slices: render SVG arc paths
                      const R = 80;
                      const r = 52;
                      let currentAngle = 0;

                      return platformDonutData.slices.map((slice) => {
                        const angleSpan = (slice.percentage / 100) * 2 * Math.PI;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angleSpan;
                        currentAngle = endAngle;

                        if (angleSpan <= 0.001) return null;

                        const x1 = 100 + R * Math.cos(startAngle);
                        const y1 = 100 + R * Math.sin(startAngle);
                        const x2 = 100 + R * Math.cos(endAngle);
                        const y2 = 100 + R * Math.sin(endAngle);
                        const x3 = 100 + r * Math.cos(endAngle);
                        const y3 = 100 + r * Math.sin(endAngle);
                        const x4 = 100 + r * Math.cos(startAngle);
                        const y4 = 100 + r * Math.sin(startAngle);

                        const largeArcFlag = angleSpan > Math.PI ? 1 : 0;
                        const pathData = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${x3.toFixed(2)} ${y3.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;

                        const isSelected = selectedPlatform === slice.name;
                        const isAnySelected = selectedPlatform !== null;
                        const opacity = isSelected ? 1 : isAnySelected ? 0.35 : 0.95;

                        return (
                          <path
                            key={slice.name}
                            d={pathData}
                            fill={slice.color}
                            stroke="#0d1117"
                            strokeWidth={isSelected ? "3" : "2"}
                            opacity={opacity}
                            tabIndex={0}
                            role="button"
                            aria-label={`${slice.name}: ${slice.count} jogos (${slice.percentage}%), ${slice.hoursText}`}
                            onClick={() => setSelectedPlatform(prev => prev === slice.name ? null : slice.name)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPlatform(prev => prev === slice.name ? null : slice.name);
                              }
                            }}
                            className="cursor-pointer transition-all duration-300 hover:opacity-100 hover:brightness-110 focus-visible:outline-none focus-visible:stroke-white"
                          />
                        );
                      });
                    })()}
                  </svg>

                  {/* CENTRO DO DONUT (TEXTO INTERATIVO) */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
                    {activeSelectedSlice ? (
                      <div className="animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-xs font-mono uppercase font-bold text-[#9aa4b2] block truncate max-w-[84px]">
                          {activeSelectedSlice.name}
                        </span>
                        <span
                          className="font-heading text-xl sm:text-2xl font-black block font-mono leading-none my-0.5"
                          style={{ color: activeSelectedSlice.color }}
                        >
                          {activeSelectedSlice.percentage}%
                        </span>
                        <span className="text-xs font-semibold text-white block">
                          {activeSelectedSlice.count} {activeSelectedSlice.count === 1 ? 'jogo' : 'jogos'}
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-mono uppercase font-bold tracking-wider text-[#9aa4b2] block">
                          ACERVO
                        </span>
                        <span className="font-heading text-xl sm:text-2xl font-black text-white block font-mono leading-none my-0.5">
                          {platformDonutData.totalGames}
                        </span>
                        <span className="text-xs text-[#9aa4b2] block">
                          jogos totais
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* LEGENDA AO LADO (DESKTOP) OU ABAIXO (MOBILE) */}
                <div className="gd-platform-legend w-full min-w-0 flex-1 space-y-1.5">
                  {platformDonutData.slices.map((slice) => {
                    const isSelected = selectedPlatform === slice.name;
                    return (
                      <button
                        key={slice.name}
                        type="button"
                        tabIndex={0}
                        onClick={() => setSelectedPlatform((prev) => (prev === slice.name ? null : slice.name))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPlatform((prev) => (prev === slice.name ? null : slice.name));
                          }
                        }}
                        className={`w-full min-h-[44px] flex flex-col lg:grid lg:grid-cols-[10px_minmax(110px,1fr)_auto_auto_44px] items-stretch lg:items-center gap-1.5 lg:gap-0 lg:gap-x-[14px] px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#22d3ee] bg-[#22d3ee]/10 shadow-lg shadow-[#22d3ee]/10 ring-1 ring-[#22d3ee]/40'
                            : selectedPlatform
                              ? 'border-[#30363d]/30 bg-black/20 opacity-40 hover:opacity-100 hover:border-[#30363d]'
                              : 'border-[#30363d]/50 bg-black/20 hover:border-[#30363d] hover:bg-black/30'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`${slice.name}: ${slice.count} jogos, ${slice.percentage}%, ${slice.hoursText} jogadas`}
                      >
                        {/* Linha 1 no Mobile (Bolinha + Nome + % à direita) */}
                        <div className="flex items-center justify-between w-full lg:contents">
                          <div className="flex items-center gap-2.5 min-w-0 lg:contents">
                            <span
                              className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm lg:col-start-1 lg:justify-self-center"
                              style={{ backgroundColor: slice.color }}
                              aria-hidden="true"
                            />
                            <span className="text-xs sm:text-[13px] font-bold text-white truncate lg:col-start-2 lg:text-left">
                              {slice.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-white font-bold text-right shrink-0 whitespace-nowrap lg:col-start-5 lg:min-w-[44px] lg:w-[44px] lg:text-[13px]">{slice.percentage}%</span>
                        </div>

                        {/* Linha 2 no Mobile (98 jogos · 268h 46m em 11px) */}
                        <div className="flex items-center gap-1.5 text-[11px] lg:text-[13px] font-mono text-[#9aa4b2] text-left lg:contents">
                          <span className="whitespace-nowrap lg:col-start-3 lg:text-right lg:text-white/90">{slice.count} {slice.count === 1 ? 'jogo' : 'jogos'}</span>
                          <span className="lg:hidden text-[#30363d]">·</span>
                          <span className="text-emerald-400 font-semibold whitespace-nowrap lg:col-start-4 lg:text-right">{slice.hoursText}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border-t border-[#30363d]/50 pt-3 mt-4 flex items-center justify-between text-xs text-[#9aa4b2] font-mono">
              <span>Líder: <strong className="text-white">{platformDonutData.slices[0]?.name || '—'}</strong></span>
              <span className="text-[#22d3ee] font-bold">
                {games.length} jogos na biblioteca
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MODAL: EDITAR META ANUAL (SOMENTE DONO) ── */}
      <EditGoalModal
        isOpen={isEditingGoal && isOwner}
        onClose={() => setIsEditingGoal(false)}
        currentGoal={currentGoal}
        currentCycleYear={currentCycleYear}
        onSave={(newGoal) => updateAnnualGoal(newGoal, currentCycleYear)}
      />
    </div>
  );
};

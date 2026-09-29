import React, { useState } from 'react';
import {
  Trophy,
  Gamepad2,
  Clock,
  Star,
  Flame,
  Plus,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sparkles,
  History,
  Medal,
  CalendarHeart,
} from 'lucide-react';
import { Game, AppConfig } from '../types';
import { NowPlayingSlider } from './NowPlayingSlider';
import { GameCover } from './GameCover';
import { ConsoleIcon, getConsoleColor } from './ConsoleIcon';
import { formatMinutes, formatDateBR } from '../utils/storage';

interface DashboardProps {
  games: Game[];
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onSelectGame: (game: Game) => void;
  onQuickAddTime: (gameId: string, minutes: number) => void;
  onAdjustTime: (game: Game) => void;
  onQuickFinish: (game: Game) => void;
  onOpenAddModal: () => void;
  onChangeTab: (tab: 'inicio' | 'backlog' | 'jogando' | 'wrap') => void;
}

/** Última sessão registrada de um jogo (data + hora), ou string vazia */
const lastSessionKey = (g: Game): string => {
  const ss = g.sessoes || [];
  if (ss.length === 0) return '';
  const last = [...ss].sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio))[0];
  return `${last.data}T${last.inicio || '00:00'}`;
};

export const Dashboard: React.FC<DashboardProps> = ({
  games,
  config,
  onUpdateConfig,
  onSelectGame,
  onQuickAddTime,
  onAdjustTime,
  onQuickFinish,
  onOpenAddModal,
  onChangeTab,
}) => {
  const [editingMeta, setEditingMeta] = useState(false);
  const [tempMeta, setTempMeta] = useState(config.metaAnual);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const todayMMDD = `${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  // Filtragem dos jogos
  const zerados = games.filter((g) => g.status === 'zerado');
  const zeradosEsteAno = zerados.filter((g) => (g.fim || '').startsWith(String(currentYear)));
  const jogando = [...games.filter((g) => g.status === 'jogando')].sort(
    (a, b) => lastSessionKey(b).localeCompare(lastSessionKey(a)) || (b.inicio || '').localeCompare(a.inicio || '')
  );
  const backlog = games.filter((g) => g.status === 'backlog');

  // Recém zerados: os 5 últimos concluídos
  const recemZerados = [...zerados]
    .filter((g) => g.fim)
    .sort((a, b) => (b.fim || '').localeCompare(a.fim || ''))
    .slice(0, 5);

  // Máquina do tempo: jogos zerados no MESMO dia/mês em anos anteriores
  const maquinaDoTempo = zerados.filter((g) => {
    const fim = g.fim || '';
    if (fim.length < 10) return false;
    const mmdd = fim.slice(5, 10); // MM-DD
    const yyyy = fim.slice(0, 4);
    return mmdd === todayMMDD && yyyy !== String(currentYear);
  });

  // Hall da Fama: jogos premiados no GOT do ano até o momento.
  // Prioridade 1: seleções feitas na aba Wrap-Up -> GOT (config.gotPremios[ano] = { categoria: jogoId }).
  // Prioridade 2: propriedades got_* sincronizadas do Obsidian.
  const gotSelecionado = config.gotPremios?.[String(currentYear)];
  const hallDaFama = (() => {
    if (gotSelecionado && Object.keys(gotSelecionado).length > 0) {
      const ids = new Set(Object.values(gotSelecionado).filter(Boolean));
      return zeradosEsteAno.filter((g) => ids.has(g.id));
    }
    return zeradosEsteAno.filter((g) => g.got && Object.keys(g.got).length > 0);
  })();

  // Cálculo de horas totais
  const tempoTotalMinutos = games.reduce((sum, g) => sum + (g.tempo || 0), 0);
  const tempoAnoMinutos = zeradosEsteAno.reduce((sum, g) => sum + (g.tempo || 0), 0);

  // Média de nota dos zerados
  const zeradosComNota = zerados.filter((g) => typeof g.nota === 'number');
  const notaMedia =
    zeradosComNota.length > 0
      ? (zeradosComNota.reduce((sum, g) => sum + (g.nota || 0), 0) / zeradosComNota.length).toFixed(1)
      : '—';

  // Meta do ano
  const meta = config.metaAnual || 24;
  const percentualMeta = Math.min(100, Math.round((zeradosEsteAno.length / meta) * 100));
  const projecaoAnual = Math.round((zeradosEsteAno.length / Math.max(1, currentMonth)) * 12);
  const ritmoMensal = (zeradosEsteAno.length / Math.max(1, currentMonth)).toFixed(1);

  // Ritmo recente (últimos 7, 30 e 90 dias)
  const calcRecent = (dias: number) => {
    const dataLimite = new Date(Date.now() - dias * 864e5).toISOString().slice(0, 10);
    const lista = zerados.filter((g) => (g.fim || '') >= dataLimite);
    const minutos = lista.reduce((sum, g) => sum + (g.tempo || 0), 0);
    return { count: lista.length, minutos };
  };

  const ult7 = calcRecent(7);
  const ult30 = calcRecent(30);
  const ult90 = calcRecent(90);

  const handleSaveMeta = () => {
    if (tempMeta > 0) {
      onUpdateConfig({ metaAnual: tempMeta });
    }
    setEditingMeta(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-10">
      {/* ========================================================================= */}
      {/* HERO BANNER & WELCOME */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 p-5 sm:p-7 border border-slate-800/90">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
              <Sparkles className="h-4 w-4" />
              <span>Painel Gamer Pessoal</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-400">Temporada {currentYear}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Seu Santuário de Jogos
            </h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Acompanhe seu progresso, registre horas de gameplay e vença seu backlog no PC, consoles e portáteis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Novo Jogo</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SLIDE: JOGANDO AGORA (ordenado por tempo que falta para zerar) */}
      {/* ========================================================================= */}
      <NowPlayingSlider
        games={jogando}
        onSelectGame={onSelectGame}
        onQuickAddTime={onQuickAddTime}
        onAdjustTime={onAdjustTime}
        onQuickFinish={onQuickFinish}
        onGoBacklog={() => onChangeTab('backlog')}
      />

      {/* ========================================================================= */}
      {/* PRIMARY METRICS (60-30-10 Color Discipline, Tabular Numerals) */}
      {/* ========================================================================= */}
      <section aria-labelledby="kpis-title">
        <h2 id="kpis-title" className="sr-only">
          Métricas Gerais
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
          {/* Card 1: Zerados no Ano — roxo */}
          <div className="obs-card obs-card-hover relative overflow-hidden p-4 obs-purple">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Zerados em {currentYear}</span>
              <Trophy className="h-4 w-4 obs-color" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {zeradosEsteAno.length}
              </span>
              <span className="text-xs text-slate-500">/ {meta} meta</span>
            </div>
            <p className="mt-1 text-xs obs-color font-medium">
              {percentualMeta}% atingido
            </p>
          </div>

          {/* Card 2: Em Andamento — azul */}
          <div className="obs-card obs-card-hover relative overflow-hidden p-4 obs-blue">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Em Andamento</span>
              <Gamepad2 className="h-4 w-4 obs-color" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {jogando.length}
              </span>
              <span className="text-xs text-slate-500">jogos</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {backlog.length} no backlog
            </p>
          </div>

          {/* Card 3: Total Zerados — verde */}
          <div className="obs-card obs-card-hover relative overflow-hidden p-4 obs-green">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Zerados</span>
              <CheckCircle2 className="h-4 w-4 obs-color" />
            </div>
            <div className="mt-2">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {zerados.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {games.length} catalogados
            </p>
          </div>

          {/* Card 4: Horas Totais — âmbar */}
          <div className="obs-card obs-card-hover relative overflow-hidden p-4 obs-amber">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Horas de Jogo</span>
              <Clock className="h-4 w-4 obs-color" />
            </div>
            <div className="mt-2">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {formatMinutes(tempoTotalMinutos)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {formatMinutes(tempoAnoMinutos)} em {currentYear}
            </p>
          </div>

          {/* Card 5: Nota Média — rosa */}
          <div className="col-span-2 sm:col-span-1 obs-card obs-card-hover relative overflow-hidden p-4 obs-pink">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Nota Média</span>
              <Star className="h-4 w-4 obs-color fill-current opacity-40" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {notaMedia}
              </span>
              <span className="text-xs text-slate-500">/ 10</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {zeradosComNota.length} avaliações
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* META DO ANO (estilo Obsidian) & PROJEÇÃO */}
      {/* ========================================================================= */}
      <section className="obs-card relative overflow-hidden p-5 sm:p-6 obs-indigo">
        <span className="obs-accent-bar" style={{ background: 'linear-gradient(90deg, #a78bfa, #60a5fa, transparent)' }} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="obs-title text-base font-semibold text-white">
                Meta do Ano — {currentYear}
              </h3>
              {!editingMeta ? (
                <button
                  onClick={() => {
                    setTempMeta(meta);
                    setEditingMeta(true);
                  }}
                  className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 ml-1"
                >
                  Alterar meta
                </button>
              ) : (
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={tempMeta}
                    onChange={(e) => setTempMeta(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 rounded bg-slate-950 border border-slate-700 px-2 py-0.5 text-xs text-white"
                  />
                  <button
                    onClick={handleSaveMeta}
                    className="px-2 py-0.5 rounded bg-violet-500 text-white text-xs font-semibold hover:bg-violet-400"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingMeta(false)}
                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ritmo atual de <span className="font-semibold text-violet-300">{ritmoMensal} jogos/mês</span> · Projeção de{' '}
              <span className="font-semibold text-violet-300">{projecaoAnual} jogos</span> até dezembro
            </p>
          </div>

          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
            <span className="font-display text-2xl font-bold tabular-nums text-violet-400">
              {percentualMeta}%
            </span>
            <span className="text-xs text-slate-400">
              {zeradosEsteAno.length} de {meta} concluídos
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2.5 w-full rounded-full bg-slate-950 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${percentualMeta}%`, background: 'linear-gradient(90deg, #a78bfa, #60a5fa)' }}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RITMO DA SEMANA (cores estilo Obsidian) */}
      {/* ========================================================================= */}
      <section aria-labelledby="momentum-title">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-violet-400" />
          <h2 id="momentum-title" className="obs-title text-sm font-semibold uppercase tracking-wider text-slate-400">
            Ritmo da Semana
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="obs-card obs-card-hover relative overflow-hidden p-3 sm:p-4 text-center obs-purple">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 7 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums obs-color mt-1">
              +{ult7.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult7.minutos)}</span>
          </div>

          <div className="obs-card obs-card-hover relative overflow-hidden p-3 sm:p-4 text-center obs-blue">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 30 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums obs-color mt-1">
              +{ult30.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult30.minutos)}</span>
          </div>

          <div className="obs-card obs-card-hover relative overflow-hidden p-3 sm:p-4 text-center obs-teal">
            <span className="obs-accent-bar" style={{ background: 'var(--obs-c)' }} />
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 90 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums obs-color mt-1">
              +{ult90.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult90.minutos)}</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RECÉM ZERADOS (últimos 5 jogos concluídos — destaque + lista) */}
      {/* ========================================================================= */}
      {recemZerados.length > 0 && (
        <section aria-labelledby="recem-zerados-title">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h2 id="recem-zerados-title" className="obs-title text-sm font-semibold uppercase tracking-wider text-slate-400">
              Recém Zerados
            </h2>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-slate-900/60 to-slate-950/60 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
              {recemZerados.map((game, idx) => (
                <button
                  key={game.id}
                  onClick={() => onSelectGame(game)}
                  className={`group flex items-center gap-3 rounded-xl border p-2 text-left transition-colors ${
                    idx === 0
                      ? 'border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                      : 'border-slate-800/70 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="w-12 shrink-0 overflow-hidden rounded-lg">
                    <GameCover
                      capa={game.capa}
                      nome={game.nome}
                      genero={game.genero}
                      consoleName={game.console}
                      aspect="portrait"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
                      {game.nome}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                      <ConsoleIcon name={game.console} className="h-3 w-3 shrink-0" />
                      <span style={{ color: getConsoleColor(game.console) }} className="font-medium truncate">{game.console}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">{formatDateBR(game.fim)}</p>
                  </div>
                  {typeof game.nota === 'number' && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-amber-300">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {game.nota.toFixed(1)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* MÁQUINA DO TEMPO (zerados no mesmo dia/mês em anos anteriores — destaque + lista) */}
      {/* ========================================================================= */}
      {maquinaDoTempo.length > 0 && (
        <section aria-labelledby="maquina-tempo-title">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-fuchsia-400" />
            <h2 id="maquina-tempo-title" className="obs-title text-sm font-semibold uppercase tracking-wider text-slate-400">
              Máquina do Tempo — zerados em {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </h2>
          </div>

          <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/[0.08] via-purple-950/40 to-slate-950/60 p-3 sm:p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
              {maquinaDoTempo.slice(0, 5).map((game, idx) => {
                const anoZerado = (game.fim || '').slice(0, 4);
                const anosAtras = currentYear - Number(anoZerado);
                return (
                  <button
                    key={`mt-${game.id}`}
                    onClick={() => onSelectGame(game)}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-xl border p-2 text-left transition-colors ${
                      idx === 0
                        ? 'border-fuchsia-400/40 bg-fuchsia-500/10 hover:bg-fuchsia-500/15'
                        : 'border-slate-800/70 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="absolute right-1.5 top-1.5 rounded-md bg-slate-950/90 border border-fuchsia-500/40 px-1.5 py-0.5 text-[9px] font-bold text-fuchsia-300">
                      {anoZerado}
                    </span>
                    <div className="w-12 shrink-0 overflow-hidden rounded-lg">
                      <GameCover
                        capa={game.capa}
                        nome={game.nome}
                        genero={game.genero}
                        consoleName={game.console}
                        aspect="portrait"
                      />
                    </div>
                    <div className="min-w-0 flex-1 pr-6">
                      <p className="truncate text-xs font-semibold text-slate-200 group-hover:text-fuchsia-300 transition-colors">
                        {game.nome}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-400">
                        <CalendarHeart className="h-3 w-3 shrink-0 text-fuchsia-400" />
                        <span>Há {anosAtras} {anosAtras === 1 ? 'ano' : 'anos'}</span>
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* HALL DA FAMA (jogos com prêmios GOT do ano até o momento) */}
      {/* ========================================================================= */}
      {hallDaFama.length > 0 && (
        <section aria-labelledby="hall-fama-title">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Medal className="h-4 w-4 text-amber-400" />
              <h2 id="hall-fama-title" className="obs-title text-sm font-semibold uppercase tracking-wider text-slate-400">
                Hall da Fama — {currentYear}
              </h2>
            </div>
            <button
              onClick={() => onChangeTab('wrap')}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>Ver GOT completo</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hallDaFama.map((game) => {
              const premios = Object.entries(game.got || {})
                .filter(([k]) => k !== 'jogo')
                .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '));
              const isGoty = !!(game.got && game.got.jogo);
              return (
                <div
                  key={`hf-${game.id}`}
                  onClick={() => onSelectGame(game)}
                  className="group obs-card obs-card-hover cursor-pointer flex items-center gap-3 p-3 obs-amber"
                >
                  <div className="w-12 shrink-0">
                    <GameCover
                      capa={game.capa}
                      nome={game.nome}
                      genero={game.genero}
                      consoleName={game.console}
                      aspect="portrait"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 truncate">
                      <Trophy className="h-3 w-3 shrink-0" />
                      {isGoty ? 'GOTY' : premios.slice(0, 2).join(' · ') || 'Premiado'}
                    </p>
                    <h4 className="truncate font-display text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {game.nome}
                    </h4>
                    <p className="truncate text-[11px] text-slate-400">
                      <span style={{ color: getConsoleColor(game.console) }} className="font-semibold">{game.console}</span>
                      {typeof game.nota === 'number' ? ` · ⭐ ${game.nota.toFixed(1)}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* PRÓXIMOS DO BACKLOG (Sugestões rápidas) */}
      {/* ========================================================================= */}
      {backlog.length > 0 && (
        <section aria-labelledby="backlog-title">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h2 id="backlog-title" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
                Na Fila do Backlog ({backlog.length})
              </h2>
            </div>
            <button
              onClick={() => onChangeTab('backlog')}
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>Explorar catálogo</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {backlog.slice(0, 6).map((game) => (
              <div
                key={game.id}
                onClick={() => onSelectGame(game)}
                className="group cursor-pointer rounded-xl border border-slate-800/80 bg-slate-900/50 p-2.5 transition-all hover:border-slate-700 hover:bg-slate-900"
              >
                <GameCover
                  capa={game.capa}
                  nome={game.nome}
                  genero={game.genero}
                  consoleName={game.console}
                  aspect="portrait"
                />
                <div className="mt-2 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors truncate">
                    {game.nome}
                  </h4>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                    <span>{game.console}</span>
                    {game.est ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>~{game.est}h</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import {
  Trophy,
  Gamepad2,
  Clock,
  Star,
  Flame,
  ArrowRight,
  Plus,
  Play,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { Game, AppConfig } from '../types';
import { NowPlayingSlider } from './NowPlayingSlider';
import { GameCover } from './GameCover';
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

  // Filtragem dos jogos
  const zerados = games.filter((g) => g.status === 'zerado');
  const zeradosEsteAno = zerados.filter((g) => (g.fim || '').startsWith(String(currentYear)));
  const jogando = games.filter((g) => g.status === 'jogando');
  const backlog = games.filter((g) => g.status === 'backlog');

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
          {/* Card 1: Zerados no Ano */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Zerados em {currentYear}</span>
              <Trophy className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                {zeradosEsteAno.length}
              </span>
              <span className="text-xs text-slate-500">/ {meta} meta</span>
            </div>
            <p className="mt-1 text-xs text-cyan-400/90 font-medium">
              {percentualMeta}% atingido
            </p>
          </div>

          {/* Card 2: Jogando Agora */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Em Andamento</span>
              <Gamepad2 className="h-4 w-4 text-emerald-400" />
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

          {/* Card 3: Total Zerados */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Zerados</span>
              <CheckCircle2 className="h-4 w-4 text-indigo-400" />
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

          {/* Card 4: Horas Totais */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Horas de Jogo</span>
              <Clock className="h-4 w-4 text-amber-400" />
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

          {/* Card 5: Nota Média */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800/80 bg-slate-900/70 p-4 transition-all hover:border-slate-700">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Nota Média</span>
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400/20" />
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
      {/* META ANUAL & PROJEÇÃO */}
      {/* ========================================================================= */}
      <section className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-semibold text-white">
                Meta de Zerados em {currentYear}
              </h3>
              {!editingMeta ? (
                <button
                  onClick={() => {
                    setTempMeta(meta);
                    setEditingMeta(true);
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 ml-1"
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
                    className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-xs font-semibold hover:bg-cyan-400"
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
              Ritmo atual de <span className="font-semibold text-slate-200">{ritmoMensal} jogos/mês</span> · Projeção de{' '}
              <span className="font-semibold text-slate-200">{projecaoAnual} jogos</span> até dezembro
            </p>
          </div>

          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
            <span className="font-display text-2xl font-bold tabular-nums text-cyan-400">
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
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500"
            style={{ width: `${percentualMeta}%` }}
          />
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RITMO RECENTE (Momentum) */}
      {/* ========================================================================= */}
      <section aria-labelledby="momentum-title">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-orange-400" />
          <h2 id="momentum-title" className="font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
            Ritmo de Vitórias
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-4 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 7 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums text-cyan-400 mt-1">
              +{ult7.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult7.minutos)}</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-4 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 30 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums text-emerald-400 mt-1">
              +{ult30.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult30.minutos)}</span>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 sm:p-4 text-center">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Últimos 90 dias</span>
            <p className="font-display text-xl sm:text-2xl font-bold tabular-nums text-purple-400 mt-1">
              +{ult90.count}
            </p>
            <span className="text-[11px] text-slate-400">{formatMinutes(ult90.minutos)}</span>
          </div>
        </div>
      </section>

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

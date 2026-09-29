import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Star,
  Flame,
  Award,
  Trophy,
  Trash2,
  Pencil,
  CheckCircle2,
  Gamepad2,
} from 'lucide-react';
import { Game } from '../types';
import { GameCover } from './GameCover';
import { ConsoleIcon, getConsoleColor } from './ConsoleIcon';
import { formatMinutes, formatDateBR } from '../utils/storage';

interface PlayingViewProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  onQuickAddTime: (gameId: string, minutes: number) => void;
  onAdjustTime: (game: Game) => void;
  onDeleteGame: (gameId: string) => boolean | void;
  onQuickFinish: (game: Game) => void;
  onUpdateGameStatus: (gameId: string, status: Game['status']) => void;
  onOpenAddModal: () => void;
}

type Filtro = 'todos' | 'recentes' | 'perto';

/** Última sessão registrada de um jogo (data + hora), ou string vazia */
const lastSessionKey = (g: Game): string => {
  const ss = g.sessoes || [];
  if (ss.length === 0) return '';
  const last = [...ss].sort((a, b) => (b.data + b.inicio).localeCompare(a.data + a.inicio))[0];
  return `${last.data}T${last.inicio || '00:00'}`;
};

/** Data/hora da última atividade: sessão mais recente ou data de início */
const lastActivityKey = (g: Game): string => lastSessionKey(g) || (g.inicio ? `${g.inicio}T00:00` : '');

const daysSince = (d?: string) => {
  if (!d) return 0;
  const t = new Date(d + 'T00:00:00').getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
};

const percentOf = (game: Game): number | null => {
  const estMin = (game.est || 0) * 60;
  return estMin > 0 ? Math.min(100, Math.round(((game.tempo || 0) / estMin) * 100)) : null;
};

export const PlayingView: React.FC<PlayingViewProps> = ({
  games,
  onSelectGame,
  onQuickAddTime,
  onAdjustTime,
  onDeleteGame,
  onQuickFinish,
  onUpdateGameStatus,
  onOpenAddModal,
}) => {
  const jogandoBase = games.filter((g) => g.status === 'jogando' || g.status === 'pausado');
  const zerados = games
    .filter((g) => g.status === 'zerado')
    .sort((a, b) => (b.fim || '').localeCompare(a.fim || ''));

  const [filtro, setFiltro] = useState<Filtro>('todos');

  // Ordem padrão: jogo com a sessão registrada mais recente primeiro
  const jogando = [...jogandoBase].sort((a, b) => {
    if (filtro === 'recentes') return (b.inicio || '').localeCompare(a.inicio || '');
    if (filtro === 'perto') return (percentOf(b) ?? -1) - (percentOf(a) ?? -1);
    return lastActivityKey(b).localeCompare(lastActivityKey(a));
  });

  const destaque = jogando[0];
  const outros = jogando.slice(1);

  /** Paleta de cores por jogo em andamento (para dar mais cor ao layout) */
  const ACCENTS = ['#22d3ee', '#c084fc', '#fb923c', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#f87171', '#a3e635', '#2dd4bf'];
  const accentOf = (g: Game, idx: number) => {
    let h = 0;
    for (const c of g.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return ACCENTS[h % ACCENTS.length] || ACCENTS[idx % ACCENTS.length];
  };

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todos', label: `Todos (${jogandoBase.length})` },
    { id: 'recentes', label: 'Mais recentes' },
    { id: 'perto', label: 'Perto do fim' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-fuchsia-950/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-cyan-400" />
          <h1 className="font-display text-base sm:text-lg font-bold text-white">
            {jogandoBase.length} {jogandoBase.length === 1 ? 'jogo em andamento' : 'jogos em andamento'}
          </h1>
        </div>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/40 hover:bg-cyan-400/20"
        >
          <Plus className="h-4 w-4" />
          <span>Adicionar</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filtro === f.id
                ? 'bg-slate-800 text-cyan-300 ring-1 ring-cyan-400/40'
                : 'bg-slate-900/70 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {jogandoBase.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
          <p className="text-sm text-slate-400">Nenhum jogo em andamento no momento.</p>
        </div>
      ) : (
        <>
          {/* ===================== CARTÃO PRINCIPAL ===================== */}
          {destaque && (() => {
            const pct = percentOf(destaque);
            const estMin = (destaque.est || 0) * 60;
            const faltam = estMin > 0 ? Math.max(0, estMin - (destaque.tempo || 0)) : null;
            const dias = destaque.inicio ? daysSince(destaque.inicio) + 1 : 0;
            const ritmo = dias > 0 && destaque.tempo > 0 ? Math.round(destaque.tempo / dias) : null;
            const ac = accentOf(destaque, 0);
            return (
              <section
                className="relative overflow-hidden rounded-3xl border p-4 sm:p-5"
                style={{
                  borderColor: ac + '55',
                  background: `linear-gradient(150deg, ${ac}2e 0%, #0c0f1a 55%, #0a0d16 100%)`,
                }}
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${ac}, transparent)` }} />
                <div className="flex gap-4">
                  <div onClick={() => onSelectGame(destaque)} className="w-28 sm:w-32 shrink-0 cursor-pointer">
                    <GameCover
                      capa={destaque.capa}
                      nome={destaque.nome}
                      genero={destaque.genero}
                      consoleName={destaque.console}
                      aspect="portrait"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: ac }}>
                      {destaque.status === 'pausado' ? '⏸ Pausado' : '🔥 Jogando agora'}
                    </p>
                    <h2
                      onClick={() => onSelectGame(destaque)}
                      className="mt-0.5 font-display text-xl font-bold leading-tight text-white cursor-pointer hover:text-cyan-300 line-clamp-2"
                    >
                      {destaque.nome}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase"
                        style={{ color: getConsoleColor(destaque.console), background: getConsoleColor(destaque.console) + '1a', border: `1px solid ${getConsoleColor(destaque.console)}55` }}
                      >
                        <ConsoleIcon name={destaque.console} className="h-3 w-3" />
                        {destaque.console}
                      </span>
                      <span className="rounded-md border border-slate-700/70 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                        {destaque.genero}
                      </span>
                    </div>
                    {destaque.inicio && (
                      <p className="mt-2 text-xs text-slate-400">Iniciado em {formatDateBR(destaque.inicio)}</p>
                    )}
                  </div>
                </div>

                {/* Tempo e progresso */}
                <div className="mt-4 rounded-2xl border bg-slate-950/70 p-4" style={{ borderColor: ac + '40' }}>
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-display text-3xl font-bold tabular-nums" style={{ color: ac }}>
                      {formatMinutes(destaque.tempo)}
                      {destaque.est ? (
                        <span className="ml-1.5 text-xs font-medium text-slate-500">/ ~{destaque.est}h estimadas</span>
                      ) : null}
                    </p>
                    {pct !== null && <span className="font-display text-lg font-bold text-fuchsia-300">{pct}%</span>}
                  </div>
                  {pct !== null && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ac}, #f0abfc)` }}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" style={{ color: ac }} />
                      {ritmo !== null ? `Ritmo: ~${formatMinutes(ritmo)} / dia` : 'Sem ritmo ainda'}
                    </span>
                    {faltam !== null && faltam > 0 && (
                      <span className="font-bold uppercase text-slate-300">Faltam {formatMinutes(faltam)}</span>
                    )}
                  </div>
                </div>

                {/* Registro rápido */}
                <p className="mt-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Registro rápido de sessão
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onQuickAddTime(destaque.id, 30)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900 py-3 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" /> 30 min
                  </button>
                  <button
                    onClick={() => onQuickAddTime(destaque.id, 60)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900 py-3 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" /> 1 hora
                  </button>
                  <button
                    onClick={() => onAdjustTime(destaque)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-400/10 py-3 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/20"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Ajustar
                  </button>
                </div>

                <button
                  onClick={() => onQuickFinish(destaque)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 py-3.5 text-sm font-bold uppercase tracking-wide text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-300"
                >
                  <Trophy className="h-4 w-4" /> Marcar como zerado
                </button>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <select
                    value={destaque.status}
                    onChange={(e) => onUpdateGameStatus(destaque.id, e.target.value as any)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300"
                  >
                    <option value="jogando">Jogando</option>
                    <option value="pausado">Pausado</option>
                    <option value="backlog">Voltar p/ Backlog</option>
                  </select>
                  <button
                    onClick={() => onDeleteGame(destaque.id)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-950/40 hover:text-rose-400"
                    aria-label={`Excluir ${destaque.nome}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir jogo
                  </button>
                </div>
              </section>
            );
          })()}

          {/* ===================== OUTROS EM ANDAMENTO ===================== */}
          {outros.length > 0 && (
            <section aria-labelledby="others-title">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" />
                  <h2 id="others-title" className="font-display text-sm font-bold uppercase tracking-wide text-white">
                    Outros em andamento
                  </h2>
                </div>
                <span className="text-xs text-slate-500">{outros.length} {outros.length === 1 ? 'jogo' : 'jogos'}</span>
              </div>

              <div className="space-y-3">
                {outros.map((game, idx) => {
                  const pct = percentOf(game);
                  const ac = accentOf(game, idx + 1);
                  const cc = getConsoleColor(game.console);
                  return (
                    <div
                      key={game.id}
                      className="rounded-2xl border p-3"
                      style={{
                        borderColor: ac + '40',
                        background: `linear-gradient(120deg, ${ac}1c 0%, rgba(15,23,42,0.6) 60%)`,
                        borderLeft: `3px solid ${ac}`,
                      }}
                    >
                      <div className="flex gap-3">
                        <div onClick={() => onSelectGame(game)} className="w-16 shrink-0 cursor-pointer">
                          <GameCover
                            capa={game.capa}
                            nome={game.nome}
                            genero={game.genero}
                            consoleName={game.console}
                            aspect="portrait"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase">
                            <span className="inline-flex min-w-0 items-center gap-1 truncate" style={{ color: cc }}>
                              <ConsoleIcon name={game.console} className="h-3 w-3 shrink-0" />
                              <span className="truncate">{game.console}</span>
                            </span>
                            {game.status === 'pausado' && <span className="text-amber-400">⏸ Pausado</span>}
                          </div>
                          <h3
                            onClick={() => onSelectGame(game)}
                            className="cursor-pointer truncate font-display text-sm font-bold text-white hover:text-cyan-300"
                          >
                            {game.nome}
                          </h3>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="font-display text-base font-bold tabular-nums" style={{ color: ac }}>
                              {formatMinutes(game.tempo)}
                            </span>
                            {pct !== null && <span className="text-xs font-bold text-fuchsia-300">{pct}%</span>}
                          </div>
                          {pct !== null && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${ac}, #f0abfc)` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-800/60 pt-2">
                        <button
                          onClick={() => onQuickAddTime(game.id, 30)}
                          className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                        >
                          +30m
                        </button>
                        <button
                          onClick={() => onQuickAddTime(game.id, 60)}
                          className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                        >
                          +1h
                        </button>
                        <button
                          onClick={() => onAdjustTime(game)}
                          className="flex items-center gap-1 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
                        >
                          <Pencil className="h-3 w-3" /> Ajustar
                        </button>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => onQuickFinish(game)}
                            className="rounded-md p-1.5 text-emerald-400 hover:bg-emerald-950/40"
                            title="Marcar como zerado"
                            aria-label={`Marcar ${game.nome} como zerado`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => onDeleteGame(game.id)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400"
                            title="Excluir jogo"
                            aria-label={`Excluir ${game.nome}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* HISTÓRICO DE JOGOS ZERADOS */}
      {/* ========================================================================= */}
      <section aria-labelledby="completed-games-title">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-cyan-400" />
            <h2 id="completed-games-title" className="font-display text-base font-bold text-white">
              Histórico de Zerados ({zerados.length})
            </h2>
          </div>
        </div>

        {zerados.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhum jogo concluído ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="py-3 px-3 sm:px-4">Jogo</th>
                  <th className="py-3 px-3 sm:px-4">Console</th>
                  <th className="py-3 px-3 sm:px-4">Início</th>
                  <th className="py-3 px-3 sm:px-4">Conclusão</th>
                  <th className="py-3 px-3 sm:px-4">Tempo Total</th>
                  <th className="py-3 px-3 sm:px-4">Nota</th>
                  <th className="py-3 px-3 sm:px-4">Dificuldade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {zerados.map((game) => (
                  <tr
                    key={game.id}
                    onClick={() => onSelectGame(game)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 sm:px-4 font-medium text-white hover:text-cyan-400">
                      {game.nome}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-400">{game.console}</td>
                    <td className="py-3 px-3 sm:px-4 text-slate-400">{formatDateBR(game.inicio)}</td>
                    <td className="py-3 px-3 sm:px-4 text-slate-300 font-medium">
                      {formatDateBR(game.fim)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 tabular-nums font-mono">
                      {formatMinutes(game.tempo)}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {game.nota !== null && typeof game.nota === 'number' ? (
                        <div className="flex items-center gap-1 text-amber-300 font-medium">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{game.nota.toFixed(1)}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-400">{game.dificuldade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

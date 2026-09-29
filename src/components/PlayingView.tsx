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

  const jogando = [...jogandoBase].sort((a, b) => {
    if (filtro === 'recentes') return (b.inicio || '').localeCompare(a.inicio || '');
    if (filtro === 'perto') return (percentOf(b) ?? -1) - (percentOf(a) ?? -1);
    return 0;
  });

  const destaque = jogando[0];
  const outros = jogando.slice(1);

  const FILTROS: { id: Filtro; label: string }[] = [
    { id: 'todos', label: `Todos (${jogandoBase.length})` },
    { id: 'recentes', label: 'Mais recentes' },
    { id: 'perto', label: 'Perto do fim' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-2.5">
          <Gamepad2 className="h-5 w-5 text-cyan-400" />
          <h1 className="font-display text-base sm:text-lg font-bold text-white">
            {jogandoBase.length} {jogandoBase.length === 1 ? 'jogo em andamento' : 'jogos em andamento'}
          </h1>
        </div>
        <button
          onClick={onOpenAddModal}
          className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
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
            return (
              <section className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-5">
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
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                      {destaque.status === 'pausado' ? 'Pausado' : 'Jogando agora'}
                    </p>
                    <h2
                      onClick={() => onSelectGame(destaque)}
                      className="mt-0.5 font-display text-xl font-bold leading-tight text-white cursor-pointer hover:text-cyan-300 line-clamp-2"
                    >
                      {destaque.nome}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                        {destaque.console}
                      </span>
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                        {destaque.genero}
                      </span>
                    </div>
                    {destaque.inicio && (
                      <p className="mt-2 text-xs text-slate-400">Iniciado em {formatDateBR(destaque.inicio)}</p>
                    )}
                  </div>
                </div>

                {/* Tempo e progresso */}
                <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
                  <div className="flex items-end justify-between gap-2">
                    <p className="font-display text-3xl font-bold tabular-nums text-cyan-300">
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
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-cyan-400" />
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
                {outros.map((game) => {
                  const pct = percentOf(game);
                  return (
                    <div key={game.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
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
                          <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase text-cyan-400">
                            <span className="truncate">{game.console}</span>
                            {game.status === 'pausado' && <span className="text-amber-400">Pausado</span>}
                          </div>
                          <h3
                            onClick={() => onSelectGame(game)}
                            className="cursor-pointer truncate font-display text-sm font-bold text-white hover:text-cyan-300"
                          >
                            {game.nome}
                          </h3>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="font-display text-base font-bold tabular-nums text-white">
                              {formatMinutes(game.tempo)}
                            </span>
                            {pct !== null && <span className="text-xs font-bold text-fuchsia-300">{pct}%</span>}
                          </div>
                          {pct !== null && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500"
                                style={{ width: `${pct}%` }}
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

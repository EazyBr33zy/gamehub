import React, { useState, useEffect } from 'react';
import {
  Trophy,
  X,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Game } from '../types';
import { GameCover } from './GameCover';
import { formatMinutes } from '../utils/storage';
import { DurationInput } from './DurationInput';

interface FinishGameModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onConfirmFinish: (
    gameId: string,
    fimDate: string,
    nota: number | null,
    totalMinutes: number,
    review: string
  ) => void;
}

export const FinishGameModal: React.FC<FinishGameModalProps> = ({
  isOpen,
  game,
  onClose,
  onConfirmFinish,
}) => {
  const [fimDate, setFimDate] = useState<string>('');
  const [minutos, setMinutos] = useState<number>(0);
  const [nota, setNota] = useState<string>('9.0');
  const [review, setReview] = useState<string>('');

  useEffect(() => {
    if (game) {
      const ultimaSessao = game.sessoes && game.sessoes.length > 0 ? game.sessoes[game.sessoes.length - 1].data : '';
      setFimDate(game.fim || ultimaSessao || new Date().toISOString().slice(0, 10));
      setMinutos(Math.max(0, Math.round(game.tempo || 0)));
      setNota(game.nota !== null && game.nota !== undefined ? String(game.nota) : '9.0');
      setReview(game.notasPessoais || '');
    }
  }, [game, isOpen]);

  if (!isOpen || !game) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalMinutes = Math.max(0, Math.round(minutos));
    const finalNota = nota !== '' ? Math.min(10, Math.max(0, parseFloat(nota))) : null;

    onConfirmFinish(
      game.id,
      fimDate || new Date().toISOString().slice(0, 10),
      finalNota,
      finalMinutes,
      review.trim()
    );
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-slate-900 shadow-2xl p-6 my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Celebration header */}
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 text-slate-950 shadow-lg shadow-emerald-500/20">
            <Trophy className="h-6 w-6 stroke-[2.5]" />
          </div>
          <h2 id="finish-modal-title" className="font-display text-xl font-bold text-white">
            Parabéns! Jogo Zerado!
          </h2>
          <p className="text-xs text-slate-400">
            Registre os detalhes finais e adicione mais uma vitória ao seu histórico gamer.
          </p>
        </div>

        {/* Game summary preview */}
        <div className="flex items-center gap-3.5 rounded-xl border border-slate-800 bg-slate-950/60 p-3 mb-5">
          <div className="w-14 shrink-0">
            <GameCover
              capa={game.capa}
              nome={game.nome}
              genero={game.genero}
              consoleName={game.console}
              aspect="portrait"
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-bold text-white truncate">
              {game.nome}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {game.console} · {game.genero}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nota */}
          <div>
            <label className="block text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1">
              Sua Nota (0 a 10)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                required
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                className="w-28 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white font-bold text-center focus:outline-none focus:border-cyan-500"
              />
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-5 w-5 fill-amber-400" />
                <span className="text-sm font-bold text-white">{nota} / 10</span>
              </div>
            </div>
          </div>

          {/* Horas Totais & Data Conclusão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Tempo Final (horas : min)
              </label>
              <DurationInput minutes={minutos} onChange={setMinutos} />
              {(game.sessoes?.length || 0) > 0 && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Já somado de {game.sessoes!.length} {game.sessoes!.length === 1 ? 'sessão' : 'sessões'}:{' '}
                  <span className="font-semibold text-cyan-300">{formatMinutes(game.tempo || 0)}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Data em que Zerou
              </label>
              <input
                type="date"
                required
                value={fimDate}
                onChange={(e) => setFimDate(e.target.value)}
                className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Review / Considerações finais */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Veredito Final / Anotações
            </label>
            <textarea
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="O que achou do jogo? Chefe mais difícil? Momentos inesquecíveis?"
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-sm transition-all"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Confirmar Vitória</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

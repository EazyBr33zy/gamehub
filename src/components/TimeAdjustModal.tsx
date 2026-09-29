import React, { useEffect, useState } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { Game, PlaySession } from '../types';
import { formatMinutes, sessionMinutes } from '../utils/storage';
import { DurationInput } from './DurationInput';

interface TimeAdjustModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  /** Recebe o NOVO tempo total do jogo, em minutos (modos "somar" e "definir") */
  onApply: (gameId: string, newTotalMinutes: number) => void;
  /** Registra uma sessão (dia + hora de início e fim) */
  onApplySession: (gameId: string, session: PlaySession) => void;
}

type Mode = 'sessao' | 'somar' | 'definir';

const today = () => new Date().toISOString().slice(0, 10);

const inputClass =
  'w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]';

export const TimeAdjustModal: React.FC<TimeAdjustModalProps> = ({
  isOpen,
  game,
  onClose,
  onApply,
  onApplySession,
}) => {
  const [mode, setMode] = useState<Mode>('sessao');
  const [value, setValue] = useState(0);
  const [data, setData] = useState(today());
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  useEffect(() => {
    if (isOpen && game) {
      setMode('sessao');
      setValue(0);
      setData(today());
      setInicio('');
      setFim('');
    }
  }, [isOpen, game]);

  if (!isOpen || !game) return null;

  const atual = game.tempo || 0;
  const minSessao = sessionMinutes(inicio, fim);
  const passouMeiaNoite = !!inicio && !!fim && fim < inicio;

  const novoTotal = mode === 'sessao' ? atual + minSessao : mode === 'somar' ? atual + value : value;
  const podeAplicar = mode === 'sessao' ? !!data && minSessao > 0 : mode === 'somar' ? value > 0 : true;

  const handleApply = () => {
    if (!podeAplicar) return;
    if (mode === 'sessao') {
      onApplySession(game.id, {
        id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        data,
        inicio,
        fim,
        minutos: minSessao,
      });
    } else {
      onApply(game.id, novoTotal);
    }
    onClose();
  };

  const MODES: { id: Mode; label: string }[] = [
    { id: 'sessao', label: 'Sessão' },
    { id: 'somar', label: 'Somar tempo' },
    { id: 'definir', label: 'Definir total' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/85 backdrop-blur-sm p-0 sm:p-4"
    >
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-slate-800 bg-slate-900 p-5 pb-safe shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-1 text-cyan-400 text-xs font-semibold uppercase tracking-wider">
          <Clock className="h-4 w-4" />
          <span>Registrar tempo de jogo</span>
        </div>
        <h2 className="font-display text-lg font-bold text-white pr-8 truncate">{game.nome}</h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-4">
          Tempo registrado agora: <span className="font-semibold text-slate-200">{formatMinutes(atual)}</span>
        </p>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 mb-4">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors ${
                mode === m.id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'sessao' ? (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Dia da sessão
              </label>
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Começou às
                </label>
                <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputClass} />
              </div>
              <span className="pb-3 text-xs text-slate-500">até</span>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Terminou às
                </label>
                <input type="time" value={fim} onChange={(e) => setFim(e.target.value)} className={inputClass} />
              </div>
            </div>
            <p className="text-xs text-center">
              {minSessao > 0 ? (
                <span className="font-semibold text-cyan-300">
                  Sessão de {formatMinutes(minSessao)}
                  {passouMeiaNoite ? ' (passou da meia-noite)' : ''}
                </span>
              ) : (
                <span className="text-slate-500">Informe o horário de início e de fim</span>
              )}
            </p>
          </div>
        ) : (
          <DurationInput minutes={value} onChange={setValue} />
        )}

        <p className="mt-4 text-xs text-slate-400 text-center">
          Novo total: <span className="font-display text-base font-bold text-white">{formatMinutes(novoTotal)}</span>
        </p>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={!podeAplicar}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded-xl"
          >
            <Check className="h-4 w-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
};

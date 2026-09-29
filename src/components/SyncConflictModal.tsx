import React from 'react';
import { AlertTriangle, Cloud, Smartphone } from 'lucide-react';
import { SyncApi } from '../hooks/useServerSync';
import { Game } from '../types';

const fmtWhen = (iso?: string) => {
  if (!iso) return 'data desconhecida';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'data desconhecida' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const SyncConflictModal: React.FC<{ sync: SyncApi; localGames: Game[] }> = ({ sync, localGames }) => {
  if (!sync.conflictOpen || !sync.conflict) return null;
  const server = sync.conflict;
  const serverCount = server.games?.length ?? 0;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold">Os dados são diferentes</h2>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          O servidor tem uma versão diferente da que está neste aparelho (por exemplo, você cadastrou jogos em outro
          aparelho). Escolha qual manter. Nada é apagado sem cópia de segurança.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <Cloud className="mx-auto h-5 w-5 text-cyan-300" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Servidor</p>
            <p className="font-display text-xl font-bold text-white">{serverCount}</p>
            <p className="text-[10px] text-slate-500">jogos · {fmtWhen(server.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <Smartphone className="mx-auto h-5 w-5 text-fuchsia-300" />
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Este aparelho</p>
            <p className="font-display text-xl font-bold text-white">{localGames.length}</p>
            <p className="text-[10px] text-slate-500">jogos</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <button
            onClick={sync.resolveUseServer}
            className="w-full rounded-xl bg-cyan-400 px-4 py-3 text-left text-sm font-bold text-slate-950 hover:bg-cyan-300"
          >
            Usar os dados do servidor
            <span className="block text-[11px] font-medium text-slate-800">
              Substitui os deste aparelho. Um arquivo de backup deles é baixado antes.
            </span>
          </button>
          <button
            onClick={sync.resolveUseLocal}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left text-sm font-bold text-white hover:bg-slate-700"
          >
            Manter os deste aparelho
            <span className="block text-[11px] font-medium text-slate-400">
              Sobrescreve o servidor, que guarda uma cópia da versão anterior.
            </span>
          </button>
          <button onClick={sync.closeConflict} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">
            Decidir depois (as alterações ficam salvas só neste aparelho por enquanto)
          </button>
        </div>
      </div>
    </div>
  );
};

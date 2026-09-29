import React, { useState } from 'react';
import { Cloud, CloudOff, Copy, Check, RefreshCw, KeyRound, AlertTriangle } from 'lucide-react';
import { SyncApi } from '../hooks/useServerSync';
import { defaultEndpoint } from '../utils/sync';

const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const arr = new Uint32Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join('');
};

const fmtWhen = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

export const SyncPanel: React.FC<{ sync: SyncApi }> = ({ sync }) => {
  const [senha, setSenha] = useState('');
  const [url, setUrl] = useState(defaultEndpoint());
  const [showUrl, setShowUrl] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const configCode = `<?php return ['key' => '${senha || 'SUA-SENHA-AQUI'}'];`;

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEnable = async () => {
    setError('');
    if (senha.trim().length < 12) {
      setError('A senha precisa ter pelo menos 12 caracteres. Use o botão "Gerar senha".');
      return;
    }
    setBusy(true);
    const res = await sync.enable(url.trim(), senha.trim());
    setBusy(false);
    if (!res.ok) setError(res.message || 'Não consegui ativar.');
  };

  const box = 'mb-4 rounded-xl border p-3.5';

  /* ------------------------- Ativado ------------------------- */
  if (sync.settings) {
    const st = sync.status;
    const ok = st === 'ok';
    const warn = st === 'error' || st === 'conflict';
    return (
      <div className={`${box} ${warn ? 'border-amber-500/40 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
          {warn ? <AlertTriangle className="h-4 w-4 text-amber-300" /> : <Cloud className="h-4 w-4 text-emerald-300" />}
          <span className={warn ? 'text-amber-300' : 'text-emerald-300'}>Salvamento no servidor ativado</span>
        </div>
        <p className="mt-1.5 text-xs text-slate-300">
          {ok && 'Tudo o que você cadastra é enviado automaticamente para o seu servidor.'}
          {(st === 'syncing' || st === 'checking') && 'Enviando...'}
          {st === 'error' && `${sync.message} Suas alterações continuam salvas neste aparelho e serão reenviadas.`}
          {st === 'conflict' && sync.message}
        </p>
        {sync.settings.lastSyncAt && (
          <p className="mt-1 text-[11px] text-slate-500">Última sincronização: {fmtWhen(sync.settings.lastSyncAt)}</p>
        )}
        <p className="mt-1 text-[11px] text-slate-500">
          O servidor guarda também cópias de segurança automáticas (até 40 versões).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {st === 'conflict' && (
            <button
              onClick={sync.openConflict}
              className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-300"
            >
              Resolver agora
            </button>
          )}
          <button
            onClick={() => sync.syncNow()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Sincronizar agora
          </button>
          <button
            onClick={() => {
              if (confirm('Desativar o salvamento no servidor neste aparelho? Os dados já enviados continuam no servidor.')) sync.disable();
            }}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-400"
          >
            Desativar
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------- Desativado ------------------------- */
  return (
    <div className={`${box} border-cyan-500/30 bg-cyan-500/5`}>
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
        <CloudOff className="h-4 w-4" />
        <span>Salvar também no servidor (recomendado)</span>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">
        Hoje seus dados ficam só neste navegador: se você limpar o histórico ou trocar de aparelho, eles somem. Ativando isto,
        cada alteração é enviada para a sua hospedagem, com cópias de segurança, e você usa os mesmos jogos no PC e no celular.
      </p>

      <ol className="mt-3 space-y-3 text-[11px] text-slate-300">
        <li>
          <span className="font-bold text-cyan-300">1. Crie uma senha.</span>
          <div className="mt-1.5 flex gap-2">
            <input
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="mínimo 12 caracteres"
              className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => setSenha(generatePassword())}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <KeyRound className="h-3.5 w-3.5" /> Gerar senha
            </button>
          </div>
        </li>
        <li>
          <span className="font-bold text-cyan-300">2. Crie o arquivo da senha no servidor.</span> No cPanel, abra o
          Gerenciador de Arquivos, vá para a pasta inicial da conta (a que fica <em>acima</em> da pasta do seu site) e crie um
          arquivo chamado <code className="text-cyan-200">gamehub-config.php</code> com este conteúdo:
          <div className="mt-1.5 flex items-start gap-2 rounded-lg bg-slate-950 p-2.5">
            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-emerald-300">{configCode}</code>
            <button onClick={() => copy(configCode)} className="shrink-0 text-slate-400 hover:text-white" aria-label="Copiar">
              {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </li>
        <li>
          <span className="font-bold text-cyan-300">3. Ative.</span> O site publicado precisa ter a pasta{' '}
          <code className="text-cyan-200">api</code> (ela já vem no build). Depois é só clicar aqui:
          <button
            onClick={handleEnable}
            disabled={busy}
            className="mt-2 w-full rounded-lg bg-cyan-400 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
          >
            {busy ? 'Testando conexão...' : 'Ativar salvamento no servidor'}
          </button>
        </li>
      </ol>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </p>
      )}

      <button onClick={() => setShowUrl((v) => !v)} className="mt-3 text-[10px] text-slate-500 hover:text-slate-300">
        {showUrl ? 'Ocultar' : 'Avançado: endereço do script'}
      </button>
      {showUrl && (
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-slate-300 focus:border-cyan-500 focus:outline-none"
        />
      )}
    </div>
  );
};

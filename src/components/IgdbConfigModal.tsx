import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { KeyRound, CheckCircle2, AlertCircle, RefreshCw, Trash2, ExternalLink, ShieldAlert } from 'lucide-react';
import { getIgdbConfig, saveIgdbConfig, clearIgdbConfig, testIgdbConnection } from '../utils/igdbService';
import { showToast } from '../utils/toast';

interface IgdbConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const IgdbConfigModal: React.FC<IgdbConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getIgdbConfig();
      setClientId(config.clientId || '');
      setClientSecret(config.clientSecret || '');
      setAccessToken(config.accessToken || '');
      setFeedback(null);
    }
  }, [isOpen]);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanClientId = clientId.trim();
    const cleanSecret = clientSecret.trim();
    const cleanToken = accessToken.trim();

    if (!cleanClientId) {
      setFeedback({ type: 'error', message: 'O Client ID da Twitch/IGDB é obrigatório.' });
      return;
    }

    if (!cleanSecret && !cleanToken) {
      setFeedback({ type: 'error', message: 'Informe o Client Secret ou um Token de Acesso válido.' });
      return;
    }

    setIsTesting(true);

    try {
      const res = await testIgdbConnection(cleanClientId, cleanSecret, cleanToken || undefined);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        showToast('API do IGDB conectada com sucesso!', 'success');
        if (onSaved) onSaved();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro inesperado ao conectar.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    clearIgdbConfig();
    setClientId('');
    setClientSecret('');
    setAccessToken('');
    setFeedback(null);
    showToast('Chaves do IGDB apagadas deste navegador.', 'info');
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuração da API do IGDB"
      icon={<KeyRound className="h-5 w-5 text-[#22d3ee]" aria-hidden="true" />}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleTestAndSave} className="space-y-4">
        <p className="text-xs text-[#9aa4b2] leading-relaxed">
          Conecte sua conta de desenvolvedor da Twitch/IGDB para buscar capas oficiais automaticamente em alta definição (2x) diretamente da base de dados do IGDB.
        </p>

        {/* Aviso de Segurança, Armazenamento Local e Proxy */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200/90 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-300 uppercase tracking-wide text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
            <span>Aviso de Armazenamento Local & Proxy</span>
          </div>
          <p className="text-xs leading-relaxed text-amber-100/80">
            O <strong>Client Secret</strong> fica salvo localmente neste navegador (localStorage). As consultas podem passar por um proxy público (<strong>corsproxy.io</strong>) para contornar restrições de CORS da API da Twitch.
          </p>
        </div>

        {/* Client ID */}
        <div>
          <label htmlFor="igdb-client-id" className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
            Client ID (Twitch / IGDB) *
          </label>
          <input
            id="igdb-client-id"
            type="text"
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Ex: u8x7a9bcdef0123456789..."
            className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-600 focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
          />
        </div>

        {/* Client Secret */}
        <div>
          <label htmlFor="igdb-client-secret" className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
            Client Secret (Chave Secreta)
          </label>
          <input
            id="igdb-client-secret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Ex: klmno9876543210..."
            className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-600 focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
          />
          <p className="text-xs text-[#9aa4b2] mt-1">
            Usado para gerar e renovar tokens de acesso automaticamente em segundo plano.
          </p>
        </div>

        {/* Token de Acesso Opcional */}
        <div>
          <label htmlFor="igdb-access-token" className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
            Token de Acesso Bearer (Opcional)
          </label>
          <input
            id="igdb-access-token"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Ex: oauth:..."
            className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-600 focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
          />
          <p className="text-xs text-[#9aa4b2] mt-1">
            Preencha apenas se você já possui um token fixo e não deseja informar o Client Secret.
          </p>
        </div>

        {/* Feedback visual */}
        {feedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-red-500/10 border-red-500/40 text-red-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" aria-hidden="true" />
            )}
            <div className="leading-relaxed">{feedback.message}</div>
          </div>
        )}

        {/* Links de ajuda */}
        <div className="rounded-lg bg-black/40 border border-[#30363d]/60 p-3 text-xs text-[#9aa4b2] space-y-1">
          <div className="font-bold text-white flex items-center justify-between">
            <span>Como obter as credenciais da Twitch:</span>
            <a
              href="https://dev.twitch.tv/console/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#22d3ee] hover:underline flex items-center gap-1 font-mono text-xs"
            >
              <span>dev.twitch.tv</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <ol className="list-decimal pl-4 space-y-0.5 text-xs">
            <li>Acesse o Console de Desenvolvedores da Twitch e crie uma Aplicação.</li>
            <li>Defina a URL de redirecionamento como <code className="text-[#22d3ee]">http://localhost</code>.</li>
            <li>Copie o <strong>Client ID</strong> e clique em <strong>Novo Segredo</strong> para gerar o <strong>Client Secret</strong>.</li>
          </ol>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-[#30363d]/60">
          <div>
            <button
              type="button"
              onClick={handleClear}
              className="w-full sm:w-auto min-h-[40px] px-3.5 py-2 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              title="Apagar credenciais do IGDB salvas localmente neste navegador"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Apagar chaves deste navegador</span>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 rounded-xl border border-[#30363d] text-xs font-bold text-[#9aa4b2] hover:text-white cursor-pointer transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="min-h-[40px] px-5 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] text-xs font-black uppercase tracking-wider text-[#0d1117] cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#22d3ee]/20"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Testar & Salvar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

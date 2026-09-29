import React, { useState } from 'react';
import {
  DownloadCloud,
  UploadCloud,
  Copy,
  Check,
  X,
  RotateCcw,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  FolderOpen,
  FileText
} from 'lucide-react';
import { Game, AppConfig } from '../types';
import { DEFAULT_GAMES } from '../data/defaultGames';
import { SyncPanel } from './SyncPanel';
import { SyncApi } from '../hooks/useServerSync';
import { getLastBackup, markBackupDone } from '../utils/storage';
import { ImportPreview, ObsidianFile, buildPreview, mergeImported } from '../utils/obsidian';
import { fillMissingCovers } from '../utils/covers';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  config: AppConfig;
  onImportGames: (importedGames: Game[], importedConfig?: Partial<AppConfig>) => void;
  onResetToDefaults: () => void;
  sync: SyncApi;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  games,
  config,
  onImportGames,
  onResetToDefaults,
  sync,
}) => {
  const [backupText, setBackupText] = useState('');
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [obsPreview, setObsPreview] = useState<ImportPreview | null>(null);
  const [obsLoading, setObsLoading] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  React.useEffect(() => {
    if (isOpen) navigator.storage?.persisted?.().then(setPersisted).catch(() => setPersisted(null));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExportJSON = () => {
    const payload = {
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      meta: config.metaAnual,
      jogos: games,
    };
    const jsonStr = JSON.stringify(payload, null, 2);
    setBackupText(jsonStr);

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gamehub_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    markBackupDone();
  };

  const handleCopyText = () => {
    if (!backupText) {
      const payload = {
        meta: config.metaAnual,
        jogos: games,
      };
      const jsonStr = JSON.stringify(payload);
      setBackupText(jsonStr);
      navigator.clipboard.writeText(jsonStr);
    } else {
      navigator.clipboard.writeText(backupText);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImportText = () => {
    if (!backupText.trim()) {
      alert('Cole o JSON de backup no campo de texto para importar.');
      return;
    }
    try {
      let parsed = JSON.parse(backupText.trim());
      let importedGames: Game[] = [];
      let importedMeta: number | undefined;

      if (Array.isArray(parsed)) {
        importedGames = parsed;
      } else if (parsed && Array.isArray(parsed.jogos)) {
        importedGames = parsed.jogos;
        if (typeof parsed.meta === 'number') importedMeta = parsed.meta;
      } else {
        throw new Error('Formato não reconhecido');
      }

      if (importedGames.length === 0) {
        alert('Nenhum jogo encontrado no arquivo importado.');
        return;
      }

      if (
        confirm(
          `Deseja importar ${importedGames.length} jogos? Isso mesclará/atualizará sua biblioteca atual.`
        )
      ) {
        onImportGames(importedGames, importedMeta ? { metaAnual: importedMeta } : undefined);
        setImportStatus(`Sucesso! ${importedGames.length} jogos carregados.`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      alert('Texto JSON inválido. Certifique-se de colar o conteúdo exportado do Game Hub.');
    }
  };

  // ---- Importar notas do Obsidian (.md) ----
  const handleObsidianFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []).filter((f) => /\.md$/i.test(f.name));
    e.target.value = '';
    if (list.length === 0) {
      alert('Nenhum arquivo .md encontrado. Escolha a pasta das suas notas de jogos ou os arquivos .md.');
      return;
    }
    setObsLoading(true);
    try {
      const files: ObsidianFile[] = await Promise.all(
        list.map(async (f) => ({
          name: f.name,
          path: (f as any).webkitRelativePath || f.name,
          text: await f.text(),
        }))
      );
      setObsPreview(buildPreview(files, games));
    } catch (err) {
      alert('Não consegui ler os arquivos: ' + err);
    } finally {
      setObsLoading(false);
    }
  };

  const [autoCoverBusy, setAutoCoverBusy] = useState(false);

  const handleConfirmObsidian = async (withCovers: boolean) => {
    if (!obsPreview) return;
    const preview = obsPreview; // guarda antes de limpar o estado
    const merged = mergeImported(games, preview.imported);
    setObsPreview(null);
    if (withCovers) {
      setAutoCoverBusy(true);
      try {
        const filled = await fillMissingCovers(merged, (d, t) =>
          setImportStatus(`Buscando capas... ${d}/${t}`)
        );
        setImportStatus(
          `Pronto! ${preview.novos} jogos novos e ${preview.atualizados} atualizados. Capas encontradas: ${filled}.`
        );
      } catch {
        setImportStatus(
          `Pronto! ${preview.novos} jogos novos e ${preview.atualizados} atualizados (a busca de capas falhou).`
        );
      } finally {
        setAutoCoverBusy(false);
        onImportGames(merged);
      }
    } else {
      onImportGames(merged);
      setImportStatus(
        `Pronto! ${preview.novos} jogos novos e ${preview.atualizados} atualizados a partir do Obsidian.`
      );
    }
  };

  /** Busca capas apenas nos jogos que ainda não têm imagem */
  const handleFillCovers = async () => {
    setAutoCoverBusy(true);
    try {
      const copy = games.map((g) => ({ ...g }));
      const filled = await fillMissingCovers(copy, (d, t) =>
        setImportStatus(`Buscando capas... ${d}/${t}`)
      );
      if (filled > 0) onImportGames(copy);
      setImportStatus(
        filled > 0
          ? `Capas adicionadas em ${filled} jogo(s). Os demais ficaram com o card colorido padrão.`
          : 'Nenhuma capa nova foi encontrada. Dica: informe uma chave RAWG abaixo para melhorar os resultados.'
      );
    } finally {
      setAutoCoverBusy(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setBackupText(content);
      } catch (err) {
        alert('Erro ao ler arquivo: ' + err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 my-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <DownloadCloud className="h-5 w-5 text-cyan-400" />
          <h2 id="backup-modal-title" className="font-display text-lg font-bold text-white">
            Backup & Sincronização
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Seus dados ficam salvos com segurança no seu navegador. Exporte para guardar no seu computador ou transferir para outro celular/PC.
        </p>

        <SyncPanel sync={sync} />

        {/* Quick action buttons */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleExportJSON}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors"
          >
            <DownloadCloud className="h-4 w-4 text-cyan-400" />
            <span>Baixar Arquivo .json</span>
          </button>

          <label className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white border border-slate-700 transition-colors">
            <UploadCloud className="h-4 w-4 text-indigo-400" />
            <span>Carregar Arquivo .json</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <p className="-mt-2 mb-4 text-[11px] text-slate-500">
          Último backup baixado:{' '}
          {getLastBackup() ? new Date(getLastBackup()!).toLocaleDateString('pt-BR') : 'nunca'}
          {persisted !== null && (
            <> · Proteção do navegador contra limpeza automática: {persisted ? 'ativa' : 'não concedida'}</>
          )}
        </p>

        {/* Textarea for JSON copy/paste */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Conteúdo JSON</span>
            <button
              onClick={handleCopyText}
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Texto'}</span>
            </button>
          </div>
          <textarea
            rows={5}
            value={backupText}
            onChange={(e) => setBackupText(e.target.value)}
            placeholder="Cole o código JSON de um backup aqui para restaurar..."
            className="w-full rounded-lg bg-slate-950 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Importar do Obsidian */}
        <div className="mb-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/5 p-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-300">
            <FileText className="h-4 w-4" />
            <span>Importar do Obsidian</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Escolha a pasta das notas de jogos (ex.: Jogos/Zerados) ou vários arquivos .md. Cada nota com as propriedades
            (tempo, console, gênero, nota, capa, datas...) vira um jogo. Quem já existe é atualizado, nada é apagado.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700">
              <FolderOpen className="h-4 w-4 text-fuchsia-300" />
              <span>Escolher pasta</span>
              <input
                type="file"
                multiple
                onChange={handleObsidianFiles}
                className="hidden"
                {...({ webkitdirectory: '', directory: '' } as any)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700">
              <FileText className="h-4 w-4 text-fuchsia-300" />
              <span>Escolher arquivos .md</span>
              <input type="file" multiple accept=".md,text/markdown" onChange={handleObsidianFiles} className="hidden" />
            </label>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleFillCovers}
              disabled={autoCoverBusy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/40 disabled:opacity-50"
            >
              🖼️ {autoCoverBusy ? 'Buscando capas...' : 'Buscar capas dos jogos sem imagem'}
            </button>
            <input
              type="password"
              placeholder="Chave RAWG opcional (rawg.io) — melhora os resultados"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-fuchsia-400 focus:outline-none"
              onChange={(e) => {
                try {
                  if (e.target.value) localStorage.setItem('gamehub_rawg_key', e.target.value);
                  else localStorage.removeItem('gamehub_rawg_key');
                } catch {}
              }}
            />
          </div>

          {obsLoading && <p className="mt-3 text-xs text-slate-400">Lendo as notas...</p>}

          {obsPreview && (
            <div className="mt-3 rounded-lg bg-slate-950/80 p-3 text-xs">
              {obsPreview.imported.length === 0 ? (
                <p className="text-amber-300">
                  Nenhuma nota com propriedades de jogo foi encontrada ({obsPreview.ignorados} arquivos ignorados).
                </p>
              ) : (
                <>
                  <p className="text-slate-200">
                    <span className="font-bold text-emerald-300">{obsPreview.novos} novos</span> ·{' '}
                    <span className="font-bold text-cyan-300">{obsPreview.atualizados} atualizados</span>
                    {obsPreview.ignorados > 0 && <span className="text-slate-500"> · {obsPreview.ignorados} ignorados (sem propriedades)</span>}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    Ex.: {obsPreview.exemplos.join(', ')}
                    {obsPreview.imported.length > obsPreview.exemplos.length ? '...' : ''}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => setObsPreview(null)}
                      className="flex-1 rounded-lg bg-slate-800 py-2 font-semibold text-slate-300 hover:bg-slate-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleConfirmObsidian(false)}
                      className="flex-1 rounded-lg bg-slate-700 py-2 font-bold text-white hover:bg-slate-600"
                    >
                      Importar sem capas
                    </button>
                    <button
                      onClick={() => handleConfirmObsidian(true)}
                      disabled={autoCoverBusy}
                      className="flex-1 rounded-lg bg-fuchsia-400 py-2 font-bold text-slate-950 hover:bg-fuchsia-300 disabled:opacity-50"
                    >
                      Importar {obsPreview.imported.length} jogos + capas
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {importStatus && (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-300 text-center">
            {importStatus}
          </div>
        )}

        {/* Import & Reset Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => {
              if (confirm('Restaurar para a lista padrão de demonstração? Seus jogos atuais serão substituídos.')) {
                onResetToDefaults();
                onClose();
              }
            }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-amber-400 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Dados de Exemplo</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Fechar
            </button>
            <button
              onClick={handleImportText}
              disabled={!backupText.trim()}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 rounded-lg transition-all"
            >
              Importar Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

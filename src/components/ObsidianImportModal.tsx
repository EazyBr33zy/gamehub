import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { 
  FileUp, 
  Check, 
  FileText, 
  UploadCloud, 
  Sparkles, 
  Trash2, 
  FileJson, 
  Download, 
  HardDriveDownload, 
  FileDown, 
  Layers, 
  Image as ImageIcon, 
  CheckCircle2, 
  Table,
  AlertCircle
} from 'lucide-react';
import { 
  parseObsidianMarkdown, 
  parseMultiGameBacklog, 
  parseObsidianVaultFiles,
  extractCoverMappings, 
  normalizeTitleKey,
  formatTempoDisplay
} from '../utils/markdownParser';
import { GameItem, GameStatus } from '../types/game';
import { Modal } from './Modal';

const SAMPLE_PLAYING_MD = `---
tempo: 13:15
ano_zerado: 2026
console: Steam Deck
genero: Rpg
nota:
status: jogando
capa: https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co5scl.jpg
hltb: 15:10
hltb_real:
data_inicio: 2026-07-18
data_zerado:
---
![capa|300](https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co5scl.jpg)
## 📊 Ficha Técnica

| 🎯 Campo       | 📝 Valor  |
| -------------- | --------- |
| **Nota**       | ⭐⭐⭐⭐⭐ /10 |
| **Ano Zerado** | 2026      |
`;

const SAMPLE_BEATEN_MD = `---
tempo: 0:55
ano_zerado: 2023
console: Arcade
genero: Shmup
nota: 7
status: zerado
capa: https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2kqq.jpg
data_zerado: 2023-02-03
---
`;

export const ObsidianImportModal: React.FC = () => {
  const { 
    isImportModalOpen, 
    setIsImportModalOpen, 
    importObsidianFiles, 
    importDualObsidianFiles, 
    games, 
    clearAllGames, 
    exportBackupJSON, 
    importBackupJSON
  } = useGame();

  const { success, error, warning } = useToast();

  const [activeMode, setActiveMode] = useState<'upload' | 'dual' | 'paste' | 'backup'>('dual');
  const [pastedText, setPastedText] = useState('');
  const [pastedFileName, setPastedFileName] = useState('Meu Jogo Obsidian.md');
  const [previewGame, setPreviewGame] = useState<GameItem | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Upload Preview State
  const [uploadPreviewGames, setUploadPreviewGames] = useState<GameItem[]>([]);
  const [unreadFiles, setUnreadFiles] = useState<{ name: string; error: string }[]>([]);
  const [isUploadImporting, setIsUploadImporting] = useState(false);

  // Dual File Backlog + Capas State
  const [dualBacklogContent, setDualBacklogContent] = useState('');
  const [dualBacklogFileName, setDualBacklogFileName] = useState('');
  const [dualCoversContent, setDualCoversContent] = useState('');
  const [dualCoversFileName, setDualCoversFileName] = useState('');
  const [dualPreviewGames, setDualPreviewGames] = useState<GameItem[]>([]);
  const [dualMatchedCoversCount, setDualMatchedCoversCount] = useState(0);
  const [isDualImporting, setIsDualImporting] = useState(false);

  const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
    { value: 'jogando', label: '🎮 Jogando' },
    { value: 'fila', label: '📋 Na Fila' },
    { value: 'pausado', label: '⏸️ Pausado' },
    { value: 'abandonado', label: '🛑 Abandonado' },
    { value: 'wishlist', label: '✨ Wishlist' },
    { value: 'zerado', label: '🏆 Zerado' },
  ];

  const getSourceBadgeText = (source?: string): string => {
    switch (source) {
      case 'frontmatter': return 'frontmatter';
      case 'inline': return 'campo inline';
      case 'tag': return 'tag';
      case 'corpo': return 'texto no corpo';
      case 'arquivo': return 'pasta/arquivo';
      case 'manual': return 'alterado pelo dono';
      default: return 'não identificado';
    }
  };

  const getStatusBadgeClasses = (status: GameStatus, isUnidentified?: boolean): string => {
    if (isUnidentified) {
      return 'border-amber-500/50 bg-amber-500/15 text-amber-300';
    }
    switch (status) {
      case 'jogando':
        return 'border-cyan-500/50 bg-cyan-500/15 text-cyan-300';
      case 'zerado':
        return 'border-purple-500/50 bg-purple-500/15 text-purple-300';
      case 'abandonado':
        return 'border-amber-500/50 bg-amber-500/15 text-amber-400';
      case 'pausado':
        return 'border-amber-500/50 bg-amber-500/15 text-amber-300';
      case 'wishlist':
        return 'border-pink-500/50 bg-pink-500/15 text-pink-300';
      case 'fila':
      default:
        return 'border-slate-500/50 bg-slate-500/15 text-slate-300';
    }
  };

  if (!isImportModalOpen) return null;

  const handleClose = () => {
    setIsImportModalOpen(false);
  };

  const updateDualPreview = (backlogText: string, coversText: string, fileName = 'backlog.md') => {
    if (!backlogText.trim()) {
      setDualPreviewGames([]);
      setDualMatchedCoversCount(0);
      return;
    }

    const coverMap = coversText.trim() ? extractCoverMappings(coversText) : new Map<string, string>();
    const parsedGames = parseMultiGameBacklog(backlogText, fileName);

    let matched = 0;
    parsedGames.forEach((g) => {
      const key = normalizeTitleKey(g.title);
      const mapped = coverMap.get(key);
      if (mapped) {
        g.capa = mapped;
        matched++;
      }
    });

    setDualPreviewGames(parsedGames);
    setDualMatchedCoversCount(matched);
  };

  const handleDualBacklogUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setDualBacklogContent(text);
        setDualBacklogFileName(file.name);
        updateDualPreview(text, dualCoversContent, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDualCoversUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setDualCoversContent(text);
        setDualCoversFileName(file.name);
        updateDualPreview(dualBacklogContent, text, dualBacklogFileName || 'backlog.md');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateUploadStatus = (index: number, newStatus: GameStatus) => {
    setUploadPreviewGames((prev) =>
      prev.map((g, idx) =>
        idx === index
          ? {
              ...g,
              status: newStatus,
              statusUnidentified: false,
              statusSource: 'manual' as any,
            }
          : g
      )
    );
  };

  const handleUpdateDualStatus = (index: number, newStatus: GameStatus) => {
    setDualPreviewGames((prev) =>
      prev.map((g, idx) =>
        idx === index
          ? {
              ...g,
              status: newStatus,
              statusUnidentified: false,
              statusSource: 'manual' as any,
            }
          : g
      )
    );
  };

  const handleConfirmUploadImport = () => {
    if (uploadPreviewGames.length === 0) return;
    setIsUploadImporting(true);
    try {
      const res = importObsidianFiles(uploadPreviewGames);
      success(`${res.count} notas importadas com sucesso!`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setUploadPreviewGames([]);
        setUnreadFiles([]);
      }, 1500);
    } finally {
      setIsUploadImporting(false);
    }
  };

  const handleExecuteDualImport = async () => {
    if (dualPreviewGames.length > 0) {
      setIsDualImporting(true);
      try {
        const res = importObsidianFiles(dualPreviewGames);
        success(`${res.count} notas importadas com sucesso!`);
        setTimeout(() => {
          setIsImportModalOpen(false);
          setDualPreviewGames([]);
        }, 1500);
      } finally {
        setIsDualImporting(false);
      }
      return;
    }

    if (!dualBacklogContent.trim()) {
      error('Por favor, carregue o arquivo de Backlog primeiro.');
      return;
    }

    setIsDualImporting(true);
    try {
      const res = await importDualObsidianFiles(
        dualBacklogContent,
        dualCoversContent,
        dualBacklogFileName || 'backlog.md'
      );

      if (res.success) {
        success(res.message);
        setTimeout(() => {
          setIsImportModalOpen(false);
        }, 1500);
      } else {
        error(res.message);
      }
    } finally {
      setIsDualImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList: { name: string; content: string }[] = [];
    const unread: { name: string; error: string }[] = [];
    let readCount = 0;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content && content.trim()) {
          fileList.push({ name: file.name, content });
        } else {
          unread.push({ name: file.name, error: 'Arquivo vazio ou sem texto legível' });
        }
        readCount++;
        if (readCount === files.length) {
          setUnreadFiles(unread);
          if (fileList.length > 0) {
            try {
              const { games: parsed } = parseObsidianVaultFiles(fileList);
              setUploadPreviewGames(parsed);
              if (parsed.length === 0 && unread.length === 0) {
                error('Nenhum jogo identificado nos arquivos fornecidos.');
              }
            } catch (err: any) {
              error(`Erro ao processar arquivos: ${err?.message || err}`);
            }
          } else {
            setUploadPreviewGames([]);
          }
        }
      };
      reader.onerror = () => {
        unread.push({ name: file.name, error: 'Falha ao ler o arquivo no navegador' });
        readCount++;
        if (readCount === files.length) {
          setUnreadFiles(unread);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleImportPasted = () => {
    if (!pastedText.trim()) return;
    const gameToImport = previewGame || parseObsidianMarkdown(pastedText, pastedFileName);
    const res = importObsidianFiles([gameToImport]);
    success(`Jogo "${res.titles[0] || gameToImport.title}" importado com sucesso!`);
    setTimeout(() => {
      setIsImportModalOpen(false);
      setPastedText('');
      setPreviewGame(null);
    }, 1500);
  };

  return (
    <Modal
      isOpen={isImportModalOpen}
      onClose={handleClose}
      title="Importar e Exportar Catálogo"
      titleId="import-modal-title"
      icon={<FileUp className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Seletor de Modo */}
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-black/40 p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveMode('dual')}
            className={`min-h-[44px] rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'dual' ? 'bg-accent text-bg shadow' : 'text-text-muted hover:text-text'
            }`}
          >
            <Table className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Backlog + Capas</span>
            <span className="sm:hidden">Backlog</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`min-h-[44px] rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'upload' ? 'bg-accent text-bg shadow' : 'text-text-muted hover:text-text'
            }`}
          >
            <UploadCloud className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Vault (.md)</span>
            <span className="sm:hidden">Vault</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('paste')}
            className={`min-h-[44px] rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'paste' ? 'bg-accent text-bg shadow' : 'text-text-muted hover:text-text'
            }`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Colar .md</span>
            <span className="sm:hidden">Colar</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMode('backup')}
            className={`min-h-[44px] rounded-lg text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
              activeMode === 'backup' ? 'bg-accent text-bg shadow' : 'text-text-muted hover:text-text'
            }`}
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            <span>Backup</span>
          </button>
        </div>

        {/* MODO 1: DUAL FILE BACKLOG + CAPAS */}
        {activeMode === 'dual' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs text-slate-300 space-y-1">
              <div className="font-bold text-accent flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Importação Inteligente do Obsidian</span>
              </div>
              <p className="text-text-muted leading-relaxed">
                Envie o arquivo <strong>backlog.md</strong> e opcionalmente o <strong>capas.md</strong>. O GameHub fará o cruzamento automático de capas por título.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Backlog Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border bg-bg hover:border-accent cursor-pointer transition-colors text-center min-h-[110px]">
                <Table className="h-6 w-6 text-accent mb-1" aria-hidden="true" />
                <span className="text-xs font-bold text-text">
                  {dualBacklogFileName ? `✓ ${dualBacklogFileName}` : '1. Selecionar backlog.md'}
                </span>
                <span className="text-xs text-text-muted mt-0.5">Tabela de jogos</span>
                <input
                  type="file"
                  accept=".md,.markdown,.txt,text/markdown,text/plain"
                  onChange={handleDualBacklogUpload}
                  className="hidden"
                />
              </label>

              {/* Capas Upload */}
              <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-border bg-bg hover:border-purple-400 cursor-pointer transition-colors text-center min-h-[110px]">
                <ImageIcon className="h-6 w-6 text-purple-400 mb-1" aria-hidden="true" />
                <span className="text-xs font-bold text-text">
                  {dualCoversFileName ? `✓ ${dualCoversFileName}` : '2. Selecionar capas.md (Opcional)'}
                </span>
                <span className="text-xs text-text-muted mt-0.5">Links de capas</span>
                <input
                  type="file"
                  accept=".md,.markdown,.txt,.json,.js,text/markdown,text/plain,application/json"
                  onChange={handleDualCoversUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview da Importação Dual */}
            {dualPreviewGames.length > 0 && (
              <div className="rounded-xl border border-border bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                  <span className="font-bold text-accent flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {dualPreviewGames.length} jogos identificados
                  </span>
                  <span className="text-purple-300 font-mono">
                    {dualMatchedCoversCount} capas associadas
                  </span>
                </div>

                {dualPreviewGames.some((g) => g.statusUnidentified) && (
                  <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Alguns jogos estão com status não identificado. Você pode ajustar o status no seletor de cada item abaixo.</span>
                  </div>
                )}

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {dualPreviewGames.map((g, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-surface border border-border/60 gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {g.capa ? (
                          <img src={g.capa} alt={g.title} className="h-9 w-7 rounded object-cover shrink-0 bg-black/50" />
                        ) : (
                          <div className="h-9 w-7 rounded bg-black/50 border border-border flex items-center justify-center shrink-0 text-xs text-text-muted">🎮</div>
                        )}
                        <div className="min-w-0">
                          <span className="font-bold text-text truncate block">{g.title}</span>
                          <div className="text-text-muted flex items-center gap-2 flex-wrap text-xs mt-0.5">
                            <span>{g.console}</span>
                            <span>&middot;</span>
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded border font-semibold uppercase ${getStatusBadgeClasses(g.status, g.statusUnidentified)}`}>
                              {g.statusUnidentified ? 'Não identificado' : g.status}
                            </span>
                            <span className="text-xs text-text-muted/80">({getSourceBadgeText(g.statusSource)})</span>
                          </div>
                          {g.missingFields && g.missingFields.length > 0 ? (
                            <div className="text-xs text-amber-300/80 mt-0.5">
                              ⚠️ Ausente: {g.missingFields.join(', ')}
                            </div>
                          ) : (
                            <div className="text-xs text-emerald-400/80 mt-0.5">
                              ✓ Campos essenciais lidos
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <select
                          value={g.status}
                          onChange={(e) => handleUpdateDualStatus(idx, e.target.value as GameStatus)}
                          className="min-h-[36px] rounded-lg border border-border bg-bg px-2 py-1 text-xs text-text focus:border-accent focus:outline-none cursor-pointer"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleExecuteDualImport}
                    disabled={isDualImporting}
                    className="w-full min-h-[44px] rounded-xl bg-accent px-5 py-2.5 text-xs font-black uppercase text-bg hover:bg-cyan-300 disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
                  >
                    {isDualImporting ? 'Importando...' : `Confirmar Importação de ${dualPreviewGames.length} Jogos`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODO 2: VAULT OBSIDIAN (.md) COM PRÉVIA COMPLETA */}
        {activeMode === 'upload' && (
          <div className="space-y-4">
            {/* Aviso de arquivos com erro de leitura */}
            {unreadFiles.length > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-red-200">Não foi possível ler {unreadFiles.length} arquivo(s):</span>
                  <p className="text-red-300/80 mt-0.5">
                    {unreadFiles.map((u) => `${u.name} (${u.error})`).join(', ')}
                  </p>
                </div>
              </div>
            )}

            {/* Aviso de status não identificado */}
            {uploadPreviewGames.some((g) => g.statusUnidentified) && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <span className="font-bold text-amber-200">
                    {uploadPreviewGames.filter((g) => g.statusUnidentified).length} jogo(s) com status não identificado:
                  </span>
                  <p className="text-amber-300/80 mt-0.5">
                    O parser não encontrou um status claro no arquivo. Você pode definir o status desejado nos seletores abaixo antes de importar.
                  </p>
                </div>
              </div>
            )}

            {/* Lista de Prévia Interativa */}
            {uploadPreviewGames.length > 0 ? (
              <div className="rounded-xl border border-border bg-black/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs flex-wrap gap-2 border-b border-border pb-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-accent">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <span>Pré-visualização: {uploadPreviewGames.length} jogo(s) prontos</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadPreviewGames([]);
                      setUnreadFiles([]);
                    }}
                    className="min-h-[32px] text-xs font-bold text-text-muted hover:text-text cursor-pointer underline"
                  >
                    Limpar / Selecionar outros arquivos
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {uploadPreviewGames.map((g, idx) => (
                    <div
                      key={g.id || idx}
                      className="p-3 rounded-xl bg-surface border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {g.capa ? (
                          <img
                            src={g.capa}
                            alt={g.title}
                            className="h-12 w-9 rounded object-cover shrink-0 bg-black/50"
                          />
                        ) : (
                          <div className="h-12 w-9 rounded bg-black/50 border border-border flex items-center justify-center shrink-0 text-xs text-text-muted">
                            🎮
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-heading font-bold text-sm text-text truncate max-w-[220px]">
                              {g.title}
                            </span>
                            <span className="text-xs text-text-muted font-mono truncate max-w-[150px]">
                              ({g.fileName})
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-text-muted text-xs mt-1">
                            <span>🎮 {g.console}</span>
                            <span>&middot;</span>
                            <span>⏱️ {g.tempo ? formatTempoDisplay(g.tempo) : '0:00'}</span>
                            {g.sessoes && g.sessoes.length > 0 && (
                              <>
                                <span>&middot;</span>
                                <span className="text-cyan-300 font-medium">{g.sessoes.length} sessões</span>
                              </>
                            )}
                            {g.nota !== undefined && (
                              <>
                                <span>&middot;</span>
                                <span className="text-amber-400 font-bold">⭐ {g.nota}</span>
                              </>
                            )}
                          </div>

                          {/* Status Badge + Origem */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase ${getStatusBadgeClasses(g.status, g.statusUnidentified)}`}>
                              {g.statusUnidentified ? '⚠️ Não identificado' : g.status}
                            </span>
                            <span className="text-xs text-text-muted">
                              (origem: <strong className="text-text font-normal">{getSourceBadgeText(g.statusSource)}</strong>)
                            </span>
                          </div>

                          {/* Campos lidos vs faltantes */}
                          {g.missingFields && g.missingFields.length > 0 ? (
                            <div className="text-xs text-amber-300/80 mt-1 font-medium">
                              ⚠️ Campos ausentes: <strong className="text-amber-200">{g.missingFields.join(', ')}</strong>
                            </div>
                          ) : (
                            <div className="text-xs text-emerald-400/80 mt-1 font-medium">
                              ✓ Todos os campos lidos (Título, Console, Tempo, Sessões)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Seletor de Status Individual */}
                      <div className="flex flex-col sm:items-end gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                        <label className="text-xs font-bold text-text-muted uppercase">Alterar Status:</label>
                        <select
                          value={g.status}
                          onChange={(e) => handleUpdateUploadStatus(idx, e.target.value as GameStatus)}
                          className="min-h-[38px] rounded-lg border border-border bg-bg px-2.5 py-1 text-xs text-text focus:border-accent focus:outline-none cursor-pointer"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmUploadImport}
                    disabled={isUploadImporting}
                    className="flex-1 min-h-[44px] rounded-xl bg-accent px-5 py-2.5 text-xs font-black uppercase text-bg hover:bg-cyan-300 disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>
                      {isUploadImporting ? 'Importando...' : `Confirmar Importação de ${uploadPreviewGames.length} Jogos`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border bg-bg hover:border-accent cursor-pointer transition-colors text-center min-h-[160px]">
                <UploadCloud className="h-8 w-8 text-accent mb-2" aria-hidden="true" />
                <span className="text-xs sm:text-sm font-bold text-text">
                  Clique para selecionar múltiplos arquivos .md, .markdown ou .txt
                </span>
                <span className="text-xs text-text-muted mt-1 max-w-sm">
                  Suporta notas individuais com frontmatter YAML, campos inline Dataview (<code>status:: jogando</code>), tags e listas de sessões de gameplay.
                </span>
                <input
                  type="file"
                  multiple
                  accept=".md,.markdown,.txt,text/markdown,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}

            {games.length > 0 && !uploadPreviewGames.length && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-red-300">
                  <Trash2 className="h-4 w-4 text-red-400 flex-shrink-0" aria-hidden="true" />
                  <span>Deseja apagar os {games.length} jogos anteriores antes de importar?</span>
                </div>
                {!confirmClearOpen ? (
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="min-h-[40px] px-3.5 py-1.5 rounded-lg border border-red-500/40 bg-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/30 transition-colors cursor-pointer"
                  >
                    Limpar Catálogo ({games.length})
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isClearing}
                      onClick={async () => {
                        setIsClearing(true);
                        try {
                          await clearAllGames();
                          warning('Catálogo esvaziado com sucesso.');
                          setConfirmClearOpen(false);
                        } finally {
                          setIsClearing(false);
                        }
                      }}
                      className="min-h-[40px] px-3.5 py-1.5 rounded-lg bg-red-600 text-xs font-black uppercase text-white hover:bg-red-500 cursor-pointer"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearOpen(false)}
                      className="min-h-[40px] px-2.5 py-1.5 rounded-lg border border-border text-xs text-text-muted hover:text-text cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODO 3: COLAR MARKDOWN COM PRÉVIA E SELETOR */}
        {activeMode === 'paste' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label htmlFor="pasted-filename-input" className="text-xs uppercase font-bold text-text shrink-0">
                Nome do Arquivo:
              </label>
              <input
                id="pasted-filename-input"
                type="text"
                value={pastedFileName}
                onChange={(e) => {
                  setPastedFileName(e.target.value);
                  if (pastedText.trim()) {
                    try {
                      setPreviewGame(parseObsidianMarkdown(pastedText, e.target.value));
                    } catch {
                      // ignore
                    }
                  }
                }}
                className="min-h-[40px] rounded-lg border border-border bg-bg px-3 py-1.5 text-xs text-text flex-1 focus:border-accent focus:outline-none"
              />
            </div>

            <textarea
              value={pastedText}
              onChange={(e) => {
                const val = e.target.value;
                setPastedText(val);
                if (val.trim()) {
                  try {
                    setPreviewGame(parseObsidianMarkdown(val, pastedFileName));
                  } catch {
                    setPreviewGame(null);
                  }
                } else {
                  setPreviewGame(null);
                }
              }}
              placeholder="Cole aqui o conteúdo do seu arquivo .md (frontmatter YAML, status:: jogando, sessões de gameplay)..."
              className="w-full h-40 rounded-xl border border-border bg-bg p-3 text-xs font-mono text-text placeholder-text-muted focus:border-accent focus:outline-none"
            ></textarea>

            {previewGame && (
              <div className="rounded-xl border border-border bg-surface p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  {previewGame.capa ? (
                    <img
                      src={previewGame.capa}
                      alt={previewGame.title}
                      className="h-12 w-9 rounded object-cover shrink-0 bg-black/50"
                    />
                  ) : (
                    <div className="h-12 w-9 rounded bg-black/50 border border-border flex items-center justify-center shrink-0 text-xs text-text-muted">
                      🎮
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="font-heading font-bold text-sm text-text block truncate">
                      {previewGame.title}
                    </span>
                    <div className="text-text-muted flex items-center gap-2 flex-wrap text-xs mt-0.5">
                      <span>{previewGame.console}</span>
                      <span>&middot;</span>
                      <span>⏱️ {previewGame.tempo ? formatTempoDisplay(previewGame.tempo) : '0:00'}</span>
                      {previewGame.sessoes && previewGame.sessoes.length > 0 && (
                        <>
                          <span>&middot;</span>
                          <span className="text-cyan-300 font-medium">{previewGame.sessoes.length} sessões</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border uppercase ${getStatusBadgeClasses(previewGame.status, previewGame.statusUnidentified)}`}>
                        {previewGame.statusUnidentified ? '⚠️ Não identificado' : previewGame.status}
                      </span>
                      <span className="text-xs text-text-muted">
                        (origem: <strong className="text-text font-normal">{getSourceBadgeText(previewGame.statusSource)}</strong>)
                      </span>
                    </div>

                    {previewGame.missingFields && previewGame.missingFields.length > 0 ? (
                      <div className="text-xs text-amber-300/80 mt-1 font-medium">
                        ⚠️ Campos ausentes: <strong className="text-amber-200">{previewGame.missingFields.join(', ')}</strong>
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-400/80 mt-1 font-medium">
                        ✓ Todos os campos lidos (Título, Console, Tempo, Sessões)
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <label className="text-xs font-bold text-text-muted uppercase">Status:</label>
                  <select
                    value={previewGame.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as GameStatus;
                      setPreviewGame((prev) =>
                        prev
                          ? {
                              ...prev,
                              status: newStatus,
                              statusUnidentified: false,
                              statusSource: 'manual',
                            }
                          : null
                      );
                    }}
                    className="min-h-[38px] rounded-lg border border-border bg-bg px-2.5 py-1 text-xs text-text focus:border-accent focus:outline-none cursor-pointer"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleImportPasted}
                disabled={!pastedText.trim()}
                className="min-h-[44px] rounded-xl bg-accent px-5 py-2 text-xs font-black uppercase text-bg hover:bg-cyan-300 disabled:opacity-40 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
              >
                Importar para a Biblioteca
              </button>
            </div>
          </div>
        )}

        {/* MODO 4: BACKUP JSON */}
        {activeMode === 'backup' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                  <Download className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-text uppercase">
                    Exportar Backup Completo (.json)
                  </h4>
                  <p className="text-xs text-text-muted">
                    Salva todos os {games.length} jogos em formato JSON seguro.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  exportBackupJSON();
                  success('Backup .json baixado com sucesso!');
                }}
                className="min-h-[44px] rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black uppercase text-bg hover:bg-emerald-400 transition-all shadow-md shadow-emerald-500/20 whitespace-nowrap"
              >
                Baixar Backup
              </button>
            </div>

            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
                  <HardDriveDownload className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="font-heading text-sm font-bold text-text uppercase">
                    Restaurar Backup (.json)
                  </h4>
                  <p className="text-xs text-text-muted">
                    Recupere sua coleção a partir de um backup salvo anteriormente.
                  </p>
                </div>
              </div>
              <label className="min-h-[44px] inline-flex items-center justify-center rounded-xl bg-accent px-5 py-2.5 text-xs font-black uppercase text-bg hover:bg-cyan-300 transition-all shadow-md shadow-cyan-500/20 cursor-pointer whitespace-nowrap">
                Restaurar JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const text = ev.target?.result as string;
                      if (text) {
                        const res = await importBackupJSON(text);
                        if (res.success) {
                          success(res.message);
                          setIsImportModalOpen(false);
                        } else {
                          error(res.message);
                        }
                      }
                    };
                    reader.readAsText(file);
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

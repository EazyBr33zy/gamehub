import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Modal } from './Modal';
import { Database, CheckCircle2, AlertTriangle, ArrowRight, Download, RefreshCw } from 'lucide-react';
import { formatMinutes } from '../utils/markdownParser';

export const MigrationModal: React.FC = () => {
  const { isMigrationModalOpen, setIsMigrationModalOpen, getMigrationPreview, executeMigration, isOwner } = useGame();
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationDone, setMigrationDone] = useState(false);
  const [updatedCount, setUpdatedCount] = useState(0);

  if (!isOwner) return null;

  const preview = getMigrationPreview();

  const handleRunMigration = async () => {
    setIsMigrating(true);
    const res = await executeMigration();
    setIsMigrating(false);
    if (res.success) {
      setMigrationDone(true);
      setUpdatedCount(res.updatedCount);
    }
  };

  const handleClose = () => {
    setIsMigrationModalOpen(false);
    setTimeout(() => {
      setMigrationDone(false);
      setUpdatedCount(0);
    }, 300);
  };

  return (
    <Modal
      isOpen={isMigrationModalOpen}
      onClose={handleClose}
      title="Migração e Normalização de Dados"
      description="Padronização de datas ISO e minutos inteiros com backup de segurança prévio"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 py-1 text-slate-200">
        {!migrationDone ? (
          <>
            {/* Overview Box */}
            <div className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[#9aa4b2]">Total de jogos no acervo:</span>
                <span className="text-white">{preview.totalGames}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[#9aa4b2]">Jogos para normalizar:</span>
                <span className="text-[#22d3ee]">{preview.gamesToUpdate}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[#9aa4b2]">Datas para formato ISO (YYYY-MM-DD):</span>
                <span className="text-purple-300">{preview.changesSummary.fixedDates}</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-[#9aa4b2]">Tempos para tempoMinutos inteiros:</span>
                <span className="text-emerald-300">{preview.changesSummary.fixedTimeMinutes}</span>
              </div>
            </div>

            {/* Sample Changes Preview */}
            {preview.changesSummary.sampleChanges.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
                  Exemplos de transformações:
                </div>
                <div className="space-y-1 text-xs font-mono bg-black/40 p-2.5 rounded-xl border border-[#30363d] max-h-40 overflow-y-auto">
                  {preview.changesSummary.sampleChanges.map((change, idx) => (
                    <div key={idx} className="border-b border-white/5 pb-1 mb-1 last:border-none last:pb-0 last:mb-0">
                      <div className="text-white font-bold truncate">{change.title}</div>
                      <div className="text-slate-400 text-xs flex items-center gap-2 mt-0.5">
                        {change.oldTime && (
                          <span>Tempo: {change.oldTime} → {change.newMinutes}min ({formatMinutes(change.newMinutes, 'hm')})</span>
                        )}
                        {change.oldDate && (
                          <span>Data: {change.oldDate} → {change.newDate}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notice */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Um <strong>backup JSON completo</strong> será baixado automaticamente antes da gravação no Firestore.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isMigrating}
                className="flex-1 min-h-[44px] rounded-xl border border-[#30363d] bg-[#21262d] text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleRunMigration}
                disabled={isMigrating || preview.gamesToUpdate === 0}
                className="flex-1 min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#22d3ee] hover:bg-[#06b6d4] text-[#0d1117] text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
              >
                {isMigrating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Migrando...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Migrar Dados</span>
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-white">Migração Concluída!</h3>
            <p className="text-xs text-[#9aa4b2]">
              {updatedCount} jogos foram normalizados e salvos com sucesso no Firestore.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="min-h-[44px] w-full rounded-xl bg-[#22d3ee] text-[#0d1117] text-xs font-black uppercase tracking-wider hover:bg-[#06b6d4] transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

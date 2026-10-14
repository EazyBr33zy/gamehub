import React from 'react';
import { useGame } from '../context/GameContext';
import { AlertCircle, ExternalLink, Plus } from 'lucide-react';
import { cleanTitle } from '../utils/markdownParser';
import { Modal } from './Modal';

export const DuplicateWarningModal: React.FC = () => {
  const { duplicatePrompt, setDuplicatePrompt, setSelectedGameId, setActiveTab, confirmAddDuplicate } = useGame();

  if (!duplicatePrompt) return null;

  const { existingGame, pendingGame } = duplicatePrompt;

  const handleOpenExisting = () => {
    setSelectedGameId(existingGame.id);
    setActiveTab('detalhes');
    setDuplicatePrompt(null);
  };

  const handleCreateAnyway = () => {
    confirmAddDuplicate(pendingGame);
    setDuplicatePrompt(null);
  };

  return (
    <Modal
      isOpen={!!duplicatePrompt}
      onClose={() => setDuplicatePrompt(null)}
      title={
        <div className="flex items-center gap-2 text-[#f59e0b]">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Título Já Existente</span>
        </div>
      }
      description="Verificação de duplicidade"
      maxWidth="max-w-md"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCreateAnyway}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl border border-[#30363d] text-xs font-bold text-[#9aa4b2] hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Criar mesmo assim</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExisting}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2 rounded-xl bg-[#22d3ee] text-xs font-black uppercase text-[#0d1117] hover:bg-[#06b6d4] shadow-lg shadow-[#22d3ee]/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            <span>Abrir existente</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <p className="text-sm text-slate-200 leading-relaxed">
          Já existe <strong className="text-white">"{cleanTitle(existingGame.title)}"</strong> cadastrado na sua biblioteca ({existingGame.console || 'Sem console'}).
        </p>
        <p className="text-xs text-[#9aa4b2] leading-relaxed">
          Deseja abrir o jogo existente para visualização/edição ou cadastrar como um novo registro mesmo assim?
        </p>
      </div>
    </Modal>
  );
};

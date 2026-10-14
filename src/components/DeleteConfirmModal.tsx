import React from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { cleanTitle } from '../utils/markdownParser';
import { Modal } from './Modal';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  gameTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  gameTitle,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={
        <div className="flex items-center gap-2.5 text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Excluir Jogo</span>
        </div>
      }
      description="Confirmação de exclusão"
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="min-h-[44px] rounded-xl border border-[#30363d] px-5 py-2 text-xs font-bold text-[#9aa4b2] hover:text-white hover:bg-white/5 transition-all disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-xs font-black uppercase text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition-all disabled:opacity-50 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            {isDeleting ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" aria-hidden="true"></span>
                <span>Excluindo...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                <span>Sim, Excluir</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-3 py-1">
        <p className="text-sm text-slate-200 leading-relaxed">
          Deseja realmente excluir <strong className="text-white">"{cleanTitle(gameTitle)}"</strong> da sua biblioteca?
        </p>
        <p className="text-xs text-[#9aa4b2] leading-relaxed">
          Você poderá desfazer a exclusão através da notificação na tela logo após confirmar.
        </p>
      </div>
    </Modal>
  );
};

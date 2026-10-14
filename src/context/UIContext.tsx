import React, { createContext, useContext, useState, useCallback } from 'react';
import { GameItem } from '../types/game';

export interface UIContextType {
  activeTab: 'painel' | 'backlog' | 'detalhes' | 'wrapup' | 'jogando';
  setActiveTab: (tab: 'painel' | 'backlog' | 'detalhes' | 'wrapup' | 'jogando') => void;
  selectedGameId: string | null;
  setSelectedGameId: (id: string | null) => void;

  // Modals
  isImportModalOpen: boolean;
  setIsImportModalOpen: (open: boolean) => void;
  isNewGameModalOpen: boolean;
  setIsNewGameModalOpen: (open: boolean) => void;
  isEditGameModalOpen: boolean;
  setIsEditGameModalOpen: (open: boolean) => void;
  isMigrationModalOpen: boolean;
  setIsMigrationModalOpen: (open: boolean) => void;
  isDuplicatesModalOpen: boolean;
  setIsDuplicatesModalOpen: (open: boolean) => void;

  // Editing Game State
  editingGame: GameItem | null;
  setEditingGame: (game: GameItem | null) => void;
  openEditModal: (game: GameItem) => void;

  // Duplicate prompt
  duplicatePrompt: { existingGame: GameItem; pendingGame: Partial<GameItem> } | null;
  setDuplicatePrompt: (val: { existingGame: GameItem; pendingGame: Partial<GameItem> } | null) => void;

  // Search & Global Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterPlatform: string;
  setFilterPlatform: (platform: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;

  // WrapUp Year Selection
  wrapUpSelectedYear: number;
  setWrapUpSelectedYear: (year: number) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<'painel' | 'backlog' | 'detalhes' | 'wrapup' | 'jogando'>('painel');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNewGameModalOpen, setIsNewGameModalOpen] = useState(false);
  const [isEditGameModalOpen, setIsEditGameModalOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isDuplicatesModalOpen, setIsDuplicatesModalOpen] = useState(false);

  const [editingGame, setEditingGame] = useState<GameItem | null>(null);
  const [duplicatePrompt, setDuplicatePrompt] = useState<{ existingGame: GameItem; pendingGame: Partial<GameItem> } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('TODAS');
  const [filterStatus, setFilterStatus] = useState('TODAS');

  const [wrapUpSelectedYear, setWrapUpSelectedYear] = useState<number>(() => new Date().getFullYear());

  const openEditModal = useCallback((game: GameItem) => {
    setEditingGame(game);
    setIsEditGameModalOpen(true);
  }, []);

  const value = {
    activeTab,
    setActiveTab,
    selectedGameId,
    setSelectedGameId,
    isImportModalOpen,
    setIsImportModalOpen,
    isNewGameModalOpen,
    setIsNewGameModalOpen,
    isEditGameModalOpen,
    setIsEditGameModalOpen,
    isMigrationModalOpen,
    setIsMigrationModalOpen,
    isDuplicatesModalOpen,
    setIsDuplicatesModalOpen,
    editingGame,
    setEditingGame,
    openEditModal,
    duplicatePrompt,
    setDuplicatePrompt,
    searchQuery,
    setSearchQuery,
    filterPlatform,
    setFilterPlatform,
    filterStatus,
    setFilterStatus,
    wrapUpSelectedYear,
    setWrapUpSelectedYear,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within an UIProvider');
  }
  return context;
};

import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { 
  User as UserIcon,
  Radio, 
  Layers, 
  Gamepad2, 
  Trophy, 
  FileUp,
  LogIn,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  WifiOff,
  CopyCheck,
  X
} from 'lucide-react';
import { useIsOwner } from '../hooks/useIsOwner';
import { Modal } from './Modal';

export const Navbar: React.FC = () => {
  const { 
    setIsImportModalOpen,
    setIsMigrationModalOpen,
    setIsDuplicatesModalOpen,
    exportBackupJSON,
    currentUser,
    login,
    logout,
    serverSyncStatus
  } = useGame();

  const { tab } = useHashRoute();
  const isOwner = useIsOwner();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileUserSheetOpen, setIsMobileUserSheetOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [lastBackupInfo, setLastBackupInfo] = useState<{ dateStr: string; isOlderThan30Days: boolean }>({
    dateStr: 'Nunca realizado',
    isOlderThan30Days: true,
  });

  useEffect(() => {
    const raw = localStorage.getItem('gamehub_last_backup_date');
    if (!raw) {
      setLastBackupInfo({ dateStr: 'Nunca realizado', isOlderThan30Days: true });
      return;
    }
    try {
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        setLastBackupInfo({ dateStr: 'Nunca realizado', isOlderThan30Days: true });
        return;
      }
      const formatted = d.toLocaleDateString('pt-BR');
      const diffMs = Date.now() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      setLastBackupInfo({ dateStr: formatted, isOlderThan30Days: diffDays > 30 });
    } catch {
      setLastBackupInfo({ dateStr: 'Nunca realizado', isOlderThan30Days: true });
    }
  }, [isUserMenuOpen, isMobileUserSheetOpen]);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { path: 'painel' as const, label: 'Painel', hash: '#/painel', icon: Radio },
    { path: 'backlog' as const, label: 'Backlog', hash: '#/backlog', icon: Layers },
    { path: 'jogando' as const, label: 'Jogando', fullLabel: 'Jogando Agora', hash: '#/jogando', icon: Gamepad2 },
    { path: 'wrapup' as const, label: 'Wrap-Up', fullLabel: 'Wrap-Up Anual', hash: '#/wrapup', icon: Trophy },
  ];

  const getSyncStatusDetails = () => {
    switch (serverSyncStatus) {
      case 'synced':
        return {
          dotColor: 'bg-[#10b981]',
          textColor: 'text-[#10b981]',
          label: 'Sincronizado',
          desc: 'Seu acervo está salvo e atualizado no Firebase Firestore em tempo real.',
          icon: CheckCircle2,
        };
      case 'syncing':
        return {
          dotColor: 'bg-[#22d3ee] animate-pulse',
          textColor: 'text-[#22d3ee]',
          label: 'Sincronizando...',
          desc: 'Enviando ou recebendo dados com a nuvem...',
          icon: RefreshCw,
        };
      case 'offline':
        return {
          dotColor: 'bg-[#f59e0b]',
          textColor: 'text-[#f59e0b]',
          label: 'Offline (Cache)',
          desc: 'Operando em modo offline com armazenamento em cache local.',
          icon: WifiOff,
        };
      case 'error':
      default:
        return {
          dotColor: 'bg-[#f43f5e]',
          textColor: 'text-[#f43f5e]',
          label: 'Erro de Sincronia',
          desc: 'Houve uma falha na conexão com o Firestore. Os dados locais foram preservados.',
          icon: AlertCircle,
        };
    }
  };

  const syncDetails = getSyncStatusDetails();
  const SyncIcon = syncDetails.icon;

  return (
    <>
      {/* ── BARRA SUPERIOR (HEADER FIXO) - UMA LINHA SÓ NO MOBILE ── */}
      <header className="sticky top-0 z-40 w-full border-b border-[#30363d] bg-[#0d1117]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[52px] max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* LADO ESQUERDO: LOGO GAMEHUB + STATUS DE SINCRONIZAÇÃO */}
          <div className="flex items-center gap-3 sm:gap-4">
            <a 
              href="#/painel"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#22d3ee] rounded-xl outline-none"
              aria-label="Ir para o Painel GameHub"
            >
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#06b6d4]/15 border border-[#06b6d4]/35 text-[#06b6d4] shadow-md shrink-0">
                <Gamepad2 className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
              </div>
              <div className="flex items-baseline">
                <span className="font-heading text-xl sm:text-2xl font-black tracking-wide text-white">
                  Game<span className="text-[#22d3ee]">Hub</span>
                </span>
              </div>
            </a>

            {/* Status Real de Sincronização */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#30363d] bg-white/[0.02] hover:bg-white/5 transition-all text-xs cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none"
              title={`Status de sincronização: ${syncDetails.label}. Clique para detalhes.`}
              aria-label={`Status de sincronização: ${syncDetails.label}`}
            >
              <span className={`flex h-2 w-2 rounded-full ${syncDetails.dotColor}`} aria-hidden="true"></span>
              <span className={`hidden sm:inline font-mono text-xs font-bold uppercase tracking-wider ${syncDetails.textColor}`}>
                {syncDetails.label}
              </span>
            </button>
          </div>

          {/* CENTRO: NAVEGAÇÃO DESKTOP NO TOPO */}
          <nav aria-label="Navegação principal desktop" className="hidden md:flex items-center gap-1 rounded-lg border border-[#30363d] bg-[#161b22] p-1 text-sm">
            {navItems.map((item) => {
              const isActive = tab === item.path || (item.path === 'jogando' && tab === 'jogo');
              return (
                <a
                  key={item.path}
                  href={item.hash}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-bold uppercase tracking-[0.5px] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none ${
                    isActive
                      ? 'bg-[#06b6d4] text-[#0d1117] font-black shadow-sm'
                      : 'text-[#9aa4b2] hover:text-white'
                  }`}
                >
                  {item.fullLabel || item.label}
                </a>
              );
            })}
          </nav>

          {/* LADO DIREITO: IMPORT VAULT (SOMENTE DONO) + BOTÃO DE PERFIL/LOGIN */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Import Obsidian Shortcut (apenas visível para o dono) */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="hidden lg:flex items-center gap-1.5 rounded-md border border-[#30363d] bg-[#161b22] px-2.5 py-1 text-xs font-mono text-[#9aa4b2] hover:text-white hover:border-[#9aa4b2] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
                title="Importar Obsidian .md"
                aria-label="Abrir importação de Obsidian Vault"
              >
                <FileUp className="h-3.5 w-3.5 text-[#22d3ee]" aria-hidden="true" />
                <span>Vault</span>
              </button>
            )}

            {/* Menu de Usuário / Login */}
            <div className="relative" ref={menuRef}>
              {currentUser ? (
                <>
                  {/* Desktop Dropdown Trigger */}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.innerWidth < 640) {
                        setIsMobileUserSheetOpen(true);
                      } else {
                        setIsUserMenuOpen((prev) => !prev);
                      }
                    }}
                    className="flex items-center gap-2 p-1 sm:px-2 sm:py-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
                    title={`Conectado como ${currentUser.displayName || currentUser.email}`}
                    aria-label="Menu do usuário autenticado"
                    aria-expanded={isUserMenuOpen}
                  >
                    <div className="hidden sm:block text-right">
                      <div className="text-xs font-bold text-white leading-tight truncate max-w-[120px]">
                        {currentUser.displayName || currentUser.email?.split('@')[0]}
                      </div>
                      <div className="text-xs font-mono uppercase text-[#22d3ee] tracking-wider leading-tight flex items-center justify-end gap-1 mt-0.5">
                        <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                        <span>DONO</span>
                      </div>
                    </div>

                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={`Foto de ${currentUser.displayName || 'usuário'}`}
                        referrerPolicy="no-referrer"
                        className="h-8 w-8 rounded-lg object-cover border border-[#22d3ee]/40 shadow-sm"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40 font-bold text-xs">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </button>

                  {/* Desktop Dropdown Box */}
                  {isUserMenuOpen && (
                    <div className="hidden sm:block absolute right-0 mt-2 w-64 rounded-xl border border-[#30363d] bg-[#161b22] p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="border-b border-[#30363d] pb-2.5 mb-2">
                        <div className="text-xs font-bold text-white truncate">
                          {currentUser.displayName || 'Comandante'}
                        </div>
                        <div className="text-xs text-[#9aa4b2] truncate font-mono mt-0.5">
                          {currentUser.email}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-bold bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30">
                          👑 Administrador / Dono
                        </div>
                      </div>

                      {/* Informações de Backup */}
                      <div className="rounded-lg bg-black/40 border border-[#30363d]/60 p-2.5 mb-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-[#9aa4b2]">
                          <span>Último backup:</span>
                          <span className="text-white font-mono font-bold">{lastBackupInfo.dateStr}</span>
                        </div>
                        {lastBackupInfo.isOlderThan30Days && (
                          <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#30363d]/40">
                            <span className="text-xs font-semibold text-amber-400">
                              Faça um backup (.json)
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                exportBackupJSON();
                                setLastBackupInfo({
                                  dateStr: new Date().toLocaleDateString('pt-BR'),
                                  isOlderThan30Days: false,
                                });
                              }}
                              className="text-xs font-bold text-[#22d3ee] hover:underline cursor-pointer"
                            >
                              Baixar
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsDuplicatesModalOpen(true);
                        }}
                        className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#22d3ee] hover:bg-[#22d3ee]/10 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none mb-1"
                      >
                        <CopyCheck className="h-4 w-4" aria-hidden="true" />
                        <span>Verificar Jogos Repetidos</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsMigrationModalOpen(true);
                        }}
                        className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-white/5 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none mb-1"
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        <span>Migrar & Normalizar Dados</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full min-h-[40px] flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-red-400 outline-none"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        <span>Encerrar Sessão (Sair)</span>
                      </button>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ── BARRA INFERIOR FIXA (MOBILE BOTTOM NAVIGATION) ── */}
      <nav 
        aria-label="Navegação principal móvel"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-[#30363d] bg-[#0d1117]/95 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] shadow-2xl"
      >
        <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.path || (item.path === 'jogando' && tab === 'jogo');

            return (
              <a
                key={item.path}
                href={item.hash}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center min-h-[48px] py-1 transition-all rounded-xl focus-visible:ring-2 focus-visible:ring-[#22d3ee] outline-none ${
                  isActive
                    ? 'text-[#22d3ee] font-black'
                    : 'text-[#9aa4b2] hover:text-slate-200 font-medium'
                }`}
              >
                {/* Indicador ativo no topo da aba */}
                {isActive && (
                  <span 
                    className="absolute top-0.5 h-1 w-8 rounded-full bg-[#22d3ee] shadow-[0_0_8px_#22d3ee]" 
                    aria-hidden="true"
                  />
                )}

                <Icon className={`h-[22px] w-[22px] mb-1 transition-transform ${isActive ? 'scale-110' : ''}`} aria-hidden="true" />
                <span className="text-xs leading-none">
                  {item.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>

      {/* ── MODAL SHEET: USUÁRIO MOBILE ── */}
      <Modal
        isOpen={isMobileUserSheetOpen && !!currentUser}
        onClose={() => setIsMobileUserSheetOpen(false)}
        title="Perfil do Usuário"
        description="Detalhes da conta conectada"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 py-1">
          <div className="flex items-center gap-3 p-3 rounded-xl border border-[#30363d] bg-[#0d1117]">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt=""
                className="h-12 w-12 rounded-xl object-cover border border-[#22d3ee]/40"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#22d3ee]/20 text-[#22d3ee] font-bold text-base">
                {(currentUser?.displayName || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="font-heading text-sm font-bold text-white truncate">
                {currentUser?.displayName || 'Comandante'}
              </div>
              <div className="text-xs text-[#9aa4b2] truncate font-mono">
                {currentUser?.email}
              </div>
              <div className="mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-bold bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/30">
                👑 Dono do Acervo
              </div>
            </div>
          </div>

          {/* Informações de Backup (Mobile) */}
          <div className="rounded-xl bg-[#0d1117] border border-[#30363d] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9aa4b2]">
              <span>Último backup:</span>
              <span className="text-white font-mono font-bold">{lastBackupInfo.dateStr}</span>
            </div>
            {lastBackupInfo.isOlderThan30Days && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#30363d]/50">
                <span className="text-xs font-semibold text-amber-400">
                  Faça um backup (.json)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    exportBackupJSON();
                    setLastBackupInfo({
                      dateStr: new Date().toLocaleDateString('pt-BR'),
                      isOlderThan30Days: false,
                    });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#22d3ee]/10 text-xs font-bold text-[#22d3ee] border border-[#22d3ee]/30 cursor-pointer"
                >
                  Baixar agora
                </button>
              </div>
            )}
          </div>

          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsMobileUserSheetOpen(false);
                  setIsDuplicatesModalOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#22d3ee]/40 bg-[#22d3ee]/10 text-xs font-bold text-[#22d3ee] hover:bg-[#22d3ee]/20 transition-all cursor-pointer"
              >
                <CopyCheck className="h-4 w-4" aria-hidden="true" />
                <span>Verificar Jogos Repetidos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileUserSheetOpen(false);
                  setIsMigrationModalOpen(true);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-[#30363d] bg-white/5 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span>Migrar & Normalizar Dados</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              setIsMobileUserSheetOpen(false);
              logout();
            }}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>Encerrar Sessão (Sair)</span>
          </button>
        </div>
      </Modal>

      {/* ── MODAL: STATUS DE SINCRONIZAÇÃO ── */}
      <Modal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Status de Sincronização"
        description="Conexão com a base de dados Firestore"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 py-1 text-center sm:text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#30363d] bg-[#0d1117]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-[#30363d] shrink-0">
              <SyncIcon className={`h-5 w-5 ${syncDetails.textColor}`} aria-hidden="true" />
            </div>
            <div>
              <div className={`font-heading text-sm font-bold uppercase tracking-wider ${syncDetails.textColor}`}>
                {syncDetails.label}
              </div>
              <p className="text-xs text-[#9aa4b2] mt-0.5 leading-relaxed">
                {syncDetails.desc}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-mono space-y-1 bg-black/30 p-3 rounded-lg border border-[#30363d]/40 text-left">
            <div>• Plataforma: Firebase Cloud Firestore</div>
            <div>• Modo: {isOwner ? 'Leitura & Escrita em Tempo Real' : 'Leitura Pública'}</div>
            <div>• Rede: {navigator.onLine ? 'Online' : 'Desconectado'}</div>
          </div>

          <button
            type="button"
            onClick={() => setIsSyncModalOpen(false)}
            className="w-full min-h-[44px] rounded-xl bg-[#21262d] hover:bg-[#30363d] text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </Modal>
    </>
  );
};

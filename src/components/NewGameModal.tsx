import React, { useState, useEffect, useMemo, useId } from 'react';
import { useGame } from '../context/GameContext';
import { useIsOwner } from '../hooks/useIsOwner';
import { Plus } from 'lucide-react';
import { GameItem, GameStatus } from '../types/game';
import { CoverPicker } from './CoverPicker';
import { Modal } from './Modal';
import { SelectWithCustom } from './SelectWithCustom';
import { cleanTitle, normalizeTitleKey, normalizeConsoleName } from '../utils/markdownParser';
import { getAutoBeatenDate } from '../utils/recentBeatenGames';

const DEFAULT_CONSOLE_PRESETS = [
  'PC / Steam',
  'PlayStation 5',
  'PlayStation 4',
  'Nintendo Switch',
  'Steam Deck',
  'PC Engine',
  'Retro / CPS2',
  'SNES',
  'GBA',
  'Arcade',
  'Nintendo 64',
  'PlayStation 2',
  'Mega Drive',
  'Nintendo DS',
];

const DEFAULT_GENRE_PRESETS = [
  'Ação',
  'Ação Aventura',
  'Ação Mecha',
  'RPG / Sci-Fi',
  'JRPG',
  'CRPG',
  'Metroidvania',
  'Luta 2D',
  'Souls-like',
  'Roguelike / Cartas',
  'Plataforma',
  'Survival Horror',
  'Terror Psicológico',
  'Shmup',
  'Tiro / FPS',
  'Aventura',
];

export const NewGameModal: React.FC = () => {
  const { games, isNewGameModalOpen, setIsNewGameModalOpen, addGame, setSelectedGameId, setActiveTab, setDuplicatePrompt } = useGame();
  const isOwner = useIsOwner();

  const titleInputId = useId();
  const consoleInputId = useId();
  const genreInputId = useId();
  const releaseYearId = useId();
  const statusInputId = useId();
  const yearBeatenId = useId();
  const dateBeatenId = useId();
  const hltbId = useId();
  const ratingId = useId();
  const prioridadeInputId = useId();

  const currentYear = new Date().getFullYear();
  const todayDateStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [consoleValue, setConsoleValue] = useState('PC / Steam');
  const [genreValue, setGenreValue] = useState('Ação');
  const [releaseYear, setReleaseYear] = useState('');
  const [status, setStatus] = useState<GameStatus>('fila');
  const [prioridade, setPrioridade] = useState(false);
  const [yearBeaten, setYearBeaten] = useState(String(currentYear));
  const [dateBeaten, setDateBeaten] = useState(todayDateStr);
  const [coverUrl, setCoverUrl] = useState('');
  const [hltbTime, setHltbTime] = useState('');
  const [rating, setRating] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isDateManuallyEdited, setIsDateManuallyEdited] = useState(false);
  const [isAutoFilledDate, setIsAutoFilledDate] = useState(false);

  // Suggestions from user's current game library
  const suggestedConsoles = useMemo(() => {
    const fromLibrary = games.map((g) => g.console).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_CONSOLE_PRESETS, ...fromLibrary]));
    return combined.sort();
  }, [games]);

  const suggestedGenres = useMemo(() => {
    const fromLibrary = games.map((g) => g.genero).filter(Boolean);
    const combined = Array.from(new Set([...DEFAULT_GENRE_PRESETS, ...fromLibrary]));
    return combined.sort();
  }, [games]);

  const resetFields = () => {
    setTitle('');
    setConsoleValue('PC / Steam');
    setGenreValue('Ação');
    setReleaseYear('');
    setStatus('fila');
    setPrioridade(false);
    setYearBeaten(String(new Date().getFullYear()));
    setDateBeaten(new Date().toISOString().split('T')[0]);
    setIsDateManuallyEdited(false);
    setIsAutoFilledDate(false);
    setCoverUrl('');
    setHltbTime('');
    setRating('');
    setErrorMsg('');
  };

  // Reset fields when opening/closing modal
  useEffect(() => {
    if (isNewGameModalOpen) {
      resetFields();
    }
  }, [isNewGameModalOpen]);

  const handleClose = () => {
    resetFields();
    setIsNewGameModalOpen(false);
  };

  const handleStatusChange = (newStatus: GameStatus) => {
    setStatus(newStatus);
    if (newStatus === 'zerado') {
      if (!isDateManuallyEdited || !dateBeaten.trim()) {
        const auto = getAutoBeatenDate([]);
        setDateBeaten(auto.data_zerado);
        setYearBeaten(String(auto.ano_zerado));
        setIsAutoFilledDate(true);
      }
    }
  };

  if (!isNewGameModalOpen || !isOwner) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Por favor, informe o título do jogo.');
      return;
    }

    // Validate Cover URL if provided
    let finalCover = coverUrl.trim();
    if (finalCover) {
      const isHttps = finalCover.startsWith('https://');
      const isIgdbCode = /^[a-zA-Z0-9_-]+$/.test(finalCover) && !finalCover.includes('/');
      if (!isHttps && !isIgdbCode) {
        setErrorMsg('A URL da capa deve usar o protocolo seguro HTTPS (https://...) ou ser um código IGDB válido.');
        return;
      }
    } else {
      finalCover = 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg';
    }

    const parsedReleaseYear = releaseYear.trim() ? parseInt(releaseYear.trim(), 10) : undefined;
    const parsedRating = status === 'zerado' && rating.trim() ? parseFloat(rating.trim()) : undefined;
    
    let parsedDateBeaten: string | undefined = undefined;
    let parsedYearBeaten: number | undefined = undefined;

    if (status === 'zerado') {
      parsedDateBeaten = dateBeaten.trim() || getAutoBeatenDate([]).data_zerado;
      parsedYearBeaten = parseInt(yearBeaten, 10);
      if (isNaN(parsedYearBeaten) && parsedDateBeaten) {
        parsedYearBeaten = parseInt(parsedDateBeaten.split('-')[0], 10);
      }
      if (!parsedYearBeaten || isNaN(parsedYearBeaten)) {
        parsedYearBeaten = currentYear;
      }
    }

    const finalConsole = consoleValue.trim() || 'Outro';
    const pendingGameData: Partial<GameItem> = {
      title: title.trim(),
      fileName: `${title.trim()}.md`,
      console: finalConsole,
      genero: genreValue.trim() || 'Geral',
      ano_lancamento: parsedReleaseYear,
      status,
      ano_zerado: parsedYearBeaten,
      data_zerado: parsedDateBeaten,
      capa: finalCover,
      hltb: hltbTime.trim() || undefined,
      nota: parsedRating,
      tempo: '0h00',
      ...(prioridade ? { prioridade: true, prioridadeEm: Date.now() } : {}),
    };

    // Check if game already exists with same normalized title and same normalized console
    const normKey = normalizeTitleKey(title.trim());
    const normConsole = normalizeConsoleName(finalConsole).toLowerCase();
    const existing = games.find(
      (g) => normalizeTitleKey(g.title) === normKey && normalizeConsoleName(g.console).toLowerCase() === normConsole
    );

    if (existing) {
      handleClose();
      setDuplicatePrompt({ existingGame: existing, pendingGame: pendingGameData });
      return;
    }

    const newGame = addGame(pendingGameData);

    handleClose();
    setSelectedGameId(newGame.id);
    setActiveTab('detalhes');
  };

  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;

  return (
    <Modal
      isOpen={isNewGameModalOpen}
      onClose={handleClose}
      title="Cadastrar Novo Jogo"
      description="Adicione um título ao seu acervo e backlog pessoal."
      maxWidth="max-w-xl"
    >
      <form id="new-game-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* Título */}
        <div>
          <label htmlFor={titleInputId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
            Título do Jogo *
          </label>
          <input
            id={titleInputId}
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Metroid Prime 4: Beyond"
            className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white placeholder-[#9aa4b2] focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
          />
        </div>

        {/* Console / Plataforma */}
        <SelectWithCustom
          id={consoleInputId}
          label="Plataforma / Console"
          value={consoleValue}
          onChange={setConsoleValue}
          presets={DEFAULT_CONSOLE_PRESETS}
          libraryValues={games.map((g) => g.console).filter(Boolean)}
          type="console"
          required
        />

        {/* Gênero */}
        <SelectWithCustom
          id={genreInputId}
          label="Gênero"
          value={genreValue}
          onChange={setGenreValue}
          presets={DEFAULT_GENRE_PRESETS}
          libraryValues={games.map((g) => g.genero).filter(Boolean)}
          type="genero"
          required
        />

        {/* Ano de Lançamento e Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label htmlFor={releaseYearId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
              Ano de Lançamento
            </label>
            <input
              id={releaseYearId}
              type="text"
              inputMode="numeric"
              value={releaseYear}
              onChange={(e) => setReleaseYear(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Ex: 1994, 2024"
              className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
            />
          </div>

          <div>
            <label htmlFor={statusInputId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
              Status *
            </label>
            <select
              id={statusInputId}
              value={status}
              onChange={(e: any) => handleStatusChange(e.target.value)}
              className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-bold"
            >
              <option value="fila">Fila</option>
              <option value="jogando">Jogando</option>
              <option value="pausado">Pausado</option>
              <option value="abandonado">Abandonado</option>
              <option value="wishlist">Wishlist</option>
              <option value="zerado">Zerado</option>
            </select>
          </div>
        </div>

        {/* Opção Prioridade (Próximos Jogos) - 44px touch target */}
        <div className="flex items-center min-h-[44px] rounded-lg border border-[#30363d]/80 bg-[#0d1117] px-3.5 py-2">
          <label htmlFor={prioridadeInputId} className="flex items-center gap-3 cursor-pointer select-none w-full min-h-[44px]">
            <input
              id={prioridadeInputId}
              type="checkbox"
              checked={prioridade}
              onChange={(e) => setPrioridade(e.target.checked)}
              className="h-5 w-5 rounded border-[#30363d] bg-[#161b22] text-[#22d3ee] focus:ring-[#22d3ee] focus:ring-offset-0 cursor-pointer accent-[#22d3ee]"
            />
            <span className="text-xs sm:text-sm font-semibold text-white">
              Marcar como prioridade (aparece em Próximos jogos)
            </span>
          </label>
        </div>

        {/* Horas para zerar segundo o HLTB (HowLongToBeat) */}
        <div>
          <label htmlFor={hltbId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5 flex items-center justify-between">
            <span>Horas para Zerar (HLTB)</span>
            <span className="text-xs font-normal text-[#9aa4b2] lowercase">estimativa HowLongToBeat</span>
          </label>
          <input
            id={hltbId}
            type="text"
            value={hltbTime}
            onChange={(e) => setHltbTime(e.target.value)}
            placeholder="Ex: 15h ou 15:30"
            className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
          />
        </div>

        {/* Campos Condicionais para Status Zerado */}
        {status === 'zerado' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 rounded-xl border border-[#30363d] bg-[#0d1117]/60 p-3.5">
            <div>
              <label htmlFor={yearBeatenId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
                Ano Zerado
              </label>
              <input
                id={yearBeatenId}
                type="text"
                inputMode="numeric"
                value={yearBeaten}
                onChange={(e) => setYearBeaten(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label htmlFor={dateBeatenId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
                Data em que Zerou
              </label>
              <input
                id={dateBeatenId}
                type="date"
                value={dateBeaten}
                onChange={(e) => {
                  setDateBeaten(e.target.value);
                  setIsDateManuallyEdited(true);
                  setIsAutoFilledDate(false);
                  const parts = e.target.value.split('-');
                  if (parts.length >= 1 && parts[0].length === 4) {
                    setYearBeaten(parts[0]);
                  }
                }}
                className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
              />
              {isAutoFilledDate && (
                <p className="text-xs text-[#22d3ee] mt-1 font-medium">
                  Preenchido com a data da última sessão
                </p>
              )}
            </div>

            <div>
              <label htmlFor={ratingId} className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5">
                Nota Pessoal (0 - 10)
              </label>
              <input
                id={ratingId}
                type="text"
                inputMode="decimal"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="Ex: 9.0"
                className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-base md:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Seletor de Capas com Validação HTTPS */}
        <CoverPicker
          gameTitle={title}
          coverUrl={coverUrl}
          onChangeCoverUrl={setCoverUrl}
        />

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={handleClose}
            className="min-h-[44px] rounded-xl border border-[#30363d] px-5 py-2 text-xs font-bold text-[#9aa4b2] hover:text-white hover:bg-white/5 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#22d3ee] px-6 py-2 text-xs font-black uppercase text-[#0d1117] shadow-lg shadow-[#22d3ee]/20 hover:bg-[#06b6d4] transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            <Plus className="h-4 w-4 stroke-[3]" aria-hidden="true" />
            <span>Cadastrar Jogo</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

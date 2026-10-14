import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { Save, Trash2, Edit3, Trophy, Check } from 'lucide-react';
import { GameStatus } from '../types/game';
import { CoverPicker } from './CoverPicker';
import { formatTempoDisplay } from '../utils/markdownParser';
import { Modal } from './Modal';
import { SelectWithCustom } from './SelectWithCustom';
import { normalizeConsoleName } from '../utils/gameDeduplicator';
import { getAutoBeatenDate } from '../utils/recentBeatenGames';

const CONSOLE_PRESETS = [
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
  'Outro (Personalizado)'
];

const GENRE_PRESETS = [
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
  'Outro (Personalizado)'
];

export const EditGameModal: React.FC = () => {
  const { 
    isEditGameModalOpen, 
    setIsEditGameModalOpen, 
    editingGame, 
    updateGame, 
    deleteGame,
    games 
  } = useGame();

  const { success } = useToast();

  const [title, setTitle] = useState('');
  const [selectedConsole, setSelectedConsole] = useState('PC / Steam');
  const [selectedGenre, setSelectedGenre] = useState('Ação');
  const [releaseYear, setReleaseYear] = useState('');
  const [status, setStatus] = useState<GameStatus>('fila');
  const [prioridade, setPrioridade] = useState(false);
  const [yearBeaten, setYearBeaten] = useState('');
  const [dataZerado, setDataZerado] = useState('');
  const [tempo, setTempo] = useState('');
  const [progressPercent, setProgressPercent] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [hltbTime, setHltbTime] = useState('');
  const [rating, setRating] = useState('');
  const [notes, setNotes] = useState('');

  // GOT Awards state
  const [gotJogo, setGotJogo] = useState(false);
  const [gotGameplay, setGotGameplay] = useState(false);
  const [gotNarrativa, setGotNarrativa] = useState(false);
  const [gotArte, setGotArte] = useState(false);
  const [gotIndie, setGotIndie] = useState(false);
  const [gotSurpresa, setGotSurpresa] = useState(false);
  const [gotRetro, setGotRetro] = useState(false);
  const [gotDificil, setGotDificil] = useState(false);
  const [gotPior, setGotPior] = useState(false);
  const [isDateManuallyEdited, setIsDateManuallyEdited] = useState(false);
  const [isAutoFilledDate, setIsAutoFilledDate] = useState(false);

  useEffect(() => {
    if (editingGame) {
      setTitle(editingGame.title || '');
      setSelectedConsole(editingGame.console || 'PC / Steam');
      setSelectedGenre(editingGame.genero || 'Ação');
      setReleaseYear(editingGame.ano_lancamento ? String(editingGame.ano_lancamento) : '');
      setStatus(editingGame.status || 'fila');
      setPrioridade(Boolean(editingGame.prioridade));
      
      // Auto-preenchimento ou preservação de data de zerado
      if (editingGame.status === 'zerado' && editingGame.data_zerado) {
        setDataZerado(editingGame.data_zerado);
        setYearBeaten(editingGame.ano_zerado ? String(editingGame.ano_zerado) : String(parseInt(editingGame.data_zerado.split('-')[0], 10) || new Date().getFullYear()));
        setIsDateManuallyEdited(false);
        setIsAutoFilledDate(false);
      } else if (editingGame.status === 'zerado' && !editingGame.data_zerado) {
        const auto = getAutoBeatenDate(editingGame.sessoes);
        setDataZerado(auto.data_zerado);
        setYearBeaten(String(auto.ano_zerado));
        setIsDateManuallyEdited(false);
        setIsAutoFilledDate(true);
      } else {
        setDataZerado('');
        setYearBeaten(String(new Date().getFullYear()));
        setIsDateManuallyEdited(false);
        setIsAutoFilledDate(false);
      }

      setTempo(editingGame.tempo || '');
      setProgressPercent(editingGame.progressPercent !== undefined ? String(editingGame.progressPercent) : '');
      setCoverUrl(editingGame.capa || '');
      setHltbTime(editingGame.hltb || '');
      setRating(editingGame.nota !== undefined ? String(editingGame.nota) : '');
      setNotes(editingGame.anotacoes || '');

      setGotJogo(!!editingGame.got_jogo);
      setGotGameplay(!!editingGame.got_gameplay);
      setGotNarrativa(!!editingGame.got_narrativa);
      setGotArte(!!editingGame.got_arte);
      setGotIndie(!!editingGame.got_indie);
      setGotSurpresa(!!editingGame.got_surpresa);
      setGotRetro(!!editingGame.got_retro);
      setGotDificil(!!editingGame.got_dificil);
      setGotPior(!!editingGame.got_pior);
    }
  }, [editingGame]);

  if (!isEditGameModalOpen || !editingGame) return null;

  const handleClose = () => {
    setIsEditGameModalOpen(false);
  };

  const handleStatusChange = (newStatus: GameStatus) => {
    setStatus(newStatus);
    if (newStatus === 'zerado') {
      // Se acabou de mudar para zerado e o campo não foi editado manualmente (ou está vazio):
      if (!isDateManuallyEdited || !dataZerado.trim()) {
        const auto = getAutoBeatenDate(editingGame.sessoes);
        setDataZerado(auto.data_zerado);
        setYearBeaten(String(auto.ano_zerado));
        setIsAutoFilledDate(true);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalConsole = selectedConsole.trim() || 'Outro';
    const finalGenre = selectedGenre.trim() || 'Geral';

    const parsedYear = releaseYear.trim() ? parseInt(releaseYear.trim(), 10) : undefined;
    
    let finalDataZerado: string | undefined = undefined;
    let parsedYearBeaten: number | undefined = undefined;

    if (status === 'zerado') {
      if (dataZerado.trim()) {
        finalDataZerado = dataZerado.trim();
      } else {
        const auto = getAutoBeatenDate(editingGame.sessoes);
        finalDataZerado = auto.data_zerado;
      }

      parsedYearBeaten = parseInt(yearBeaten.trim(), 10);
      if (isNaN(parsedYearBeaten) && finalDataZerado) {
        parsedYearBeaten = parseInt(finalDataZerado.split('-')[0], 10);
      }
      if (!parsedYearBeaten || isNaN(parsedYearBeaten)) {
        parsedYearBeaten = new Date().getFullYear();
      }
    }

    const parsedRating = rating.trim() ? parseFloat(rating) : undefined;
    const parsedProgress = progressPercent.trim() ? parseInt(progressPercent, 10) : undefined;

    let finalCover = coverUrl.trim();
    if (finalCover && !finalCover.startsWith('http://') && !finalCover.startsWith('https://')) {
      if (/^[a-zA-Z0-9_-]+$/.test(finalCover)) {
        finalCover = `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${finalCover}.jpg`;
      } else {
        finalCover = `https://${finalCover}`;
      }
    }

    updateGame(editingGame.id, {
      title: title.trim(),
      console: finalConsole,
      genero: finalGenre,
      ano_lancamento: parsedYear,
      status,
      ano_zerado: parsedYearBeaten,
      data_zerado: finalDataZerado,
      tempo: tempo.trim() || '0h00',
      progressPercent: parsedProgress,
      capa: finalCover,
      hltb: hltbTime.trim() || undefined,
      nota: parsedRating,
      anotacoes: notes.trim() || undefined,
      got_jogo: gotJogo,
      got_gameplay: gotGameplay,
      got_narrativa: gotNarrativa,
      got_arte: gotArte,
      got_indie: gotIndie,
      got_surpresa: gotSurpresa,
      got_retro: gotRetro,
      got_dificil: gotDificil,
      got_pior: gotPior,
      ...(prioridade
        ? {
            prioridade: true,
            prioridadeEm:
              editingGame.prioridade && editingGame.prioridadeEm
                ? editingGame.prioridadeEm
                : Date.now(),
          }
        : {
            prioridade: false,
          }),
    });

    success(`"${title.trim()}" atualizado com sucesso!`);
    handleClose();
  };

  const handleDelete = () => {
    deleteGame(editingGame.id);
    handleClose();
    success(`"${editingGame.title}" foi excluído.`);
  };

  return (
    <Modal
      isOpen={isEditGameModalOpen}
      onClose={handleClose}
      title="Editar Jogo"
      titleId="edit-game-modal-title"
      icon={<Edit3 className="h-5 w-5" aria-hidden="true" />}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Título */}
        <div>
          <label htmlFor="edit-game-title" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
            Título do Jogo *
          </label>
          <input
            id="edit-game-title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-border bg-bg px-3.5 py-2.5 text-base md:text-sm text-text focus-visible:ring-2 focus-visible:ring-accent focus:outline-none"
          />
        </div>

        {/* Plataforma */}
        <SelectWithCustom
          id="edit-game-console"
          label="Plataforma"
          value={selectedConsole}
          onChange={setSelectedConsole}
          presets={CONSOLE_PRESETS.filter((p) => p !== 'Outro (Personalizado)')}
          libraryValues={games.map((g) => g.console).filter(Boolean)}
          type="console"
          required
        />

        {/* Gênero */}
        <SelectWithCustom
          id="edit-game-genre"
          label="Gênero"
          value={selectedGenre}
          onChange={setSelectedGenre}
          presets={GENRE_PRESETS.filter((p) => p !== 'Outro (Personalizado)')}
          libraryValues={games.map((g) => g.genero).filter(Boolean)}
          type="genero"
          required
        />

        {/* Status, Nota, Tempo e HLTB */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="edit-game-status" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Status *
            </label>
            <select
              id="edit-game-status"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as GameStatus)}
              className="w-full min-h-[44px] rounded-xl border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-bold focus:border-accent focus:outline-none"
            >
              <option value="fila">Quero Jogar / Fila</option>
              <option value="jogando">Jogando Agora</option>
              <option value="pausado">Pausado</option>
              <option value="abandonado">Abandonado</option>
              <option value="wishlist">Wishlist</option>
              <option value="zerado">Zerado</option>
            </select>
          </div>

          {/* Opção Prioridade (Próximos Jogos) - 44px touch target */}
          <div className="sm:col-span-3 flex items-center min-h-[44px] rounded-xl border border-border bg-bg px-3.5 py-2">
            <label htmlFor="edit-game-prioridade" className="flex items-center gap-3 cursor-pointer select-none w-full min-h-[44px]">
              <input
                id="edit-game-prioridade"
                type="checkbox"
                checked={prioridade}
                onChange={(e) => setPrioridade(e.target.checked)}
                className="h-5 w-5 rounded border-border bg-card text-accent focus:ring-accent focus:ring-offset-0 cursor-pointer accent-[#22d3ee]"
              />
              <span className="text-xs sm:text-sm font-semibold text-text">
                Marcar como prioridade (aparece em Próximos jogos)
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="edit-game-rating" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Nota (0 - 10)
            </label>
            <input
              id="edit-game-rating"
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-game-tempo" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Tempo Total (h:mm)
            </label>
            <input
              id="edit-game-tempo"
              type="text"
              value={tempo}
              onChange={(e) => setTempo(e.target.value)}
              placeholder="Ex: 10:30"
              className="w-full min-h-[44px] rounded-xl border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="edit-game-hltb" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Horas HLTB
            </label>
            <input
              id="edit-game-hltb"
              type="text"
              value={hltbTime}
              onChange={(e) => setHltbTime(e.target.value)}
              placeholder="Ex: 15h ou 15:30"
              className="w-full min-h-[44px] rounded-xl border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-mono focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        {/* Informações de Zerado se status === 'zerado' */}
        {status === 'zerado' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5">
            <div>
              <label htmlFor="edit-game-year-beaten" className="block text-xs font-bold text-text-muted mb-1">
                Ano Zerado
              </label>
              <input
                id="edit-game-year-beaten"
                type="text"
                inputMode="numeric"
                value={yearBeaten}
                onChange={(e) => setYearBeaten(e.target.value)}
                className="w-full min-h-[44px] rounded-lg border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-mono"
              />
            </div>
            <div>
              <label htmlFor="edit-game-date-beaten" className="block text-xs font-bold text-text-muted mb-1">
                Data Zerado (YYYY-MM-DD)
              </label>
              <input
                id="edit-game-date-beaten"
                type="date"
                value={dataZerado}
                onChange={(e) => {
                  setDataZerado(e.target.value);
                  setIsDateManuallyEdited(true);
                  setIsAutoFilledDate(false);
                  const parts = e.target.value.split('-');
                  if (parts.length >= 1 && parts[0].length === 4) {
                    setYearBeaten(parts[0]);
                  }
                }}
                className="w-full min-h-[44px] rounded-lg border border-border bg-bg px-3 py-2 text-base md:text-sm text-text font-mono"
              />
              {isAutoFilledDate && (
                <p className="text-xs text-[#22d3ee] mt-1 font-medium">
                  Preenchido com a data da última sessão
                </p>
              )}
            </div>
          </div>
        )}

        {/* Seletor de Capa */}
        <div className="pt-2">
          <CoverPicker
            gameTitle={title}
            coverUrl={coverUrl}
            onChangeCoverUrl={(url: string) => setCoverUrl(url)}
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Excluir Jogo</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-xs font-black uppercase text-bg hover:bg-cyan-300 transition-all shadow-md shadow-cyan-500/20 min-h-[44px]"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

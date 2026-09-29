import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Trash2,
  Save,
  Upload,
  ImageIcon,
  Gamepad2,
  Rocket,
  Play,
  Pause,
  Trophy,
  Clock,
  Star,
  Heart,
  Plus,
} from 'lucide-react';
import { Game, GameStatus, PlaySession } from '../types';
import { GameCover } from './GameCover';
import { DurationInput } from './DurationInput';
import { compressImageFile, formatMinutes, sessionMinutes } from '../utils/storage';

interface GameModalProps {
  isOpen: boolean;
  game: Game | null; // null = novo jogo
  games: Game[]; // usado para sugerir consoles e gêneros já cadastrados
  onClose: () => void;
  onSave: (game: Game) => void;
  onDelete: (gameId: string) => boolean | void;
}

const STATUS_OPTIONS: { value: GameStatus; label: string; Icon: React.ElementType }[] = [
  { value: 'backlog', label: 'Quero jogar', Icon: Rocket },
  { value: 'jogando', label: 'Jogando agora', Icon: Play },
  { value: 'pausado', label: 'Pausado', Icon: Pause },
  { value: 'zerado', label: 'Zerado', Icon: Trophy },
  { value: 'abandonado', label: 'Abandonado', Icon: X },
];

const DIFICULDADES = ['', 'Fácil', 'Normal', 'Difícil', 'Insano'] as const;

const today = () => new Date().toISOString().slice(0, 10);

/** Lista os valores mais usados (ex.: consoles) nos jogos já cadastrados */
function topValues(list: Game[], key: 'console' | 'genero', max: number): string[] {
  const count = new Map<string, number>();
  list.forEach((g) => {
    const v = (g[key] || '').trim();
    if (v) count.set(v, (count.get(v) || 0) + 1);
  });
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([v]) => v);
}

const sectionClass = 'rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4';
const sectionTitle = 'flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-3';
const labelClass = 'block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5';
const inputClass =
  'w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 [color-scheme:dark]';

/** Botões de escolha (console/gênero) + campo "Outro" */
const ChipSelect: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
  const isCustom = value !== '' && !options.includes(value);
  const [showOther, setShowOther] = useState(isCustom);

  useEffect(() => {
    if (isCustom) setShowOther(true);
  }, [isCustom]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            type="button"
            key={opt}
            onClick={() => {
              onChange(opt);
              setShowOther(false);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              value === opt
                ? 'bg-cyan-400 text-slate-950 border-cyan-400'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
            }`}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowOther(true)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            showOther
              ? 'bg-fuchsia-500 text-white border-fuchsia-500'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
          }`}
        >
          + Outro
        </button>
      </div>
      {showOther && (
        <input
          type="text"
          value={isCustom ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} mt-2`}
          autoFocus={!isCustom}
        />
      )}
    </div>
  );
};

export const GameModal: React.FC<GameModalProps> = ({ isOpen, game, games, onClose, onSave, onDelete }) => {
  const [nome, setNome] = useState('');
  const [capa, setCapa] = useState('');
  const [consoleName, setConsoleName] = useState('');
  const [genero, setGenero] = useState('');
  const [ano, setAno] = useState('');
  const [status, setStatus] = useState<GameStatus>('backlog');
  const [favorito, setFavorito] = useState(false);
  const [tempoBase, setTempoBase] = useState(0); // minutos jogados sem sessão registrada
  const [sessoes, setSessoes] = useState<PlaySession[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [est, setEst] = useState(''); // horas para zerar
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [nota, setNota] = useState(''); // '' = sem nota
  const [dificuldade, setDificuldade] = useState<string>('');
  const [notasPessoais, setNotasPessoais] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const consoleOptions = useMemo(() => {
    const base = topValues(games, 'console', 8);
    return game?.console && !base.includes(game.console) ? [...base, game.console] : base;
  }, [games, game]);

  const generoOptions = useMemo(() => {
    const base = topValues(games, 'genero', 10);
    return game?.genero && !base.includes(game.genero) ? [...base, game.genero] : base;
  }, [games, game]);

  // Preenche o formulário ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setUploading(false);
    if (game) {
      setNome(game.nome || '');
      setCapa(game.capa || '');
      setConsoleName(game.console || '');
      setGenero(game.genero || '');
      setAno(game.ano ? String(game.ano) : '');
      setStatus(game.status);
      setFavorito(!!game.favorito);
      const sess = game.sessoes || [];
      const somaSess = sess.reduce((acc, x) => acc + (x.minutos || 0), 0);
      setSessoes(sess);
      setTempoBase(Math.max(0, Math.round((game.tempo || 0) - somaSess)));
      setEst(game.est ? String(game.est) : '');
      setInicio(game.inicio || '');
      setFim(game.fim || '');
      setNota(typeof game.nota === 'number' ? String(game.nota) : '');
      setDificuldade(game.dificuldade || '');
      setNotasPessoais(game.notasPessoais || '');
    } else {
      setNome('');
      setCapa('');
      setConsoleName(consoleOptions[0] || '');
      setGenero('');
      setAno('');
      setStatus('backlog');
      setFavorito(false);
      setTempoBase(0);
      setSessoes([]);
      setEst('');
      setInicio('');
      setFim('');
      setNota('');
      setDificuldade('');
      setNotasPessoais('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, game]);

  if (!isOpen) return null;

  const isEditing = !!game;

  const showError = (msg: string) => {
    setError(msg);
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalSessoes = sessoes.reduce((acc, x) => acc + sessionMinutes(x.inicio, x.fim), 0);
  const totalTempo = tempoBase + totalSessoes;

  const addSessao = () => {
    const ultima = sessoes[sessoes.length - 1];
    setSessoes((prev) => [
      ...prev,
      {
        id: `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        data: ultima?.data || today(),
        inicio: '',
        fim: '',
        minutos: 0,
      },
    ]);
  };
  const updateSessao = (id: string, patch: Partial<PlaySession>) =>
    setSessoes((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeSessao = (id: string) => setSessoes((prev) => prev.filter((x) => x.id !== id));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const dataUrl = await compressImageFile(file);
    setUploading(false);
    if (dataUrl) setCapa(dataUrl);
    else showError('Não consegui ler essa imagem. Tente outra ou use o link (URL).');
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      showError('Digite o nome do jogo para salvar.');
      return;
    }
    for (let i = 0; i < sessoes.length; i++) {
      const x = sessoes[i];
      if (!x.data || !x.inicio || !x.fim) {
        showError(`Preencha a data, o início e o fim da sessão ${i + 1} (ou remova essa linha).`);
        return;
      }
      if (x.inicio === x.fim) {
        showError(`Na sessão ${i + 1}, o horário de início e o de fim são iguais.`);
        return;
      }
    }
    const sessoesFinais: PlaySession[] = [...sessoes]
      .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
      .map((x) => ({ ...x, minutos: sessionMinutes(x.inicio, x.fim) }));
    const primeiraSessao = sessoesFinais[0];
    const ultimaSessao = sessoesFinais[sessoesFinais.length - 1];

    const estNum = parseFloat(est.replace(',', '.'));
    const notaNum = nota === '' ? null : Math.min(10, Math.max(0, parseFloat(nota.replace(',', '.')) || 0));
    const anoLimpo = ano.trim();

    const salvo: Game = {
      id: game?.id || `game-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      nome: nomeLimpo,
      console: consoleName.trim() || 'Geral',
      genero: genero.trim() || 'Aventura',
      ano: anoLimpo ? (Number.isNaN(Number(anoLimpo)) ? anoLimpo : Number(anoLimpo)) : '',
      capa: capa.trim(),
      status,
      tempo: Math.max(0, Math.round(totalTempo)),
      est: Number.isFinite(estNum) && estNum > 0 ? estNum : 0,
      inicio: inicio || primeiraSessao?.data || (status === 'jogando' ? today() : ''),
      fim: fim || (status === 'zerado' ? ultimaSessao?.data || today() : ''),
      nota: notaNum,
      favorito,
      notasPessoais: notasPessoais.trim(),
      dificuldade: dificuldade as Game['dificuldade'],
      sessoes: sessoesFinais,
    };

    onSave(salvo);
    onClose();
  };

  const handleDelete = () => {
    if (!game) return;
    const result = onDelete(game.id);
    if (result !== false) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm md:flex md:items-center md:justify-center md:p-6"
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full w-full flex-col bg-[#0b1020] md:h-auto md:max-h-[92vh] md:max-w-2xl md:rounded-2xl md:border md:border-slate-800 md:shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-center gap-3 border-b border-slate-800/80 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              {isEditing ? 'Editar registro' : 'Protocolo de registro'}
            </p>
            <h2 id="game-modal-title" className="font-display text-lg font-bold text-white truncate">
              {isEditing ? game!.nome : 'Ficha cadastral'}
            </h2>
          </div>
        </div>

        {/* Corpo com rolagem */}
        <div ref={bodyRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs font-medium text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Capa */}
          <section className={sectionClass}>
            <h3 className={sectionTitle}>
              <ImageIcon className="h-4 w-4" />
              <span>Capa do jogo</span>
            </h3>
            <div className="flex gap-4">
              <div className="w-24 shrink-0">
                <GameCover capa={capa} nome={nome || 'Novo jogo'} genero={genero} consoleName={consoleName} aspect="portrait" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700">
                  <Upload className="h-4 w-4 text-cyan-400" />
                  <span>{uploading ? 'Processando...' : 'Enviar imagem do aparelho'}</span>
                  <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                </label>
                <div>
                  <label className={labelClass} htmlFor="capa-url">
                    Ou link da imagem (mais leve)
                  </label>
                  <input
                    id="capa-url"
                    type="url"
                    value={capa.startsWith('data:') ? '' : capa}
                    onChange={(e) => setCapa(e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                {capa && (
                  <button
                    type="button"
                    onClick={() => setCapa('')}
                    className="text-[11px] text-slate-500 hover:text-rose-400"
                  >
                    Remover capa
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Informações principais */}
          <section className={sectionClass}>
            <h3 className={sectionTitle}>
              <Gamepad2 className="h-4 w-4" />
              <span>Informações principais</span>
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass} htmlFor="nome-jogo">
                  Nome do jogo *
                </label>
                <input
                  id="nome-jogo"
                  type="text"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Ex.: Chrono Trigger, Elden Ring..."
                  className={inputClass}
                />
              </div>

              <div>
                <span className={labelClass}>Console / plataforma</span>
                <ChipSelect
                  options={consoleOptions}
                  value={consoleName}
                  onChange={setConsoleName}
                  placeholder="Digite a plataforma"
                />
              </div>

              <div>
                <span className={labelClass}>Gênero</span>
                <ChipSelect options={generoOptions} value={genero} onChange={setGenero} placeholder="Digite o gênero" />
              </div>

              <div>
                <label className={labelClass} htmlFor="ano-jogo">
                  Ano de lançamento
                </label>
                <input
                  id="ano-jogo"
                  type="text"
                  inputMode="numeric"
                  value={ano}
                  onChange={(e) => setAno(e.target.value.slice(0, 4))}
                  placeholder="1995"
                  className={`${inputClass} sm:w-40`}
                />
              </div>
            </div>
          </section>

          {/* Status */}
          <section className={sectionClass}>
            <h3 className={sectionTitle}>
              <Rocket className="h-4 w-4" />
              <span>Status de execução</span>
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {STATUS_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  type="button"
                  key={value}
                  onClick={() => setStatus(value)}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors ${
                    status === value
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFavorito((f) => !f)}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 px-3 py-3 text-left"
              aria-pressed={favorito}
            >
              <span className="flex items-center gap-2">
                <Heart className={`h-4 w-4 ${favorito ? 'fill-fuchsia-400 text-fuchsia-400' : 'text-slate-500'}`} />
                <span>
                  <span className="block text-sm font-semibold text-white">Favorito</span>
                  <span className="block text-[11px] text-slate-500">Destacar este jogo na sua lista</span>
                </span>
              </span>
              <span
                className={`relative h-6 w-11 rounded-full transition-colors ${favorito ? 'bg-cyan-400' : 'bg-slate-700'}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    favorito ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </span>
            </button>
          </section>

          {/* Tempo */}
          <section className={sectionClass}>
            <h3 className={sectionTitle}>
              <Clock className="h-4 w-4" />
              <span>Tempo de jogo</span>
            </h3>

            <div className="space-y-4">
              <div>
                <span className={labelClass}>Sessões de jogo</span>
                {sessoes.length === 0 && (
                  <p className="mb-2 text-[11px] text-slate-500">
                    Registre o dia e o horário em que começou e terminou de jogar. O tempo é calculado sozinho.
                  </p>
                )}
                <div className="space-y-2">
                  {sessoes.map((x) => {
                    const min = sessionMinutes(x.inicio, x.fim);
                    const passouMeiaNoite = !!x.inicio && !!x.fim && x.fim < x.inicio;
                    return (
                      <div key={x.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={x.data}
                            onChange={(e) => updateSessao(x.id, { data: e.target.value })}
                            className={`${inputClass} flex-1`}
                            aria-label="Data da sessão"
                          />
                          <button
                            type="button"
                            onClick={() => removeSessao(x.id)}
                            className="p-2 text-slate-500 hover:text-rose-400"
                            aria-label="Remover sessão"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                          <input
                            type="time"
                            value={x.inicio}
                            onChange={(e) => updateSessao(x.id, { inicio: e.target.value })}
                            className={inputClass}
                            aria-label="Hora que começou"
                          />
                          <span className="text-xs text-slate-500">até</span>
                          <input
                            type="time"
                            value={x.fim}
                            onChange={(e) => updateSessao(x.id, { fim: e.target.value })}
                            className={inputClass}
                            aria-label="Hora que terminou"
                          />
                        </div>
                        <p className="mt-2 text-[11px]">
                          {min > 0 ? (
                            <span className="font-semibold text-cyan-300">
                              {formatMinutes(min)} jogados{passouMeiaNoite ? ' (passou da meia-noite)' : ''}
                            </span>
                          ) : (
                            <span className="text-slate-500">Informe o início e o fim para calcular</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addSessao}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-cyan-400/40 py-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-400/10"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar sessão
                </button>
              </div>

              <div>
                <span className={labelClass}>Tempo jogado antes (sem sessão registrada)</span>
                <DurationInput minutes={tempoBase} onChange={setTempoBase} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3">
                <div>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total jogado</span>
                  <span className="text-[11px] text-slate-500">
                    {sessoes.length} {sessoes.length === 1 ? 'sessão' : 'sessões'}
                    {tempoBase > 0 ? ` + ${formatMinutes(tempoBase)} anteriores` : ''}
                  </span>
                </div>
                <span className="font-display text-2xl font-bold text-cyan-300">{formatMinutes(totalTempo)}</span>
              </div>

              <div>
                <label className={labelClass} htmlFor="meta-horas">
                  Meta para concluir (horas)
                </label>
                <input
                  id="meta-horas"
                  type="text"
                  inputMode="decimal"
                  value={est}
                  onChange={(e) => setEst(e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="Ex.: 25"
                  className={`${inputClass} sm:w-40`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass} htmlFor="data-inicio">
                    Início
                  </label>
                  <input
                    id="data-inicio"
                    type="date"
                    value={inicio}
                    onChange={(e) => setInicio(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="data-fim">
                    Término
                  </label>
                  <input
                    id="data-fim"
                    type="date"
                    value={fim}
                    onChange={(e) => setFim(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Avaliação */}
          <section className={sectionClass}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`${sectionTitle} mb-0`}>
                <Star className="h-4 w-4" />
                <span>Avaliação pessoal</span>
              </h3>
              <span className="flex items-center gap-1 rounded-lg bg-slate-950 px-2.5 py-1 text-sm font-bold text-fuchsia-300">
                <Star className="h-3.5 w-3.5 fill-fuchsia-300" />
                {nota === '' ? '—' : Number(nota).toFixed(1)}
                <span className="text-[10px] font-medium text-slate-500">/10</span>
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={nota === '' ? 0 : nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full accent-fuchsia-400"
              aria-label="Nota de 0 a 10"
            />
            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
              <span>0</span>
              <span>5</span>
              <span>10</span>
            </div>
            {nota !== '' && (
              <button
                type="button"
                onClick={() => setNota('')}
                className="mt-1 text-[11px] text-slate-500 hover:text-rose-400"
              >
                Remover nota
              </button>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className={labelClass} htmlFor="dificuldade">
                  Dificuldade
                </label>
                <select
                  id="dificuldade"
                  value={dificuldade}
                  onChange={(e) => setDificuldade(e.target.value)}
                  className={inputClass}
                >
                  {DIFICULDADES.map((d) => (
                    <option key={d} value={d}>
                      {d || '— não informada —'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="anotacoes">
                  Anotações de campanha
                </label>
                <textarea
                  id="anotacoes"
                  rows={3}
                  value={notasPessoais}
                  onChange={(e) => setNotasPessoais(e.target.value)}
                  placeholder="Dicas de build, senhas, progresso..."
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Rodapé fixo com as ações */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 bg-[#0b1020] px-4 py-3 pb-safe md:rounded-b-2xl">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex h-12 items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/50"
              aria-label={`Excluir ${game!.nome}`}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-xl bg-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-[0.99]"
          >
            <Save className="h-4 w-4" />
            <span>{isEditing ? 'Salvar alterações' : 'Salvar jogo'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

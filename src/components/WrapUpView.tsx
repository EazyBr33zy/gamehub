import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Trophy,
  CalendarDays,
  Globe2,
  Share2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Crown,
  Clock,
  Star,
  Check,
} from 'lucide-react';
import { Game, AppConfig, GOT_CATEGORIES } from '../types';
import { ConsoleIcon } from './ConsoleIcon';

interface WrapUpViewProps {
  games: Game[];
  config: AppConfig;
  onUpdateConfig: (newConfig: Partial<AppConfig>) => void;
  onSelectGame: (game: Game) => void;
}

type Tab = 'resumo' | 'analise' | 'top' | 'timeline' | 'geral';
type Rated = Game & { nota: number };

/* ------------------------------ helpers ------------------------------ */

const fmtHM = (m: number) => {
  const t = Math.max(0, Math.round(m || 0));
  return `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`;
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MESES_NOME = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MESES_LONGOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const DIAS_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

const PALETTE = ['#38bdf8', '#fb923c', '#f87171', '#c084fc', '#a78bfa', '#34d399', '#fbbf24', '#f472b6', '#2dd4bf', '#a3e635'];
const KNOWN: Record<string, string> = {
  'steam deck': '#3b82f6',
  arcade: '#fb923c',
  'nintendo ds': '#ef4444',
  dreamcast: '#c026d3',
  snes: '#8b5cf6',
  'neo geo': '#a855f7',
  'playstation 4': '#2563eb',
  android: '#a78bfa',
  'amiga cd32': '#d946ef',
  'game boy color': '#a855f7',
};

/** Cor fixa por nome (plataforma ou gênero) */
const colorOf = (name: string) => {
  const k = (name || '').trim().toLowerCase();
  if (KNOWN[k]) return KNOWN[k];
  let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const notaColor = (n: number) => {
  if (n >= 9) return '#fbbf24';
  if (n >= 8) return '#34d399';
  if (n >= 6) return '#22d3ee';
  return '#fb7185';
};

const notaLabel = (n: number) => (n >= 8 ? 'EXCELENTE' : n >= 7 ? 'ÓTIMO' : n >= 6 ? 'BOM' : 'REGULAR');

const GOT_LABELS: Record<string, { emoji: string; label: string; color: string }> = {
  gameplay: { emoji: '🎮', label: 'Melhor gameplay', color: '#22d3ee' },
  narrativa: { emoji: '📖', label: 'Melhor narrativa', color: '#c084fc' },
  arte: { emoji: '🎨', label: 'Direção de arte', color: '#fb923c' },
  indie: { emoji: '🌱', label: 'Indie do ano', color: '#34d399' },
  surpresa: { emoji: '💥', label: 'Surpresa do ano', color: '#f43f5e' },
  retro: { emoji: '🕹️', label: 'Retrô do ano', color: '#a78bfa' },
  dificil: { emoji: '💀', label: 'Mais difícil', color: '#fb923c' },
  mais_dificil: { emoji: '💀', label: 'Mais difícil', color: '#fb923c' },
  pior: { emoji: '📉', label: 'Pior do ano', color: '#94a3b8' },
};

const pad2 = (n: number) => String(n).padStart(2, '0');

const Chip: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    style={{ color, borderColor: color + '55', background: color + '1a' }}
    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
  >
    {children}
  </span>
);

const NotaChip: React.FC<{ nota?: number | null }> = ({ nota }) =>
  typeof nota === 'number' ? (
    <span
      style={{ color: notaColor(nota), borderColor: notaColor(nota) + '55', background: notaColor(nota) + '1a' }}
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold"
    >
      <Star className="h-2.5 w-2.5 fill-current" />
      {nota.toFixed(1)}
    </span>
  ) : null;

/** Miniatura da capa (com plano B quando não há imagem) */
const Thumb: React.FC<{ game: Game; className?: string }> = ({ game, className = '' }) => {
  const [err, setErr] = useState(false);
  if (game.capa && !err) {
    return (
      <img
        src={game.capa}
        alt={game.nome}
        referrerPolicy="no-referrer"
        onError={() => setErr(true)}
        className={`object-cover ${className}`}
      />
    );
  }
  const ini = game.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-indigo-950 to-slate-900 text-[10px] font-bold text-white/40 ${className}`}
    >
      {ini || 'GH'}
    </div>
  );
};

/** Ranking de horas (por console ou por gênero) dos jogos zerados */
const TimeRanking: React.FC<{
  title: string;
  rows: { name: string; count: number; minutes: number; icon?: React.ReactNode }[];
}> = ({ title, rows }) => {
  const sorted = [...rows].sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...sorted.map((r) => r.minutes));
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4">
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{title}</h3>
      <div className="space-y-3.5">
        {sorted.map((r) => {
          const color = colorOf(r.name);
          return (
            <div key={r.name}>
              <div className="mb-1 flex items-center gap-2">
                {r.icon && (
                  <span className="shrink-0" style={{ color }}>
                    {r.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color }}>
                  {r.name}
                </span>
                <span className="font-display text-sm font-bold text-white">{fmtHM(r.minutes)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full" style={{ width: `${(r.minutes / max) * 100}%`, background: color }} />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {r.count} {r.count === 1 ? 'zerado' : 'zerados'} · média de {fmtHM(r.minutes / r.count)} por jogo
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ color?: string; children: React.ReactNode }> = ({ color = '#22d3ee', children }) => (
  <div className="mb-4 flex items-center gap-2">
    <span className="h-2 w-2 rounded-full" style={{ background: color }} />
    <h2 className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.18em] text-white">{children}</h2>
    <span className="h-px flex-1 bg-gradient-to-r from-slate-700/70 to-transparent" />
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  accent: string;
  sub?: string;
  extra?: React.ReactNode;
}> = ({ label, value, accent, sub, extra }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4">
    <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className="mt-1 font-display text-2xl sm:text-3xl font-bold leading-tight" style={{ color: accent }}>
      {value}
    </p>
    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    {extra}
  </div>
);

const Delta: React.FC<{ value: number; suffix: string }> = ({ value, suffix }) => {
  if (value === 0) return <p className="mt-0.5 text-[11px] font-bold text-slate-500">= {suffix}</p>;
  const up = value > 0;
  return (
    <p className="mt-0.5 text-[11px] font-bold" style={{ color: up ? '#34d399' : '#fb7185' }}>
      {up ? '▲ +' : '▼ '}
      {value} {suffix}
    </p>
  );
};

/* ------------------------------ componente ------------------------------ */

export const WrapUpView: React.FC<WrapUpViewProps> = ({ games, config, onUpdateConfig, onSelectGame }) => {
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const set = new Set<number>([currentYear]);
    games.forEach((g) => {
      if (g.status === 'zerado' && g.fim) {
        const y = parseInt(g.fim.slice(0, 4), 10);
        if (!Number.isNaN(y)) set.add(y);
      }
    });
    return [...set].sort((a, b) => a - b);
  }, [games, currentYear]);

  const [year, setYear] = useState(currentYear);
  const [tab, setTab] = useState<Tab>('resumo');
  const [openPlat, setOpenPlat] = useState<string | null>(null);
  const [openGen, setOpenGen] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tlMonth, setTlMonth] = useState<number | null>(null); // mês visível na timeline

  const yearIdx = years.indexOf(year);
  const changeYear = (y: number) => {
    setYear(y);
    setTlMonth(null);
    setOpenPlat(null);
    setOpenGen(null);
  };

  const inYear = useMemo(
    () => games.filter((g) => g.status === 'zerado' && (g.fim || '').startsWith(String(year))),
    [games, year]
  );
  const prevYear = useMemo(
    () => games.filter((g) => g.status === 'zerado' && (g.fim || '').startsWith(String(year - 1))),
    [games, year]
  );

  const total = inYear.length;
  const totalMin = inYear.reduce((s, g) => s + (g.tempo || 0), 0);
  const prevMin = prevYear.reduce((s, g) => s + (g.tempo || 0), 0);

  const rated = useMemo(
    () => inYear.filter((g): g is Rated => typeof g.nota === 'number'),
    [inYear]
  );
  const avg = rated.length > 0 ? rated.reduce((s, g) => s + g.nota, 0) / rated.length : null;

  const byNota = useMemo(() => [...rated].sort((a, b) => b.nota - a.nota || b.tempo - a.tempo), [rated]);
  const byLongest = useMemo(() => [...inYear].sort((a, b) => b.tempo - a.tempo), [inYear]);
  const fastest = useMemo(
    () => [...inYear].filter((g) => g.tempo > 0).sort((a, b) => a.tempo - b.tempo)[0],
    [inYear]
  );
  const lowest = useMemo(() => (rated.length > 0 ? [...rated].sort((a, b) => a.nota - b.nota)[0] : undefined), [rated]);

  const group = (key: 'console' | 'genero') => {
    const map = new Map<string, Game[]>();
    inYear.forEach((g) => {
      const k = (g[key] || 'Outros').trim() || 'Outros';
      map.set(k, [...(map.get(k) || []), g]);
    });
    return [...map.entries()]
      .map(([name, items]) => {
        const r = items.filter((g): g is Rated => typeof g.nota === 'number');
        return {
          name,
          items: [...items].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1)),
          minutes: items.reduce((s, g) => s + (g.tempo || 0), 0),
          avg: r.length > 0 ? r.reduce((s, g) => s + g.nota, 0) / r.length : null,
        };
      })
      .sort((a, b) => b.items.length - a.items.length || b.minutes - a.minutes);
  };
  const platforms = useMemo(() => group('console'), [inYear]);
  const genres = useMemo(() => group('genero'), [inYear]);

  // Distribuição de notas (5, 6, 7, 8, 9, 10 e <5)
  const dist = useMemo(() => {
    const buckets = [5, 6, 7, 8, 9, 10].map((n) => ({ label: String(n), n, count: 0, color: notaColor(n) }));
    const low = { label: '<5', n: 0, count: 0, color: '#fb7185' };
    rated.forEach((g) => {
      const f = Math.floor(g.nota);
      if (f < 5) low.count++;
      else buckets[Math.min(10, f) - 5].count++;
    });
    return [...buckets, low];
  }, [rated]);
  const maxDist = Math.max(1, ...dist.map((b) => b.count));

  // Atividade mensal
  const monthly = useMemo(() => {
    const count = Array(12).fill(0) as number[];
    const minutes = Array(12).fill(0) as number[];
    inYear.forEach((g) => {
      const m = parseInt((g.fim || '').slice(5, 7), 10) - 1;
      if (m >= 0 && m < 12) {
        count[m]++;
        minutes[m] += g.tempo || 0;
      }
    });
    return { count, minutes };
  }, [inYear]);
  const maxMonth = Math.max(1, ...monthly.count);
  const peakMonth = monthly.count.indexOf(Math.max(...monthly.count));
  const activeMonths = monthly.count.filter((c) => c > 0).length;

  // Timeline
  const byDay = useMemo(() => {
    const map = new Map<string, Game[]>();
    inYear.forEach((g) => map.set(g.fim!, [...(map.get(g.fim!) || []), g]));
    return map;
  }, [inYear]);

  /* ---------- Geral: soma de TODOS os anos (aba separada) ---------- */
  const allZerados = useMemo(
    () => games.filter((g) => g.status === 'zerado' && g.fim),
    [games]
  );
  const allRated = useMemo(
    () => allZerados.filter((g): g is Rated => typeof g.nota === 'number'),
    [allZerados]
  );
  const allAvg = allRated.length > 0 ? allRated.reduce((s, g) => s + g.nota, 0) / allRated.length : null;
  const allMinutos = allZerados.reduce((s, g) => s + (g.tempo || 0), 0);

  const allDist = useMemo(() => {
    const buckets = [5, 6, 7, 8, 9, 10].map((n) => ({ label: String(n), n, count: 0, color: notaColor(n) }));
    const low = { label: '<5', n: 0, count: 0, color: '#fb7185' };
    allRated.forEach((g) => {
      const f = Math.floor(g.nota);
      if (f < 5) low.count++;
      else buckets[Math.min(10, f) - 5].count++;
    });
    return [...buckets, low];
  }, [allRated]);
  const allMaxDist = Math.max(1, ...allDist.map((b) => b.count));

  const allMonthly = useMemo(() => {
    const count = Array(12).fill(0) as number[];
    const minutes = Array(12).fill(0) as number[];
    allZerados.forEach((g) => {
      const m = parseInt((g.fim || '').slice(5, 7), 10) - 1;
      if (m >= 0 && m < 12) {
        count[m]++;
        minutes[m] += g.tempo || 0;
      }
    });
    return { count, minutes };
  }, [allZerados]);
  const allMaxMonth = Math.max(1, ...allMonthly.count);
  const allPeakMonth = allMonthly.count.indexOf(Math.max(...allMonthly.count));

  /** Agrupa jogos zerados por console ou gênero, somando todos os anos */
  const groupAll = (key: 'console' | 'genero') => {
    const map = new Map<string, Game[]>();
    allZerados.forEach((g) => {
      const k = (g[key] || 'Outros').trim() || 'Outros';
      map.set(k, [...(map.get(k) || []), g]);
    });
    return [...map.entries()]
      .map(([name, items]) => ({
        name,
        items: [...items].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1)),
        minutes: items.reduce((s, g) => s + (g.tempo || 0), 0),
      }))
      .sort((a, b) => b.minutes - a.minutes);
  };
  const allPlatforms = useMemo(() => groupAll('console'), [allZerados]);
  const allGenres = useMemo(() => groupAll('genero'), [allZerados]);

  const lastMonthWithGame = monthly.count.reduce((acc, c, i) => (c > 0 ? i : acc), -1);
  const defaultMonth = lastMonthWithGame >= 0 ? lastMonthWithGame : year === currentYear ? new Date().getMonth() : 0;
  const activeMonth = tlMonth ?? defaultMonth;

  const chrono = useMemo(() => {
    const sorted = [...inYear].sort((a, b) => (a.fim || '').localeCompare(b.fim || ''));
    const groups: { month: number; items: Game[] }[] = [];
    sorted.forEach((g) => {
      const m = parseInt((g.fim || '').slice(5, 7), 10) - 1;
      const last = groups[groups.length - 1];
      if (last && last.month === m) last.items.push(g);
      else groups.push({ month: m, items: [g] });
    });
    return groups;
  }, [inYear]);

  // Games of the Year: prioridade às seleções feitas na seção GOT desta aba (config.gotPremios[ano]);
  // sem elas, usa os prêmios got_* sincronizados do Obsidian; e por fim calcula automaticamente.
  const gotSelecao = config.gotPremios?.[String(year)] || {};
  const temSelecao = Object.values(gotSelecao).some(Boolean);
  const gameById = useMemo(() => {
    const m = new Map<string, Game>();
    inYear.forEach((g) => m.set(g.id, g));
    return m;
  }, [inYear]);

  /** Vencedor de uma categoria: escolha do usuário > marcação got_* do Obsidian */
  const winnerOf = (catKey: string): Game | undefined => {
    const escolhidoId = gotSelecao[catKey];
    if (escolhidoId) {
      const g = gameById.get(escolhidoId);
      if (g) return g;
    }
    const marcados = inYear.filter((x) => x.got?.[catKey] || (catKey === 'jogo' && x.got?.jogo));
    if (marcados.length > 0) return bestOfList(marcados);
    return undefined;
  };

  const gotGames = useMemo(
    () => (temSelecao ? [] : inYear.filter((g) => g.got && Object.keys(g.got).length > 0)),
    [inYear, temSelecao]
  );
  const hasGot = gotGames.length > 0 || temSelecao;
  const bestOfList = (list: Game[]) => [...list].sort((a, b) => (b.nota ?? -1) - (a.nota ?? -1) || b.tempo - a.tempo)[0];

  const goty = useMemo(() => {
    return (winnerOf('jogo') || byNota[0]) as Game | undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gotSelecao, inYear, byNota]);

  const categorias = useMemo(() => {
    const cats: { emoji: string; label: string; color: string; game: Game }[] = [];

    // 1) Categorias oficiais escolhidas pelo usuário na seção GOT (ou marcadas no Obsidian)
    const usados = new Set<string>();
    if (goty) usados.add(goty.id);
    GOT_CATEGORIES.filter((c) => c.key !== 'jogo').forEach((c) => {
      const w = winnerOf(c.key);
      if (!w) return;
      cats.push({ emoji: c.emoji, label: c.label, color: c.color, game: w });
      usados.add(w.id);
    });
    if (cats.length > 0) return cats;

    // 2) Chaves got_* extras vindas do Obsidian
    if (gotGames.length > 0) {
      const keys = new Set<string>();
      gotGames.forEach((g) => Object.keys(g.got!).forEach((k) => k !== 'jogo' && keys.add(k)));
      [...keys].forEach((k) => {
        const winners = gotGames.filter((g) => g.got![k]);
        if (winners.length === 0) return;
        const meta = GOT_LABELS[k] || {
          emoji: '🏆',
          label: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' '),
          color: colorOf(k),
        };
        cats.push({ ...meta, game: bestOfList(winners) });
      });
      return cats;
    }

    // 3) Sem GOT escolhido/marcado: cálculo automático
    const fav = inYear.filter((g) => g.favorito);
    if (fav.length) cats.push({ emoji: '❤️', label: 'Favorito do ano', color: '#f472b6', game: bestOfList(fav) });

    const rank = (d?: string) => (d === 'Insano' ? 2 : d === 'Difícil' ? 1 : 0);
    const hard = inYear.filter((g) => rank(g.dificuldade) > 0);
    if (hard.length)
      cats.push({
        emoji: '💀',
        label: 'Mais difícil',
        color: '#fb923c',
        game: [...hard].sort((a, b) => rank(b.dificuldade) - rank(a.dificuldade) || b.tempo - a.tempo)[0],
      });

    const indie = inYear.filter((g) => /indie/i.test(`${g.genero} ${g.console}`));
    if (indie.length) cats.push({ emoji: '🌱', label: 'Indie do ano', color: '#34d399', game: bestOfList(indie) });

    const retro = inYear.filter((g) => Number(g.ano) > 0 && Number(g.ano) <= 2005);
    if (retro.length) cats.push({ emoji: '🕹️', label: 'Retrô do ano', color: '#a78bfa', game: bestOfList(retro) });

    if (byLongest[0] && byLongest[0].tempo > 0)
      cats.push({ emoji: '🏃', label: 'Maratona do ano', color: '#c084fc', game: byLongest[0] });

    if (lowest && rated.length > 1) cats.push({ emoji: '📉', label: 'Menor nota', color: '#22d3ee', game: lowest });

    return cats;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inYear, byLongest, lowest, rated.length, hasGot, gotGames, gotSelecao, goty]);

  /** Salva/remove a escolha de um jogo em uma categoria do GOT do ano selecionado */
  const setGotChoice = (catKey: string, gameId: string) => {
    const yearKey = String(year);
    const prev = config.gotPremios?.[yearKey] || {};
    const next: Record<string, string> = { ...prev };
    if (gameId) next[catKey] = gameId;
    else delete next[catKey];
    onUpdateConfig({ gotPremios: { ...(config.gotPremios || {}), [yearKey]: next } });
  };

  const handleShare = () => {
    const text =
      `🎮 MEU WRAP-UP GAMER ${year} 🎮\n` +
      `🏆 ${total} jogos zerados\n` +
      `⏱️ ${fmtHM(totalMin)} de gameplay\n` +
      (avg !== null ? `⭐ Nota média: ${avg.toFixed(2)}/10\n` : '') +
      (goty ? `👑 GOTY: ${goty.nome}${typeof goty.nota === 'number' ? ` (${goty.nota.toFixed(1)})` : ''}\n` : '') +
      (platforms[0] ? `🕹️ Plataforma do ano: ${platforms[0].name} (${platforms[0].items.length} jogos)\n` : '') +
      `\nRastreado com Game Hub!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'resumo', label: 'Resumo', Icon: BarChart3 },
    { id: 'analise', label: 'Análise', Icon: TrendingUp },
    { id: 'top', label: 'Top Jogos + GOT', Icon: Trophy },
    { id: 'timeline', label: 'Timeline', Icon: CalendarDays },
    { id: 'geral', label: 'Geral (todos os anos)', Icon: Globe2 },
  ];

  /* ---------- pedaços reutilizáveis ---------- */

  const HighlightCard: React.FC<{ game: Game; label: string; labelColor: string; value: string; valueColor: string }> = ({
    game,
    label,
    labelColor,
    value,
    valueColor,
  }) => (
    <button
      onClick={() => onSelectGame(game)}
      className="flex overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 text-left transition-colors hover:border-slate-600"
    >
      <Thumb game={game} className="w-24 sm:w-28 shrink-0 self-stretch" />
      <div className="min-w-0 flex-1 p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: labelColor }}>
          {label}
        </p>
        <h3 className="mt-1 font-display text-base font-bold leading-snug text-white line-clamp-2">{game.nome}</h3>
        <p className="mt-1 font-display text-2xl font-bold" style={{ color: valueColor }}>
          {value}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip color={colorOf(game.console)}>{game.console}</Chip>
          <NotaChip nota={game.nota} />
        </div>
      </div>
    </button>
  );

  const MiniGame: React.FC<{ game: Game }> = ({ game }) => (
    <button
      onClick={() => onSelectGame(game)}
      className="w-28 shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70 text-left hover:border-slate-600"
    >
      <Thumb game={game} className="aspect-[3/4] w-full" />
      <div className="p-2">
        <p className="truncate text-[11px] font-bold text-white">{game.nome}</p>
        <p className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-0.5">
            <Clock className="h-2.5 w-2.5" />
            {fmtHM(game.tempo)}
          </span>
          {typeof game.nota === 'number' && (
            <span className="flex items-center gap-0.5 font-bold" style={{ color: notaColor(game.nota) }}>
              <Star className="h-2.5 w-2.5 fill-current" />
              {game.nota % 1 === 0 ? game.nota : game.nota.toFixed(1)}
            </span>
          )}
        </p>
      </div>
    </button>
  );

  /* ------------------------------ render ------------------------------ */

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-800/70 bg-gradient-to-br from-[#06131c] via-[#0a0d16] to-[#12081c] pb-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 border-b border-slate-800/60 px-4 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-wide bg-gradient-to-r from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Wrap-Up Anual
          </h1>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Escolha o ano e navegue pelas abas para ver destaques, análises, ranking e conquistas.
          </p>
        </div>
        <div className="sm:text-right">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Selecionar ano</p>
          <div className="inline-flex items-center gap-3">
            <button
              onClick={() => yearIdx > 0 && changeYear(years[yearIdx - 1])}
              disabled={yearIdx <= 0}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white hover:bg-slate-800 disabled:opacity-30"
              aria-label="Ano anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-display text-3xl font-bold text-cyan-300">{year}</span>
            <button
              onClick={() => yearIdx < years.length - 1 && changeYear(years[yearIdx + 1])}
              disabled={yearIdx >= years.length - 1}
              className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white hover:bg-slate-800 disabled:opacity-30"
              aria-label="Próximo ano"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 overflow-x-auto border-b border-slate-800/60 px-3 pt-3 sm:px-6">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-t-xl border border-b-0 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === id
                ? 'border-slate-700 bg-slate-900/80 text-cyan-300'
                : 'border-transparent text-slate-500 hover:text-slate-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 pt-6 sm:px-8">
        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center">
            <p className="text-sm text-slate-400">Nenhum jogo zerado em {year} ainda.</p>
          </div>
        ) : (
          <>
            {/* ===================== RESUMO ===================== */}
            {tab === 'resumo' && (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  <StatCard
                    label="Zerados"
                    value={String(total)}
                    accent="#22d3ee"
                    sub={`≈ ${(total / 12).toFixed(1)} por mês`}
                    extra={prevYear.length > 0 ? <Delta value={total - prevYear.length} suffix="vs ano ant." /> : null}
                  />
                  <StatCard
                    label="Horas jogadas"
                    value={fmtHM(totalMin)}
                    accent="#34d399"
                    sub={`≈ ${fmtHM(totalMin / total)} por jogo`}
                    extra={prevYear.length > 0 ? <Delta value={Math.round((totalMin - prevMin) / 60)} suffix="h vs ant." /> : null}
                  />
                  <StatCard
                    label="Nota média"
                    value={avg !== null ? avg.toFixed(2) : '—'}
                    accent="#fbbf24"
                    sub={`${rated.length} jogos com nota`}
                    extra={avg !== null ? <p className="mt-0.5 text-[10px] font-bold tracking-wider text-slate-400">{notaLabel(avg)}</p> : null}
                  />
                  <StatCard
                    label="Plataforma do ano"
                    value={platforms[0]?.name || '—'}
                    accent={platforms[0] ? colorOf(platforms[0].name) : '#94a3b8'}
                    sub={platforms[0] ? `${platforms[0].items.length} zerados` : undefined}
                  />
                  <StatCard
                    label="Gênero mais jogado"
                    value={genres[0]?.name || '—'}
                    accent="#f43f5e"
                    sub={genres[0] ? `${genres[0].items.length} jogos` : undefined}
                  />
                  <StatCard
                    label="Jogo mais longo"
                    value={byLongest[0] ? fmtHM(byLongest[0].tempo) : '—'}
                    accent="#c084fc"
                    sub={byLongest[0]?.nome}
                  />
                </div>

                <section>
                  <SectionTitle color="#fbbf24">Destaques do ano</SectionTitle>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {byNota[0] && (
                      <HighlightCard game={byNota[0]} label="🏅 Melhor avaliado" labelColor="#fbbf24" value={byNota[0].nota.toFixed(1)} valueColor="#fbbf24" />
                    )}
                    {lowest && rated.length > 1 && (
                      <HighlightCard game={lowest} label="📉 Menor nota" labelColor="#fb7185" value={lowest.nota.toFixed(1)} valueColor="#22d3ee" />
                    )}
                    {byLongest[0] && (
                      <HighlightCard game={byLongest[0]} label="⏱️ Jogo mais longo" labelColor="#c084fc" value={fmtHM(byLongest[0].tempo)} valueColor="#c084fc" />
                    )}
                    {fastest && (
                      <HighlightCard game={fastest} label="⚡ Jogo mais rápido" labelColor="#22d3ee" value={fmtHM(fastest.tempo)} valueColor="#22d3ee" />
                    )}
                  </div>
                </section>

                {/* ===================== PRÊMIOS DO ANO (GOT escolhido aqui embaixo) ===================== */}
                <section>
                  <SectionTitle color="#c084fc">🏅 Prêmios do ano — {year}</SectionTitle>
                  {categorias.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-4 text-xs text-slate-400">
                      Nenhum prêmio ainda. Escolha seus vencedores na seção <span className="font-bold text-amber-300">🏆 GOT</span> logo abaixo — eles aparecem aqui automaticamente
                      (e também no Hall da Fama da aba Início).
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {goty && temSelecao && (
                        <button
                          onClick={() => onSelectGame(goty)}
                          className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-950/40 to-[#0c0f1a] p-3 text-left hover:border-amber-300"
                        >
                          <Thumb game={goty} className="h-14 w-11 shrink-0 rounded-md" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">👑 Jogo do Ano</p>
                            <p className="truncate font-display text-base font-bold text-white">{goty.nome}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              <span style={{ color: colorOf(goty.console) }} className="font-semibold">{goty.console}</span> · {goty.genero}
                            </p>
                          </div>
                          {typeof goty.nota === 'number' && <NotaChip nota={goty.nota} />}
                        </button>
                      )}
                      {categorias.map((c) => (
                        <button
                          key={c.label}
                          onClick={() => onSelectGame(c.game)}
                          className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f1a]/90 p-3 text-left hover:border-slate-600"
                          style={{ borderLeft: `3px solid ${c.color}` }}
                        >
                          <Thumb game={c.game} className="h-14 w-11 shrink-0 rounded-md" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.color }}>{c.emoji} {c.label}</p>
                            <p className="truncate font-display text-sm font-bold text-white">{c.game.nome}</p>
                            <p className="truncate text-[11px] text-slate-400">
                              <span style={{ color: colorOf(c.game.console) }} className="font-semibold">{c.game.console}</span> · ⏱ {fmtHM(c.game.tempo)}
                            </p>
                          </div>
                          {typeof c.game.nota === 'number' && <NotaChip nota={c.game.nota} />}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* ===================== GOT — escolha seus vencedores ===================== */}
                <section>
                  <SectionTitle color="#fbbf24">🏆 GOT — escolha os melhores jogos que você zerou em {year}</SectionTitle>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {GOT_CATEGORIES.map((cat) => {
                      const escolhidoId = gotSelecao[cat.key] || '';
                      return (
                        <div
                          key={cat.key}
                          className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-3.5"
                          style={{ borderTop: `2px solid ${cat.color}` }}
                        >
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
                            {cat.emoji} {cat.label}
                          </p>
                          <select
                            value={escolhidoId}
                            onChange={(e) => setGotChoice(cat.key, e.target.value)}
                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-xs font-medium text-slate-200 focus:border-amber-400 focus:outline-none"
                          >
                            <option value="">— Selecione um jogo —</option>
                            {inYear.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.nome}
                                {typeof g.nota === 'number' ? ` (${g.nota.toFixed(1)})` : ''}
                              </option>
                            ))}
                          </select>
                          {(() => {
                            const w = winnerOf(cat.key);
                            if (!w) return null;
                            const origem = escolhidoId ? 'sua escolha' : 'Obsidian';
                            return (
                              <div className="mt-2 flex items-center gap-2">
                                <Thumb game={w} className="h-9 w-7 shrink-0 rounded" />
                                <p className="min-w-0 truncate text-[11px] text-slate-400">
                                  🏆 <span className="font-bold text-white">{w.nome}</span>
                                  <span className="text-slate-500"> · via {origem}</span>
                                </p>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500">
                    Suas escolhas ficam salvas por ano e aparecem em “Prêmios do ano”, na aba Top Jogos + GOT e no Hall da Fama (Início).
                  </p>
                </section>

                <button
                  onClick={handleShare}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-fuchsia-400 py-4 text-sm font-bold uppercase tracking-wide text-slate-950 hover:opacity-90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                  {copied ? 'Resumo copiado!' : 'Compartilhar retrospectiva'}
                </button>
              </div>
            )}

            {/* ===================== ANÁLISE ===================== */}
            {tab === 'analise' && (
              <div className="space-y-10">
                <section>
                  <SectionTitle color="#fbbf24">Distribuição de notas</SectionTitle>
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                    <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4 px-1">
                      {dist.map((b) => (
                        <div key={b.label} className="flex h-full flex-col items-center justify-end">
                          <span className="mb-1 font-display text-sm font-bold" style={{ color: b.color }}>
                            {b.count > 0 ? b.count : ''}
                          </span>
                          <div
                            className="w-full max-w-[60px] rounded-t-md"
                            style={{
                              height: b.count > 0 ? `${Math.max(8, (b.count / maxDist) * 150)}px` : '3px',
                              background: b.count > 0 ? `linear-gradient(to bottom, ${b.color}, ${b.color}66)` : b.color + '55',
                            }}
                          />
                          <span className="mt-2 font-display text-xs font-bold" style={{ color: b.color }}>
                            {b.label}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Média geral</p>
                      <p className="font-display text-5xl font-bold text-emerald-400">{avg !== null ? avg.toFixed(2) : '—'}</p>
                      {avg !== null && (
                        <span className="mt-1 inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
                          {notaLabel(avg)}
                        </span>
                      )}
                      <dl className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-left text-xs">
                        <div className="flex justify-between"><dt className="text-slate-400">🏆 Nota máx:</dt><dd className="font-bold text-amber-300">{byNota[0] ? byNota[0].nota.toFixed(1) : '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">📊 Com nota:</dt><dd className="font-bold text-white">{rated.length} / {total}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">⭐ Masterpieces:</dt><dd className="font-bold text-emerald-300">{rated.filter((g) => g.nota >= 10).length}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">📉 Nota mín:</dt><dd className="font-bold text-rose-400">{lowest ? lowest.nota.toFixed(1) : '—'}</dd></div>
                      </dl>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle color="#22d3ee">Atividade mensal</SectionTitle>
                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div className="grid grid-cols-12 items-end gap-1 sm:gap-2">
                      {MESES.map((mes, i) => {
                        const c = monthly.count[i];
                        const isPeak = c > 0 && i === peakMonth;
                        return (
                          <div key={mes} className="flex flex-col items-center">
                            <span className="mb-1 h-5 font-display text-xs font-bold text-white">{c > 0 ? c : ''}</span>
                            <div
                              className="w-full rounded-t-md"
                              style={{
                                height: c > 0 ? `${Math.max(14, (c / maxMonth) * 110)}px` : '3px',
                                background:
                                  c === 0
                                    ? '#33415555'
                                    : isPeak
                                    ? 'linear-gradient(to bottom,#fde047,#f97316)'
                                    : 'linear-gradient(to bottom,#06b6d4,#7e22ce)',
                              }}
                            />
                            <span className={`mt-2 text-[10px] font-bold uppercase ${isPeak ? 'text-amber-300' : 'text-slate-400'}`}>{mes}</span>
                            <span className="text-[9px] text-slate-500 hidden sm:block">{c > 0 ? fmtHM(monthly.minutes[i]) : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">📅 Mês pico</p>
                        <p className="font-display text-xl font-bold text-amber-300">{monthly.count[peakMonth] > 0 ? MESES[peakMonth] : '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">🔢 Meses ativos</p>
                        <p className="font-display text-xl font-bold text-cyan-300">{activeMonths}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">⚡ Ritmo médio</p>
                        <p className="font-display text-xl font-bold text-emerald-400">
                          {activeMonths > 0 ? (total / activeMonths).toFixed(1) : '—'} <span className="text-xs font-medium text-slate-500">/mês</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                  <SectionTitle color="#34d399">Tempo de jogo dos zerados — por gênero</SectionTitle>
                  {(() => {
                    const half = Math.ceil(genres.length / 2);
                    const colunas = [genres.slice(0, half), genres.slice(half)];
                    return (
                      <div className="grid gap-4 lg:grid-cols-2">
                        {colunas.map((col, i) => (
                          <TimeRanking
                            key={i}
                            title={`Gêneros ${i === 0 ? '(1ª parte)' : '(2ª parte)'}`}
                            rows={col.map((g) => ({ name: g.name, count: g.items.length, minutes: g.minutes }))}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </section>

                <section>
                  <SectionTitle color="#fb923c">Plataformas de {year}</SectionTitle>
                  <div className="space-y-3">
                    {platforms.map((p, idx) => {
                      const color = colorOf(p.name);
                      const pct = Math.round((p.items.length / total) * 100);
                      const open = openPlat === p.name;
                      return (
                        <div
                          key={p.name}
                          className="overflow-hidden rounded-2xl border"
                          style={{
                            borderColor: open ? color + '66' : '#1e293b',
                            background: `linear-gradient(120deg, ${color}14 0%, rgba(12,15,26,0.94) 55%), #0c0f1a`,
                          }}
                        >
                          <button onClick={() => setOpenPlat(open ? null : p.name)} className="relative w-full px-4 py-3.5 text-left">
                            <span className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(to bottom, ${color}, transparent)` }} />
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: color + '22', color }}>
                                <ConsoleIcon name={p.name} className="h-5 w-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-display text-base font-bold uppercase" style={{ color }}>{p.name}</p>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Plataforma{idx === 0 ? ' · 👑 Líder' : ''}
                                </p>
                              </div>
                              <div className="hidden text-right sm:block">
                                <p className="font-display text-base font-bold text-slate-400">{pct}%</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">dos jogos</p>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-base font-bold text-white">{fmtHM(p.minutes)}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">horas</p>
                              </div>
                              <div className="border-l border-slate-800 pl-3 text-center">
                                <p className="font-display text-2xl font-bold" style={{ color }}>{p.items.length}</p>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600">zerados</p>
                              </div>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </button>
                          {open && (
                            <div className="flex gap-3 overflow-x-auto border-t border-slate-800/80 p-4">
                              {p.items.map((g) => <MiniGame key={g.id} game={g} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <SectionTitle color="#c084fc">Gêneros de {year}</SectionTitle>
                  <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
                    {genres.map((gn) => {
                      const color = colorOf(gn.name);
                      const pct = Math.round((gn.items.length / total) * 100);
                      const open = openGen === gn.name;
                      return (
                        <div key={gn.name} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90" style={{ borderLeft: `3px solid ${color}` }}>
                          <button onClick={() => setOpenGen(open ? null : gn.name)} className="w-full px-3.5 py-3 text-left">
                            <div className="flex items-center gap-3">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold" style={{ background: color + '22', color }}>
                                {gn.name.charAt(0).toUpperCase()}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-display text-sm font-bold uppercase" style={{ color }}>{gn.name}</p>
                                <p className="text-[11px] text-slate-500">{gn.items.length} {gn.items.length === 1 ? 'jogo' : 'jogos'} · {fmtHM(gn.minutes)}</p>
                              </div>
                              {gn.avg !== null && (
                                <span className="flex items-center gap-1 text-xs font-bold" style={{ color: notaColor(gn.avg) }}>
                                  <Star className="h-3 w-3 fill-current" />
                                  {gn.avg.toFixed(1)}
                                </span>
                              )}
                              <span className="font-display text-base font-bold" style={{ color }}>{pct}%</span>
                              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-slate-800">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                            </div>
                          </button>
                          {open && (
                            <div className="flex gap-3 overflow-x-auto border-t border-slate-800/80 p-3">
                              {gn.items.map((g) => <MiniGame key={g.id} game={g} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {/* ===================== TOP JOGOS + GOT ===================== */}
            {tab === 'top' && (
              <div className="space-y-10">
                <section>
                  <SectionTitle color="#fbbf24">Melhores avaliados</SectionTitle>
                  {byNota.length === 0 ? (
                    <p className="text-sm text-slate-400">Nenhum jogo com nota neste ano.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {byNota.slice(0, 4).map((g, i) => {
                        const meta = [
                          { l: '🥇 GOTY crítico', c: '#fbbf24' },
                          { l: '🥈 Vice-líder', c: '#94a3b8' },
                          { l: '🥉 Terceiro lugar', c: '#fb923c' },
                          { l: '🏅 Quarto lugar', c: '#38bdf8' },
                        ][i];
                        return <HighlightCard key={g.id} game={g} label={meta.l} labelColor={meta.c} value={g.nota.toFixed(1)} valueColor="#fbbf24" />;
                      })}
                    </div>
                  )}
                </section>

                <div className="grid gap-8 lg:grid-cols-2">
                  <section>
                    <SectionTitle color="#94a3b8">Restante do top 10</SectionTitle>
                    <div className="space-y-2">
                      {byNota.slice(4, 10).map((g, i) => (
                        <button key={g.id} onClick={() => onSelectGame(g)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f1a]/90 p-2.5 text-left hover:border-slate-600">
                          <span className="w-8 text-center font-display text-base font-bold text-slate-500">#{i + 5}</span>
                          <Thumb game={g} className="h-12 w-10 shrink-0 rounded-md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">{g.nome}</p>
                            <Chip color={colorOf(g.console)}>{g.console}</Chip>
                          </div>
                          <span className="flex items-center gap-1 font-display text-lg font-bold" style={{ color: notaColor(g.nota) }}>
                            <Star className="h-4 w-4 fill-current" />
                            {g.nota.toFixed(1)}
                          </span>
                        </button>
                      ))}
                      {byNota.length <= 4 && <p className="text-xs text-slate-500">Ainda não há jogos suficientes para o restante do top 10.</p>}
                    </div>
                  </section>

                  <section>
                    <SectionTitle color="#c084fc">Mais longos (top 5)</SectionTitle>
                    <div className="space-y-2">
                      {byLongest.slice(0, 5).map((g, i) => (
                        <button key={g.id} onClick={() => onSelectGame(g)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f1a]/90 p-2.5 text-left hover:border-slate-600">
                          <span className="w-8 text-center text-lg">{['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
                          <Thumb game={g} className="h-12 w-10 shrink-0 rounded-md" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">{g.nome}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <Chip color={colorOf(g.console)}>{g.console}</Chip>
                              <NotaChip nota={g.nota} />
                            </div>
                          </div>
                          <span className="font-display text-lg font-bold text-fuchsia-400">{fmtHM(g.tempo)}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <section>
                  <SectionTitle color="#fbbf24">👑 Games of the Year — {year}</SectionTitle>
                  {goty ? (
                    <div className="space-y-3">
                      <button
                        onClick={() => onSelectGame(goty)}
                        className="relative flex w-full overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-950/30 to-[#0c0f1a] text-left"
                      >
                        <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-300 via-orange-400 to-transparent" />
                        <Thumb game={goty} className="w-20 sm:w-28 shrink-0 self-stretch" />
                        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-4">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300"><Crown className="h-4 w-4" /> Game of the Year</p>
                          <h3 className="font-display text-xl sm:text-2xl font-bold text-white">{goty.nome}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            <Chip color={colorOf(goty.console)}>{goty.console}</Chip>
                            <Chip color="#94a3b8">{goty.genero}</Chip>
                            <Chip color="#94a3b8">⏱ {fmtHM(goty.tempo)}</Chip>
                            {typeof goty.nota === 'number' && goty.nota >= 10 && <Chip color="#fbbf24">Obra-prima</Chip>}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center pr-4 sm:pr-8">
                          <span className="font-display text-3xl sm:text-5xl font-bold text-amber-300">{typeof goty.nota === 'number' ? goty.nota.toFixed(1) : '—'}</span>
                          <span className="flex items-center gap-1 text-xs font-bold tracking-wider text-amber-500"><Star className="h-3 w-3 fill-current" /> GOTY</span>
                        </div>
                      </button>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {categorias.map((c) => (
                          <button
                            key={c.label}
                            onClick={() => onSelectGame(c.game)}
                            className="flex items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f1a]/90 p-3 text-left hover:border-slate-600"
                            style={{ borderLeft: `3px solid ${c.color}` }}
                          >
                            <Thumb game={c.game} className="h-14 w-11 shrink-0 rounded-md" />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.color }}>{c.emoji} {c.label}</p>
                              <p className="truncate font-display text-base font-bold text-white">{c.game.nome}</p>
                              <p className="truncate text-[11px] text-slate-400">
                                <span style={{ color: colorOf(c.game.console) }} className="font-semibold">{c.game.console}</span> · {c.game.genero} · ⏱ {fmtHM(c.game.tempo)}
                              </p>
                            </div>
                            {typeof c.game.nota === 'number' && (
                              <span className="flex items-center gap-1 font-display text-lg font-bold" style={{ color: notaColor(c.game.nota) }}>
                                {c.game.nota.toFixed(1)}
                                <Star className="h-4 w-4 fill-current" />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {hasGot
                          ? 'Prêmios vindos das propriedades got_* das suas notas do Obsidian.'
                          : 'Categorias calculadas automaticamente a partir de nota, favorito, dificuldade, ano de lançamento, gênero e tempo de jogo.'}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">Dê notas aos jogos zerados para ver o Game of the Year.</p>
                  )}
                </section>
              </div>
            )}

            {/* ===================== TIMELINE ===================== */}
            {tab === 'timeline' && (
              <div className="space-y-10">
                <section>
                  <SectionTitle color="#22d3ee">Calendário de zeradas — {year}</SectionTitle>
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => setTlMonth(Math.max(0, activeMonth - 1))}
                      disabled={activeMonth === 0}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white hover:bg-slate-800 disabled:opacity-30"
                      aria-label="Mês anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-[150px] text-center">
                      <p className="font-display text-xl font-bold uppercase text-white">{MESES_NOME[activeMonth]}</p>
                      <p className="text-[11px] text-slate-500">{year}</p>
                    </div>
                    <button
                      onClick={() => setTlMonth(Math.min(11, activeMonth + 1))}
                      disabled={activeMonth === 11}
                      className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-white hover:bg-slate-800 disabled:opacity-30"
                      aria-label="Próximo mês"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:justify-center">
                    {MESES.map((mes, i) => (
                      <button
                        key={mes}
                        onClick={() => setTlMonth(i)}
                        className={`relative shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase transition-colors ${
                          i === activeMonth
                            ? 'bg-cyan-400 text-slate-950'
                            : monthly.count[i] > 0
                            ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            : 'bg-slate-900/70 text-slate-600 hover:text-slate-400'
                        }`}
                      >
                        {mes}
                        {monthly.count[i] > 0 && i !== activeMonth && (
                          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-fuchsia-400" />
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl">
                    {[activeMonth].map((m) => {
                      const firstDow = new Date(year, m, 1).getDay();
                      const daysInMonth = new Date(year, m + 1, 0).getDate();
                      const cells: (number | null)[] = [
                        ...Array(firstDow).fill(null),
                        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                      ];
                      return (
                        <div key={m} className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4 sm:p-6">
                          <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-display text-lg sm:text-xl font-bold uppercase text-white">{MESES_LONGOS[m]}</h3>
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                              {monthly.count[m]} zerados
                            </span>
                          </div>
                          <div className="mb-1 grid grid-cols-7 gap-1.5 sm:gap-2 text-center text-[10px] sm:text-xs font-bold text-slate-500">
                            {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
                          </div>
                          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {cells.map((d, i) => {
                              if (d === null) return <div key={`b${i}`} />;
                              const key = `${year}-${pad2(m + 1)}-${pad2(d)}`;
                              const list = byDay.get(key);
                              if (!list) {
                                return (
                                  <div key={key} className="aspect-square rounded-lg bg-slate-900/70 p-1.5 text-xs font-bold text-slate-600 sm:text-sm">
                                    {d}
                                  </div>
                                );
                              }
                              const g = list[0];
                              return (
                                <button
                                  key={key}
                                  onClick={() => onSelectGame(g)}
                                  title={list.map((x) => x.nome).join(', ')}
                                  className="relative aspect-square overflow-hidden rounded-lg border border-slate-700"
                                >
                                  <Thumb game={g} className="h-full w-full" />
                                  <span className="absolute left-1 top-0.5 text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-sm">{d}</span>
                                  {typeof g.nota === 'number' && (
                                    <span
                                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1 text-[10px] font-bold"
                                      style={{ color: notaColor(g.nota) }}
                                    >
                                      {g.nota.toFixed(1)}
                                    </span>
                                  )}
                                  {list.length > 1 && (
                                    <span className="absolute right-0 top-0 rounded-bl bg-fuchsia-500 px-1 text-[10px] font-bold text-white">+{list.length - 1}</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <SectionTitle color="#f43f5e">Lista cronológica · {total} com data</SectionTitle>
                  <div className="max-h-[620px] space-y-6 overflow-y-auto rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/60 p-4">
                    {chrono.map((grp) => (
                      <div key={grp.month}>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="font-display text-sm font-bold text-cyan-300">{MESES_LONGOS[grp.month]}</span>
                          <span className="text-[11px] text-slate-500">
                            {grp.items.length} {grp.items.length === 1 ? 'jogo' : 'jogos'} · {fmtHM(grp.items.reduce((s, g) => s + (g.tempo || 0), 0))}
                          </span>
                          <span className="h-px flex-1 bg-gradient-to-r from-slate-700/70 to-transparent" />
                        </div>
                        <div className="space-y-1.5">
                          {grp.items.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => onSelectGame(g)}
                              className="flex w-full items-center gap-3 rounded-xl border border-slate-800/80 bg-[#0c0f1a] p-2 text-left hover:border-slate-600"
                            >
                              <span className="w-14 shrink-0 text-xs font-bold text-slate-500">
                                {(g.fim || '').slice(8, 10)}/{MESES[grp.month]}
                              </span>
                              <Thumb game={g} className="h-10 w-10 shrink-0 rounded-lg" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">{g.nome}</p>
                                <p className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                  <Chip color={colorOf(g.console)}>{g.console}</Chip>
                                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" /> {fmtHM(g.tempo)}</span>
                                </p>
                              </div>
                              {typeof g.nota === 'number' && (
                                <span className="font-display text-lg font-bold" style={{ color: notaColor(g.nota) }}>
                                  {g.nota % 1 === 0 ? g.nota : g.nota.toFixed(1)}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ===================== GERAL (TODOS OS ANOS) ===================== */}
            {tab === 'geral' && (
              <div className="space-y-10">
                {/* Cabeçalho + stats acumulados */}
                <section>
                  <SectionTitle color="#c084fc">Geral — soma de todos os anos</SectionTitle>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="Anos rastreados" value={String(years.length)} accent="#c084fc" sub={`${years[0] ?? '—'} → ${years[years.length - 1] ?? '—'}`} />
                    <StatCard label="Zerados (total)" value={String(allZerados.length)} accent="#22d3ee" sub="todos os anos somados" />
                    <StatCard label="Horas jogadas" value={fmtHM(allMinutos)} accent="#34d399" sub={allZerados.length > 0 ? `≈ ${fmtHM(allMinutos / allZerados.length)} por jogo` : undefined} />
                    <StatCard label="Nota média geral" value={allAvg !== null ? allAvg.toFixed(2) : '—'} accent="#fbbf24" sub={`${allRated.length} jogos com nota`} />
                    <StatCard label="Média por ano" value={(allZerados.length / Math.max(1, years.length)).toFixed(1)} accent="#f472b6" sub="zerados por ano" />
                  </div>
                </section>

                {/* Distribuição de notas — todos os anos */}
                <section>
                  <SectionTitle color="#fbbf24">Distribuição de notas — todos os anos</SectionTitle>
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                    <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4">
                      <div className="grid h-56 grid-cols-7 items-end gap-2 px-1 sm:gap-4">
                        {allDist.map((b) => (
                          <div key={b.label} className="flex h-full flex-col items-center justify-end">
                            <span className="mb-1 font-display text-sm font-bold" style={{ color: b.color }}>
                              {b.count > 0 ? b.count : ''}
                            </span>
                            <div
                              className="w-full max-w-[60px] rounded-t-md"
                              style={{
                                height: b.count > 0 ? `${Math.max(8, (b.count / allMaxDist) * 150)}px` : '3px',
                                background: b.count > 0 ? `linear-gradient(to bottom, ${b.color}, ${b.color}66)` : b.color + '55',
                              }}
                            />
                            <span className="mt-2 font-display text-xs font-bold" style={{ color: b.color }}>
                              {b.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Média geral (acumulada)</p>
                      <p className="font-display text-5xl font-bold text-emerald-400">{allAvg !== null ? allAvg.toFixed(2) : '—'}</p>
                      {allAvg !== null && (
                        <span className="mt-1 inline-block rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-[10px] font-bold tracking-wider text-emerald-400">
                          {notaLabel(allAvg)}
                        </span>
                      )}
                      <dl className="mt-4 space-y-2 border-t border-slate-800 pt-4 text-left text-xs">
                        <div className="flex justify-between"><dt className="text-slate-400">🏆 Nota máx:</dt><dd className="font-bold text-amber-300">{allRated.length > 0 ? Math.max(...allRated.map((g) => g.nota)).toFixed(1) : '—'}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">📊 Com nota:</dt><dd className="font-bold text-white">{allRated.length} / {allZerados.length}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">⭐ Masterpieces:</dt><dd className="font-bold text-emerald-300">{allRated.filter((g) => g.nota >= 10).length}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">📉 Nota mín:</dt><dd className="font-bold text-rose-400">{allRated.length > 0 ? Math.min(...allRated.map((g) => g.nota)).toFixed(1) : '—'}</dd></div>
                      </dl>
                    </div>
                  </div>
                </section>

                {/* Zerados por mês — todos os anos */}
                <section>
                  <SectionTitle color="#22d3ee">Zerados por mês — todos os anos somados</SectionTitle>
                  <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                    <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4">
                      <div className="grid grid-cols-12 items-end gap-1 sm:gap-2">
                        {MESES.map((mes, i) => {
                          const c = allMonthly.count[i];
                          const isPeak = c > 0 && i === allPeakMonth;
                          return (
                            <div key={mes} className="flex flex-col items-center">
                              <span className="mb-1 h-5 font-display text-xs font-bold text-white">{c > 0 ? c : ''}</span>
                              <div
                                className="w-full rounded-t-md"
                                style={{
                                  height: c > 0 ? `${Math.max(14, (c / allMaxMonth) * 130)}px` : '3px',
                                  background:
                                    c === 0
                                      ? '#33415555'
                                      : isPeak
                                      ? 'linear-gradient(to bottom,#fde047,#f97316)'
                                      : 'linear-gradient(to bottom,#06b6d4,#7e22ce)',
                                }}
                              />
                              <span className={`mt-2 text-[10px] font-bold uppercase ${isPeak ? 'text-amber-300' : 'text-slate-400'}`}>{mes}</span>
                              <span className="hidden text-[9px] text-slate-500 sm:block">{c > 0 ? fmtHM(allMonthly.minutes[i]) : ''}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4 rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-5">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">📅 Mês mais forte</p>
                        <p className="font-display text-xl font-bold text-amber-300">{allMonthly.count[allPeakMonth] > 0 ? MESES_NOME[allPeakMonth] : '—'}</p>
                        <p className="text-[11px] text-slate-500">{allMonthly.count[allPeakMonth]} zerados em todos os anos</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">⚡ Ritmo médio mensal</p>
                        <p className="font-display text-xl font-bold text-cyan-300">
                          {(allZerados.length / 12).toFixed(1)} <span className="text-xs font-medium text-slate-500">/mês</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">🎮 Média mensal de horas</p>
                        <p className="font-display text-xl font-bold text-emerald-400">
                          {fmtHM(allMinutos / 12)} <span className="text-xs font-medium text-slate-500">/mês</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Zerados por plataforma — todos os anos */}
                <section>
                  <SectionTitle color="#fb923c">Zerados por plataforma — todos os anos</SectionTitle>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {allPlatforms.map((p) => {
                      const color = colorOf(p.name);
                      return (
                        <div
                          key={p.name}
                          className="relative overflow-hidden rounded-2xl border border-slate-800/80 p-4"
                          style={{ background: `linear-gradient(145deg, ${color}26, #0c0f1a 70%)` }}
                        >
                          <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{p.name}</p>
                          <p className="mt-1 font-display text-3xl font-bold" style={{ color }}>{p.items.length}</p>
                          <p className="text-[11px] text-slate-500">{p.items.length === 1 ? 'jogo zerado' : 'jogos zerados'} · {fmtHM(p.minutes)}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Tempo por gênero — todos os anos (duas colunas) */}
                <section>
                  <SectionTitle color="#34d399">Tempo de jogo por gênero — todos os anos</SectionTitle>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <TimeRanking
                      title="1ª parte"
                      rows={allGenres.slice(0, Math.ceil(allGenres.length / 2)).map((g) => ({ name: g.name, count: g.items.length, minutes: g.minutes }))}
                    />
                    <TimeRanking
                      title="2ª parte"
                      rows={allGenres.slice(Math.ceil(allGenres.length / 2)).map((g) => ({ name: g.name, count: g.items.length, minutes: g.minutes }))}
                    />
                  </div>
                </section>

                {/* Zerados por ano — comparativo */}
                <section>
                  <SectionTitle color="#f472b6">Zerados por ano</SectionTitle>
                  <div className="rounded-2xl border border-slate-800/80 bg-[#0c0f1a]/90 p-4">
                    <div
                      className="grid items-end gap-2"
                      style={{ gridTemplateColumns: `repeat(${Math.max(1, years.length)}, minmax(0, 1fr))` }}
                    >
                      {years.map((y) => {
                        const c = allZerados.filter((g) => (g.fim || '').startsWith(String(y))).length;
                        const maxYearCount = Math.max(1, ...years.map((yy) => allZerados.filter((g) => (g.fim || '').startsWith(String(yy))).length));
                        const isCurrent = y === currentYear;
                        return (
                          <button key={y} onClick={() => { changeYear(y); setTab('resumo'); }} className="flex flex-col items-center" title={`Ver wrap-up de ${y}`}>
                            <span className="mb-1 h-5 font-display text-xs font-bold text-white">{c > 0 ? c : ''}</span>
                            <div
                              className="w-full max-w-[56px] rounded-t-md transition-opacity hover:opacity-80"
                              style={{
                                height: c > 0 ? `${Math.max(10, (c / maxYearCount) * 120)}px` : '3px',
                                background: isCurrent
                                  ? 'linear-gradient(to bottom,#f0abfc,#a21caf)'
                                  : 'linear-gradient(to bottom,#38bdf8,#1e3a8a)',
                              }}
                            />
                            <span className={`mt-2 text-[11px] font-bold ${isCurrent ? 'text-fuchsia-300' : 'text-slate-400'}`}>{y}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-center text-[11px] text-slate-500">Clique em um ano para abrir o wrap-up dele.</p>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

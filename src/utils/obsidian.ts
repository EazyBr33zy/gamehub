import { Game, GameStatus } from '../types';

/** Um arquivo .md lido do computador */
export interface ObsidianFile {
  name: string; // ex.: "Aero Fighters.md"
  path: string; // ex.: "Zerados/2026/Aero Fighters.md"
  text: string;
}

const FALSY = new Set(['', 'false', 'não', 'nao', 'no', 'n', '0', '-', 'null', 'sem valor']);

const stripWiki = (v: string) => v.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => (b || a).trim());

const unquote = (v: string) => {
  const t = v.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
};

/** Lê as "Propriedades" (frontmatter) do início da nota */
export function parseFrontmatter(text: string): Record<string, string> | null {
  const m = text.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out: Record<string, string> = {};
  let key: string | null = null;
  let list: string[] = [];
  const flush = () => {
    if (key && list.length) out[key] = list.join(', ');
    list = [];
  };
  for (const line of m[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && key) {
      list.push(stripWiki(unquote(item[1])));
      continue;
    }
    const kv = line.match(/^([^\s:#][^:]*?):\s*(.*)$/);
    if (!kv) continue;
    flush();
    key = kv[1].trim().toLowerCase();
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']') && !v.startsWith('[[')) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((x) => stripWiki(unquote(x.trim())))
        .filter(Boolean)
        .join(', ');
    } else {
      v = stripWiki(unquote(v));
    }
    out[key] = v;
  }
  flush();
  return out;
}

/** "0:31" -> 31 · "56:42" -> 3402 · "1h 30m" -> 90 · número puro = horas */
export function parseDuration(v?: string): number {
  const s = (v || '').trim().toLowerCase();
  if (!s) return 0;
  let m = s.match(/^(\d+):(\d{1,2})(?::\d{1,2})?$/);
  if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  m = s.match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/);
  if (m && (m[1] || m[2])) return parseInt(m[1] || '0', 10) * 60 + parseInt(m[2] || '0', 10);
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 60) : 0;
}

/** Aceita 2026-09-28 ou 28/09/2026 e devolve AAAA-MM-DD */
export function parseDateValue(v?: string): string {
  const s = (v || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

const STATUS_MAP: Record<string, GameStatus> = {
  zerado: 'zerado',
  concluido: 'zerado',
  concluído: 'zerado',
  completo: 'zerado',
  jogando: 'jogando',
  pausado: 'pausado',
  abandonado: 'abandonado',
  backlog: 'backlog',
  'quero jogar': 'backlog',
  quero_jogar: 'backlog',
};

const norm = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const gameKey = (g: Pick<Game, 'nome' | 'console'>) => `${norm(g.nome)}|${norm(g.console)}`;

/** Converte uma nota do Obsidian em jogo. Devolve null se não tiver propriedades de jogo. */
export function noteToGame(f: ObsidianFile): Game | null {
  const fm = parseFrontmatter(f.text);
  if (!fm) return null;
  if (!['console', 'genero', 'nota', 'tempo', 'status', 'capa'].some((k) => fm[k])) return null;

  const nome = f.name.replace(/\.md$/i, '').trim();
  if (!nome) return null;

  const pathLower = f.path.toLowerCase();
  let status: GameStatus =
    STATUS_MAP[(fm.status || '').toLowerCase().trim()] ||
    (pathLower.includes('zerado') ? 'zerado' : pathLower.includes('backlog') ? 'backlog' : 'backlog');

  const notaNum = parseFloat((fm.nota || '').replace(',', '.'));
  const anoZerado = /^\d{4}$/.test((fm.ano_zerado || '').trim()) ? fm.ano_zerado.trim() : '';
  const fim =
    parseDateValue(fm.data_zerado) || parseDateValue(fm.data_fim) || (status === 'zerado' && anoZerado ? `${anoZerado}-01-01` : '');

  const estMin = parseDuration(fm.hltb || fm.est);
  const got: Record<string, string> = {};
  Object.entries(fm).forEach(([k, v]) => {
    if (k.startsWith('got_') && !FALSY.has(v.trim().toLowerCase())) got[k.slice(4)] = v.trim();
  });

  const dif = (fm.dificuldade || '').trim();
  const slug = norm(nome).replace(/ /g, '-');

  return {
    id: `obs-${slug || Math.random().toString(36).slice(2, 8)}`,
    nome,
    console: (fm.console || '').trim() || 'Geral',
    genero: (fm.genero || '').trim() || 'Aventura',
    ano: (fm.ano || fm.ano_lancamento || fm.lancamento || '').trim(),
    capa: (fm.capa || '').trim(),
    status,
    tempo: parseDuration(fm.tempo),
    est: estMin > 0 ? Math.round((estMin / 60) * 100) / 100 : 0,
    inicio: parseDateValue(fm.data_inicio),
    fim,
    nota: Number.isFinite(notaNum) ? Math.min(10, Math.max(0, notaNum)) : null,
    favorito: ['true', 'sim', 'yes'].includes((fm.favorito || '').toLowerCase()),
    notasPessoais: '',
    dificuldade: (['Fácil', 'Normal', 'Difícil', 'Insano'].includes(dif) ? dif : '') as Game['dificuldade'],
    sessoes: [],
    got: Object.keys(got).length > 0 ? got : undefined,
  };
}

export interface ImportPreview {
  imported: Game[]; // jogos lidos das notas (sem duplicados)
  novos: number;
  atualizados: number;
  ignorados: number; // arquivos .md sem propriedades de jogo
  exemplos: string[];
}

/** Lê as notas e diz o que vai acontecer, sem mexer em nada ainda */
export function buildPreview(files: ObsidianFile[], existing: Game[]): ImportPreview {
  const byKey = new Map<string, Game>();
  let ignorados = 0;
  files.forEach((f) => {
    const g = noteToGame(f);
    if (!g) ignorados++;
    else byKey.set(gameKey(g), g);
  });
  const imported = [...byKey.values()];
  const existingKeys = new Set(existing.map(gameKey));
  const atualizados = imported.filter((g) => existingKeys.has(gameKey(g))).length;
  return {
    imported,
    novos: imported.length - atualizados,
    atualizados,
    ignorados,
    exemplos: imported.slice(0, 6).map((g) => g.nome),
  };
}

/** Junta os jogos das notas com a biblioteca atual (mesmo nome + console = atualiza) */
export function mergeImported(existing: Game[], imported: Game[]): Game[] {
  const map = new Map(imported.map((g) => [gameKey(g), g]));
  const used = new Set<string>();
  const updated = existing.map((e) => {
    const k = gameKey(e);
    const inc = map.get(k);
    if (!inc) return e;
    used.add(k);
    const temSessoes = (e.sessoes?.length || 0) > 0;
    return {
      ...e,
      console: inc.console || e.console,
      genero: inc.genero || e.genero,
      ano: inc.ano || e.ano,
      capa: inc.capa || e.capa,
      status: inc.status,
      tempo: temSessoes ? e.tempo : inc.tempo > 0 ? inc.tempo : e.tempo,
      est: inc.est || e.est,
      inicio: inc.inicio || e.inicio,
      fim: inc.fim || e.fim,
      nota: inc.nota ?? e.nota,
      got: inc.got || e.got,
    } as Game;
  });
  const novos = imported.filter((g) => !used.has(gameKey(g)));
  return [...novos, ...updated];
}

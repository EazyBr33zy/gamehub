import { GameItem, GameReviewRubric, GameplayDaySession, GameplaySessionInterval } from '../types/game';

/**
 * Validação central da nota pessoal de um jogo.
 * Aceita 0 a NOTA_MAX (11 = favorito); rejeita NaN e fora da faixa.
 */
export function validateGameForSave(nota: number | undefined | null): { ok: boolean; value?: number } {
  if (nota === undefined || nota === null) return { ok: true };
  if (typeof nota !== 'number' || isNaN(nota)) return { ok: false };
  if (nota < 0 || nota > 11) return { ok: false };
  return { ok: true, value: nota };
}

// Parse time string or number to total integer minutes
export function parseToMinutes(t: string | number | undefined | null): number {
  if (t === undefined || t === null) return 0;
  if (typeof t === 'number') {
    return Math.round(t * 60);
  }
  const s = String(t).replace(/[\s\u00a0\u200b]+/g, '').trim();
  if (!s) return 0;

  // 1. "13:15" or "1:60" or "0:45"
  const mColon = s.match(/^(\d+):(\d{2})$/);
  if (mColon) {
    const hrs = parseInt(mColon[1], 10);
    const mins = parseInt(mColon[2], 10);
    return (hrs * 60) + mins;
  }

  // 2. "1h30" or "1h30m" or "2h" or "10h"
  const mH = s.match(/^(\d+)h(?:(\d+)(?:m)?)?$/i);
  if (mH) {
    const hrs = parseInt(mH[1], 10);
    const mins = mH[2] ? parseInt(mH[2], 10) : 0;
    return (hrs * 60) + mins;
  }

  // 3. "45m" or "45min"
  const mMin = s.match(/^(\d+)m(?:in)?$/i);
  if (mMin) {
    return parseInt(mMin[1], 10);
  }

  // 4. "1.5h" or "1.5" or "2,5"
  const dec = parseFloat(s.replace(',', '.'));
  if (!isNaN(dec)) {
    return Math.round(dec * 60);
  }

  return 0;
}

// Parse time string (e.g. "13:15", "1h 30m", 13.25) to decimal hours
export function parseTime(t: string | number | undefined | null): number {
  const minutes = parseToMinutes(t);
  return minutes / 60;
}

// Format minutes to standardized format ("1h07" or "1:07")
export function formatMinutes(minutes: number | undefined | null, format: 'hm' | 'colon' = 'hm'): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) {
    return format === 'colon' ? '0:00' : '0h00';
  }
  const totalM = Math.round(minutes);
  const hrs = Math.floor(totalM / 60);
  const mins = totalM % 60;
  if (format === 'colon') {
    return `${hrs}:${String(mins).padStart(2, '0')}`;
  }
  return `${hrs}h${String(mins).padStart(2, '0')}`;
}

// Format decimal hours to standardized "1h07" format (e.g. 1.1166h -> 1h07, 15h -> 15h00)
export function fmtH(h: number): string {
  return formatMinutes(h * 60, 'hm');
}

// Format minutes to standardized "1h07" format
export function fmtMinutes(minutes: number): string {
  return formatMinutes(minutes, 'hm');
}

// Format any tempo string/number into standardized "1h07" format
export function formatTempoDisplay(t: string | number | undefined | null): string {
  const minutes = parseToMinutes(t);
  return formatMinutes(minutes, 'hm');
}

// Parse date safely ignoring local timezone shifts (e.g. "2026-10-01" -> year 2026, month 9, day 1)
export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = String(dateStr).trim().split('T')[0];
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed (Jan=0...Out=9)
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      }
    }
  } else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      } else {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m, day: d };
      }
    }
  }
  return null;
}

// Format YYYY-MM-DD to DD/MM/YYYY
export function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const parts = parseDateParts(dateStr);
  if (!parts) return String(dateStr);
  const dd = String(parts.day).padStart(2, '0');
  const mm = String(parts.month + 1).padStart(2, '0');
  return `${dd}/${mm}/${parts.year}`;
}

// Calculate score from rubric following the exact dataview formula from user's Obsidian file
export function calculateRubricScore(rubric: GameReviewRubric): number {
  const mJ = (rubric.controles + rubric.dificuldade + rubric.levelDesign + rubric.mecanicas) / 4;
  const mG = (rubric.estiloVisual + rubric.animacoes + rubric.paletaCores + rubric.detalhes) / 4;
  const mT = (rubric.musicasMemoraveis + rubric.adequacao + rubric.variedade + rubric.efeitosSonoros) / 4;
  const mD = (rubric.querContinuarJogando + rubric.satisfacao + rubric.rejogabilidade + rubric.interesse) / 4;

  const notaBruta = (mJ * 2 + mG * 1 + mT * 1 + mD * 2) / 6;
  return Math.min(10, Math.round(notaBruta * 2) / 2);
}

export type StatusSource = 'frontmatter' | 'inline' | 'tag' | 'corpo' | 'arquivo' | 'manual' | 'desconhecido';

export interface StatusDetectionResult {
  status: GameItem['status'];
  source: StatusSource;
  rawMatched?: string;
  isUnidentified: boolean;
}

/**
 * Normalizes any raw status string (handling emojis, markdown, accents, uppercase, whitespace)
 * and maps it to one of the 5 canonical GameStatus values.
 */
export function matchStatusValue(raw: string): GameItem['status'] | null {
  if (!raw) return null;
  // 1. Remove emojis (using Unicode Extended_Pictographic property and specific emoji ranges)
  const withoutEmoji = raw
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1FA00}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, ' ');
  // 2. Remove markdown decorators, wiki link brackets, quotes, dashes, hashes, slashes
  const cleaned = withoutEmoji.replace(/[*_`~\[\]()"':#\-\/\\]/g, ' ');
  // 3. Normalize accents to ASCII and lowercase
  const normalized = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  if (!normalized) return null;

  // WISHLIST: check first to prevent "quero jogar" from triggering "jogar"
  if (
    normalized.includes('wish') ||
    normalized.includes('desejo') ||
    normalized.includes('quero') ||
    normalized.includes('comprar') ||
    normalized.includes('pretendo') ||
    normalized.includes('interesse') ||
    normalized.includes('almejad') ||
    normalized.includes('planej')
  ) {
    return 'wishlist';
  }

  // JOGANDO: jogando, playing, andamento, em andamento, em progresso, in progress, current, atual, active, now
  if (
    normalized.includes('joga') ||
    normalized.includes('play') ||
    normalized.includes('andamento') ||
    normalized.includes('progress') ||
    normalized.includes('execuc') ||
    normalized.includes('current') ||
    normalized.includes('atual') ||
    normalized.includes('activ') ||
    normalized.includes('now')
  ) {
    return 'jogando';
  }

  // ZERADO: zerado, zerar, zerei, beaten, beat, concluido, finalizado, completo, terminado, clear, finished, completed, vencido, platina, fechado
  if (
    normalized.includes('zera') ||
    normalized.includes('beat') ||
    normalized.includes('conclu') ||
    normalized.includes('finaliz') ||
    normalized.includes('comple') ||
    normalized.includes('termin') ||
    normalized.includes('clear') ||
    normalized.includes('finish') ||
    normalized.includes('venc') ||
    normalized.includes('platin') ||
    normalized.includes('fechad')
  ) {
    return 'zerado';
  }

  // ABANDONADO: abandonado, abandoned, dropado, dropped, drop, largado
  if (
    normalized.includes('abandon') ||
    normalized.includes('drop') ||
    normalized.includes('largad')
  ) {
    return 'abandonado';
  }

  // PAUSADO: pausado, pausa, geladeira, na geladeira, espera, on hold, hold, standby, interrompido
  if (
    normalized.includes('paus') ||
    normalized.includes('gela') ||
    normalized.includes('espera') ||
    normalized.includes('hold') ||
    normalized.includes('standby') ||
    normalized.includes('interromp')
  ) {
    return 'pausado';
  }

  // FILA: fila, backlog, queue, proximo, pendente, to play, to-play, aguardando, next
  if (
    normalized.includes('fila') ||
    normalized.includes('queue') ||
    normalized.includes('backlog') ||
    normalized.includes('proxim') ||
    normalized.includes('pendent') ||
    normalized.includes('aguard') ||
    normalized.includes('next') ||
    normalized.includes('to play') ||
    normalized.includes('to-play')
  ) {
    return 'fila';
  }

  return null;
}

/**
 * Robustly extracts the game status and its source from Markdown content and/or file path.
 * Enforces priority: frontmatter > campo inline > tag > texto no corpo > pasta/nome do arquivo.
 */
export function extractGameStatusWithSource(
  markdown: string,
  filePathOrName?: string
): StatusDetectionResult {
  const cleanMd = (markdown || '').replace(/^\uFEFF/, '').trimStart();
  let yamlBlock = '';
  let bodyContent = cleanMd;

  const frontmatterMatch = cleanMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    yamlBlock = frontmatterMatch[1];
    bodyContent = cleanMd.slice(frontmatterMatch[0].length);
  }

  // 1. FRONTMATTER: check status / estado / situacao / progresso / state keys
  if (yamlBlock) {
    const yamlLines = yamlBlock.split(/\r?\n/);
    for (let i = 0; i < yamlLines.length; i++) {
      const line = yamlLines[i];
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        if (['status', 'estado', 'situacao', 'situação', 'progresso', 'state', 'game_status'].includes(key)) {
          let val = line.slice(colonIdx + 1).trim();
          // If empty value on this line, check if next line is a list item: - jogando
          if (!val && i + 1 < yamlLines.length && /^\s*-\s+/.test(yamlLines[i + 1])) {
            val = yamlLines[i + 1].replace(/^\s*-\s+/, '').trim();
          }
          // Support array notation: status: [jogando]
          val = val.replace(/^\[\s*["']?([^\]"']+)["']?\s*\]$/, '$1').trim();
          const matched = matchStatusValue(val);
          if (matched) {
            return { status: matched, source: 'frontmatter', rawMatched: val, isUnidentified: false };
          }
        }
      }
    }
  }

  // 2. CAMPO INLINE DATAVIEW: status:: jogando, [status:: jogando], (status:: jogando), **Status**:: Jogando, Status:: [[Jogando]]
  const inlineRegex = /(?:\[|\()?\s*(?:\*\*|__)?(?:status|estado|situacao|situação|progresso)(?:\*\*|__)?\s*::\s*([^\r\n\]\)]+)/gi;
  let inlineMatch: RegExpExecArray | null;
  while ((inlineMatch = inlineRegex.exec(cleanMd)) !== null) {
    const val = inlineMatch[1].trim();
    const matched = matchStatusValue(val);
    if (matched) {
      return { status: matched, source: 'inline', rawMatched: val, isUnidentified: false };
    }
  }

  // 3. TAGS:
  // 3a. Tags in frontmatter (tags: [jogando], tag: jogando, tags:\n - jogando)
  if (yamlBlock) {
    const tagsMatch = yamlBlock.match(/(?:tags|tag|etiquetas):\s*([^\r\n]+)/i);
    if (tagsMatch) {
      const rawTags = tagsMatch[1].trim();
      // Check whole string or split by comma / space
      const tagTokens = rawTags.replace(/^\[|\]$/g, '').split(/[,;\s]+/).filter(Boolean);
      for (const token of tagTokens) {
        const matched = matchStatusValue(token);
        if (matched) {
          return { status: matched, source: 'tag', rawMatched: token, isUnidentified: false };
        }
      }
      const matched = matchStatusValue(rawTags);
      if (matched) {
        return { status: matched, source: 'tag', rawMatched: rawTags, isUnidentified: false };
      }
    }
    const listTagsMatch = yamlBlock.match(/(?:tags|tag|etiquetas):\s*\r?\n((?:\s*-[^\r\n]+\r?\n?)+)/i);
    if (listTagsMatch) {
      const lines = listTagsMatch[1].split(/\r?\n/);
      for (const line of lines) {
        const tagVal = line.replace(/^\s*-\s*/, '').trim();
        const matched = matchStatusValue(tagVal);
        if (matched) {
          return { status: matched, source: 'tag', rawMatched: tagVal, isUnidentified: false };
        }
      }
    }
  }

  // 3b. Hashtags in text (e.g. #status/jogando, #jogando, #em-andamento, #playing, etc.)
  const hashtagRegex = /#(?:status\/|estado\/|progresso\/)?([a-zA-Z0-9_\u00C0-\u00FF-]+)/g;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = hashtagRegex.exec(cleanMd)) !== null) {
    const rawTag = tagMatch[1];
    const matched = matchStatusValue(rawTag);
    if (matched) {
      return { status: matched, source: 'tag', rawMatched: `#${rawTag}`, isUnidentified: false };
    }
  }

  // 4. TEXTO NO CORPO: lines like "Status: Jogando", "**Status**: Jogando", "- Status: Jogando"
  const bodyStatusRegex = /(?:^|\n)[-*#>\s]*(?:\*\*|__)?(?:status|estado|situação|situacao|progresso)(?:\*\*|__)?\s*:\s*([^\r\n]+)/gi;
  let bodyMatch: RegExpExecArray | null;
  while ((bodyMatch = bodyStatusRegex.exec(bodyContent)) !== null) {
    const val = bodyMatch[1].trim();
    const matched = matchStatusValue(val);
    if (matched) {
      return { status: matched, source: 'corpo', rawMatched: val, isUnidentified: false };
    }
  }

  // 5. PASTA / NOME DO ARQUIVO:
  if (filePathOrName) {
    const normalizedPath = filePathOrName.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/');
    // Check folders
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      const folderStatus = matchStatusValue(part);
      if (folderStatus) {
        return { status: folderStatus, source: 'arquivo', rawMatched: part, isUnidentified: false };
      }
    }
    // Also check bracketed tags in filename, e.g. [Jogando] Mario.md or Mario (Jogando).md or Mario - Jogando.md
    const fileName = pathParts[pathParts.length - 1] || '';
    const bracketMatch = fileName.match(/[\[\(]([^\)\]]+)[\]\)]/);
    if (bracketMatch) {
      const bracketStatus = matchStatusValue(bracketMatch[1]);
      if (bracketStatus) {
        return { status: bracketStatus, source: 'arquivo', rawMatched: bracketMatch[1], isUnidentified: false };
      }
    }
    const dashMatch = fileName.replace(/\.(md|markdown|txt)$/i, '').match(/-\s*([^\-]+)$/);
    if (dashMatch) {
      const dashStatus = matchStatusValue(dashMatch[1]);
      if (dashStatus) {
        return { status: dashStatus, source: 'arquivo', rawMatched: dashMatch[1], isUnidentified: false };
      }
    }
  }

  // Se nada for reconhecido: marcar como não identificado
  return { status: 'fila', source: 'desconhecido', isUnidentified: true };
}

// Parse an Obsidian Markdown string into a GameItem
export function parseObsidianMarkdown(markdown: string, fallbackFileName?: string): GameItem {
  const cleanMd = (markdown || '').replace(/^\uFEFF/, '').trimStart();

  const cleanFallbackName = fallbackFileName
    ? fallbackFileName.replace(/\\/g, '/').split('/').pop()?.replace(/\.(md|markdown|txt)$/i, '') || 'Novo Jogo'
    : 'Novo Jogo';

  let frontmatterObj: Record<string, string> = {};
  let bodyContent = cleanMd;

  // Extract YAML frontmatter
  const frontmatterMatch = cleanMd.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const yamlBlock = frontmatterMatch[1];
    bodyContent = cleanMd.slice(frontmatterMatch[0].length);

    yamlBlock.split(/\r?\n/).forEach((line) => {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim().toLowerCase();
        let val = line.slice(colonIdx + 1).trim();
        // remove surrounding quotes
        val = val.replace(/^["'](.*)["']$/, '$1');
        frontmatterObj[key] = val;
      }
    });
  }

  // Title extraction: frontmatter -> heading # -> filename
  const hasExplicitTitle = Boolean(
    frontmatterObj['title'] || frontmatterObj['jogo'] || frontmatterObj['game'] || frontmatterObj['nome']
  );
  let extractedTitle = frontmatterObj['title'] || frontmatterObj['jogo'] || frontmatterObj['game'] || frontmatterObj['nome'] || '';
  if (!extractedTitle) {
    const headingMatch = bodyContent.match(/^#\s+([^#\r\n]+)/m);
    if (headingMatch) {
      const candidate = headingMatch[1].trim();
      const candLower = candidate.toLowerCase();
      if (!candLower.includes('ficha') && !candLower.includes('calculadora') && !candLower.includes('sess') && !candLower.includes('registo')) {
        extractedTitle = candidate;
      }
    }
  }
  const title = extractedTitle || cleanFallbackName;

  // Console / Platform extraction
  const hasExplicitConsole = Boolean(
    frontmatterObj['console'] || frontmatterObj['plataforma'] || frontmatterObj['platform']
  );
  let extractedConsole = frontmatterObj['console'] || frontmatterObj['plataforma'] || frontmatterObj['platform'] || '';
  if (!extractedConsole) {
    const inlineConsole = bodyContent.match(/(?:\[|\()?(?:\*\*|__)?(?:console|plataforma|platform)(?:\*\*|__)?\s*::\s*([^\r\n\]\)]+)/i);
    if (inlineConsole) extractedConsole = inlineConsole[1].trim();
    else {
      const bodyConsole = bodyContent.match(/(?:^|\n)[-*#>\s]*(?:\*\*|__)?(?:console|plataforma|platform)(?:\*\*|__)?\s*:\s*([^\r\n]+)/i);
      if (bodyConsole) extractedConsole = bodyConsole[1].trim();
    }
  }
  const consoleVal = extractedConsole || 'PC';

  // Cover image extraction
  let capa = frontmatterObj['capa'] || frontmatterObj['cover'] || frontmatterObj['image'] || '';
  if (!capa) {
    const imgMatch = bodyContent.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
    if (imgMatch) capa = imgMatch[1];
  }

  // Gameplay Sessions extraction
  const sessoes: GameplayDaySession[] = [];
  const lines = bodyContent.split(/\r?\n/);
  let currentDate = 'Sem Data';
  let currentIntervals: GameplaySessionInterval[] = [];

  const regData = /(?:^|\s|-|\*|#)(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{4}-\d{2}-\d{2})/;
  const regIntervalGlobal = /(\d{1,2}(?::|h)\d{2}|\d{1,2}h)\s*(?:até|às|ate|as|to|[-~]|a)\s*:?(\d{1,2}(?::|h)\d{2}|\d{1,2}h)/gi;
  const regSingleDuration = /^\s*(?:-\s*)?(\d{1,2}:\d{2}|\d+h(?:\s*\d{1,2}m?)?|\d+m(?:in)?)\s*$/i;

  let totalParsedMinutes = 0;

  const normalizeClock = (raw: string): [number, number, string] => {
    let s = raw.toLowerCase().trim();
    if (s.includes('h')) {
      const parts = s.split('h');
      const h = parseInt(parts[0], 10) || 0;
      const m = parts[1] ? parseInt(parts[1], 10) || 0 : 0;
      return [h, m, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`];
    }
    const [hStr, mStr] = s.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    return [h, m, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    const mData = trimmed.match(regData);
    if (mData && !trimmed.toLowerCase().includes('data_inicio') && !trimmed.toLowerCase().includes('data_zerado')) {
      if (currentIntervals.length > 0) {
        const dayTotal = currentIntervals.reduce((acc, curr) => acc + curr.minutos, 0);
        sessoes.push({
          data: currentDate,
          intervalos: [...currentIntervals],
          totalMinutos: dayTotal,
        });
        currentIntervals = [];
      }
      currentDate = mData[1];
    }

    // Match all intervals on this line (supports multiple intervals separated by comma/e/space)
    let match: RegExpExecArray | null;
    regIntervalGlobal.lastIndex = 0;
    let foundIntervalOnLine = false;
    while ((match = regIntervalGlobal.exec(trimmed)) !== null) {
      foundIntervalOnLine = true;
      const [h1, m1, formattedInicio] = normalizeClock(match[1]);
      const [h2, m2, formattedFim] = normalizeClock(match[2]);
      let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      if (diff < 0) diff += 1440; // Midnight crossover
      totalParsedMinutes += diff;
      currentIntervals.push({
        inicio: formattedInicio,
        fim: formattedFim,
        minutos: diff,
      });
    }

    // Also support single durations on a session line (e.g. "     0:45", "45m", "1h 15m")
    if (!foundIntervalOnLine && currentDate !== 'Sem Data') {
      const mSingle = trimmed.match(regSingleDuration);
      if (mSingle) {
        const mins = parseToMinutes(mSingle[1]);
        if (mins > 0) {
          totalParsedMinutes += mins;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          currentIntervals.push({
            inicio: '00:00',
            fim: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            minutos: mins,
          });
        }
      }
    }
  });

  if (currentIntervals.length > 0) {
    const dayTotal = currentIntervals.reduce((acc, curr) => acc + curr.minutos, 0);
    sessoes.push({
      data: currentDate,
      intervalos: [...currentIntervals],
      totalMinutos: dayTotal,
    });
  }

  // Rubric Extraction: inline fields like `**Controles**:: 10`
  const extractInline = (key: string): number => {
    const regex = new RegExp(`\\*\\*${key}\\*\\*\\s*::\\s*([0-9.,]+)`, 'i');
    const match = bodyContent.match(regex);
    if (match) {
      return parseFloat(match[1].replace(',', '.')) || 0;
    }
    return 0;
  };

  const hasRubric = /::\s*\d+/.test(bodyContent);
  let rubric: GameReviewRubric | undefined = undefined;

  if (hasRubric) {
    rubric = {
      controles: extractInline('Controles'),
      dificuldade: extractInline('Dificuldade'),
      levelDesign: extractInline('Level design') || extractInline('Level Design'),
      mecanicas: extractInline('Mecânicas') || extractInline('Mecanicas'),

      estiloVisual: extractInline('Estilo visual') || extractInline('Estilo Visual'),
      animacoes: extractInline('Animações') || extractInline('Animacoes'),
      paletaCores: extractInline('Paleta de cores') || extractInline('Paleta de Cores'),
      detalhes: extractInline('Detalhes'),

      musicasMemoraveis: extractInline('Músicas memoráveis') || extractInline('Musicas memoraveis'),
      adequacao: extractInline('Adequação') || extractInline('Adequacao'),
      variedade: extractInline('Variedade'),
      efeitosSonoros: extractInline('Efeitos sonoros') || extractInline('Efeitos Sonoros'),

      querContinuarJogando: extractInline('Você quer continuar jogando') || extractInline('Voce quer continuar jogando'),
      satisfacao: extractInline('Satisfação') || extractInline('Satisfacao'),
      rejogabilidade: extractInline('Rejogabilidade'),
      interesse: extractInline('Interesse'),
    };
  }

  // Nota calculation
  let finalNota: number | undefined = undefined;
  if (frontmatterObj['nota']) {
    const n = parseFloat(frontmatterObj['nota'].replace(',', '.'));
    if (!isNaN(n)) finalNota = n;
  } else if (rubric) {
    finalNota = calculateRubricScore(rubric);
  }

  // Anotações extraction
  let anotacoes = frontmatterObj['anotacoes'] || '';
  if (!anotacoes) {
    const notesMatch = bodyContent.match(/##\s*(?:📝\s*)?(?:Anotações|Anotacoes|Notas|Review)\s*\r?\n([\s\S]*?)(?=\n##\s*|$)/i);
    if (notesMatch) {
      anotacoes = notesMatch[1].trim();
    }
  }

  // Time handling
  const hasExplicitTempo = Boolean(frontmatterObj['tempo'] || frontmatterObj['horas'] || frontmatterObj['time']);
  let tempo = frontmatterObj['tempo'] || frontmatterObj['horas'] || frontmatterObj['time'] || '';
  if (!tempo) {
    const inlineTempo = bodyContent.match(/(?:\[|\()?(?:\*\*|__)?(?:tempo|horas|playtime)(?:\*\*|__)?\s*::\s*([^\r\n\]\)]+)/i);
    if (inlineTempo) tempo = inlineTempo[1].trim();
    else {
      const bodyTempo = bodyContent.match(/(?:^|\n)[-*#>\s]*(?:\*\*|__)?(?:tempo|tempo jogado|horas)(?:\*\*|__)?\s*:\s*([^\r\n]+)/i);
      if (bodyTempo) tempo = bodyTempo[1].trim();
    }
  }
  if (!tempo && totalParsedMinutes > 0) {
    const h = Math.floor(totalParsedMinutes / 60);
    const m = totalParsedMinutes % 60;
    tempo = `${h}:${String(m).padStart(2, '0')}`;
  }

  // Robust status extraction with priority hierarchy
  const statusInfo = extractGameStatusWithSource(markdown, fallbackFileName);
  const status: GameItem['status'] = statusInfo.status;

  const checkBool = (key: string): boolean => {
    const v = (frontmatterObj[key] || '').toLowerCase();
    return v === 'true' || v === '1' || v === 'sim' || v === 'yes';
  };

  const id = 'game_' + Math.random().toString(36).substring(2, 9);

  // Detect missing fields for preview feedback
  const missingFields: string[] = [];
  if (!extractedTitle && cleanFallbackName === 'Novo Jogo') missingFields.push('Título');
  if (!extractedConsole) missingFields.push('Console');
  if (!tempo && totalParsedMinutes === 0) missingFields.push('Tempo');
  if (sessoes.length === 0) missingFields.push('Sessões');
  if (statusInfo.isUnidentified) missingFields.push('Status');
  if (!capa) missingFields.push('Capa');

  return {
    id,
    title,
    fileName: fallbackFileName ? fallbackFileName.replace(/\\/g, '/').split('/').pop() || `${title}.md` : `${title}.md`,
    status,
    ano_zerado: frontmatterObj['ano_zerado'] ? parseInt(frontmatterObj['ano_zerado'], 10) : undefined,
    console: consoleVal,
    genero: frontmatterObj['genero'] || 'Ação',
    nota: finalNota,
    capa: capa || 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg',
    tempo: tempo || '0:00',
    tempoMinutos: parseToMinutes(tempo || '0:00'),
    hltb: frontmatterObj['hltb'],
    hltb_real: frontmatterObj['hltb_real'],
    data_inicio: frontmatterObj['data_inicio'],
    data_zerado: frontmatterObj['data_zerado'],

    // GOT Awards
    got_jogo: checkBool('got_jogo'),
    got_gameplay: checkBool('got_gameplay'),
    got_narrativa: checkBool('got_narrativa'),
    got_arte: checkBool('got_arte'),
    got_indie: checkBool('got_indie'),
    got_surpresa: checkBool('got_surpresa'),
    got_retro: checkBool('got_retro'),
    got_dificil: checkBool('got_dificil'),
    got_pior: checkBool('got_pior'),

    rubric,
    sessoes,
    anotacoes: anotacoes || undefined,
    rawMarkdown: markdown,

    // Import preview metadata
    statusSource: statusInfo.source,
    statusUnidentified: statusInfo.isUnidentified,
    missingFields,
  };
}

// Generate complete Obsidian Markdown compliant with DataviewJS
export function generateObsidianMarkdown(game: GameItem): string {
  const frontmatterLines = [
    '---',
    `tempo: ${game.tempo || '0:00'}`,
    game.ano_zerado ? `ano_zerado: ${game.ano_zerado}` : 'ano_zerado:',
    `console: ${game.console}`,
    `genero: ${game.genero}`,
    game.nota !== undefined ? `nota: ${game.nota}` : 'nota:',
    `status: ${game.status}`,
    `capa: ${game.capa}`,
    game.hltb ? `hltb: ${game.hltb}` : 'hltb:',
    game.hltb_real ? `hltb_real: ${game.hltb_real}` : 'hltb_real:',
    game.data_inicio ? `data_inicio: ${game.data_inicio}` : 'data_inicio:',
    game.data_zerado ? `data_zerado: ${game.data_zerado}` : 'data_zerado:',
    `got_jogo: ${Boolean(game.got_jogo)}`,
    `got_gameplay: ${Boolean(game.got_gameplay)}`,
    `got_narrativa: ${Boolean(game.got_narrativa)}`,
    `got_arte: ${Boolean(game.got_arte)}`,
    `got_indie: ${Boolean(game.got_indie)}`,
    `got_surpresa: ${Boolean(game.got_surpresa)}`,
    `got_retro: ${Boolean(game.got_retro)}`,
    `got_dificil: ${Boolean(game.got_dificil)}`,
    `got_pior: ${Boolean(game.got_pior)}`,
    '---',
  ];

  let sessionsBlock = '';
  if (game.sessoes && game.sessoes.length > 0) {
    sessionsBlock = game.sessoes
      .map((s) => {
        const intervals = s.intervalos.map((i) => `     ${i.inicio} até ${i.fim}`).join('\n');
        return `${s.data}\n${intervals}`;
      })
      .join('\n');
  }

  const rubricBlock = game.rubric ? `
----
## 🕹️ JOGABILIDADE (0-10) - PESO 2x
**Controles**:: ${game.rubric.controles}
**Dificuldade**:: ${game.rubric.dificuldade}
**Level design**:: ${game.rubric.levelDesign}
**Mecânicas**:: ${game.rubric.mecanicas}

## 🎨 GRÁFICOS (0-10) - PESO 1x
**Estilo visual**:: ${game.rubric.estiloVisual}
**Animações**:: ${game.rubric.animacoes}
**Paleta de cores**:: ${game.rubric.paletaCores}
**Detalhes**:: ${game.rubric.detalhes}

## 🎵 TRILHA SONORA (0-10) - PESO 1x
**Músicas memoráveis**:: ${game.rubric.musicasMemoraveis}
**Adequação**:: ${game.rubric.adequacao}
**Variedade**:: ${game.rubric.variedade}
**Efeitos sonoros**:: ${game.rubric.efeitosSonoros}

## ⭐ DIVERSÃO (0-10) - PESO 2x
**Você quer continuar jogando**:: ${game.rubric.querContinuarJogando}
**Satisfação**:: ${game.rubric.satisfacao}
**Rejogabilidade**:: ${game.rubric.rejogabilidade}
**Interesse**:: ${game.rubric.interesse}` : '';

  const notesBlock = game.anotacoes && game.anotacoes.trim() ? `\n\n## 📝 Anotações\n${game.anotacoes.trim()}` : '';

  const body = `
![capa|300](${game.capa})

## 📊 Ficha Técnica

| 🎯 Campo       | 📝 Valor  |
| -------------- | --------- |
| **Nota**       | ⭐⭐⭐⭐⭐ ${game.nota !== undefined ? game.nota : '—'}/10 |
| **Ano Zerado** | ${game.ano_zerado || '—'}      |

---

## ⏱️ Calculadora de Tempo Automática
 \`\`\`dataviewjs
 const arquivo = await dv.io.load(dv.current().file.path);
if (!arquivo) return;

const linhas = arquivo.split('\\n');
let logSessoes = {};
let dataAtual = "Sem Data";
let minutosTotais = 0;

const regData = /^(\\d{1,2}\\/\\d{1,2})/;
const regTempo = /(\\d{1,2}:\\d{2})\\s*até\\s*:?(\\d{1,2}:\\d{2})/;

linhas.forEach(linha => {
    const mData = linha.match(regData);
    if (mData) dataAtual = mData[1];

    const mTempo = linha.match(regTempo);
    if (mTempo) {
        if (!logSessoes[dataAtual]) logSessoes[dataAtual] = { sessoes: [], total: 0 };

        const [h1, m1] = mTempo[1].split(':').map(Number);
        const [h2, m2] = mTempo[2].split(':').map(Number);
        
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440; 

        logSessoes[dataAtual].sessoes.push(mTempo[1] + " às " + mTempo[2] + " (<b>+" + diff + " min</b>)");
        logSessoes[dataAtual].total += diff;
        minutosTotais += diff;
    }
});

if (minutosTotais > 0) {
    const hT = Math.floor(minutosTotais/60);
    const mT = minutosTotais%60;
    dv.header(3, "✅ Total Acumulado: " + hT + "h " + mT + "m");
    
    const rows = Object.entries(logSessoes).map(([d, i]) => {
        const hD = Math.floor(i.total/60);
        const mD = i.total%60;
        return [d, i.sessoes.join("<br>"), "**" + hD + "h " + mD + "m**"];
    });
    dv.table(["Data", "Sessões", "Total do Dia"], rows);
} else {
    dv.paragraph("⚠️ *Aguardando horários no formato: HH:mm até HH:mm*");
}
 \`\`\`

## 📅 Registos de Gameplay
${sessionsBlock || '(Escreva abaixo a data e os horários no formato HH:mm até HH:mm)'}${rubricBlock}${notesBlock}
`;

  return `${frontmatterLines.join('\n')}\n${body.trim()}\n`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-GAME BACKLOG & COVERS ENGINE (FOR OBSIDIAN 2-FILE BACKLOG/CAPAS)
// ─────────────────────────────────────────────────────────────────────────────

export function cleanTitle(raw: string): string {
  if (!raw) return 'Sem Título';
  let t = raw.trim();
  // Strip any leading directory path (e.g. Games/Folder/Title.md -> Title.md)
  t = t.replace(/^.*[\\\/]/, '');
  // Strip .md, .markdown, .mde, .txt extensions
  t = t.replace(/\.(?:md|markdown|mde|txt)$/i, '');
  // Strip wikilinks [[Title|Alias]] or [[Title]]
  t = t.replace(/\[\[(?:[^|\]]*\|)?(.*?)\]\]/g, '$1');
  // Strip markdown links [Title](url)
  t = t.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  // Strip bold, italics, inline code, heading markers
  t = t.replace(/^[*_~`#\s-]+|[*_~`#\s-]+$/g, '');
  // Strip .md or .markdown again in case it was wrapped in formatting
  t = t.replace(/\.(?:md|markdown|mde|txt)$/i, '');
  return t.trim() || 'Sem Título';
}

export function normalizeTitleKey(raw: string): string {
  if (!raw) return '';
  let cleaned = cleanTitle(raw)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove diacritics

  // Strip common platform and language tags in parentheses or brackets e.g. (ps1), (pt-br), [snes], etc.
  cleaned = cleaned.replace(/\s*[\(\[](?:ps[1-5]|psx|psv|psp|pc|steam(?:\s*deck)?|switch|dreamcast|arcade|cps[1-3]|neogeo|neo\s*geo|snes|nes|genesis|mega\s*drive|gamecube|wii(?:\s*u)?|xbox(?:\s*360|\s*one|\s*series)?|gba|gbc|gb|nds|3ds|pt-br|pt|br|en|us|jp|traduzido)[\)\]]/gi, '');

  return cleaned
    .replace(/[^a-z0-9\s]/g, ' ') // replace non-alphanumeric with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Robust unique beaten games calculation using Set and Map deduplication.
 * Eliminates duplicates caused by multi-platform entries, duplicate IDs, or repeated imports.
 * Ensures each distinct game title is accounted for exactly once.
 */
export function getUniqueZerados(gamesList: GameItem[], yearFilter?: number): GameItem[] {
  if (!Array.isArray(gamesList)) return [];

  const beatenGames = gamesList.filter(g => {
    if (g.status !== 'zerado') return false;
    if (yearFilter !== undefined) {
      const parts = parseDateParts(g.data_zerado);
      const yr = parts ? parts.year : (g.ano_zerado || (g.data_zerado ? parseInt(String(g.data_zerado).split('-')[0], 10) : undefined));
      return yr === yearFilter;
    }
    return true;
  });

  const uniqueMap = new Map<string, GameItem>();
  const seenKeys = new Set<string>();

  beatenGames.forEach(g => {
    const normKey = normalizeTitleKey(g.title);
    const key = normKey || g.id || g.title.toLowerCase().trim();

    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueMap.set(key, { ...g });
    } else {
      // Merge richer data (cover, rating, playtime, date) into the deduplicated entry
      const existing = uniqueMap.get(key)!;
      uniqueMap.set(key, {
        ...existing,
        ...g,
        capa: (g.capa && !g.capa.includes('placeholder')) ? g.capa : existing.capa,
        data_zerado: g.data_zerado || existing.data_zerado,
        ano_zerado: g.ano_zerado || existing.ano_zerado,
        nota: (g.nota !== undefined && g.nota > 0) ? g.nota : existing.nota,
        tempo: (g.tempo && g.tempo !== '0:00' && g.tempo !== '0h00') ? g.tempo : existing.tempo,
        hltb: g.hltb || existing.hltb,
        sessoes: (g.sessoes && g.sessoes.length > 0) ? g.sessoes : existing.sessoes,
      });
    }
  });

  return Array.from(uniqueMap.values());
}

export function extractImageUrl(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();

  // Markdown image: ![...](URL)
  const mdImg = trimmed.match(/!\[.*?\]\((https?:\/\/[^\s\)\"']+)\)/i);
  if (mdImg) return mdImg[1];

  // HTML img: <img src="URL"
  const htmlImg = trimmed.match(/<img[^>]+src=["'](https?:\/\/[^"']+)["']/i);
  if (htmlImg) return htmlImg[1];

  // Standalone http/https URL
  const rawUrl = trimmed.match(/(https?:\/\/[^\s\)\|\"'\`<>]+)/i);
  if (rawUrl) return rawUrl[1];

  // IGDB image code: co1x77, co3i89, etc.
  const igdbCode = trimmed.match(/^(?:co[0-9a-z]{3,7})$/i);
  if (igdbCode) {
    return `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${igdbCode[0]}.jpg`;
  }

  // Obsidian wiki attachment ![[image.jpg]] or [[image.jpg]]
  const wikiImg = trimmed.match(/!?\[\[(.*?)\.(png|jpe?g|webp|gif|svg)\]\]/i);
  if (wikiImg) {
    return `${wikiImg[1]}.${wikiImg[2]}`;
  }

  return null;
}

export function extractCoverMappings(content: string): Map<string, string> {
  const map = new Map<string, string>();
  if (!content) return map;

  const decodeEntities = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

  const registerEntry = (key: string, url: string) => {
    if (!key || !url) return;
    const cleanUrl = url.trim().replace(/^['"]|['"]$/g, '');
    if (!cleanUrl.startsWith('http') && !cleanUrl.startsWith('//') && !cleanUrl.includes('images.igdb.com')) return;
    const finalUrl = cleanUrl.startsWith('//') ? `https:${cleanUrl}` : cleanUrl;
    
    const cleanK = decodeEntities(key).trim();
    if (!cleanK) return;
    map.set(cleanK, finalUrl);
    
    const norm = normalizeTitleKey(cleanK);
    if (norm) map.set(norm, finalUrl);

    // Also strip emojis
    const noEmoji = cleanK.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '').trim();
    if (noEmoji && noEmoji !== cleanK) {
      map.set(noEmoji, finalUrl);
      const noEmojiNorm = normalizeTitleKey(noEmoji);
      if (noEmojiNorm) map.set(noEmojiNorm, finalUrl);
    }
  };

  // Strip markdown code fences if present: ```json ... ``` or ```js ... ```
  let cleanContent = content.trim();
  const codeBlockMatch = cleanContent.match(/```(?:json|javascript|js)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    cleanContent = codeBlockMatch[1].trim();
  }

  // 1. Direct JSON check or extract JSON object inside JS file (e.g. const COVER_MAP = { ... };)
  const firstBrace = cleanContent.indexOf('{');
  const lastBrace = cleanContent.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleanContent.slice(firstBrace, lastBrace + 1);
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (typeof parsed === 'object' && parsed !== null) {
        Object.entries(parsed).forEach(([key, val]) => {
          if (typeof val === 'string') {
            registerEntry(key, val);
          }
        });
        if (map.size > 0) return map;
      }
    } catch {
      // Continue to regex parsing
    }
  }

  // 2. JSON or JS Object / DataviewJS regex with quotes: "Title": "https://..." or 'Title': 'https://...'
  const jsonKvRegex = /(?:["']([^"'\r\n]+)["'])\s*:\s*(?:["'](https?:\/\/[^"'\r\n]+|\/\/[^"'\r\n]+)["'])/g;
  let kvMatch: RegExpExecArray | null;
  while ((kvMatch = jsonKvRegex.exec(cleanContent)) !== null) {
    registerEntry(kvMatch[1], kvMatch[2]);
  }

  // 3. JS object without quotes around keys: Title_Name: "https://..." or TitleName: 'https://...'
  const unquotedKeyRegex = /([a-zA-Z0-9_\$]+)\s*:\s*(?:["'](https?:\/\/[^"'\r\n]+|\/\/[^"'\r\n]+)["'])/g;
  let unqMatch: RegExpExecArray | null;
  while ((unqMatch = unquotedKeyRegex.exec(cleanContent)) !== null) {
    registerEntry(unqMatch[1], unqMatch[2]);
  }

  if (map.size > 0) return map;

  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 1. Markdown Table Row: | Jogo | Capa | or | Title | Image |
    if (line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      if (parts[0] === '') parts.shift();
      if (parts[parts.length - 1] === '') parts.pop();

      if (parts.length >= 2) {
        const col1 = parts[0];
        const col2 = parts[1];
        // Skip header and separator
        if (
          col1.toLowerCase().includes('jogo') ||
          col1.toLowerCase().includes('game') ||
          col1.toLowerCase().includes('title') ||
          col1.startsWith(':-') ||
          col1.startsWith('--')
        ) {
          continue;
        }

        const img1 = extractImageUrl(col1);
        const img2 = extractImageUrl(col2);

        if (img2 && !img1) {
          const key = normalizeTitleKey(col1);
          if (key) map.set(key, img2);
        } else if (img1 && !img2) {
          const key = normalizeTitleKey(col2);
          if (key) map.set(key, img1);
        }
        continue;
      }
    }

    // 2. Headings followed by image:
    // ## Chrono Trigger
    // ![capa](https://...)
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      const rawTitle = headingMatch[1];
      const normKey = normalizeTitleKey(rawTitle);
      for (let j = i + 1; j <= Math.min(i + 4, lines.length - 1); j++) {
        const nextLine = lines[j].trim();
        const img = extractImageUrl(nextLine);
        if (img) {
          map.set(normKey, img);
          break;
        }
        if (nextLine.startsWith('#')) break;
      }
      continue;
    }

    // 3. Key-Value or Reference link:
    // Chrono Trigger: https://...
    // [[Chrono Trigger]]: https://...
    // [Chrono Trigger]: https://...
    const kvMatch = line.match(/^(?:\[\[(.*?)\]\]|\[(.*?)\]|([^\:\#\-\|\*\`]+))\s*(?:::|:|=|-|\>)\s*(.+)$/);
    if (kvMatch) {
      const rawTitle = kvMatch[1] || kvMatch[2] || kvMatch[3];
      const rest = kvMatch[4];
      const img = extractImageUrl(rest);
      const normKey = normalizeTitleKey(rawTitle);
      if (normKey && img) {
        map.set(normKey, img);
        continue;
      }
    }

    // 4. Bullet list items: - [[Chrono Trigger]]: https://... or - Chrono Trigger - URL
    const bulletMatch = line.match(/^[-*+]\s+(?:\[\[(.*?)\]\]|([^\(\)\:\-]+))\s*(?:[-:|]\s*)?(.+)$/);
    if (bulletMatch) {
      const rawTitle = bulletMatch[1] || bulletMatch[2];
      const rest = bulletMatch[3];
      const img = extractImageUrl(rest);
      const normKey = normalizeTitleKey(rawTitle);
      if (normKey && img) {
        map.set(normKey, img);
      }
    }
  }

  return map;
}

export function parseMarkdownTable(tableText: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const lines = tableText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('|') && l.includes('|'));
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  const headers = headerLine.split('|').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (headers.length === 0) return null;

  const dataRows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // skip separator row | :--- | ---: |
    if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?$/.test(line)) continue;

    const cells = line.split('|').map((c) => c.trim());
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();

    if (cells.length === 0) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] || '';
    });
    dataRows.push(rowObj);
  }

  return dataRows.length > 0 ? { headers, rows: dataRows } : null;
}

export function isMultiGameContent(content: string): boolean {
  if (!content) return false;
  const clean = content.replace(/^\uFEFF/, '').trimStart();

  // 1. If it has single-game YAML frontmatter, it is ALWAYS a single game note
  const frontmatterMatch = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const yaml = frontmatterMatch[1].toLowerCase();
    if (
      yaml.includes('status:') ||
      yaml.includes('console:') ||
      yaml.includes('plataforma:') ||
      yaml.includes('tempo:') ||
      yaml.includes('horas:') ||
      yaml.includes('genero:') ||
      yaml.includes('gênero:') ||
      yaml.includes('ano_zerado:') ||
      yaml.includes('data_inicio:') ||
      yaml.includes('data_zerado:') ||
      yaml.includes('hltb:')
    ) {
      return false;
    }
  }

  // 2. If it has single-game Dataview inline fields or standard single-game sections, it is a single game note
  const lowerClean = clean.toLowerCase();
  if (
    lowerClean.includes('status::') ||
    lowerClean.includes('console::') ||
    lowerClean.includes('ficha técnica') ||
    lowerClean.includes('ficha tecnica') ||
    lowerClean.includes('calculadora de tempo') ||
    lowerClean.includes('registos de gameplay') ||
    lowerClean.includes('registros de gameplay') ||
    lowerClean.includes('jogabilidade (0-10)')
  ) {
    return false;
  }

  // 3. Check if it has Obsidian callout/task backlog (- [ ] or - [x] with pipes |)
  const taskPipes = clean.match(/[-*+]\s+\[[ xX]\][^\n]+\|/g);
  if (taskPipes && taskPipes.length >= 2) return true;

  // 4. Check if it has a markdown table with at least 2 data rows AND catalog headers
  const parsedTable = parseMarkdownTable(clean);
  if (parsedTable && parsedTable.rows.length >= 2) {
    const headersStr = parsedTable.headers.join(' ').toLowerCase();
    if (
      (headersStr.includes('jogo') ||
        headersStr.includes('game') ||
        headersStr.includes('titulo') ||
        headersStr.includes('título')) &&
      !headersStr.includes('campo')
    ) {
      return true;
    }
  }

  // 5. Check if it has markdown list of games (at least 3 bullet items with links)
  const links = clean.match(/[-*+]\s+\[\[[^\n\]]+\]\]/g);
  if (links && links.length >= 3) return true;

  return false;
}

export function parseObsidianTaskBacklog(
  content: string,
  coversMap?: Map<string, string>
): GameItem[] {
  const games: GameItem[] = [];
  const covers = coversMap || new Map<string, string>();
  const lines = content.split(/\r?\n/);

  let currentSectionConsole = 'PC';

  for (let line of lines) {
    let s = line.trim();
    while (s.startsWith('>')) {
      s = s.slice(1).trim();
    }

    // Check for Obsidian Callout header: > [!abstract]- 💽 Amiga CD32 or [!abstract]- 🕹️ Arcade
    const calloutMatch = s.match(/\[!(?:abstract|note|tip|info|summary)[^\]]*\]-?\s*(?:[^\w\s]*\s*)?([^\n\r]+)/i);
    if (calloutMatch) {
      // Clean console name: strip emojis
      const cleaned = calloutMatch[1].replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '').trim();
      if (cleaned) currentSectionConsole = cleaned;
      continue;
    }

    // Must be a task item: - [ ] or - [x]
    if (!s.startsWith('- [ ]') && !s.startsWith('- [x]') && !s.startsWith('- [X]')) {
      continue;
    }

    const isDone = s.startsWith('- [x]') || s.startsWith('- [X]');
    const taskRest = s.replace(/^- \[[ xX]\]\s*/, '').trim();

    const parts = taskRest.split('|').map((p) => p.trim());
    if (parts.length === 0) continue;

    const rawTitlePart = parts[0];
    let title = cleanTitle(rawTitlePart);

    if (!title) continue;

    // Platform / Console
    let consoleVal = currentSectionConsole;
    if (parts.length >= 2 && parts[1]) {
      const colConsole = parts[1].replace(/[`*]/g, '').trim();
      if (colConsole) consoleVal = colConsole;
    }

    // Tags / Genre
    let genero = 'Ação';
    let isPriority = false;
    if (parts.length >= 3) {
      const tagsStr = parts.slice(2).join(' ');
      if (tagsStr.includes('#prioridade') || tagsStr.includes('⭐')) {
        isPriority = true;
      }
      const tagMatches = tagsStr.match(/#([a-zA-Z0-9_\u00C0-\u017F-]+)/g);
      if (tagMatches) {
        const firstGenreTag = tagMatches.find((t) => !t.toLowerCase().includes('prioridade'));
        if (firstGenreTag) {
          const rawTag = firstGenreTag.replace('#', '').replace(/-/g, ' ');
          genero = rawTag.charAt(0).toUpperCase() + rawTag.slice(1);
        }
      }
    }

    // Cover resolution
    const normKey = normalizeTitleKey(title);
    const noEmojiTitle = title.replace(/[\p{Emoji}\p{Extended_Pictographic}]/gu, '').trim();
    const noEmojiKey = normalizeTitleKey(noEmojiTitle);

    let coverUrl =
      covers.get(title) ||
      covers.get(normKey) ||
      covers.get(noEmojiTitle) ||
      covers.get(noEmojiKey) ||
      'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg';

    // Metadata extraction from other parts
    let tempoVal = '0:00';
    let notaVal: number | undefined = undefined;
    let dataZeradoVal: string | undefined = undefined;
    let anoZeradoVal: number | undefined = undefined;
    let hltbVal: string | undefined = undefined;

    parts.slice(1).forEach((part) => {
      const p = part.trim();
      if (!p) return;

      // Check for date (YYYY-MM-DD or DD/MM/YYYY or DD/MM)
      const dateM = p.match(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}(?:[-/.]\d{2,4})?)\b/);
      if (dateM && !p.toLowerCase().includes('hltb') && !p.includes(':')) {
        const dp = parseDateParts(dateM[1]);
        if (dp) {
          dataZeradoVal = `${dp.year}-${String(dp.month + 1).padStart(2, '0')}-${String(dp.day).padStart(2, '0')}`;
          anoZeradoVal = dp.year;
        }
      }

      // Check for score/nota
      const starM = p.match(/⭐+/);
      if (starM) {
        notaVal = Math.min(10, starM[0].length * 2);
      } else {
        const notaM = p.match(/(?:nota|score|rating)?\s*[:=]?\s*(\d+(?:[.,]\d+)?)(?:\/10)?/i);
        if (notaM && !p.toLowerCase().includes('h') && !p.toLowerCase().includes('min') && !p.includes(':')) {
          const num = parseFloat(notaM[1].replace(',', '.'));
          if (!isNaN(num) && num >= 0 && num <= 10) {
            notaVal = num;
          }
        }
      }

      // Check for tempo/hours: e.g. "15:30", "15h", "15h 30m"
      const tempoM = p.match(/(\d+(?::|h)\d{2}|\d+h|\d+\s*horas?)/i);
      if (tempoM && !p.toLowerCase().includes('hltb')) {
        const parsed = parseTime(tempoM[1]);
        if (parsed > 0) {
          const h = Math.floor(parsed);
          const m = Math.round((parsed - h) * 60);
          tempoVal = `${h}:${String(m).padStart(2, '0')}`;
        }
      }

      // Check for HLTB
      if (p.toLowerCase().includes('hltb')) {
        const hMatch = p.match(/hltb[:\s]*([0-9hm: ]+)/i);
        if (hMatch) hltbVal = hMatch[1].trim();
      }
    });

    const id = 'game_' + Math.random().toString(36).substring(2, 9);

    games.push({
      id,
      title,
      fileName: `${title.replace(/[\/\\?%*:|"<>]/g, '_')}.md`,
      status: isDone ? 'zerado' : 'wishlist',
      ano_zerado: isDone ? anoZeradoVal : undefined,
      data_zerado: isDone ? (dataZeradoVal || undefined) : undefined,
      console: consoleVal,
      genero,
      capa: coverUrl,
      tempo: tempoVal,
      nota: notaVal,
      hltb: hltbVal,
      priorityLabel: isPriority ? 'ALTA PRIORIDADE' : undefined,
    });
  }

  return games;
}

export function normalizeStatus(raw: string): GameItem['status'] {
  const matched = matchStatusValue(raw);
  if (matched) return matched;
  return 'wishlist';
}

export function parseMultiGameBacklog(
  backlogContent: string,
  fallbackFileName?: string,
  coversMap?: Map<string, string>
): GameItem[] {
  const covers = coversMap || new Map<string, string>();

  // Attempt 1: Parse Obsidian task-based callout backlog (- [ ] **Title** | `Console` | #Tags)
  const taskGames = parseObsidianTaskBacklog(backlogContent, covers);
  if (taskGames.length > 0) {
    return taskGames;
  }

  const results: GameItem[] = [];

  // Attempt 2: Parse Markdown Table
  const tableData = parseMarkdownTable(backlogContent);
  if (tableData && tableData.rows.length > 0) {
    const { headers, rows } = tableData;

    // Detect column indexes/names
    const titleHeader = headers.find((h) =>
      h.includes('jogo') || h.includes('game') || h.includes('titulo') || h.includes('título') || h.includes('title') || h.includes('nome') || h.includes('name')
    ) || headers[0];

    const consoleHeader = headers.find((h) =>
      h.includes('console') || h.includes('plataforma') || h.includes('platform') || h.includes('sistema') || h.includes('system')
    );

    const statusHeader = headers.find((h) =>
      h.includes('status') || h.includes('estado') || h.includes('situacao') || h.includes('situação') || h.includes('progresso')
    );

    const notaHeader = headers.find((h) =>
      h.includes('nota') || h.includes('score') || h.includes('rating') || h.includes('avaliacao') || h.includes('avaliação')
    );

    const tempoHeader = headers.find((h) =>
      h.includes('tempo') || h.includes('horas') || h.includes('time') || h.includes('duracao') || h.includes('duração') || h.includes('hours')
    );

    const anoHeader = headers.find((h) =>
      h.includes('ano') || h.includes('year') || h.includes('zerado em') || h.includes('concluido em') || h.includes('data_zerado')
    );

    const generoHeader = headers.find((h) =>
      h.includes('genero') || h.includes('gênero') || h.includes('genre') || h.includes('categoria')
    );

    const capaHeader = headers.find((h) =>
      h.includes('capa') || h.includes('cover') || h.includes('imagem') || h.includes('image') || h.includes('banner')
    );

    const notesHeader = headers.find((h) =>
      h.includes('anotacao') || h.includes('anotacoes') || h.includes('anotações') || h.includes('review') || h.includes('comentario') || h.includes('obs')
    );

    const hltbHeader = headers.find((h) => h.includes('hltb'));

    rows.forEach((row, idx) => {
      const rawTitle = row[titleHeader] || `Jogo #${idx + 1}`;
      const title = cleanTitle(rawTitle);
      if (!title || title.toLowerCase() === 'jogo' || title.toLowerCase() === 'title') return;

      const normKey = normalizeTitleKey(title);

      // Cover resolution: from table column > from coversMap > default
      let cover = '';
      if (capaHeader && row[capaHeader]) {
        const c = extractImageUrl(row[capaHeader]);
        if (c) cover = c;
      }
      if (!cover && covers.has(normKey)) {
        cover = covers.get(normKey)!;
      }
      if (!cover) {
        cover = 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg';
      }

      // Status
      const rawStatus = statusHeader ? row[statusHeader] : 'wishlist';
      const status = normalizeStatus(rawStatus);

      // Score / Nota
      let nota: number | undefined = undefined;
      if (notaHeader && row[notaHeader]) {
        const rawNota = row[notaHeader].replace(',', '.');
        const num = parseFloat(rawNota.match(/(\d+(?:\.\d+)?)/)?.[1] || '');
        if (!isNaN(num) && num >= 0 && num <= 10) {
          nota = num;
        } else if (row[notaHeader].includes('⭐')) {
          const stars = (row[notaHeader].match(/⭐/g) || []).length;
          if (stars > 0) nota = Math.min(10, stars * 2);
        }
      }

      // Time / Tempo
      let tempo = '0:00';
      if (tempoHeader && row[tempoHeader]) {
        const tStr = row[tempoHeader];
        const parsedHours = parseTime(tStr);
        if (parsedHours > 0) {
          const h = Math.floor(parsedHours);
          const m = Math.round((parsedHours - h) * 60);
          tempo = `${h}:${String(m).padStart(2, '0')}`;
        }
      }

      // Year / Ano
      let anoZerado: number | undefined = undefined;
      if (anoHeader && row[anoHeader]) {
        const yMatch = row[anoHeader].match(/\b(19\d{2}|20\d{2})\b/);
        if (yMatch) anoZerado = parseInt(yMatch[1], 10);
      }

      const consoleVal = consoleHeader ? row[consoleHeader].trim() : 'PC';
      const generoVal = generoHeader ? row[generoHeader].trim() : 'Ação';
      const anotacoesVal = notesHeader ? row[notesHeader].trim() : undefined;
      const hltbVal = hltbHeader ? row[hltbHeader].trim() : undefined;

      const id = 'game_' + Math.random().toString(36).substring(2, 9);

      results.push({
        id,
        title,
        fileName: `${title}.md`,
        status,
        ano_zerado: anoZerado,
        console: consoleVal || 'PC',
        genero: generoVal || 'Ação',
        nota,
        capa: cover,
        tempo,
        hltb: hltbVal,
        anotacoes: anotacoesVal,
      });
    });

    if (results.length > 0) return results;
  }

  // Attempt 2: Bullet points or lists with [[Title]]
  const bulletLines = backlogContent.split(/\r?\n/).filter((l) => /^[-*+]\s+/.test(l.trim()));
  if (bulletLines.length >= 2) {
    bulletLines.forEach((line) => {
      const match = line.match(/^[-*+]\s+(?:\[([ xX])\]\s+)?(?:\[\[(.*?)\]\]|([^\-\|:]+))(.*)$/);
      if (match) {
        const isChecked = Boolean(match[1] && match[1].toLowerCase() === 'x');
        const rawTitle = match[2] || match[3];
        const rest = match[4] || '';
        const title = cleanTitle(rawTitle);
        if (!title) return;

        const normKey = normalizeTitleKey(title);
        const cover = covers.get(normKey) || 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg';

        let status: GameItem['status'] = isChecked ? 'zerado' : 'fila';
        if (rest) {
          status = normalizeStatus(rest);
          if (isChecked && status === 'fila') status = 'zerado';
        }

        const id = 'game_' + Math.random().toString(36).substring(2, 9);
        results.push({
          id,
          title,
          fileName: `${title}.md`,
          status,
          ano_zerado: undefined,
          console: 'PC',
          genero: 'Ação',
          capa: cover,
          tempo: '0:00',
        });
      }
    });

    if (results.length > 0) return results;
  }

  // Fallback to single game note
  return [parseObsidianMarkdown(backlogContent, fallbackFileName)];
}

export function parseObsidianVaultFiles(files: { name: string; content: string }[]): {
  games: GameItem[];
  coverCount: number;
  matchedCovers: number;
  summary: string;
} {
  if (!files || files.length === 0) {
    return { games: [], coverCount: 0, matchedCovers: 0, summary: 'Nenhum arquivo fornecido.' };
  }

  // Step 1: Detect cover files (including .json, .js, COVER_MAP, etc.)
  const coverFiles = files.filter((f) => {
    const lowerName = f.name.toLowerCase();
    if (
      lowerName.endsWith('.json') ||
      lowerName.endsWith('.js') ||
      lowerName.includes('capa') ||
      lowerName.includes('cover') ||
      lowerName.includes('image') ||
      lowerName.includes('imagem') ||
      f.content.includes('COVER_MAP')
    ) {
      return true;
    }
    // Content heuristic: contains many image URLs and covers
    const imgUrls = f.content.match(/https?:\/\/[^\s\)\|\"'\`]+\.(?:jpe?g|png|webp|gif)/gi);
    return imgUrls && imgUrls.length >= 3;
  });

  // Extract cover mappings from cover files
  const unifiedCoversMap = new Map<string, string>();
  coverFiles.forEach((cf) => {
    const mappings = extractCoverMappings(cf.content);
    mappings.forEach((url, key) => unifiedCoversMap.set(key, url));
  });

  // Step 2: Separate game files (excluding cover files)
  const gameFiles = files.filter((f) => !coverFiles.includes(f));

  // If all files were identified as cover files, treat the first non-capas or all as games
  const targetGameFiles = gameFiles.length > 0 ? gameFiles : files;

  const rawImportedGames: GameItem[] = [];
  let matchedCovers = 0;

  targetGameFiles.forEach((file) => {
    if (isMultiGameContent(file.content)) {
      // It's a multi-game backlog file (e.g. backlog.md, table, list)
      const gamesFromTable = parseMultiGameBacklog(file.content, file.name, unifiedCoversMap);
      gamesFromTable.forEach((game) => {
        const normKey = normalizeTitleKey(game.title);
        if (unifiedCoversMap.has(normKey)) {
          matchedCovers++;
        }
        rawImportedGames.push(game);
      });
    } else {
      // It's a single game note with YAML frontmatter
      const singleGame = parseObsidianMarkdown(file.content, file.name);
      const normKey = normalizeTitleKey(singleGame.title);
      if (unifiedCoversMap.has(normKey)) {
        singleGame.capa = unifiedCoversMap.get(normKey)!;
        matchedCovers++;
      }
      rawImportedGames.push(singleGame);
    }
  });

  // Deduplicate by normalized title to prevent identical games from counting multiple times
  const uniqueGamesMap = new Map<string, GameItem>();
  rawImportedGames.forEach((game) => {
    const key = normalizeTitleKey(game.title) || game.title.toLowerCase().trim();
    if (!uniqueGamesMap.has(key)) {
      uniqueGamesMap.set(key, game);
    } else {
      // Merge properties if second entry has more details
      const existing = uniqueGamesMap.get(key)!;
      uniqueGamesMap.set(key, {
        ...existing,
        ...game,
        capa: game.capa && !game.capa.includes('co3i89.jpg') ? game.capa : existing.capa,
        tempo: game.tempo && game.tempo !== '0:00' && game.tempo !== '0h00' ? game.tempo : existing.tempo,
        sessoes: (game.sessoes && game.sessoes.length > 0) ? game.sessoes : existing.sessoes,
        nota: game.nota !== undefined ? game.nota : existing.nota,
        data_zerado: game.data_zerado || existing.data_zerado,
        ano_zerado: game.ano_zerado || existing.ano_zerado,
      });
    }
  });

  const allImportedGames = Array.from(uniqueGamesMap.values());

  const totalCovers = unifiedCoversMap.size;
  const totalGames = allImportedGames.length;

  let summary = `Importação concluída: ${totalGames} jogo(s) processado(s).`;
  if (totalCovers > 0) {
    summary += ` ${matchedCovers} de ${totalGames} jogos tiveram capas vinculadas com sucesso a partir de ${coverFiles.length} arquivo(s) de capa.`;
  }

  return {
    games: allImportedGames,
    coverCount: totalCovers,
    matchedCovers,
    summary,
  };
}

export function parseDateZerado(dateStr?: string): { year: number; month: number; day: number; formatted: string } | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  // 1. YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
    };
  }
  // 2. DD/MM/YYYY
  const brMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (brMatch) {
    const y = parseInt(brMatch[3], 10);
    const m = parseInt(brMatch[2], 10) - 1;
    const d = parseInt(brMatch[1], 10);
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
    };
  }
  // 3. Fallback
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const y = dt.getUTCFullYear();
    const m = dt.getUTCMonth();
    const d = dt.getUTCDate();
    return {
      year: y,
      month: m,
      day: d,
      formatted: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
    };
  }
  return null;
}

export function normalizeConsoleName(consoleName?: string | null): string {
  if (!consoleName) return 'Outros';
  const c = consoleName.trim();
  const lower = c.toLowerCase();

  // PC Engine / TurboGrafx-16 (verificar antes de PC / Steam)
  if (
    lower.includes('pc engine') ||
    lower.includes('pc-engine') ||
    lower === 'pcengine' ||
    lower.includes('turbografx') ||
    lower === 'tg-16' ||
    lower === 'tg16' ||
    lower.includes('turbo grafx')
  ) {
    return 'PC Engine';
  }

  // PC / Steam
  if (lower === 'pc' || lower === 'steam' || lower === 'pc / steam' || lower === 'windows') {
    return 'PC / Steam';
  }

  if (lower === 'ps1' || lower === 'psx' || lower.includes('playstation 1') || lower === 'psone') return 'PlayStation';
  if (lower === 'ps2' || lower.includes('playstation 2')) return 'PlayStation 2';
  if (lower === 'ps3' || lower.includes('playstation 3')) return 'PlayStation 3';
  if (lower === 'ps4' || lower.includes('playstation 4')) return 'PlayStation 4';
  if (lower === 'ps5' || lower.includes('playstation 5')) return 'PlayStation 5';
  if (lower.includes('switch')) return 'Nintendo Switch';
  if (lower.includes('deck')) return 'Steam Deck';
  if (lower === 'snes' || lower.includes('super nintendo')) return 'SNES';
  if (lower === 'nes' || lower.includes('nintendo entertainment')) return 'NES';
  if (lower.includes('n64') || lower.includes('nintendo 64')) return 'Nintendo 64';
  if (lower.includes('game boy advance') || lower === 'gba') return 'Game Boy Advance';
  if (lower.includes('game boy color') || lower === 'gbc') return 'Game Boy Color';
  if (lower.includes('game boy') || lower === 'gb') return 'Game Boy';
  if (lower.includes('game gear') || lower === 'gg') return 'Game Gear';
  if (lower.includes('mega drive') || lower.includes('genesis')) return 'Mega Drive';
  if (lower.includes('master system')) return 'Master System';
  if (lower.includes('saturn')) return 'Sega Saturn';
  if (lower.includes('dreamcast')) return 'Dreamcast';
  if (lower.includes('arcade') || lower.includes('cps') || lower.includes('mame') || lower.includes('fba')) return 'Arcade';
  if (lower.includes('amiga') || lower.includes('cd32')) return 'Amiga CD32';
  if (lower.includes('neo geo') || lower.includes('neogeo')) return 'Neo Geo';
  if (lower.includes('3ds')) return 'Nintendo 3DS';
  if (lower.includes('ds') && !lower.includes('3ds')) return 'Nintendo DS';
  return c;
}

export function deduplicateGames(games: GameItem[]): { dedupedGames: GameItem[] } {
  const seen = new Set<string>();
  const dedupedGames: GameItem[] = [];

  for (const game of games) {
    const key = `${cleanTitle(game.title).toLowerCase()}_${normalizeConsoleName(game.console).toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      dedupedGames.push(game);
    }
  }

  return { dedupedGames };
}

export function normalizeToISODate(dateStr?: string | null): string | undefined {
  if (!dateStr) return undefined;
  const parts = parseDateParts(dateStr);
  if (!parts) return undefined;
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month + 1).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export {
  getGameLatestActivityTs,
  getGameLatestSessionTs,
  getLastSessionTimestamp,
  getGameStartDateTs,
  sortActiveGames,
  sortByLastSession,
  parseFlexibleDate,
} from './gameActivity';

export {
  getGameEffectiveTime,
  getGameEffectiveScore,
  calculateIntervalDuration,
  checkIntervalOverlap,
  formatMinutesToHMM,
  calculateSessionTotalMinutes,
  formatDateBRToISO,
  formatISOToDateBR,
  sortSessionsDescending,
} from './gameCalculations';




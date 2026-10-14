export type GameStatus = 'jogando' | 'fila' | 'pausado' | 'wishlist' | 'zerado' | 'abandonado';

export interface GameplaySessionInterval {
  inicio: string; // HH:mm
  fim: string;    // HH:mm
  minutos: number;
}

export interface GameplayDaySession {
  data: string; // DD/MM/YYYY or DD/MM
  intervalos: GameplaySessionInterval[];
  totalMinutos: number;
}

export interface BossLadderStep {
  name: string;
  completed: boolean;
  active?: boolean;
}

export interface GameReviewRubric {
  // Jogabilidade (Peso 2x)
  controles: number;
  dificuldade: number;
  levelDesign: number;
  mecanicas: number;

  // Gráficos (Peso 1x)
  estiloVisual: number;
  animacoes: number;
  paletaCores: number;
  detalhes: number;

  // Trilha Sonora (Peso 1x)
  musicasMemoraveis: number;
  adequacao: number;
  variedade: number;
  efeitosSonoros: number;

  // Diversão (Peso 2x)
  querContinuarJogando: number;
  satisfacao: number;
  rejogabilidade: number;
  interesse: number;
}

export interface GameItem {
  id: string;
  title: string;
  fileName: string;
  status: GameStatus;
  ano_zerado?: number;
  ano_lancamento?: number;
  console: string;
  genero: string;
  nota?: number;
  capa: string;
  tempo?: string; // HH:mm or Xh
  tempoMinutos?: number;
  hltb?: string;
  hltb_real?: string;
  data_inicio?: string;
  data_zerado?: string; // YYYY-MM-DD
  
  // GOT Awards
  got_jogo?: boolean;
  got_gameplay?: boolean;
  got_narrativa?: boolean;
  got_arte?: boolean;
  got_indie?: boolean;
  got_surpresa?: boolean;
  got_retro?: boolean;
  got_dificil?: boolean;
  got_pior?: boolean;

  // Priority & Upcoming Games
  prioridade?: boolean;
  prioridadeEm?: number;

  // Favoritos (nota 11): nota anterior guardada e data em que virou favorito
  notaAnterior?: number | null;
  favoritoEm?: number | null;

  // UI & Live Session Tracker fields
  developer?: string;
  publisher?: string;
  priorityLabel?: string;
  priorityColor?: string;
  progressPercent?: number;
  currentStage?: string;
  quickActionLabel?: string;
  estimatedRemaining?: string;
  isArcadeRun?: boolean;
  bossLadder?: BossLadderStep[];
  lastUnlock?: string;
  combatStat?: string;

  // Detailed Rubric & Sessions
  rubric?: GameReviewRubric;
  sessoes?: GameplayDaySession[];
  anotacoes?: string;
  rawMarkdown?: string;

  // Import preview metadata
  statusSource?: 'frontmatter' | 'inline' | 'tag' | 'corpo' | 'arquivo' | 'manual' | 'desconhecido';
  statusUnidentified?: boolean;
  missingFields?: string[];
}

export interface LiveSessionState {
  gameId: string;
  active: boolean;
  secondsElapsed: number;
  currentTimerStartTime?: number;
  notes: string[];
}

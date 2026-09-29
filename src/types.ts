export type GameStatus = 'backlog' | 'jogando' | 'pausado' | 'zerado' | 'abandonado';

/** Uma sessão de jogo: dia + hora que começou + hora que terminou */
export interface PlaySession {
  id: string;
  data: string; // YYYY-MM-DD
  inicio: string; // HH:MM
  fim: string; // HH:MM
  minutos: number; // calculado a partir de inicio/fim
}

export interface Game {
  id: string;
  nome: string;
  console: string;
  genero: string;
  ano?: number | string;
  capa?: string;
  status: GameStatus;
  tempo: number; // em minutos
  est?: number; // estimativa em horas para zerar
  inicio?: string; // YYYY-MM-DD
  fim?: string; // YYYY-MM-DD
  nota?: number | null; // 0 a 10
  favorito?: boolean;
  notasPessoais?: string;
  dificuldade?: 'Fácil' | 'Normal' | 'Difícil' | 'Insano' | '';
  got?: Record<string, string>; // prêmios do Wrap-Up vindos do Obsidian (got_jogo, got_gameplay...)
  sessoes?: PlaySession[]; // sessões registradas (o tempo total inclui a soma delas)
}

export interface AppConfig {
  metaAnual: number;
  userName: string;
  anoSelecionado?: number;
}

export interface GameSession {
  gameId: string;
  gameName: string;
  startTime: number;
  elapsedSeconds: number;
  isRunning: boolean;
}

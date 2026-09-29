import { Game } from '../types';

export const DEFAULT_GAMES: Game[] = [
  {
    id: 'g-elden-ring',
    nome: 'Elden Ring',
    console: 'PC',
    genero: 'Soulslike',
    ano: 2022,
    status: 'zerado',
    tempo: 5880, // 98 horas
    est: 90,
    inicio: '2026-01-05',
    fim: '2026-02-14',
    nota: 10,
    favorito: true,
    notasPessoais: 'Obra-prima absoluta. Platinei no PC explorando cada catacumba e derrotando Malenia solo.',
    dificuldade: 'Difícil'
  },
  {
    id: 'g-bg3',
    nome: "Baldur's Gate 3",
    console: 'PC',
    genero: 'RPG',
    ano: 2023,
    status: 'jogando',
    tempo: 3240, // 54 horas
    est: 100,
    inicio: '2026-03-01',
    nota: null,
    favorito: true,
    notasPessoais: 'Campanha no Ato 2 com Paladino da Devoção. Narrativa impecável.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-zelda-totk',
    nome: 'The Legend of Zelda: Tears of the Kingdom',
    console: 'Nintendo Switch',
    genero: 'Aventura',
    ano: 2023,
    status: 'zerado',
    tempo: 4620, // 77 horas
    est: 80,
    inicio: '2025-10-10',
    fim: '2025-12-05',
    nota: 9.8,
    favorito: true,
    notasPessoais: 'Mecânicas de Ultrahand e fusão de itens revolucionaram a exploração em Hyrule.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-hollow-knight',
    nome: 'Hollow Knight',
    console: 'Steam Deck',
    genero: 'Metroidvania',
    ano: 2017,
    status: 'zerado',
    tempo: 2280, // 38 horas
    est: 35,
    inicio: '2026-02-18',
    fim: '2026-03-12',
    nota: 9.5,
    favorito: true,
    notasPessoais: 'Trilha sonora marcante e chefes com excelente precisão de combate.',
    dificuldade: 'Difícil'
  },
  {
    id: 'g-cyberpunk',
    nome: 'Cyberpunk 2077: Phantom Liberty',
    console: 'PlayStation 5',
    genero: 'RPG de Ação',
    ano: 2023,
    status: 'jogando',
    tempo: 1920, // 32 horas
    est: 60,
    inicio: '2026-03-15',
    nota: null,
    favorito: false,
    notasPessoais: 'Dogtown está incrível. Visual e iluminação no PS5 em modo Qualidade são de ponta.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-re4-remake',
    nome: 'Resident Evil 4 Remake',
    console: 'PlayStation 5',
    genero: 'Terror / Ação',
    ano: 2023,
    status: 'zerado',
    tempo: 1020, // 17 horas
    est: 18,
    inicio: '2026-01-10',
    fim: '2026-01-26',
    nota: 9.2,
    favorito: false,
    notasPessoais: 'Remake primoroso, parry com faca deixou o combate muito mais dinâmico.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-hades-2',
    nome: 'Hades II',
    console: 'PC',
    genero: 'Roguelike',
    ano: 2024,
    status: 'jogando',
    tempo: 1260, // 21 horas
    est: 45,
    inicio: '2026-03-10',
    nota: null,
    favorito: true,
    notasPessoais: 'Melinoë tem magia e jogabilidade sensacional. Supergiant acertou novamente.',
    dificuldade: 'Difícil'
  },
  {
    id: 'g-chrono-trigger',
    nome: 'Chrono Trigger',
    console: 'Retro / SNES',
    genero: 'JRPG',
    ano: 1995,
    status: 'backlog',
    tempo: 0,
    est: 25,
    nota: null,
    favorito: true,
    notasPessoais: 'Planejado para jogar no emulador portátil no fim de semana.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-metaphor',
    nome: 'Metaphor: ReFantazio',
    console: 'PC',
    genero: 'JRPG',
    ano: 2024,
    status: 'backlog',
    tempo: 0,
    est: 75,
    nota: null,
    favorito: false,
    notasPessoais: 'Dos mesmos criadores de Persona 3, 4 e 5. Muito recomendado.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-ff7-rebirth',
    nome: 'Final Fantasy VII Rebirth',
    console: 'PlayStation 5',
    genero: 'RPG de Ação',
    ano: 2024,
    status: 'backlog',
    tempo: 0,
    est: 85,
    nota: null,
    favorito: false,
    notasPessoais: 'Sequência direta de Remake.',
    dificuldade: 'Normal'
  },
  {
    id: 'g-celeste',
    nome: 'Celeste',
    console: 'Nintendo Switch',
    genero: 'Plataforma',
    ano: 2018,
    status: 'zerado',
    tempo: 780, // 13 horas
    est: 12,
    inicio: '2025-08-05',
    fim: '2025-08-18',
    nota: 9.7,
    favorito: true,
    notasPessoais: 'Trilha sonora de Lena Raine e mensagem profunda sobre ansiedade.',
    dificuldade: 'Difícil'
  },
  {
    id: 'g-astro-bot',
    nome: 'Astro Bot',
    console: 'PlayStation 5',
    genero: 'Plataforma 3D',
    ano: 2024,
    status: 'zerado',
    tempo: 840, // 14 horas
    est: 15,
    inicio: '2026-02-01',
    fim: '2026-02-08',
    nota: 9.6,
    favorito: true,
    notasPessoais: 'Puro carisma e uso espetacular de todos os recursos do DualSense.',
    dificuldade: 'Fácil'
  }
];

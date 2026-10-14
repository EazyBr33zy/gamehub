import { describe, it, expect } from 'vitest';
import {
  parseToMinutes,
  parseTime,
  formatMinutes,
  normalizeTitleKey,
  parseDateParts,
  normalizeToISODate,
  getUniqueZerados,
  parseObsidianMarkdown,
  generateObsidianMarkdown,
  parseMultiGameBacklog,
  extractCoverMappings,
  getGameLatestActivityTs,
  sortActiveGames,
  parseFlexibleDate,
  parseObsidianVaultFiles,
  normalizeConsoleName,
} from './markdownParser';
import { GameItem } from '../types/game';

const SAMPLE_PLAYING_MD = `---
tempo: 13:15
ano_zerado: 2026
console: Steam Deck
genero: Rpg
nota:
status: jogando
capa: https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg
hltb: 15:10
hltb_real:
data_inicio: 2026-07-18
data_zerado:
got_jogo:
got_gameplay:
got_narrativa:
got_arte:
got_indie:
got_surpresa:
got_retro:
got_dificil:
got_pior:
---
![capa|300](https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co3i89.jpg)
## 📊 Ficha Técnica

| 🎯 Campo       | 📝 Valor  |
| -------------- | --------- |
| **Nota**       | ⭐⭐⭐⭐⭐ /10 |
| **Ano Zerado** | 2026      |

---

## 📅 Registos de Gameplay
18/07/2026
     14:09 até 14:33
     15:12 até 15:50
     16:10 até 17:04
     17:20 até 17:45
     22:15 até 22:50
20/07/2026
     22:10 até 23:21

----
## 🕹️ JOGABILIDADE (0-10) - PESO 2x
**Controles**:: 10
**Dificuldade**:: 9
**Level design**:: 9
**Mecânicas**:: 9

## 🎨 GRÁFICOS (0-10) - PESO 1x
**Estilo visual**:: 10
**Animações**:: 10
**Paleta de cores**:: 10
**Detalhes**:: 10

## 🎵 TRILHA SONORA (0-10) - PESO 1x
**Músicas memoráveis**:: 8
**Adequação**:: 9
**Variedade**:: 8
**Efeitos sonoros**:: 9

## ⭐ DIVERSÃO (0-10) - PESO 2x
**Você quer continuar jogando**:: 9
**Satisfação**:: 9
**Rejogabilidade**:: 8
**Interesse**:: 9
`;

const SAMPLE_BEATEN_MD = `---
tempo: 0:55
ano_zerado: 2023
console: Arcade
genero: Shmup
nota: 7
status: zerado
capa: https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2kqq.jpg
data_zerado: 2023-02-03
---

## 📊 Ficha Técnica

| 🎯 Campo       | 📝 Valor   |
| -------------- | ---------- |
| **Nota**       | ⭐⭐⭐⭐⭐ 7/10 |
| **Ano Zerado** | 2023       |

## 📅 Registos de Gameplay
03/02/2023
     22:00 até 22:55
`;

const SAMPLE_TASK_BACKLOG_MD = `
> [!abstract]- 🕹️ Arcade
> - [x] **DoDonPachi** | Arcade | #shmup | 03/02/2023 | 0:55 | ⭐⭐⭐⭐ | hltb: 1h
> - [ ] **Metal Slug** | Neo Geo | #arcade #acao | 1:15
`;

const SAMPLE_COVERS_JSON = JSON.stringify({
  "DoDonPachi": "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2kqq.jpg",
  "Metal Slug": "https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1x77.jpg",
});

describe('Markdown Parser & Time Utilities', () => {
  describe('parseToMinutes and formatMinutes', () => {
    it('parses "0:45" to 45 minutes and formats correctly', () => {
      const mins = parseToMinutes('0:45');
      expect(mins).toBe(45);
      expect(formatMinutes(mins, 'colon')).toBe('0:45');
      expect(formatMinutes(mins, 'hm')).toBe('0h45');
    });

    it('correctly handles "1:60" as 120 minutes (2h00)', () => {
      const mins = parseToMinutes('1:60');
      expect(mins).toBe(120);
      expect(formatMinutes(mins, 'colon')).toBe('2:00');
      expect(formatMinutes(mins, 'hm')).toBe('2h00');
    });

    it('parses "10h" to 600 minutes and formats as 10h00', () => {
      const mins = parseToMinutes('10h');
      expect(mins).toBe(600);
      expect(parseTime('10h')).toBe(10);
      expect(formatMinutes(mins, 'hm')).toBe('10h00');
    });

    it('parses "2h30" to 150 minutes (2.5h)', () => {
      const mins = parseToMinutes('2h30');
      expect(mins).toBe(150);
      expect(parseTime('2h30')).toBe(2.5);
      expect(formatMinutes(mins, 'colon')).toBe('2:30');
      expect(formatMinutes(mins, 'hm')).toBe('2h30');
    });

    it('verifies "0:45" continues "0:45" throughout parsing and exporting', () => {
      const mins = parseToMinutes('0:45');
      expect(mins).toBe(45);
      const colon = formatMinutes(mins, 'colon');
      expect(colon).toBe('0:45');

      const mockGame: GameItem = {
        id: 'test_game',
        title: 'Short Game',
        fileName: 'Short Game.md',
        status: 'jogando',
        console: 'GBA',
        genero: 'Ação',
        capa: '',
        tempo: '0:45',
        tempoMinutos: mins,
      };

      const markdown = generateObsidianMarkdown(mockGame);
      expect(markdown).toContain('tempo: 0:45');

      const reimported = parseObsidianMarkdown(markdown, 'Short Game.md');
      expect(reimported.tempo).toBe('0:45');
      expect(reimported.tempoMinutos).toBe(45);
    });
  });

  describe('normalizeTitleKey', () => {
    it('cleans markdown symbols, emojis, and normalizes accents, platforms and case', () => {
      expect(normalizeTitleKey('🎮 Super Mario World.md')).toBe('super mario world');
      expect(normalizeTitleKey('The Legend of Zelda: Ocarina of Time (PT-BR)')).toBe('the legend of zelda ocarina of time');
      expect(normalizeTitleKey('Chrono Trigger [SNES]')).toBe('chrono trigger');
    });
  });

  describe('parseDateParts & normalizeToISODate', () => {
    it('parses ISO format YYYY-MM-DD', () => {
      const parts = parseDateParts('2026-10-02');
      expect(parts).toEqual({ year: 2026, month: 9, day: 2 }); // month is 0-indexed
      expect(normalizeToISODate('2026-10-02')).toBe('2026-10-02');
    });

    it('parses Brazilian DD/MM/YYYY format and converts to ISO', () => {
      const parts = parseDateParts('15/08/2024');
      expect(parts).toEqual({ year: 2024, month: 7, day: 15 });
      expect(normalizeToISODate('15/08/2024')).toBe('2024-08-15');
    });
  });

  describe('getUniqueZerados', () => {
    it('deduplicates beaten games by canonical title', () => {
      const sampleGames: GameItem[] = [
        {
          id: '1',
          title: 'Super Mario World',
          fileName: 'Super Mario World.md',
          status: 'zerado',
          ano_zerado: 2026,
          console: 'SNES',
          genero: 'Plataforma',
          capa: '',
          nota: 9.0,
        },
        {
          id: '2',
          title: 'Super Mario World (PT-BR)',
          fileName: 'Super Mario World (PT-BR).md',
          status: 'zerado',
          ano_zerado: 2026,
          console: 'SNES',
          genero: 'Plataforma',
          capa: 'https://example.com/mario.jpg',
          nota: 9.5,
        },
        {
          id: '3',
          title: 'Chrono Trigger',
          fileName: 'Chrono Trigger.md',
          status: 'jogando',
          console: 'SNES',
          genero: 'RPG',
          capa: '',
        },
      ];

      const zerados = getUniqueZerados(sampleGames, 2026);
      expect(zerados.length).toBe(1);
      expect(zerados[0].title).toBe('Super Mario World (PT-BR)');
      expect(zerados[0].nota).toBe(9.5);
    });
  });

  describe('Roundtrip Fidelity: import -> export -> import', () => {
    it('roundtrips SAMPLE_PLAYING_MD preserving all properties, rubric and sessions', () => {
      // Step 1: Import initial markdown
      const game1 = parseObsidianMarkdown(SAMPLE_PLAYING_MD, 'Chained Echoes.md');
      expect(game1.title).toBe('Chained Echoes');
      expect(game1.status).toBe('jogando');
      expect(game1.console).toBe('Steam Deck');
      expect(game1.genero).toBe('Rpg');
      expect(game1.tempo).toBe('13:15');
      expect(game1.tempoMinutos).toBe(13 * 60 + 15);
      expect(game1.ano_zerado).toBe(2026);
      expect(game1.data_inicio).toBe('2026-07-18');
      expect(game1.sessoes?.length).toBe(2);
      expect(game1.rubric).toBeDefined();
      expect(game1.rubric?.controles).toBe(10);
      expect(game1.rubric?.dificuldade).toBe(9);
      expect(game1.nota).toBe(9);

      // Step 2: Export to markdown
      const exportedMd = generateObsidianMarkdown(game1);
      expect(exportedMd).toContain('tempo: 13:15');
      expect(exportedMd).toContain('console: Steam Deck');
      expect(exportedMd).toContain('status: jogando');
      expect(exportedMd).toContain('**Controles**:: 10');

      // Step 3: Re-import exported markdown
      const game2 = parseObsidianMarkdown(exportedMd, 'Chained Echoes.md');
      expect(game2.title).toBe(game1.title);
      expect(game2.status).toBe(game1.status);
      expect(game2.console).toBe(game1.console);
      expect(game2.genero).toBe(game1.genero);
      expect(game2.tempo).toBe(game1.tempo);
      expect(game2.tempoMinutos).toBe(game1.tempoMinutos);
      expect(game2.ano_zerado).toBe(game1.ano_zerado);
      expect(game2.data_inicio).toBe(game1.data_inicio);
      expect(game2.nota).toBe(game1.nota);
      expect(game2.rubric).toEqual(game1.rubric);
      expect(game2.sessoes?.length).toBe(game1.sessoes?.length);
    });

    it('roundtrips SAMPLE_BEATEN_MD preserving beaten status, date and rating without rubric', () => {
      const game1 = parseObsidianMarkdown(SAMPLE_BEATEN_MD, 'DoDonPachi.md');
      expect(game1.title).toBe('DoDonPachi');
      expect(game1.status).toBe('zerado');
      expect(game1.console).toBe('Arcade');
      expect(game1.genero).toBe('Shmup');
      expect(game1.tempo).toBe('0:55');
      expect(game1.tempoMinutos).toBe(55);
      expect(game1.ano_zerado).toBe(2023);
      expect(game1.data_zerado).toBe('2023-02-03');
      expect(game1.nota).toBe(7);
      expect(game1.rubric).toBeUndefined();

      const exportedMd = generateObsidianMarkdown(game1);
      expect(exportedMd).toContain('tempo: 0:55');
      expect(exportedMd).toContain('status: zerado');
      expect(exportedMd).toContain('nota: 7');
      expect(exportedMd).toContain('data_zerado: 2023-02-03');

      const game2 = parseObsidianMarkdown(exportedMd, 'DoDonPachi.md');
      expect(game2.title).toBe(game1.title);
      expect(game2.status).toBe('zerado');
      expect(game2.tempo).toBe('0:55');
      expect(game2.tempoMinutos).toBe(55);
      expect(game2.ano_zerado).toBe(2023);
      expect(game2.data_zerado).toBe('2023-02-03');
      expect(game2.nota).toBe(7);
      expect(game2.rubric).toBeUndefined();
    });
  });

  describe('Dual Import: backlog.md + capas.json cross-referencing', () => {
    it('correctly parses backlog tasks with callout platforms and matches covers by game name', () => {
      const coversMap = extractCoverMappings(SAMPLE_COVERS_JSON);
      expect(coversMap.size).toBeGreaterThan(0);
      expect(coversMap.get('dodonpachi')).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2kqq.jpg');

      const games = parseMultiGameBacklog(SAMPLE_TASK_BACKLOG_MD, 'backlog.md', coversMap);
      expect(games.length).toBe(2);

      const ddp = games.find((g) => g.title === 'DoDonPachi');
      expect(ddp).toBeDefined();
      expect(ddp?.status).toBe('zerado');
      expect(ddp?.console).toBe('Arcade');
      expect(ddp?.genero).toBe('Shmup');
      expect(ddp?.capa).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co2kqq.jpg');
      expect(ddp?.tempo).toBe('0:55');
      expect(ddp?.nota).toBe(8); // ⭐⭐⭐⭐ = 8/10

      const ms = games.find((g) => g.title === 'Metal Slug');
      expect(ms).toBeDefined();
      expect(ms?.status).toBe('wishlist');
      expect(ms?.console).toBe('Neo Geo');
      expect(ms?.capa).toBe('https://images.igdb.com/igdb/image/upload/t_cover_big_2x/co1x77.jpg');
      expect(ms?.tempo).toBe('1:15');
    });
  });

  describe('Old JSON Backup format compatibility', () => {
    it('correctly restores an old backup JSON without tempoMinutos, preserving original tempo and calculating tempoMinutos', () => {
      const oldBackupJson = JSON.stringify({
        version: '1.0',
        exportedAt: '2024-01-15T00:00:00.000Z',
        games: [
          {
            id: 'old_game_1',
            title: 'Chrono Trigger',
            console: 'SNES',
            genero: 'RPG',
            status: 'jogando',
            tempo: '0:45',
            nota: 10,
            capa: 'https://example.com/chrono.jpg',
          },
          {
            id: 'old_game_2',
            title: 'Super Metroid',
            console: 'SNES',
            genero: 'Metroidvania',
            status: 'zerado',
            tempo: '1h30',
            ano_zerado: 2024,
            data_zerado: '10/05/2024',
          },
        ],
      });

      const parsed = JSON.parse(oldBackupJson);
      const incomingGames: any[] = parsed.games;

      const restoredGames: GameItem[] = incomingGames.map((g) => {
        const mins = typeof g.tempoMinutos === 'number' ? g.tempoMinutos : parseToMinutes(g.tempo);
        return {
          ...g,
          tempo: g.tempo !== undefined && g.tempo !== '' ? String(g.tempo) : formatMinutes(mins, 'colon'),
          tempoMinutos: mins,
          data_zerado: g.data_zerado ? (normalizeToISODate(g.data_zerado) || g.data_zerado) : undefined,
        };
      });

      expect(restoredGames.length).toBe(2);

      // Game 1: "0:45"
      expect(restoredGames[0].tempo).toBe('0:45');
      expect(restoredGames[0].tempoMinutos).toBe(45);
      expect(restoredGames[0].title).toBe('Chrono Trigger');

      // Game 2: "1h30" -> parsed to 90 minutes
      expect(restoredGames[1].tempo).toBe('1h30');
      expect(restoredGames[1].tempoMinutos).toBe(90);
      expect(restoredGames[1].data_zerado).toBe('2024-05-10'); // converted to ISO from DD/MM/YYYY
    });
  });

  describe('Game Activity and Sorting (Jogando Agora)', () => {
    it('parses dates in DD/MM/YYYY, DD/MM, and YYYY-MM-DD formats', () => {
      const currentYear = new Date().getFullYear();

      expect(parseFlexibleDate('05/10/2026')).toEqual({ year: 2026, month: 9, day: 5 });
      expect(parseFlexibleDate('2026-10-05')).toEqual({ year: 2026, month: 9, day: 5 });
      expect(parseFlexibleDate('05/10')).toEqual({ year: currentYear, month: 9, day: 5 });
      expect(parseFlexibleDate('28-02-2025')).toEqual({ year: 2025, month: 1, day: 28 });
    });

    it('orders active games by most recent session date and end of last interval', () => {
      const gameA: GameItem = {
        id: 'a',
        title: 'Game A - Older Session',
        fileName: 'Game A.md',
        status: 'jogando',
        console: 'PS5',
        genero: 'Action',
        capa: '',
        sessoes: [
          {
            data: '01/10/2026',
            totalMinutos: 60,
            intervalos: [{ inicio: '10:00', fim: '11:00', minutos: 60 }],
          },
        ],
      };

      const gameB: GameItem = {
        id: 'b',
        title: 'Game B - Newer Session Later Time',
        fileName: 'Game B.md',
        status: 'jogando',
        console: 'Steam Deck',
        genero: 'RPG',
        capa: '',
        sessoes: [
          {
            data: '05/10/2026',
            totalMinutos: 90,
            intervalos: [
              { inicio: '14:00', fim: '15:00', minutos: 60 },
              { inicio: '19:00', fim: '20:30', minutos: 30 },
            ],
          },
        ],
      };

      const sorted = sortActiveGames([gameA, gameB]);
      expect(sorted[0].id).toBe('b');
      expect(sorted[1].id).toBe('a');
    });

    it('places games without sessions after, ordered by data_inicio (most recent first) and title', () => {
      const gameWithSession: GameItem = {
        id: 'with_sess',
        title: 'Active With Session',
        fileName: 'Active.md',
        status: 'jogando',
        console: 'Switch',
        genero: 'Platformer',
        capa: '',
        sessoes: [
          {
            data: '10/09/2026',
            totalMinutos: 30,
            intervalos: [{ inicio: '09:00', fim: '09:30', minutos: 30 }],
          },
        ],
      };

      const gameNoSessionRecent: GameItem = {
        id: 'no_sess_recent',
        title: 'Zelda No Session Recent',
        fileName: 'Zelda.md',
        status: 'jogando',
        console: 'Switch',
        genero: 'Adventure',
        capa: '',
        data_inicio: '2026-10-01',
      };

      const gameNoSessionOld: GameItem = {
        id: 'no_sess_old',
        title: 'Ape Escape No Session Old',
        fileName: 'Ape Escape.md',
        status: 'jogando',
        console: 'PS1',
        genero: 'Platformer',
        capa: '',
        data_inicio: '2026-05-01',
      };

      const gameNoSessionNoDateA: GameItem = {
        id: 'no_date_a',
        title: 'Alpha Game',
        fileName: 'Alpha.md',
        status: 'jogando',
        console: 'PC',
        genero: 'Action',
        capa: '',
      };

      const gameNoSessionNoDateB: GameItem = {
        id: 'no_date_b',
        title: 'Beta Game',
        fileName: 'Beta.md',
        status: 'jogando',
        console: 'PC',
        genero: 'Action',
        capa: '',
      };

      const sorted = sortActiveGames([
        gameNoSessionNoDateB,
        gameNoSessionOld,
        gameWithSession,
        gameNoSessionNoDateA,
        gameNoSessionRecent,
      ]);

      expect(sorted[0].id).toBe('with_sess');
      expect(sorted[1].id).toBe('no_sess_recent');
      expect(sorted[2].id).toBe('no_sess_old');
      expect(sorted[3].id).toBe('no_date_a'); // alphabetical tie-breaker
      expect(sorted[4].id).toBe('no_date_b');
    });
  });

  describe('Robust Status Detection & Jogando Variations', () => {
    it('detects status from frontmatter in various formats', () => {
      // 1. lowercase standard
      const md1 = '---\nstatus: jogando\nconsole: PC\n---\n# Game';
      const r1 = parseObsidianMarkdown(md1, 'Game1.md');
      expect(r1.status).toBe('jogando');
      expect(r1.statusSource).toBe('frontmatter');
      expect(r1.statusUnidentified).toBe(false);

      // 2. uppercase
      const md2 = '---\nstatus: JOGANDO\nconsole: PC\n---\n# Game';
      const r2 = parseObsidianMarkdown(md2, 'Game2.md');
      expect(r2.status).toBe('jogando');
      expect(r2.statusSource).toBe('frontmatter');

      // 3. emoji
      const md3 = '---\nstatus: 🎮 Jogando\nconsole: PC\n---\n# Game';
      const r3 = parseObsidianMarkdown(md3, 'Game3.md');
      expect(r3.status).toBe('jogando');
      expect(r3.statusSource).toBe('frontmatter');

      // 4. "em andamento"
      const md4 = '---\nstatus: em andamento\nconsole: PC\n---\n# Game';
      const r4 = parseObsidianMarkdown(md4, 'Game4.md');
      expect(r4.status).toBe('jogando');
      expect(r4.statusSource).toBe('frontmatter');

      // 5. "playing"
      const md5 = '---\nstatus: playing\nconsole: PC\n---\n# Game';
      const r5 = parseObsidianMarkdown(md5, 'Game5.md');
      expect(r5.status).toBe('jogando');
      expect(r5.statusSource).toBe('frontmatter');

      // 6. YAML array [jogando]
      const md6 = '---\nstatus: [jogando]\nconsole: PC\n---\n# Game';
      const r6 = parseObsidianMarkdown(md6, 'Game6.md');
      expect(r6.status).toBe('jogando');
      expect(r6.statusSource).toBe('frontmatter');

      // 7. YAML list
      const md7 = '---\nstatus:\n  - jogando\nconsole: PC\n---\n# Game';
      const r7 = parseObsidianMarkdown(md7, 'Game7.md');
      expect(r7.status).toBe('jogando');
      expect(r7.statusSource).toBe('frontmatter');
    });

    it('detects status from Dataview inline fields', () => {
      // standard inline
      const md1 = '# Chrono Trigger\nconsole:: SNES\nstatus:: jogando\n';
      const r1 = parseObsidianMarkdown(md1, 'Chrono Trigger.md');
      expect(r1.status).toBe('jogando');
      expect(r1.statusSource).toBe('inline');

      // inline with emoji and bold
      const md2 = '# Hollow Knight\n**Status**:: 🎮 Jogando\n';
      const r2 = parseObsidianMarkdown(md2, 'Hollow Knight.md');
      expect(r2.status).toBe('jogando');
      expect(r2.statusSource).toBe('inline');

      // inline with wikilink
      const md3 = '# Hades\nstatus:: [[Jogando]]\n';
      const r3 = parseObsidianMarkdown(md3, 'Hades.md');
      expect(r3.status).toBe('jogando');
      expect(r3.statusSource).toBe('inline');
    });

    it('detects status from tags (frontmatter & hashtags)', () => {
      // tags in frontmatter array
      const md1 = '---\ntags: [jogando, rpg]\nconsole: PC\n---\n# Final Fantasy';
      const r1 = parseObsidianMarkdown(md1, 'FF.md');
      expect(r1.status).toBe('jogando');
      expect(r1.statusSource).toBe('tag');

      // hashtag #status/jogando
      const md2 = '# Metroid Dread\n#status/jogando\nConsole: Switch';
      const r2 = parseObsidianMarkdown(md2, 'Metroid.md');
      expect(r2.status).toBe('jogando');
      expect(r2.statusSource).toBe('tag');

      // hashtag #em-andamento
      const md3 = '# Celeste\n#em-andamento';
      const r3 = parseObsidianMarkdown(md3, 'Celeste.md');
      expect(r3.status).toBe('jogando');
      expect(r3.statusSource).toBe('tag');
    });

    it('detects status from body text lines', () => {
      const md = '# Bloodborne\nConsole: PS4\nStatus: 🎮 Jogando\n';
      const r = parseObsidianMarkdown(md, 'Bloodborne.md');
      expect(r.status).toBe('jogando');
      expect(r.statusSource).toBe('corpo');
    });

    it('detects status from folder and file name', () => {
      // folder
      const md1 = '# Super Mario\n';
      const r1 = parseObsidianMarkdown(md1, 'Jogando/Super Mario.md');
      expect(r1.status).toBe('jogando');
      expect(r1.statusSource).toBe('arquivo');

      // bracket in filename
      const r2 = parseObsidianMarkdown(md1, 'Super Mario [Jogando].md');
      expect(r2.status).toBe('jogando');
      expect(r2.statusSource).toBe('arquivo');
    });

    it('enforces priority: frontmatter > inline > tag > corpo > arquivo', () => {
      // Frontmatter (jogando) vs Inline (zerado)
      const md1 = '---\nstatus: jogando\n---\nstatus:: zerado\n# Game';
      const r1 = parseObsidianMarkdown(md1);
      expect(r1.status).toBe('jogando');
      expect(r1.statusSource).toBe('frontmatter');

      // Inline (jogando) vs Tag (#zerado)
      const md2 = '# Game\nstatus:: jogando\n#zerado';
      const r2 = parseObsidianMarkdown(md2);
      expect(r2.status).toBe('jogando');
      expect(r2.statusSource).toBe('inline');

      // Tag (#jogando) vs Body text (Status: Zerado)
      const md3 = '# Game\n#jogando\nStatus: Zerado';
      const r3 = parseObsidianMarkdown(md3);
      expect(r3.status).toBe('jogando');
      expect(r3.statusSource).toBe('tag');

      // Body (Status: Jogando) vs Folder (Zerado/Game.md)
      const md4 = '# Game\nStatus: Jogando';
      const r4 = parseObsidianMarkdown(md4, 'Zerado/Game.md');
      expect(r4.status).toBe('jogando');
      expect(r4.statusSource).toBe('corpo');
    });

    it('marks as unidentified when no status is detected', () => {
      const md = '# Mystery Game\nConsole: PC\nTempo: 05:00\nSem status nenhum aqui.';
      const r = parseObsidianMarkdown(md, 'Mystery.md');
      expect(r.status).toBe('fila');
      expect(r.statusSource).toBe('desconhecido');
      expect(r.statusUnidentified).toBe(true);
      expect(r.missingFields).toContain('Status');
    });

    it('correctly reads legacy files with tempo "0:45" and dates DD/MM/YYYY', () => {
      const legacyMd = `---
tempo: 0:45
ano_zerado: 2026
console: Neo Geo
genero: Fighting
nota: 8
status: zerado
data_zerado: 2026-05-10
---
## 📅 Registos de Gameplay
10/05/2026
  14:00 até 14:45
`;
      const r = parseObsidianMarkdown(legacyMd, 'Fatal Fury.md');
      expect(r.tempo).toBe('0:45');
      expect(r.tempoMinutos).toBe(45);
      expect(r.status).toBe('zerado');
      expect(r.sessoes?.length).toBe(1);
      expect(r.sessoes?.[0].data).toBe('10/05/2026');
      expect(r.sessoes?.[0].totalMinutos).toBe(45);
    });

    it('parses single game note in parseObsidianVaultFiles without being misidentified as multi-game backlog', () => {
      const singleGameFile = {
        name: 'Chrono Trigger.md',
        content: SAMPLE_PLAYING_MD,
      };

      const result = parseObsidianVaultFiles([singleGameFile]);
      expect(result.games.length).toBe(1);
      const game = result.games[0];
      expect(game.title).toBe('Chrono Trigger');
      expect(game.status).toBe('jogando');
      expect(game.statusSource).toBe('frontmatter');
      expect(game.console).toBe('Steam Deck');
      expect(game.tempo).toBe('13:15');
      expect(game.sessoes?.length).toBe(2);
    });

    it('correctly recognizes status "abandonado" and its variations (abandonado, abandoned, dropado, dropped)', () => {
      const variations = [
        'status: abandonado',
        'status: ABANDONADO',
        'status: abandoned',
        'status: dropado',
        'status: dropped',
        'status:: 🛑 Abandonado',
        '#status/dropado',
      ];

      variations.forEach((statusLine) => {
        const md = `---\ntitle: Test Game\nconsole: PS5\n${statusLine.startsWith('status:') ? statusLine : ''}\n---\n${!statusLine.startsWith('status:') ? statusLine : ''}`;
        const parsed = parseObsidianMarkdown(md, 'Test Game.md');
        expect(parsed.status).toBe('abandonado');
      });
    });

    it('exports game with status "abandonado" accurately in generateObsidianMarkdown', () => {
      const game: GameItem = {
        id: 'ab_1',
        title: 'Dropped Game',
        fileName: 'Dropped Game.md',
        console: 'Nintendo Switch',
        genero: 'RPG',
        status: 'abandonado',
        capa: 'https://images.igdb.com/igdb/image/upload/t_cover_big_2x/test.jpg',
      };

      const md = generateObsidianMarkdown(game);
      expect(md).toContain('status: abandonado');
    });

    it('handles legacy JSON backup without abandonado or prioridade fields gracefully', () => {
      const legacyJsonGame = {
        id: 'leg_1',
        title: 'Legacy Title',
        console: 'PC',
        genero: 'Aventura',
        status: 'fila',
        tempo: '2h',
      };

      const parsedGame: GameItem = {
        id: legacyJsonGame.id,
        title: legacyJsonGame.title,
        fileName: `${legacyJsonGame.title}.md`,
        status: legacyJsonGame.status as any,
        console: legacyJsonGame.console,
        genero: legacyJsonGame.genero,
        capa: '',
      };

      expect(parsedGame.status).toBe('fila');
      expect(parsedGame.prioridade).toBeUndefined();
    });
  });

  describe('normalizeConsoleName', () => {
    it('normalizes PC Engine variations to canonical "PC Engine" without confusing with PC / Steam', () => {
      expect(normalizeConsoleName('Pc Engine')).toBe('PC Engine');
      expect(normalizeConsoleName('PC Engine')).toBe('PC Engine');
      expect(normalizeConsoleName('pc engine')).toBe('PC Engine');
      expect(normalizeConsoleName('pc-engine')).toBe('PC Engine');
      expect(normalizeConsoleName('PC-Engine CD')).toBe('PC Engine');
      expect(normalizeConsoleName('Turbografx-16')).toBe('PC Engine');
      expect(normalizeConsoleName('tg-16')).toBe('PC Engine');

      // PC / Steam should remain distinct
      expect(normalizeConsoleName('PC')).toBe('PC / Steam');
      expect(normalizeConsoleName('Steam')).toBe('PC / Steam');
      expect(normalizeConsoleName('PC / Steam')).toBe('PC / Steam');
    });
  });
});

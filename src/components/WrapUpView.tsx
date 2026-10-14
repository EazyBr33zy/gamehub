import React, { useState, useMemo, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { useHashRoute } from '../hooks/useHashRoute';
import { parseTime, parseDateParts, formatDateBR } from '../utils/markdownParser';
import { getGameEffectiveTime, getGameEffectiveScore } from '../utils/gameCalculations';
import { GameItem } from '../types/game';
import { WrapUpHero } from './wrapup/WrapUpHero';
import { WrapUpResumoTab } from './wrapup/WrapUpResumoTab';
import { WrapUpAnaliseTab } from './wrapup/WrapUpAnaliseTab';
import { WrapUpStatusTab } from './wrapup/WrapUpStatusTab';
import { WrapUpTopTab } from './wrapup/WrapUpTopTab';
import { WrapUpTimelineTab } from './wrapup/WrapUpTimelineTab';

export const WrapUpView: React.FC = () => {
  const { 
    games, 
    wrapUpSelectedYear, 
    setWrapUpSelectedYear, 
    availableYears 
  } = useGame();

  const { route, navigate } = useHashRoute();

  const [activeTab, setActiveTabLocal] = useState<'resumo' | 'analise' | 'status' | 'top' | 'timeline'>('resumo');
  const [openPlatforms, setOpenPlatforms] = useState<Record<string, boolean>>({});
  const [openGenres, setOpenGenres] = useState<Record<string, boolean>>({});
  const [openPlatformsStatus, setOpenPlatformsStatus] = useState<Record<string, boolean>>({});
  const [openGenresStatus, setOpenGenresStatus] = useState<Record<string, boolean>>({});
  const CURRENT_OCTOBER_MONTH = 9; // Outubro (0-indexado: 9 = Outubro)
  const [activeMonthIndex, setActiveMonthIndex] = useState<number>(CURRENT_OCTOBER_MONTH);
  const [timelineMonthFilter, setTimelineMonthFilter] = useState<'ALL' | number>('ALL');

  // Year from route (#/wrapup/:ano) or context
  const ANO = useMemo(() => {
    if (route.params.ano) {
      const parsed = parseInt(route.params.ano, 10);
      if (!isNaN(parsed) && availableYears.includes(parsed)) {
        return parsed;
      }
    }
    return wrapUpSelectedYear;
  }, [route.params.ano, wrapUpSelectedYear, availableYears]);

  useEffect(() => {
    document.title = `Wrap-Up ${ANO} · GameHub`;
  }, [ANO]);

  // Synchronize route if wrapUpSelectedYear changes
  const handleYearChange = (delta: number) => {
    const curIdx = availableYears.indexOf(ANO);
    const nextIdx = curIdx + delta;
    if (nextIdx >= 0 && nextIdx < availableYears.length) {
      const nextYear = availableYears[nextIdx];
      setWrapUpSelectedYear(nextYear);
      navigate(`#/wrapup/${nextYear}`);
    }
  };

  const handleGameClick = (id: string) => {
    navigate(`#/jogo/${encodeURIComponent(id)}`);
  };

  // Filter games for current year and all zerados (using standardized time and score calculations)
  const zeradosAll = useMemo(() => {
    return games
      .filter((g) => g.status === 'zerado')
      .map((g) => {
        const effTime = getGameEffectiveTime(g);
        const effScore = getGameEffectiveScore(g);
        let anoZerado = g.ano_zerado;
        if (!anoZerado && g.data_zerado) {
          const parts = parseDateParts(g.data_zerado);
          if (parts) anoZerado = parts.year;
        }
        return {
          ...g,
          ano_zerado: anoZerado,
          tempo: effTime.tempo,
          tempoMinutos: effTime.tempoMinutos,
          nota: effScore.nota,
        };
      });
  }, [games]);

  // Aggregated all-time lifetime stats (for the "status" tab)
  const lifetime = useMemo(() => {
    const list = zeradosAll;
    const totalLifetime = list.length;
    const horasLifetime = list.reduce(
      (acc, g) => acc + (g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo)),
      0
    );
    const notasLifetimeArr = list
      .map((g) => g.nota)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n) && n > 0);
    const mediaLifetime = notasLifetimeArr.length
      ? notasLifetimeArr.reduce((a, b) => a + b, 0) / notasLifetimeArr.length
      : 0;
    const notas10Lifetime = notasLifetimeArr.filter((n) => n >= 9.5).length;

    // Platform aggregation (all-time)
    const plataformasLifetime: Record<string, { count: number; hours: number }> = {};
    const generosLifetime: Record<string, { count: number; hours: number }> = {};

    list.forEach((g) => {
      const t = g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo);
      const c = g.console || 'Outro';
      if (!plataformasLifetime[c]) plataformasLifetime[c] = { count: 0, hours: 0 };
      plataformasLifetime[c].count++;
      plataformasLifetime[c].hours += t;

      const gen = g.genero || 'Geral';
      if (!generosLifetime[gen]) generosLifetime[gen] = { count: 0, hours: 0 };
      generosLifetime[gen].count++;
      generosLifetime[gen].hours += t;
    });

    const topConLifetime = Object.entries(plataformasLifetime).sort((a, b) => b[1].count - a[1].count);
    const topGenLifetime = Object.entries(generosLifetime).sort((a, b) => b[1].count - a[1].count);

    // Score distribution (all-time)
    const histLifetime: Record<string, number> = { '10': 0, '9': 0, '8': 0, '7': 0, '6': 0, '5': 0, '<5': 0 };
    notasLifetimeArr.forEach((n) => {
      if (n >= 9.5) histLifetime['10']++;
      else if (n >= 8.5) histLifetime['9']++;
      else if (n >= 7.5) histLifetime['8']++;
      else if (n >= 6.5) histLifetime['7']++;
      else if (n >= 5.5) histLifetime['6']++;
      else if (n >= 4.5) histLifetime['5']++;
      else histLifetime['<5']++;
    });
    const maxNHLifetime = Math.max(...Object.values(histLifetime), 1);

    return {
      totalLifetime,
      horasLifetime,
      mediaLifetime,
      notas10Lifetime,
      notasLifetimeArr,
      topConLifetime,
      topGenLifetime,
      histLifetime,
      maxNHLifetime,
    };
  }, [zeradosAll]);

  const jogosAno = useMemo(() => {
    return zeradosAll.filter((g) => g.ano_zerado === ANO);
  }, [zeradosAll, ANO]);

  const total = jogosAno.length;
  const horas = jogosAno.reduce(
    (acc, g) => acc + (g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo)),
    0
  );
  const notasArr = jogosAno
    .map((g) => g.nota)
    .filter((n): n is number => typeof n === 'number' && !isNaN(n) && n > 0);
  const media = notasArr.length ? notasArr.reduce((a, b) => a + b, 0) / notasArr.length : 0;
  const notas10 = notasArr.filter((n) => n >= 9.5).length;

  const comTempo = jogosAno
    .filter((g) => (g.tempoMinutos ? g.tempoMinutos > 0 : parseTime(g.tempo) > 0))
    .sort((a, b) => (b.tempoMinutos || 0) - (a.tempoMinutos || 0));
  const maisLongo = comTempo[0] || null;
  const maisCurto = comTempo.length
    ? [...comTempo].sort((a, b) => (a.tempoMinutos || 0) - (b.tempoMinutos || 0))[0]
    : null;
  const mediaTempo = comTempo.length ? horas / comTempo.length : 0;

  const comNota = [...jogosAno]
    .filter((g) => g.nota !== undefined && !isNaN(g.nota))
    .sort((a, b) => (b.nota || 0) - (a.nota || 0));
  const melhor = comNota[0] || null;
  const piorNota = comNota.length ? comNota[comNota.length - 1] : null;
  const top10Notas = comNota.slice(0, 10);

  // Platform and genre aggregations
  const { topCon, topGen, plataformaDoAno, generoDoAno } = useMemo(() => {
    const plataformas: Record<string, { count: number; hours: number }> = {};
    const generos: Record<string, { count: number; hours: number }> = {};

    jogosAno.forEach((g) => {
      const t = g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo);
      const c = g.console || 'Outro';
      if (!plataformas[c]) plataformas[c] = { count: 0, hours: 0 };
      plataformas[c].count++;
      plataformas[c].hours += t;

      const gen = g.genero || 'Geral';
      if (!generos[gen]) generos[gen] = { count: 0, hours: 0 };
      generos[gen].count++;
      generos[gen].hours += t;
    });

    const conList = Object.entries(plataformas).sort((a, b) => b[1].count - a[1].count);
    const genList = Object.entries(generos).sort((a, b) => b[1].count - a[1].count);

    return {
      topCon: conList,
      topGen: genList,
      plataformaDoAno: conList[0] || null,
      generoDoAno: genList[0] || null,
    };
  }, [jogosAno]);

  // Histogram of scores
  const notasHist: Record<string, number> = { '10': 0, '9': 0, '8': 0, '7': 0, '6': 0, '5': 0, '<5': 0 };
  notasArr.forEach((n) => {
    if (n >= 9.5) notasHist['10']++;
    else if (n >= 8.5) notasHist['9']++;
    else if (n >= 7.5) notasHist['8']++;
    else if (n >= 6.5) notasHist['7']++;
    else if (n >= 5.5) notasHist['6']++;
    else if (n >= 4.5) notasHist['5']++;
    else notasHist['<5']++;
  });
  const maxNH = Math.max(...Object.values(notasHist), 1);
  const notaHistCores: Record<string, string> = {
    '10': '#ffd700',
    '9': '#ffcc00',
    '8': '#00ff9f',
    '7': '#00f5ff',
    '6': '#6ee7f7',
    '5': '#ff7a00',
    '<5': '#ff3d6a',
  };

  // Monthly activity
  const NOMES_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const NOMES_MESES_COMPLETOS = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const meses = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, i) => ({
      i,
      nome: NOMES_MESES[i],
      nomeCompleto: NOMES_MESES_COMPLETOS[i],
      qtd: 0,
      h: 0,
      games: [] as GameItem[],
    }));

    jogosAno.forEach((g) => {
      const parts = parseDateParts(g.data_zerado);
      if (parts && parts.year === ANO && parts.month >= 0 && parts.month <= 11) {
        arr[parts.month].qtd++;
        arr[parts.month].h += g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo);
        arr[parts.month].games.push(g);
      }
    });
    return arr;
  }, [jogosAno, ANO]);

  const maxMes = Math.max(...meses.map((m) => m.qtd), 1);
  const mesPico = meses.reduce((best, m) => (m.qtd > best.qtd ? m : best), meses[0]);

  // Year comparison
  const anosStats = useMemo(() => {
    return availableYears
      .map((ano) => {
        const arr = zeradosAll.filter((g) => g.ano_zerado === ano);
        const h = arr.reduce(
          (acc, g) => acc + (g.tempoMinutos ? g.tempoMinutos / 60 : parseTime(g.tempo)),
          0
        );
        const ns = arr.map((g) => g.nota).filter((n): n is number => typeof n === 'number' && !isNaN(n));
        const med = ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
        return { ano, qtd: arr.length, h, media: med };
      })
      .sort((a, b) => a.ano - b.ano);
  }, [availableYears, zeradosAll]);

  const maxAnoQtd = Math.max(...anosStats.map((a) => a.qtd), 1);

  // GOT Awards calculation
  const gotAwards = useMemo(() => {
    const list = jogosAno;
    const findExplicitOrBest = (key: keyof GameItem, fallback: () => GameItem | null) => {
      const explicit = list.find((g) => g[key] === true);
      if (explicit) return explicit;
      return fallback();
    };

    return {
      goty: findExplicitOrBest('got_jogo', () => comNota[0] || null),
      gameplay: findExplicitOrBest('got_gameplay', () => comNota[1] || comNota[0] || null),
      narrativa: findExplicitOrBest('got_narrativa', () => {
        const rpgs = list.filter((g) => /rpg|jrpg|crpg|aventura|novel/i.test(g.genero));
        return rpgs[0] || comNota[0] || null;
      }),
      arte: findExplicitOrBest('got_arte', () => comNota[2] || comNota[0] || null),
      indie: findExplicitOrBest('got_indie', () => {
        const indies = list.filter((g) => /indie|balatro|sea of stars|dave/i.test(g.genero + g.title));
        return indies[0] || comNota[0] || null;
      }),
      surpresa: findExplicitOrBest('got_surpresa', () => comNota[3] || comNota[0] || null),
      retro: findExplicitOrBest('got_retro', () => {
        const retros = list.filter((g) => /snes|arcade|gba|cps2|ps1|ps2|retro/i.test(g.console));
        return retros[0] || comNota[0] || null;
      }),
      dificil: findExplicitOrBest('got_dificil', () => {
        const hard = list.filter((g) => /souls|shmup|dificil|wukong|lies of p/i.test(g.genero + g.title));
        return hard[0] || comNota[0] || null;
      }),
      pior: findExplicitOrBest('got_pior', () => {
        const sortedAsc = [...list].filter((g) => g.nota !== undefined).sort((a, b) => (a.nota || 0) - (b.nota || 0));
        return sortedAsc[0] || null;
      }),
    };
  }, [jogosAno, comNota]);

  // Year Records (Recordes do Ano)
  const recordesAno = useMemo(() => {
    // 1. Dia que mais teve jogos zerados
    const dateCounts: Record<string, number> = {};
    jogosAno.forEach((g) => {
      if (g.data_zerado) {
        dateCounts[g.data_zerado] = (dateCounts[g.data_zerado] || 0) + 1;
      }
    });

    let bestDate = '';
    let maxDateCount = 0;
    Object.entries(dateCounts).forEach(([dateStr, count]) => {
      if (count > maxDateCount) {
        maxDateCount = count;
        bestDate = dateStr;
      }
    });

    const diaMaisZeradoFormatted = bestDate
      ? `${formatDateBR(bestDate)} (${maxDateCount} ${maxDateCount === 1 ? 'jogo' : 'jogos'})`
      : '—';

    // 2. Jogo mais longo
    const jogoMaisLongo = comTempo[0] || null;

    // 3. Melhor avaliado
    const melhorAvaliado = comNota[0] || null;

    // 4. Console do ano
    const consoleDoAno = topCon[0]
      ? { nome: topCon[0][0], count: topCon[0][1].count, hours: topCon[0][1].hours }
      : null;

    // 5. Mês com mais jogos zerados
    const mesMaisZerado = mesPico && mesPico.qtd > 0 ? `${mesPico.nomeCompleto} (${mesPico.qtd} jogos)` : '—';

    // 6. Gênero do ano
    const generoDoAno = topGen[0]
      ? { nome: topGen[0][0], count: topGen[0][1].count, hours: topGen[0][1].hours }
      : null;

    return {
      diaMaisZeradoFormatted,
      jogoMaisLongo,
      melhorAvaliado,
      consoleDoAno,
      mesMaisZerado,
      generoDoAno,
    };
  }, [jogosAno, comTempo, comNota, topCon, topGen, mesPico]);

  // Active Month Data (para a seção no estilo meses1.jpg)
  const activeMonthData = useMemo(() => {
    const monthGames = jogosAno
      .filter((g) => {
        if (!g.data_zerado) return false;
        const parts = parseDateParts(g.data_zerado);
        return parts && parts.year === ANO && parts.month === activeMonthIndex;
      })
      .sort((a, b) => {
        const da = a.data_zerado || '';
        const db = b.data_zerado || '';
        return da.localeCompare(db);
      });

    const totalGames = monthGames.length;
    const totalHours = monthGames.reduce(
      (acc, curr) => acc + (curr.tempoMinutos ? curr.tempoMinutos / 60 : parseTime(curr.tempo)),
      0
    );
    const notasValidas = monthGames
      .map((g) => g.nota)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n));
    const mediaNotas = notasValidas.length
      ? (notasValidas.reduce((a, b) => a + b, 0) / notasValidas.length).toFixed(1)
      : '—';
    const avgHoursPerGame = totalGames > 0 ? totalHours / totalGames : 0;

    // Destaque do mês: highest rated game, or longest game, or first game
    const destaque = [...monthGames].sort((a, b) => (b.nota || 0) - (a.nota || 0))[0] || null;

    const consolesMap: Record<string, number> = {};
    const generosMap: Record<string, number> = {};

    monthGames.forEach((g) => {
      const c = g.console || 'Outro';
      consolesMap[c] = (consolesMap[c] || 0) + 1;
      const gen = g.genero || 'Geral';
      generosMap[gen] = (generosMap[gen] || 0) + 1;
    });

    const consolesList = Object.entries(consolesMap).sort((a, b) => b[1] - a[1]);
    const generosList = Object.entries(generosMap).sort((a, b) => b[1] - a[1]);

    return {
      monthGames,
      totalGames,
      totalHours,
      mediaNotas,
      avgHoursPerGame,
      destaque,
      consolesList,
      generosList,
    };
  }, [jogosAno, ANO, activeMonthIndex]);

  // Year slogan
  let slogan = 'Ano consistente do começo ao fim.';
  if (total >= 40) slogan = 'Backlog exterminado. Uma lenda foi forjada aqui.';
  else if (total >= 30) slogan = 'Maratona absurda. O controle praticamente colou na mão.';
  else if (total >= 20) slogan = 'Ano consistente do começo ao fim. Ritmo de veterano.';
  else if (total >= 10) slogan = 'Boa curadoria e ritmo sólido ao longo do ano.';
  else if (total > 0) slogan = 'Ano enxuto, mas com escolhas certeiras.';

  return (
    <div className="space-y-6 pb-20">
      {/* ── HERO BANNER WITH YEAR SWITCHER ── */}
      <WrapUpHero
        ANO={ANO}
        availableYears={availableYears}
        activeTab={activeTab}
        setActiveTabLocal={setActiveTabLocal}
        onYearChange={handleYearChange}
      />

      {/* ── TAB 1: RESUMO ── */}
      {activeTab === 'resumo' && (
        <WrapUpResumoTab
          ANO={ANO}
          total={total}
          horas={horas}
          mediaTempo={mediaTempo}
          media={media}
          notasArr={notasArr}
          plataformaDoAno={plataformaDoAno}
          generoDoAno={generoDoAno}
          maisLongo={maisLongo}
          maisCurto={maisCurto}
          piorNota={piorNota}
          melhor={melhor}
          slogan={slogan}
          gotAwards={gotAwards}
          onGameClick={handleGameClick}
          onOpenTopTab={() => setActiveTabLocal('top')}
        />
      )}

      {/* ── TAB 2: ANÁLISE ── */}
      {activeTab === 'analise' && (
        <WrapUpAnaliseTab
          ANO={ANO}
          total={total}
          media={media}
          notasArr={notasArr}
          notas10={notas10}
          notasHist={notasHist}
          maxNH={maxNH}
          notaHistCores={notaHistCores}
          meses={meses}
          maxMes={maxMes}
          mesPico={mesPico}
          topCon={topCon}
          topGen={topGen}
          openPlatforms={openPlatforms}
          setOpenPlatforms={setOpenPlatforms}
          openGenres={openGenres}
          setOpenGenres={setOpenGenres}
          jogosAno={jogosAno}
          onGameClick={handleGameClick}
        />
      )}

      {/* ── TAB 3: STATUS (ESTATÍSTICAS DE TODOS OS ANOS SOMADOS) ── */}
      {activeTab === 'status' && (
        <WrapUpStatusTab
          availableYears={availableYears}
          lifetime={lifetime}
          notaHistCores={notaHistCores}
          openPlatformsStatus={openPlatformsStatus}
          setOpenPlatformsStatus={setOpenPlatformsStatus}
          openGenresStatus={openGenresStatus}
          setOpenGenresStatus={setOpenGenresStatus}
          zeradosAll={zeradosAll}
          anosStats={anosStats}
          maxAnoQtd={maxAnoQtd}
          onGameClick={handleGameClick}
        />
      )}

      {/* ── TAB 4: TOP JOGOS + GOT ── */}
      {activeTab === 'top' && (
        <WrapUpTopTab
          ANO={ANO}
          top10Notas={top10Notas}
          gotAwards={gotAwards}
          onGameClick={handleGameClick}
        />
      )}

      {/* ── TAB 5: TIMELINE (CALENDÁRIO, DETALHE DO MÊS, RECORDES, PANORAMA) ── */}
      {activeTab === 'timeline' && (
        <WrapUpTimelineTab
          ANO={ANO}
          activeMonthIndex={activeMonthIndex}
          setActiveMonthIndex={setActiveMonthIndex}
          CURRENT_OCTOBER_MONTH={CURRENT_OCTOBER_MONTH}
          NOMES_MESES_COMPLETOS={NOMES_MESES_COMPLETOS}
          jogosAno={jogosAno}
          meses={meses}
          maxMes={maxMes}
          activeMonthData={activeMonthData}
          recordesAno={recordesAno}
          setTimelineMonthFilter={setTimelineMonthFilter}
          onGameClick={handleGameClick}
        />
      )}
    </div>
  );
};

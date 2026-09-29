import React, { useState } from 'react';
import {
  Server,
  X,
  CheckCircle2,
  Download,
  Copy,
  Check,
  FolderTree,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { Game, AppConfig } from '../types';

interface HostGatorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  config: AppConfig;
}

export const HostGatorGuideModal: React.FC<HostGatorGuideModalProps> = ({
  isOpen,
  onClose,
  games,
  config,
}) => {
  const [copiedStep, setCopiedStep] = useState<number | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = (text: string, stepId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2000);
  };

  /**
   * Gera e faz o download de um index.html único e autônomo (standalone)
   * que pode ser subido diretamente na pasta public_html do cPanel da HostGator
   * sem precisar instalar Node, nem MySQL, funcionando imediatamente!
   */
  const handleDownloadStandaloneHostGatorFile = () => {
    try {
      const dataJson = JSON.stringify({ jogos: games, meta: config.metaAnual });
      
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Game Hub — Gerenciador de Backlog & Tempo de Jogo</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="description" content="Acompanhe seus jogos zerados, backlog e horas de gameplay.">
  <meta name="theme-color" content="#090d16">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
  <style>
    :root{--bg:#090d16;--c:#111827;--card:#161f30;--h:#1f293d;--hh:#2d3a52;--tx:#f1f5f9;--mu:#94a3b8;--cy:#00f0ff;--cyb:#00363a;--gr:#10b981;--am:#f59e0b;--ro:#f43f5e;box-sizing:border-box}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--tx);font:14px/1.5 'Plus Jakarta Sans',system-ui,sans-serif;-webkit-tap-highlight-color:transparent;padding-bottom:80px}
    h1,h2,h3,b,button,.sg{font-family:'Space Grotesk',system-ui,sans-serif}
    header{position:sticky;top:0;z-index:40;background:rgba(9,13,22,0.92);backdrop-filter:blur(10px);border-bottom:1px solid #1f293d;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}
    header b{font-size:18px;color:var(--cy)}
    main{max-width:1100px;margin:0 auto;padding:16px}
    .kpi-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px}
    .card{background:var(--card);border:1px solid #1f293d;border-radius:12px;padding:16px;position:relative}
    .kpi small{color:var(--mu);display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em}
    .kpi b{font-size:26px;display:block;color:#fff;margin:4px 0}
    .kpi span{font-size:12px;color:var(--cy)}
    .pb{height:8px;background:#090d16;border-radius:99px;overflow:hidden;margin:8px 0}
    .pb i{display:block;height:100%;background:linear-gradient(90deg,var(--cy),#6366f1);border-radius:99px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
    .gc{background:var(--c);border:1px solid #1f293d;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
    .cv{aspect-ratio:3/4;background:linear-gradient(135deg,#1e1b4b,#0f172a);display:flex;align-items:center;justify-content:center;position:relative;color:var(--cy);font-weight:700;font-size:28px}
    .cv img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    .gc .in{padding:10px;display:flex;flex-direction:column;flex:1}
    .gc b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .gc small{color:var(--mu);font-size:11px;margin-top:2px}
    .btns{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
    button{background:#1f293d;border:0;color:#fff;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600}
    button.cy{background:var(--cy);color:var(--cyb)}button.gr{background:var(--gr);color:#022c22}
    input,select,textarea{background:#090d16;border:1px solid #2d3a52;color:#fff;border-radius:6px;padding:8px 10px;width:100%}
    nav.mob{position:fixed;bottom:0;left:0;right:0;background:rgba(9,13,22,0.96);border-top:1px solid #1f293d;display:flex;justify-content:space-around;padding:8px 4px;z-index:50}
    nav.mob button{background:none;color:var(--mu);display:flex;flex-direction:column;align-items:center;font-size:10px;border-radius:0}
    nav.mob button.on{color:var(--cy)}
    .i{font-family:'Material Symbols Outlined';font-size:20px;display:inline-block;line-height:1}
    @media(min-width:768px){nav.mob{display:none}body{padding-bottom:24px}}
  </style>
</head>
<body>
  <header>
    <b>Game Hub</b>
    <div style="display:flex;gap:8px">
      <button onclick="exportarBackup()">Backup JSON</button>
      <button class="cy" onclick="abrirNovoJogo()">+ Novo Jogo</button>
    </div>
  </header>
  <main>
    <div id="app"></div>
  </main>
  <nav class="mob">
    <button class="on" onclick="setTab('inicio')"><span class="i">dashboard</span>Início</button>
    <button onclick="setTab('backlog')"><span class="i">library_books</span>Backlog</button>
    <button onclick="setTab('jogando')"><span class="i">sports_esports</span>Jogando</button>
    <button onclick="setTab('wrap')"><span class="i">trophy</span>Wrap-Up</button>
  </nav>

  <script>
    let JOGOS = [];
    let META = 24;
    try {
      const s = localStorage.getItem('gamehub_games_v2');
      if (s) JOGOS = JSON.parse(s);
      else {
        const seed = ${dataJson};
        JOGOS = seed.jogos || [];
        META = seed.meta || 24;
      }
    } catch(e) {}

    function salvar() {
      try { localStorage.setItem('gamehub_games_v2', JSON.stringify(JOGOS)); } catch(e){ alert('Espaço cheio'); }
    }

    let aba = 'inicio';
    function setTab(t) {
      aba = t;
      document.querySelectorAll('nav.mob button').forEach((b,i)=>b.classList.toggle('on', ['inicio','backlog','jogando','wrap'][i] === t));
      render();
    }

    function render() {
      const el = document.getElementById('app');
      const zerados = JOGOS.filter(g=>g.status==='zerado');
      const jogando = JOGOS.filter(g=>g.status==='jogando');
      const backlog = JOGOS.filter(g=>g.status==='backlog');
      const totalH = Math.round(JOGOS.reduce((s,g)=>s+(g.tempo||0),0)/60);

      if (aba === 'inicio') {
        el.innerHTML = \`
          <div class="kpi-row">
            <div class="card kpi"><small>Zerados</small><b>\${zerados.length}</b><span>Meta: \${META}</span></div>
            <div class="card kpi"><small>Jogando Agora</small><b>\${jogando.length}</b><span>\${backlog.length} no backlog</span></div>
            <div class="card kpi"><small>Horas Totais</small><b>\${totalH}h</b><span>Gameplay acumulada</span></div>
          </div>
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <b>Meta de Jogos Zerados</b>
              <span style="color:var(--cy);font-weight:700">\${Math.min(100, Math.round(zerados.length/META*100))}%</span>
            </div>
            <div class="pb"><i style="width:\${Math.min(100, Math.round(zerados.length/META*100))}%"></i></div>
          </div>
          <h2 style="font-size:16px;margin:20px 0 10px">Jogando Agora (\${jogando.length})</h2>
          <div class="grid">\${jogando.map(renderCard).join('') || '<p style="color:var(--mu)">Nenhum jogo em andamento.</p>'}</div>
        \`;
      } else if (aba === 'backlog') {
        el.innerHTML = \`
          <h2 style="font-size:18px;margin-bottom:12px">Catálogo de Jogos (\${JOGOS.length})</h2>
          <div class="grid">\${JOGOS.map(renderCard).join('')}</div>
        \`;
      } else if (aba === 'jogando') {
        el.innerHTML = \`
          <h2 style="font-size:18px;margin-bottom:12px">Em Andamento</h2>
          <div class="grid">\${jogando.map(renderCard).join('')}</div>
          <h2 style="font-size:18px;margin:24px 0 12px">Zerados (\${zerados.length})</h2>
          <div class="grid">\${zerados.map(renderCard).join('')}</div>
        \`;
      } else if (aba === 'wrap') {
        el.innerHTML = \`
          <div class="card">
            <h2 style="color:var(--cy);margin-top:0">🏆 Wrap-Up Gamer</h2>
            <p>Você zerou <b>\${zerados.length} jogos</b> acumulando mais de <b>\${totalH} horas</b> de gameplay!</p>
          </div>
        \`;
      }
    }

    function renderCard(g) {
      const h = Math.round(g.tempo/60);
      return \`
        <div class="gc">
          <div class="cv">
            \${g.capa ? '<img src="' + g.capa + '" onerror="this.remove()">' : '<span>' + (g.nome[0]||'G') + '</span>'}
          </div>
          <div class="in">
            <b>\${g.nome}</b>
            <small>\${g.console || 'Geral'} · \${g.genero || 'Aventura'}</small>
            <small style="color:var(--cy)">\${h}h jogadas</small>
            <div class="btns">
              \${g.status === 'backlog' ? '<button class="cy" onclick="mudarStatus(\\'' + g.id + '\\', \\'jogando\\')">Jogar</button>' : ''}
              \${g.status === 'jogando' ? '<button onclick="addTempo(\\'' + g.id + '\\', 60)">+1h</button><button class="gr" onclick="mudarStatus(\\'' + g.id + '\\', \\'zerado\\')">Zerei!</button>' : ''}
              <button onclick="excluir(\\'' + g.id + '\\')" style="margin-left:auto">✕</button>
            </div>
          </div>
        </div>
      \`;
    }

    function mudarStatus(id, st) {
      const g = JOGOS.find(x => x.id === id);
      if (g) {
        g.status = st;
        if (st === 'zerado') g.fim = new Date().toISOString().slice(0,10);
        salvar();
        render();
      }
    }

    function addTempo(id, min) {
      const g = JOGOS.find(x => x.id === id);
      if (g) {
        g.tempo = (g.tempo || 0) + min;
        salvar();
        render();
      }
    }

    function excluir(id) {
      if (confirm('Excluir este jogo?')) {
        JOGOS = JOGOS.filter(x => x.id !== id);
        salvar();
        render();
      }
    }

    function abrirNovoJogo() {
      const nome = prompt('Nome do jogo:');
      if (!nome) return;
      const consoleName = prompt('Console / Plataforma (ex: PC, PS5, Switch):', 'PC') || 'PC';
      const genero = prompt('Gênero (ex: RPG, Ação, Aventura):', 'RPG') || 'RPG';
      JOGOS.push({
        id: 'g-' + Date.now(),
        nome,
        console: consoleName,
        genero,
        status: 'backlog',
        tempo: 0,
        est: 20
      });
      salvar();
      render();
    }

    function exportarBackup() {
      const json = JSON.stringify({ jogos: JOGOS, meta: META }, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'gamehub_backup.json';
      a.click();
    }

    render();
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'index.html';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      alert('Erro ao gerar arquivo para download: ' + err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hostgator-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-900 shadow-2xl p-6 my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <h2 id="hostgator-title" className="font-display text-xl font-bold text-white">
              Como Publicar na HostGator (cPanel)
            </h2>
            <p className="text-xs text-slate-400">
              Guia definitivo para hospedar em qualquer plano compartilhado (Plano P, M ou Turbo).
            </p>
          </div>
        </div>

        {/* Quick Highlights / Why this works */}
        <div className="mt-4 rounded-xl bg-slate-950/60 border border-slate-800 p-4 space-y-2 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">100% Compatível com cPanel & Apache:</strong> Não requer instalação de Node.js, PM2 ou MySQL na HostGator. Funciona como site estático instantâneo.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Seus dados ficam salvos com segurança:</strong> O progresso é gravado localmente no dispositivo (localStorage) e você pode exportar ou importar backups em JSON a qualquer momento.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-white">Responsivo no celular e desktop:</strong> No celular (Android/iOS), basta clicar em "Adicionar à Tela Inicial" para usá-lo em tela cheia como um aplicativo!
            </span>
          </div>
        </div>

        {/* DOWNLOAD ACTION BUTTON */}
        <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Download className="h-4 w-4 text-amber-400" />
              <span>Baixar Arquivo Standalone Pronto para cPanel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gera um arquivo <code className="text-amber-300">index.html</code> completo com todos os seus jogos atuais embutidos.
            </p>
          </div>

          <button
            onClick={handleDownloadStandaloneHostGatorFile}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-md transition-all active:scale-95"
          >
            {downloadSuccess ? (
              <>
                <Check className="h-4 w-4 text-slate-950" />
                <span>Arquivo Baixado!</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4 text-slate-950" />
                <span>Baixar index.html</span>
              </>
            )}
          </button>
        </div>

        {/* PASSO A PASSO ILUSTRADO */}
        <div className="mt-6 space-y-4">
          <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
            Passo a Passo no cPanel da HostGator:
          </h3>

          {/* Passo 1 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 text-[10px]">
                1
              </span>
              <span>Acessar o cPanel da HostGator</span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Entre no Portal do Cliente da HostGator (<a href="https://financeiro.hostgator.com.br" target="_blank" rel="noreferrer" className="text-cyan-400 underline">financeiro.hostgator.com.br</a>), vá na aba <strong>Hospedagens</strong> e clique em <strong>"Acessar cPanel"</strong>.
            </p>
          </div>

          {/* Passo 2 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 text-[10px]">
                2
              </span>
              <span>Abrir o Gerenciador de Arquivos (File Manager)</span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              No campo de busca do cPanel, digite <strong>"Gerenciador de Arquivos"</strong> (File Manager). Dentro dele, clique duas vezes na pasta <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-300">public_html</code>.
            </p>
          </div>

          {/* Passo 3 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 text-[10px]">
                3
              </span>
              <span>Fazer o Upload do arquivo index.html</span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              No menu superior do Gerenciador de Arquivos, clique no botão <strong>"Carregar" (Upload)</strong>. Selecione o arquivo <code className="text-cyan-300">index.html</code> que você baixou acima.
            </p>
            <div className="mt-2 text-[11px] text-slate-400 bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
              💡 <em>Dica:</em> Se já houver um arquivo padrão chamado <code>default.html</code> ou <code>index.php</code> antigo da HostGator, renomeie-o ou substitua pelo seu novo <code>index.html</code>.
            </div>
          </div>

          {/* Passo 4 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-950 text-cyan-400 text-[10px]">
                4
              </span>
              <span>Ativar o Certificado SSL Gratuito (HTTPS)</span>
            </div>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              No cPanel, procure por <strong>"Status do SSL/TLS"</strong> e clique em <strong>"Executar AutoSSL"</strong>. Em poucos minutos seu site estará com o cadeado verde de segurança!
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Entendido, fechar guia
          </button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';

// Paletas de gradientes temáticas para jogos
const THEME_GRADIENTS: Record<string, string> = {
  'Soulslike': 'from-amber-950 via-stone-900 to-black',
  'RPG': 'from-indigo-950 via-purple-950 to-slate-950',
  'JRPG': 'from-blue-950 via-indigo-900 to-slate-950',
  'Aventura': 'from-emerald-950 via-teal-950 to-slate-950',
  'Ação / Aventura': 'from-red-950 via-zinc-900 to-black',
  'Metroidvania': 'from-cyan-950 via-slate-900 to-slate-950',
  'Terror / Ação': 'from-rose-950 via-stone-950 to-black',
  'Roguelike': 'from-orange-950 via-red-950 to-black',
  'Plataforma': 'from-sky-950 via-blue-900 to-slate-950',
  'Plataforma 3D': 'from-violet-950 via-indigo-900 to-slate-950',
  'Estratégia': 'from-teal-950 via-emerald-950 to-stone-950',
  'FPS': 'from-yellow-950 via-stone-900 to-black',
  'Indie': 'from-fuchsia-950 via-pink-950 to-slate-950',
};

const DEFAULT_GRADIENT = 'from-slate-900 via-indigo-950 to-slate-950';

interface GameCoverProps {
  capa?: string;
  nome: string;
  genero?: string;
  consoleName?: string;
  className?: string;
  aspect?: 'portrait' | 'square' | 'wide';
}

export const GameCover: React.FC<GameCoverProps> = ({
  capa,
  nome,
  genero,
  consoleName,
  className = '',
  aspect = 'portrait',
}) => {
  const [imgError, setImgError] = React.useState(false);

  const aspectClass =
    aspect === 'portrait' ? 'aspect-[3/4]' : aspect === 'square' ? 'aspect-square' : 'aspect-video';

  const gradient = (genero && THEME_GRADIENTS[genero]) || DEFAULT_GRADIENT;

  // Letra inicial e abreviação para fallback
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'GH';

  if (capa && !imgError) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-slate-900 ${aspectClass} ${className}`}>
        <img
          src={capa}
          alt={nome}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60" />
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-lg bg-gradient-to-br ${gradient} p-3.5 border border-slate-800/80 shadow-inner select-none ${aspectClass} ${className}`}
    >
      {/* Decorative cyber grid / glow behind */}
      <div className="absolute -top-12 -right-12 h-28 w-28 rounded-full bg-cyan-500/10 blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-indigo-500/15 blur-xl pointer-events-none" />

      {/* Top badges */}
      <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span className="font-mono text-cyan-400/90 truncate max-w-[80px]">
          {consoleName || 'GAME'}
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          {genero ? genero.slice(0, 10) : ''}
        </span>
      </div>

      {/* Middle iconic monogram */}
      <div className="relative z-10 flex flex-1 items-center justify-center my-1">
        <span className="font-display text-2xl font-bold tracking-tight text-white/30 group-hover:text-cyan-400/60 transition-colors">
          {initials}
        </span>
      </div>

      {/* Bottom title preview */}
      <div className="relative z-10">
        <p className="line-clamp-2 text-xs font-semibold text-slate-200 leading-snug">
          {nome}
        </p>
      </div>
    </div>
  );
};

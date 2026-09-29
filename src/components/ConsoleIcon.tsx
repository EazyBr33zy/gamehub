import React from 'react';
import { Gamepad2, Tv, Monitor, Smartphone, Joystick } from 'lucide-react';

const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Escolhe o ícone certo pelo nome do console/plataforma */
export function getConsoleIcon(name: string): React.ElementType {
  const n = normalize(name);
  if (/arcade|neo ?geo|fliperama/.test(n)) return Joystick;
  if (/android|\bios\b|iphone|celular|mobile/.test(n)) return Smartphone;
  if (/deck|switch|\bds\b|3ds|game ?boy|\bgba\b|\bpsp\b|vita|portatil/.test(n)) return Gamepad2;
  if (/\bpc\b|steam|windows|computador/.test(n)) return Monitor;
  if (
    /playstation|\bps ?[1-5]\b|psx|xbox|snes|super nintendo|\bnes\b|mega ?drive|genesis|master system|dreamcast|saturn|amiga|cd32|atari|\bn64\b|nintendo 64|gamecube|\bwii\b|3do|\btv\b/.test(
      n
    )
  )
    return Tv;
  return Gamepad2;
}

/** Cor característica de cada console/plataforma (estilo Obsidian) */
export function getConsoleColor(name: string): string {
  const n = normalize(name);
  // Nintendo
  if (/game ?boy|\bgbc\b|game ?boy (advance|color)|\bgb\b/.test(n)) return '#f472b6'; // rosa GB/GBC
  if (/\bds\b|3ds/.test(n)) return '#fb923c'; // laranja DS/3DS
  if (/wii u/.test(n)) return '#60a5fa';
  if (/\bwii\b/.test(n)) return '#93c5fd'; // azul claro Wii
  if (/gamecube|\bgc\b/.test(n)) return '#818cf8'; // roxo-azulado GC
  if (/nintendo 64|\bn64\b/.test(n)) return '#34d399'; // verde N64
  if (/super nintendo|\bsnes\b/.test(n)) return '#a78bfa'; // roxo SNES
  if (/\bnes\b|famicom/.test(n)) return '#ef4444'; // vermelho NES
  if (/switch/.test(n)) return '#f87171'; // vermelho Switch
  // Sega
  if (/mega ?drive|genesis/.test(n)) return '#60a5fa'; // azul Mega Drive
  if (/master ?system/.test(n)) return '#e2e8f0';
  if (/dreamcast/.test(n)) return '#2dd4bf'; // teal Dreamcast
  if (/saturn/.test(n)) return '#fbbf24';
  // Sony
  if (/playstation 5|\bps5\b/.test(n)) return '#93c5fd';
  if (/playstation 4|\bps4\b/.test(n)) return '#60a5fa';
  if (/playstation 3|\bps3\b/.test(n)) return '#a5b4fc';
  if (/\bpsp\b/.test(n)) return '#c084fc';
  if (/ps ?vita|\bvita\b/.test(n)) return '#f472b6';
  if (/playstation|\bps1\b|\bpsx\b/.test(n)) return '#818cf8'; // índigo PS1
  // Microsoft
  if (/xbox series|\bxss\b|\bxsx\b/.test(n)) return '#4ade80';
  if (/xbox one/.test(n)) return '#22c55e';
  if (/\bxbox\b/.test(n)) return '#34d399'; // verde Xbox
  // Portáteis / outros
  if (/steam ?deck/.test(n)) return '#38bdf8';
  if (/android/.test(n)) return '#a3e635';
  if (/\bios\b|iphone|apple/.test(n)) return '#e2e8f0';
  if (/arcade|fliperama/.test(n)) return '#fbbf24';
  if (/neo ?geo/.test(n)) return '#c084fc';
  if (/atari/.test(n)) return '#fb923c';
  if (/amiga|cd ?32/.test(n)) return '#e879f9';
  if (/3do/.test(n)) return '#facc15';
  // PC
  if (/\bpc\b|steam|windows|computador/.test(n)) return '#2dd4bf';
  // fallback determinístico (paleta Obsidian)
  const PALETTE = ['#a78bfa', '#60a5fa', '#2dd4bf', '#fbbf24', '#f472b6', '#34d399', '#818cf8', '#fb923c'];
  let h = 0;
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

interface ConsoleIconProps {
  name: string;
  className?: string;
  /** Se true (padrão), pinta o ícone com a cor do console */
  colored?: boolean;
}

export const ConsoleIcon: React.FC<ConsoleIconProps> = ({ name, className = 'h-4 w-4', colored = true }) => {
  const Icon = getConsoleIcon(name);
  return <Icon className={className} style={colored ? { color: getConsoleColor(name) } : undefined} aria-hidden="true" />;
};

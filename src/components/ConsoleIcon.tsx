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

interface ConsoleIconProps {
  name: string;
  className?: string;
}

export const ConsoleIcon: React.FC<ConsoleIconProps> = ({ name, className = 'h-4 w-4' }) => {
  const Icon = getConsoleIcon(name);
  return <Icon className={className} aria-hidden="true" />;
};

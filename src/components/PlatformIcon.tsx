import React from 'react';
import { Gamepad2, Monitor, Disc } from 'lucide-react';

interface PlatformIconProps {
  consoleName: string | undefined | null;
  className?: string;
  size?: number;
}

export const PlatformIcon: React.FC<PlatformIconProps> = ({
  consoleName,
  className = 'h-5 w-5 text-[#06b6d4]',
  size = 22
}) => {
  const c = String(consoleName || '').toLowerCase().trim();

  // Steam Deck (Modern handheld with handles and screen)
  if (c.includes('steam deck') || c.includes('deck')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Steam Deck"
      >
        <rect x="2" y="6" width="20" height="12" rx="4" />
        <rect x="7" y="8" width="10" height="8" rx="1" />
        <circle cx="4.5" cy="10" r="1" fill="currentColor" />
        <circle cx="19.5" cy="14" r="1" fill="currentColor" />
        <path d="M4.5 13.5h.01M19.5 10.5h.01" />
      </svg>
    );
  }

  // Arcade / Fliperama (Joystick with ball and buttons)
  if (c.includes('arcade') || c.includes('cps') || c.includes('mame') || c.includes('fba') || c.includes('neo geo') || c.includes('neogeo')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Arcade"
      >
        <path d="M3 17h18v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4Z" />
        <path d="M8 17V8" />
        <circle cx="8" cy="6" r="3" fill="currentColor" fillOpacity="0.2" />
        <circle cx="14" cy="15" r="1.2" fill="currentColor" />
        <circle cx="17.5" cy="13.5" r="1.2" fill="currentColor" />
        <circle cx="19" cy="16.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  // PlayStation families (PS1, PS2, PS3, PS4, PS5)
  if (c.includes('playstation') || c.includes('ps5') || c.includes('ps4') || c.includes('ps3') || c.includes('ps2') || c.includes('ps1') || c.includes('psx')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="PlayStation"
      >
        <path d="M6 12h4m-2-2v4" />
        <path d="M2 15c0-3 2-7 6-7h8c4 0 6 4 6 7 0 2.5-1.5 5-3.5 5-2 0-3-2-4.5-2h-4c-1.5 0-2.5 2-4.5 2C3.5 20 2 17.5 2 15Z" />
        <circle cx="16.5" cy="11.5" r="1" fill="currentColor" />
        <circle cx="18" cy="13.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  // PC / Steam / Windows (Monitor & Keyboard)
  if (c === 'pc' || c.includes('steam') || c.includes('pc / steam') || c.includes('windows')) {
    return <Monitor className={className} style={{ width: size, height: size }} />;
  }

  // Nintendo Switch (Dual split Joy-Cons + Screen)
  if (c.includes('switch')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Nintendo Switch"
      >
        <rect x="2" y="5" width="6" height="14" rx="3" />
        <circle cx="5" cy="9" r="1" fill="currentColor" />
        <rect x="16" y="5" width="6" height="14" rx="3" />
        <circle cx="19" cy="15" r="1" fill="currentColor" />
        <rect x="9.5" y="6" width="5" height="12" rx="1" />
      </svg>
    );
  }

  // Game Boy & Portable Nintendo (GBA, GBC, GB, DS, 3DS, Game Gear)
  if (c.includes('game boy') || c.includes('gba') || c.includes('gbc') || c.includes('ds') || c.includes('game gear') || c === 'gg' || c === 'gb') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Handheld Console"
      >
        <rect x="4" y="2" width="16" height="20" rx="3" />
        <rect x="7" y="5" width="10" height="7" rx="1" />
        <path d="M7 16h4m-2-2v4" />
        <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
        <circle cx="17.5" cy="17.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  // Sega Consoles (Mega Drive, Sega Saturn, Dreamcast, Master System)
  if (c.includes('mega drive') || c.includes('genesis') || c.includes('saturn') || c.includes('dreamcast') || c.includes('master system')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Sega Console"
      >
        <path d="M4 14c0-3.5 2.5-6.5 6.5-6.5h3c4 0 6.5 3 6.5 6.5 0 2.5-1.5 5.5-4 5.5-2 0-2.5-1.5-4-1.5s-2 1.5-4 1.5C5.5 19.5 4 16.5 4 14Z" />
        <path d="M7 13.5h3m-1.5-1.5v3" />
        <circle cx="15" cy="12" r="0.8" fill="currentColor" />
        <circle cx="17" cy="12" r="0.8" fill="currentColor" />
        <circle cx="14.5" cy="14" r="0.8" fill="currentColor" />
        <circle cx="16.5" cy="14" r="0.8" fill="currentColor" />
      </svg>
    );
  }

  // SNES / NES
  if (c.includes('snes') || c.includes('nes') || c.includes('nintendo 64') || c.includes('n64')) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-label="Nintendo Retro"
      >
        <rect x="2" y="8" width="20" height="9" rx="4.5" />
        <path d="M6 12.5h3m-1.5-1.5v3" />
        <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
        <circle cx="18" cy="13" r="1" fill="currentColor" />
      </svg>
    );
  }

  // Amiga CD32
  if (c.includes('amiga') || c.includes('cd32')) {
    return <Disc className={className} style={{ width: size, height: size }} />;
  }

  // Fallback Gamepad
  return <Gamepad2 className={className} style={{ width: size, height: size }} />;
};

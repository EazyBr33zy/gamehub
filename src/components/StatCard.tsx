import type { ReactNode } from 'react';

export type StatAccent = 'cyan' | 'purple' | 'blue' | 'amber';

const ACCENTS: Record<StatAccent, { border: string; iconBg: string; bar: string }> = {
  cyan: {
    border: 'border-[#22d3ee]/15 hover:border-[#22d3ee]/40',
    iconBg: 'bg-[#22d3ee]/10 text-[#22d3ee]',
    bar: 'bg-[#22d3ee]',
  },
  purple: {
    border: 'border-[#a855f7]/15 hover:border-[#a855f7]/40',
    iconBg: 'bg-[#a855f7]/10 text-[#a855f7]',
    bar: 'bg-[#a855f7]',
  },
  blue: {
    border: 'border-[#38bdf8]/15 hover:border-[#38bdf8]/40',
    iconBg: 'bg-[#38bdf8]/10 text-[#38bdf8]',
    bar: 'bg-[#38bdf8]',
  },
  amber: {
    border: 'border-[#fbbf24]/15 hover:border-[#fbbf24]/40',
    iconBg: 'bg-[#fbbf24]/10 text-[#fbbf24]',
    bar: 'bg-[#fbbf24]',
  },
};

interface StatCardProps {
  label: string;
  description: string;
  icon: ReactNode;
  value: ReactNode;
  accent?: StatAccent;
  progress?: number; // 0-100 — quando presente, renderiza a barra de progresso
  progressLabel?: string;
  action?: ReactNode; // ex.: lápis de editar meta (somente dono)
}

export function StatCard({
  label,
  description,
  icon,
  value,
  accent = 'cyan',
  progress,
  progressLabel,
  action,
}: StatCardProps) {
  const a = ACCENTS[accent];

  return (
    <div
      className={`relative overflow-hidden flex h-full flex-col justify-center rounded-xl border bg-[#0d1117]/80 py-3 px-3 sm:px-[14px] pb-3 transition-colors ${a.border}`}
    >
      {/* Cabeçalho: ícone · texto · valor */}
      <div className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto] sm:grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-2 sm:gap-2.5">
        <span
          className={`flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg ${a.iconBg}`}
          aria-hidden="true"
        >
          {icon}
        </span>

        <div className="min-w-0">
          <p className="truncate text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wide text-[#c9d1d9] min-w-0">{label}</p>
          <p className="truncate text-[10px] min-[390px]:text-[11px] sm:text-xs leading-snug text-[#9aa4b2]" title={description}>
            {description}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1">
          {action}
          <div className="whitespace-nowrap text-right font-mono text-base min-[390px]:text-[17px] font-bold tabular-nums leading-none text-[#f0f6fc] sm:text-xl lg:text-[22px]">
            {value}
          </div>
        </div>
      </div>

      {/* Barra de progresso (apenas META ANUAL): logo abaixo do cabeçalho */}
      {typeof progress === 'number' && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#21262d]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22d3ee] to-[#a855f7] transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          {progressLabel && (
            <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-[#9aa4b2]">
              {progressLabel}
            </span>
          )}
        </div>
      )}

      {/* Linha fina colorida de acento colada na base do cartão */}
      <div className={`absolute bottom-0 left-0 right-0 h-[2px] w-full opacity-40 ${a.bar}`} aria-hidden="true" />
    </div>
  );
}

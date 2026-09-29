import React, { useEffect, useState } from 'react';

interface DurationInputProps {
  /** Tempo total em minutos */
  minutes: number;
  onChange: (minutes: number) => void;
  className?: string;
}

const toMinutes = (h: string, m: string) =>
  (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);

/**
 * Campo de duração com horas e minutos separados.
 * Digitar 0 horas e 45 minutos grava exatamente 45 minutos (sem arredondar).
 */
export const DurationInput: React.FC<DurationInputProps> = ({ minutes, onChange, className = '' }) => {
  const [h, setH] = useState(String(Math.floor(minutes / 60)));
  const [m, setM] = useState(String(minutes % 60));

  // Se o valor mudar por fora (ex.: abrir outro jogo), atualiza os campos
  useEffect(() => {
    if (toMinutes(h, m) !== minutes) {
      setH(String(Math.floor(minutes / 60)));
      setM(String(minutes % 60));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minutes]);

  const update = (nh: string, nm: string) => {
    setH(nh);
    setM(nm);
    onChange(Math.max(0, toMinutes(nh, nm)));
  };

  const normalize = () => {
    const total = toMinutes(h, m);
    setH(String(Math.floor(total / 60)));
    setM(String(total % 60));
  };

  const boxClass =
    'w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2.5 text-base text-white text-center font-semibold tabular-nums focus:outline-none focus:border-cyan-500';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Horas"
          value={h}
          onFocus={(e) => e.target.select()}
          onChange={(e) => update(e.target.value.replace(/\D/g, '').slice(0, 4), m)}
          onBlur={normalize}
          className={boxClass}
        />
        <span className="block text-center text-[10px] uppercase tracking-wider text-slate-500 mt-1">horas</span>
      </div>
      <span className="pb-4 text-slate-500 font-bold">:</span>
      <div className="flex-1">
        <input
          type="text"
          inputMode="numeric"
          aria-label="Minutos"
          value={m}
          onFocus={(e) => e.target.select()}
          onChange={(e) => update(h, e.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={normalize}
          className={boxClass}
        />
        <span className="block text-center text-[10px] uppercase tracking-wider text-slate-500 mt-1">min</span>
      </div>
    </div>
  );
};

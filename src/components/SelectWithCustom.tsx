import React, { useState, useMemo, useRef, useEffect } from 'react';
import { normalizeConsoleName } from '../utils/markdownParser';
import { showToast } from '../utils/toast';

export interface SelectWithCustomProps {
  id: string;
  label: string;
  value: string;
  onChange: (newValue: string) => void;
  presets: string[];
  libraryValues: string[];
  type: 'console' | 'genero';
  required?: boolean;
}

const ADD_CUSTOM_SENTINEL = '__ADD_CUSTOM_OPTION__';

export const SelectWithCustom: React.FC<SelectWithCustomProps> = ({
  id,
  label,
  value,
  onChange,
  presets,
  libraryValues,
  type,
  required = true,
}) => {
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');
  const [locallyAdded, setLocallyAdded] = useState<string[]>([]);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Normalize and deduplicate options: presets + library + locally added + current value
  const options = useMemo(() => {
    const map = new Map<string, string>();

    const addVal = (val?: string | null) => {
      if (!val) return;
      const clean = val.trim();
      if (!clean) return;

      if (type === 'console') {
        const canonical = normalizeConsoleName(clean);
        const key = canonical.toLowerCase();
        if (!map.has(key)) {
          map.set(key, canonical);
        }
      } else {
        const key = clean.toLowerCase();
        if (!map.has(key)) {
          map.set(key, clean);
        }
      }
    };

    presets.forEach(addVal);
    libraryValues.forEach(addVal);
    locallyAdded.forEach(addVal);
    if (value) {
      addVal(value);
    }

    const list = Array.from(map.values());
    list.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
    return list;
  }, [presets, libraryValues, locallyAdded, value, type]);

  // Focus custom input when opened
  useEffect(() => {
    if (isAddingCustom) {
      const timer = setTimeout(() => {
        if (customInputRef.current) {
          customInputRef.current.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAddingCustom]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (selected === ADD_CUSTOM_SENTINEL) {
      setIsAddingCustom(true);
      setCustomInput('');
      setCustomError('');
    } else {
      setIsAddingCustom(false);
      setCustomError('');
      onChange(selected);
    }
  };

  const handleConfirmCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      setCustomError('O nome deve ter entre 2 e 40 caracteres.');
      return;
    }

    // Check if it matches an existing option
    const canonicalInput = type === 'console' ? normalizeConsoleName(trimmed) : trimmed;
    const existing = options.find((opt) => {
      if (type === 'console') {
        return normalizeConsoleName(opt).toLowerCase() === canonicalInput.toLowerCase();
      }
      return opt.toLowerCase() === canonicalInput.toLowerCase();
    });

    if (existing) {
      showToast('Já existe, selecionado', 'info');
      onChange(existing);
      setIsAddingCustom(false);
      setCustomInput('');
      setCustomError('');
      return;
    }

    // Add new custom option
    setLocallyAdded((prev) => [...prev, canonicalInput]);
    onChange(canonicalInput);
    setIsAddingCustom(false);
    setCustomInput('');
    setCustomError('');
  };

  const handleCancelCustom = () => {
    setIsAddingCustom(false);
    setCustomInput('');
    setCustomError('');
  };

  const addOptionLabel =
    type === 'console' ? '➕ Adicionar outro console…' : '➕ Adicionar outro gênero…';

  // Find corresponding canonical option in the options list
  const selectedOptionValue = useMemo(() => {
    if (isAddingCustom) return ADD_CUSTOM_SENTINEL;
    if (!value) return options[0] || '';

    // Direct exact match
    if (options.includes(value)) return value;

    // Canonical console match (e.g. "PS5" -> "PlayStation 5")
    if (type === 'console') {
      const canonical = normalizeConsoleName(value);
      if (options.includes(canonical)) return canonical;
    }

    // Case-insensitive match
    const lower = value.trim().toLowerCase();
    const found = options.find((opt) => opt.toLowerCase() === lower);
    if (found) return found;

    return value;
  }, [isAddingCustom, value, options, type]);

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-bold uppercase tracking-wider text-white mb-1.5"
      >
        {label} {required && '*'}
      </label>

      {/* Native <select>: font-size 16px on mobile prevents zoom and uses native picker wheel */}
      <select
        id={id}
        value={selectedOptionValue}
        onChange={handleSelectChange}
        required={required}
        className="w-full min-h-[44px] rounded-lg border border-[#30363d] bg-[#0d1117] px-3.5 py-2 text-[16px] sm:text-sm text-white focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none cursor-pointer transition-colors"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#161b22] text-white">
            {opt}
          </option>
        ))}
        <option
          value={ADD_CUSTOM_SENTINEL}
          className="bg-[#161b22] font-semibold text-[#22d3ee]"
        >
          {addOptionLabel}
        </option>
      </select>

      {/* Custom input section when "Adicionar outro..." is chosen */}
      {isAddingCustom && (
        <div className="pt-1.5 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customInput}
              onChange={(e) => {
                setCustomInput(e.target.value);
                if (customError) setCustomError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirmCustom();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelCustom();
                }
              }}
              placeholder={
                type === 'console'
                  ? 'Nome do console (ex: Dreamcast)...'
                  : 'Nome do gênero (ex: Hack and Slash)...'
              }
              className="flex-1 min-h-[44px] rounded-lg border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-[16px] sm:text-sm text-white placeholder-[#8b949e] focus:border-[#22d3ee] focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleConfirmCustom}
              className="min-h-[44px] px-4 rounded-lg bg-[#22d3ee] hover:bg-[#06b6d4] text-xs font-black uppercase tracking-wider text-[#0d1117] cursor-pointer transition-all shrink-0"
            >
              Adicionar
            </button>
            <button
              type="button"
              onClick={handleCancelCustom}
              className="min-h-[44px] px-3 rounded-lg border border-[#30363d] text-xs font-bold text-[#8b949e] hover:text-white cursor-pointer transition-colors shrink-0"
            >
              Cancelar
            </button>
          </div>

          {customError && (
            <p className="text-xs text-rose-400 font-medium pl-1">{customError}</p>
          )}
        </div>
      )}
    </div>
  );
};

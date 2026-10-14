import React, { useState, useEffect, useRef } from 'react';
import { Search, Image, Check, RefreshCw, X, KeyRound, Sparkles } from 'lucide-react';
import { searchGameCovers, normalizeCoverUrl, CoverSearchResult } from '../utils/coverSearch';
import { isIgdbConfigured } from '../utils/igdbService';
import { IgdbConfigModal } from './IgdbConfigModal';

interface CoverPickerProps {
  gameTitle: string;
  coverUrl: string;
  onChangeCoverUrl: (url: string) => void;
}

export const CoverPicker: React.FC<CoverPickerProps> = ({
  gameTitle,
  coverUrl,
  onChangeCoverUrl,
}) => {
  const [results, setResults] = useState<CoverSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isIgdbModalOpen, setIsIgdbModalOpen] = useState(false);
  const [hasIgdb, setHasIgdb] = useState(() => isIgdbConfigured());
  const lastSearchedTitle = useRef('');

  // Auto-search when gameTitle is entered or changed (debounced)
  useEffect(() => {
    const cleanTitle = gameTitle.trim();
    if (cleanTitle.length >= 3 && cleanTitle !== lastSearchedTitle.current) {
      const timer = setTimeout(() => {
        handleSearch(cleanTitle);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [gameTitle]);

  // Reset image error when URL changes
  useEffect(() => {
    setImageError(false);
  }, [coverUrl]);

  const handleSearch = async (termToSearch: string) => {
    const clean = termToSearch.trim();
    if (!clean) return;

    lastSearchedTitle.current = clean;
    setIsSearching(true);
    setHasSearched(true);

    try {
      const found = await searchGameCovers(clean);
      setResults(found);

      // If user has no cover yet and we found results, auto-select the best match
      if (!coverUrl && found.length > 0) {
        onChangeCoverUrl(normalizeCoverUrl(found[0].url));
      }
    } catch (err) {
      console.error('Failed to search covers:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCover = (url: string) => {
    const normalized = normalizeCoverUrl(url);
    onChangeCoverUrl(normalized);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChangeCoverUrl(normalizeCoverUrl(val));
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-3.5 sm:p-4">
      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Image className="h-4 w-4 text-[#22d3ee]" aria-hidden="true" />
          <label htmlFor="cover-url-input" className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">
            Capa do Jogo
          </label>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* IGDB Status / Config Button */}
          <button
            type="button"
            onClick={() => setIsIgdbModalOpen(true)}
            className={`min-h-[32px] inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase cursor-pointer border transition-colors ${
              hasIgdb
                ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#10b981] hover:bg-[#10b981]/20'
                : 'bg-white/5 border-[#30363d] text-[#9aa4b2] hover:text-white hover:border-[#22d3ee]'
            }`}
            title="Configurar credenciais da API do IGDB / Twitch"
          >
            {hasIgdb ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span>IGDB Conectado</span>
              </>
            ) : (
              <>
                <KeyRound className="h-3 w-3" />
                <span>Conectar API IGDB</span>
              </>
            )}
          </button>

          {gameTitle.trim() && (
            <button
              type="button"
              onClick={() => handleSearch(gameTitle)}
              disabled={isSearching}
              className="min-h-[32px] inline-flex items-center gap-1.5 rounded-lg border border-[#22d3ee]/40 bg-[#22d3ee]/10 px-3 py-1 text-xs font-bold uppercase text-[#22d3ee] hover:bg-[#22d3ee]/20 focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none transition-all disabled:opacity-50 cursor-pointer"
              title="Buscar capas oficiais para este título"
            >
              {isSearching ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Search className="h-3 w-3" aria-hidden="true" />
                  <span>Buscar Capas</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="text-xs text-[#9aa4b2] hover:text-white transition-colors underline cursor-pointer p-1"
          >
            {showSearchInput ? 'Ocultar' : 'Outro termo'}
          </button>
        </div>
      </div>

      {/* ── CUSTOM SEARCH INPUT ── */}
      {showSearchInput && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSearch(searchTerm || gameTitle);
              }
            }}
            placeholder="Digite o nome do jogo (Ex: Resident Evil 4)..."
            className="flex-1 min-h-[44px] rounded-xl border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => handleSearch(searchTerm || gameTitle)}
            disabled={isSearching || (!searchTerm.trim() && !gameTitle.trim())}
            className="min-h-[44px] rounded-xl bg-[#22d3ee] px-4 py-2 text-xs font-bold text-[#0d1117] hover:bg-[#67e8f9] transition-all disabled:opacity-50 cursor-pointer"
          >
            Buscar
          </button>
        </div>
      )}

      {/* ── SEARCH RESULTS THUMBNAILS CAROUSEL ── */}
      {isSearching ? (
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-[#9aa4b2]">
          <RefreshCw className="h-4 w-4 animate-spin text-[#22d3ee]" aria-hidden="true" />
          <span>Buscando capas oficiais para "{lastSearchedTitle.current}"...</span>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#9aa4b2]">
            <span>Toque para selecionar a capa desejada:</span>
            <span className="text-[#22d3ee] font-bold">{results.length} encontradas</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-thin">
            {results.map((item, idx) => {
              const isSelected = coverUrl === item.url;
              return (
                <button
                  type="button"
                  key={`${item.id}-${idx}`}
                  onClick={() => handleSelectCover(item.url)}
                  className={`group relative flex-shrink-0 w-24 rounded-xl border p-1 transition-all cursor-pointer text-left focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus-visible:outline-none ${
                    isSelected
                      ? 'border-[#22d3ee] bg-[#22d3ee]/15 ring-2 ring-[#22d3ee]/50 shadow-md shadow-[#22d3ee]/20'
                      : 'border-[#30363d] bg-[#161b22] hover:border-slate-400'
                  }`}
                >
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
                    <img
                      src={item.url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#22d3ee] text-[#0d1117] shadow-md">
                        <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs font-bold text-white truncate px-0.5" title={item.title}>
                    {item.title}
                  </div>
                  {item.source && (
                    <div className="text-xs text-[#22d3ee] font-mono px-0.5 truncate">
                      {item.source}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : hasSearched ? (
        <div className="rounded-xl border border-dashed border-[#30363d] p-3 text-center text-xs text-[#9aa4b2]">
          Nenhuma capa encontrada automaticamente. Cole a URL da imagem abaixo ou configure a API do IGDB.
        </div>
      ) : null}

      {/* ── EDITABLE COVER URL INPUT & PREVIEW ── */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-[#9aa4b2]">
          <span>URL da Capa (Editável):</span>
          {coverUrl && (
            <button
              type="button"
              onClick={() => onChangeCoverUrl('')}
              className="text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1">
            <input
              id="cover-url-input"
              type="url"
              value={coverUrl}
              onChange={handleInputChange}
              placeholder="https://... ou ID IGDB (Ex: co3i89)"
              className="w-full min-h-[44px] rounded-xl border border-[#30363d] bg-[#161b22] px-3.5 py-2 text-base md:text-sm text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-[#22d3ee] focus:outline-none font-mono"
            />
          </div>

          {/* Live Cover Preview */}
          <div className="h-12 w-9 rounded-lg overflow-hidden bg-black flex-shrink-0 border border-[#30363d] shadow-md relative">
            {coverUrl && !imageError ? (
              <img
                src={coverUrl}
                alt="Pré-visualização da Capa"
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-900 text-slate-600">
                <Image className="h-4 w-4" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL DE CONFIGURAÇÃO DO IGDB ── */}
      <IgdbConfigModal
        isOpen={isIgdbModalOpen}
        onClose={() => setIsIgdbModalOpen(false)}
        onSaved={() => {
          setHasIgdb(isIgdbConfigured());
          if (gameTitle.trim()) {
            handleSearch(gameTitle);
          }
        }}
      />
    </div>
  );
};

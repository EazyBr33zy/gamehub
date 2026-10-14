import React from 'react';

export const SkeletonView: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse" aria-busy="true" aria-label="Carregando conteúdo...">
      {/* Top Banner Skeleton */}
      <div className="h-44 sm:h-56 w-full rounded-2xl bg-[#161b22] border border-[#30363d]/40 p-6 flex flex-col justify-between">
        <div className="space-y-2.5">
          <div className="h-4 w-32 rounded bg-[#21262d]" />
          <div className="h-8 w-64 rounded bg-[#21262d]" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-xl bg-[#21262d]" />
          <div className="h-10 w-28 rounded-xl bg-[#21262d]" />
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[#161b22] border border-[#30363d]/40 p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-[#21262d]" />
            <div className="h-6 w-16 rounded bg-[#21262d]" />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-[#161b22] border border-[#30363d]/40 p-2 flex flex-col justify-end">
            <div className="h-3 w-3/4 rounded bg-[#21262d] mb-1.5" />
            <div className="h-2.5 w-1/2 rounded bg-[#21262d]" />
          </div>
        ))}
      </div>
    </div>
  );
};

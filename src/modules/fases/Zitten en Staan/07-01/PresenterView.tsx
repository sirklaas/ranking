"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading } from '@/lib/fases/hooks';

const PresenterView: React.FC<FaseCommonProps> = ({ faseKey }) => {
  const { data, loading, error } = useHeading(faseKey);

  return (
    <div className="w-full h-full flex flex-col text-white" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="text-xs uppercase tracking-wide opacity-70 mb-2">Presenter · Zitten en Staan</div>
      {loading && <div className="text-sm">Loading…</div>}
      {error && <div className="text-sm text-red-400">{error}</div>}
      {data && (
        <div className="flex-1 rounded border border-gray-700 p-4 bg-black/40">
          <div className="text-2xl font-light mb-2">{data.heading || '—'}</div>
          <div className="text-xs opacity-70">Fase: {faseKey}</div>
        </div>
      )}
    </div>
  );
};

export default PresenterView;

"use client";
import React, { useState } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { useHeading } from '@/lib/fases/hooks';

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey }) => {
  const { data } = useHeading(faseKey);
  const [choice, setChoice] = useState<'zitten' | 'staan' | null>(null);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-white p-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="text-2xl font-light mb-6 text-center">{data?.heading || 'Zitten of Staan?'}</div>
      <div className="flex gap-6">
        <button
          className="px-6 py-3 rounded bg-[#0A1752] text-white text-lg"
          onClick={() => setChoice('zitten')}
        >
          Zitten
        </button>
        <button
          className="px-6 py-3 rounded bg-[#0A1752] text-white text-lg"
          onClick={() => setChoice('staan')}
        >
          Staan
        </button>
      </div>
      {choice && <div className="mt-6 text-base opacity-80">Je koos: {choice}</div>}
    </div>
  );
};

export default PlayerView;

'use client';

import React from 'react';

interface CreepyRankingLogoProps {
  className?: string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CreepyRankingLogo({
  className = '',
  showSubtitle = true,
  size = 'md',
}: CreepyRankingLogoProps) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const titleSize = isSm
    ? 'text-xl sm:text-2xl'
    : isLg
    ? 'text-3xl sm:text-4xl'
    : 'text-2xl sm:text-3xl';

  const pumpkinSize = isSm ? 'text-xl sm:text-2xl' : isLg ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl';

  return (
    <div className={`flex items-center justify-center gap-2.5 select-none ${className}`}>
      <span className={`${pumpkinSize} animate-bounce`} style={{ animationDuration: '2.5s' }}>
        🎃
      </span>
      <div className="flex flex-col items-center justify-center">
        <span
          className={`text-orange-500 ${titleSize} font-normal uppercase tracking-wider leading-none`}
          style={{
            fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
            textShadow:
              '0 0 16px rgba(255, 117, 24, 0.95), 0 0 30px rgba(255, 69, 0, 0.8), 0 2px 4px rgba(0,0,0,0.95)',
          }}
        >
          Creepy Ranking
        </span>
        {showSubtitle && (
          <span
            className="text-[10px] sm:text-[11px] font-mono tracking-[0.35em] text-orange-300 uppercase mt-1"
            style={{ textShadow: '0 0 10px rgba(255,117,24,0.6)' }}
          >
            Halloween Edition
          </span>
        )}
      </div>
      <span
        className={`${pumpkinSize} animate-bounce`}
        style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
      >
        🎃
      </span>
    </div>
  );
}

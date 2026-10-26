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
  const isLg = size === 'lg';

  // Responsive font sizes: on phone it spans across 90% width, bold and crisp
  const titleSize = isLg
    ? 'text-4xl sm:text-5xl md:text-6xl'
    : 'text-[28px] sm:text-3xl md:text-4xl';

  const pumpkinSize = isLg ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl';

  return (
    <div className={`w-[90%] mx-auto flex flex-col items-center justify-center select-none text-center ${className}`}>
      {/* Title Words */}
      <span
        className={`w-full text-orange-500 ${titleSize} font-normal uppercase tracking-wider leading-none block whitespace-nowrap`}
        style={{
          fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
          textShadow:
            '0 0 16px rgba(255, 117, 24, 0.95), 0 0 30px rgba(255, 69, 0, 0.8), 0 2px 4px rgba(0,0,0,0.95)',
        }}
      >
        Creepy Ranking
      </span>

      {/* Pumpkins BELOW the words */}
      <div className="flex items-center justify-center gap-3 mt-1.5">
        <span className={`${pumpkinSize} animate-bounce`} style={{ animationDuration: '2.5s' }}>
          🎃
        </span>
        {showSubtitle && (
          <span
            className="text-[11px] sm:text-xs md:text-sm font-mono tracking-[0.35em] text-orange-300 uppercase"
            style={{ textShadow: '0 0 10px rgba(255,117,24,0.6)' }}
          >
            Halloween Edition
          </span>
        )}
        <span
          className={`${pumpkinSize} animate-bounce`}
          style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
        >
          🎃
        </span>
      </div>
    </div>
  );
}

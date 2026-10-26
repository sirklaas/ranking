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
}: CreepyRankingLogoProps) {
  return (
    <div className={`w-full flex flex-col items-center justify-center select-none text-center ${className}`}>
      {/* 90% Width Vector Title: Spans 90% of screen on all phones */}
      <div className="w-[90%] max-w-[520px] mx-auto flex items-center justify-center">
        <svg
          viewBox="0 0 520 62"
          className="w-full h-auto overflow-visible select-none"
        >
          <text
            x="50%"
            y="48"
            textAnchor="middle"
            className="fill-orange-500 font-normal uppercase"
            style={{
              fontFamily: '"BrewHouse-Aged", "BrewHouse", Impact, sans-serif',
              fontSize: '56px',
              letterSpacing: '0.05em',
              filter:
                'drop-shadow(0 0 16px rgba(255, 117, 24, 0.95)) drop-shadow(0 0 30px rgba(255, 69, 0, 0.8)) drop-shadow(0 2px 4px rgba(0,0,0,0.95))',
            }}
          >
            CREEPY RANKING
          </text>
        </svg>
      </div>

      {/* Pumpkins BELOW the Words */}
      <div className="flex items-center justify-center gap-3 mt-1">
        <span className="text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '2.5s' }}>
          🎃
        </span>
        {showSubtitle && (
          <span
            className="text-xs sm:text-sm md:text-base font-mono font-bold tracking-[0.35em] text-orange-300 uppercase"
            style={{ textShadow: '0 0 10px rgba(255,117,24,0.7)' }}
          >
            Halloween Edition
          </span>
        )}
        <span
          className="text-2xl sm:text-3xl animate-bounce"
          style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}
        >
          🎃
        </span>
      </div>
    </div>
  );
}

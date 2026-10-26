'use client';

import React, { useState, useEffect } from 'react';

interface SpookyTrailerTitleProps {
  faseKey: string;
  customHeading?: string;
  delayMs?: number;
  fontChoice?: 'BrewHouse-Aged' | 'BrewHouse' | 'BrewHouse-Full' | 'Creepster' | 'Barlow';
}

const TRAILER_TITLES: Record<string, string> = {
  '07/01': 'ZITTEN EN STAAN',
  '10/01': 'DE TOP 3',
  '13/01': 'KRAKENDE KARAKTERS',
  '17/01': 'DE TOP 10',
  '20/01': 'DE FINALE',
};

export default function SpookyTrailerTitle({
  faseKey,
  customHeading,
  delayMs = 6000,
  fontChoice = 'BrewHouse-Aged',
}: SpookyTrailerTitleProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      setVisible(true);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [faseKey, delayMs]);

  // Use defined trailer title first, or customHeading if provided
  const title = TRAILER_TITLES[faseKey] || customHeading || '';
  if (!title) return null;

  const fontFamilies: Record<string, string> = {
    'BrewHouse-Aged': '"BrewHouse-Aged", "BrewHouse", Impact, sans-serif',
    'BrewHouse': '"BrewHouse", Impact, sans-serif',
    'BrewHouse-Full': '"BrewHouse-Full", "BrewHouse", Impact, sans-serif',
    'Creepster': '"Creepster", cursive, sans-serif',
    'Barlow': '"Barlow Semi Condensed", Impact, sans-serif',
  };

  const selectedFont = fontFamilies[fontChoice] || fontFamilies['BrewHouse-Aged'];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start pt-10 sm:pt-14 md:pt-20 lg:pt-24 pointer-events-none z-30 overflow-hidden">
      {/* Top 1/3 dark atmospheric gradient for text clarity */}
      <div
        className={`absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-1000 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Animated title card - positioned in the upper 1/3 */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 max-w-5xl transition-all duration-1000 ease-out transform ${
          visible
            ? 'opacity-100 scale-100 translate-y-0 blur-none'
            : 'opacity-0 scale-90 -translate-y-6 blur-md'
        }`}
      >
        {/* Halloween badge */}
        <div className="flex items-center space-x-3 mb-2 md:mb-3">
          <span className="text-orange-500 text-xl md:text-2xl animate-pulse">🎃</span>
          <span
            className="text-orange-400 font-extrabold tracking-[0.35em] text-sm md:text-lg uppercase"
            style={{
              textShadow: '0 0 16px rgba(255, 117, 24, 0.9), 0 0 30px rgba(255, 69, 0, 0.8)',
              fontFamily: '"Barlow Semi Condensed", sans-serif',
            }}
          >
            Creepy Ranking Show
          </span>
          <span className="text-orange-500 text-xl md:text-2xl animate-pulse">🎃</span>
        </div>

        {/* Big Grungy Phase Heading */}
        <h1
          className="text-white font-normal uppercase tracking-wider text-5xl sm:text-6xl md:text-8xl lg:text-9xl whitespace-pre-line leading-none"
          style={{
            fontFamily: selectedFont,
            letterSpacing: '0.05em',
            textShadow:
              '0 0 25px rgba(255, 117, 24, 0.95), 0 0 50px rgba(220, 38, 38, 0.85), 0 6px 20px rgba(0, 0, 0, 0.95)',
            filter: 'drop-shadow(0 10px 30px rgba(0, 0, 0, 0.95))',
          }}
        >
          {title}
        </h1>

        {/* Spooky Glowing Line Accent */}
        <div className="mt-4 md:mt-6 flex items-center justify-center space-x-4 w-full max-w-md">
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_#ff7518]" />
          <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_12px_#ff7518] animate-ping" />
          <div className="flex-1 h-0.5 bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_15px_#ff7518]" />
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';

interface KrakendeDisplayProps {
  state: KrakendeState;
  allPlayerNames?: string[];
  sessionId?: string;
}

const SFX_LIST = [
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Wood_Pluck.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Perc.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Point.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Steel_Hit.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Underwater.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Glass.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Can.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Digi.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Sting.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Dream.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Dissonant.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Fright.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_80s.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Aah.m4a',
  '/sfx/krakende/FLSM_CIN_Fx_One_Shot_Accent_Deep.m4a',
];

function playKeynoteSound(idx: number) {
  try {
    const src = SFX_LIST[idx % SFX_LIST.length];
    const audio = new Audio(src);
    audio.volume = 0.7;
    audio.play().catch(() => {});
  } catch {
    // silent
  }
}

// Generate an array of 24 indices shuffled randomly: e.g. [14, 2, 21, 5, ...]
function generateRandomOrder(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function KrakendeDisplay({ state, allPlayerNames = [], sessionId }: KrakendeDisplayProps) {
  // Inject keyframe animation once
  useEffect(() => {
    if (document.getElementById('krakende-kf')) return;
    const s = document.createElement('style');
    s.id = 'krakende-kf';
    s.textContent = `
      @keyframes krakendePop {
        0%   { transform: scale(0.3); opacity: 0; }
        60%  { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(s);
  }, []);

  const totalPlayers = allPlayerNames.length;
  const isPositive = state.phase.includes('positive');
  const isResults = state.phase.endsWith('-results');
  const traits = (isPositive ? state.positiveTraits : state.negativeTraits).slice(0, 24);

  // Poll live vote count
  const [voteCount, setVoteCount] = useState(0);
  useEffect(() => {
    if (!sessionId) return;
    const fase = isPositive ? 'positive' : 'negative';
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/krakende-vote?sessionId=${encodeURIComponent(sessionId)}&fase=${encodeURIComponent(fase)}`);
        if (!active || !res.ok) return;
        const data = await res.json();
        setVoteCount(data.votes?.length || 0);
      } catch {
        /* silent */
      }
    };
    poll();
    const timer = setInterval(poll, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionId, isPositive]);

  // RANDOM POPUP LOGIC:
  // We keep a random permutation of indices, and reveal one random tile at a time
  const randomOrderRef = useRef<number[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [latestRevealedIndex, setLatestRevealedIndex] = useState<number | null>(null);

  // Reset or initialize random sequence when phase changes
  useEffect(() => {
    if (isResults) {
      // Results: all 24 tiles immediately visible
      setRevealedSet(new Set(Array.from({ length: traits.length }, (_, i) => i)));
      setLatestRevealedIndex(null);
    } else {
      // Voting: start random build
      const order = generateRandomOrder(traits.length);
      randomOrderRef.current = order;
      setRevealedSet(new Set());
      setLatestRevealedIndex(null);

      // Play intro sound if positive
      try {
        const intro = new Audio('/sfx/krakende/Agile_Funk_Synth_Lead.m4a');
        intro.volume = 0.5;
        intro.play().catch(() => {});
      } catch {
        /* silent */
      }
    }
  }, [state.phase, isResults, traits.length]);

  // Interval: reveal the next random tile one by one
  useEffect(() => {
    if (isResults) return;
    if (revealedSet.size >= traits.length) return;

    const timer = setInterval(() => {
      const order = randomOrderRef.current;
      const currentCount = revealedSet.size;
      if (currentCount >= order.length) return;

      const nextTileIndex = order[currentCount];
      playKeynoteSound(currentCount);

      setLatestRevealedIndex(nextTileIndex);
      setRevealedSet((prev) => {
        const updated = new Set(prev);
        updated.add(nextTileIndex);
        return updated;
      });
    }, 450); // ~0.45s between each random pop

    return () => clearInterval(timer);
  }, [isResults, revealedSet, traits.length]);

  return (
    <div
      className="min-h-screen w-screen flex flex-col justify-between select-none"
      style={{
        background: isPositive
          ? 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 35%, #fde047 100%)'
          : 'linear-gradient(180deg, #ea580c 0%, #f97316 40%, #fb923c 100%)',
        fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif',
      }}
    >
      {/* Hero Banner spanning 100% full screen width */}
      <div
        className="relative w-full h-24 md:h-28 bg-cover bg-center bg-no-repeat flex items-center justify-between px-8 border-b-2 border-purple-300/40 mb-3 shrink-0 shadow-2xl"
        style={{ backgroundImage: 'url(/assets/band.webp)' }}
      >
        {/* Logo - Left */}
        <div className="flex items-center z-10">
          <img
            src="/assets/ranking_logo.webp"
            alt="Ranking Logo"
            className="h-18 md:h-24 w-auto object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
          />
        </div>

        {/* Right: Live Vote Tracker Badge */}
        {!isResults && (
          <div className="z-10 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/30 shadow-xl flex items-center gap-3">
            <span className="text-white/90 font-bold tracking-wider text-base uppercase">Gekozen:</span>
            <span className={isPositive ? 'text-amber-300 font-black text-3xl' : 'text-orange-300 font-black text-3xl'}>
              {voteCount} / {totalPlayers || '–'}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-between px-8 pb-8">

      {/* HEADING PLACED DIRECTLY UNDER THE BANNER */}
      <div className="px-4 pb-2">
        <h1
          className="text-white font-normal uppercase tracking-tight leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
          style={{
            fontFamily: '"Barlow Semi Condensed", sans-serif',
            fontWeight: 400,
            fontSize: 'clamp(3.2rem, 5.2vw, 5.5rem)',
            letterSpacing: '0.01em',
          }}
        >
          {isResults
            ? isPositive
              ? 'RESULTATEN GOEDE EIGENSCHAPPEN'
              : 'RESULTATEN MINDER GOEDE EIGENSCHAPPEN'
            : isPositive
            ? '24 GOEDE EIGENSCHAPPEN'
            : '24 MINDER GOEDE EIGENSCHAPPEN'}
        </h1>
      </div>

      {/* 6 Columns x 4 Rows Grid with Random Popups */}
      <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-3 px-4 pb-4">
        {traits.map((trait, i) => {
          const isRevealed = isResults || revealedSet.has(i);
          const isLatest = i === latestRevealedIndex && !isResults;

          const line1 = trait.line1 || trait.nl.split(' ')[0] || trait.nl;
          const line2 =
            trait.line2 !== undefined
              ? trait.line2
              : trait.nl.split(' ').slice(1).join(' ');

          if (!isRevealed) {
            return (
              <div
                key={trait.id}
                className="rounded-lg opacity-0 pointer-events-none"
              />
            );
          }

          return (
            <div
              key={trait.id}
              className={`rounded-lg flex flex-col items-center justify-center p-3 text-center shadow-lg border-2 transition-all ${
                isPositive
                  ? 'bg-[#fed766] border-black/30'
                  : 'bg-[#fb923c] border-black/30'
              }`}
              style={{
                animation: isLatest ? 'krakendePop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
              }}
            >
              {/* Font Weight: 400 (regular) per request */}
              <div
                className="text-black font-normal tracking-tight leading-tight"
                style={{
                  fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(1.1rem, 1.7vw, 1.95rem)',
                }}
              >
                <div>{line1}</div>
                {line2 && <div className="mt-1">{line2}</div>}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

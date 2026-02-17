'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel, shuffleTraits } from '@/modules/krakende-karakters/logic';

interface KrakendeDisplayProps {
  state: KrakendeState;
}

// Popup sound effect (Web Audio API)
function playPopSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // silent
  }
}

// Bright colors for trait tiles
const TILE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#76D7C4', '#F8C471', '#AED6F1', '#D7BDE2',
  '#A3E4D7', '#FAD7A0', '#ABEBC6', '#D2B4DE', '#AED6F1',
  '#F9E79F', '#A9DFBF', '#F5B7B1', '#D6EAF8',
];

export default function KrakendeDisplay({ state }: KrakendeDisplayProps) {
  const isPositive = state.phase === 'positive-voting' || state.phase === 'positive-results';
  const isResults = state.phase === 'positive-results' || state.phase === 'negative-results';
  const traits = isPositive ? state.positiveTraits : state.negativeTraits;

  // Shuffle traits once per phase (stable order via ref)
  const shuffledRef = useRef<typeof traits>([]);
  const phaseRef = useRef(state.phase);
  if (phaseRef.current !== state.phase || shuffledRef.current.length === 0) {
    shuffledRef.current = shuffleTraits(traits);
    phaseRef.current = state.phase;
  }
  const shuffled = shuffledRef.current;

  // Track last revealed index to play sound on new reveals
  const lastRevealedRef = useRef(0);
  useEffect(() => {
    if (state.revealedIndex > lastRevealedRef.current && !isResults) {
      playPopSound();
    }
    lastRevealedRef.current = state.revealedIndex;
  }, [state.revealedIndex, isResults]);

  // For results: map traitId → submissions
  const getSubmissionsForTrait = useCallback(
    (traitId: string) => {
      return state.submissions.filter((s) =>
        isPositive ? s.positiveTrait === traitId : s.negativeTrait === traitId
      );
    },
    [state.submissions, isPositive]
  );

  // Results view: show all traits with who chose them
  if (isResults) {
    return (
      <div
        className="min-h-screen p-8 flex flex-col"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: isPositive
            ? 'linear-gradient(135deg, #0A1752 0%, #1a3a6b 50%, #2d5a4e 100%)'
            : 'linear-gradient(135deg, #0A1752 0%, #4a1a3a 50%, #6b1a1a 100%)',
        }}
      >
        <h1
          className="text-center text-white mb-8"
          style={{ fontSize: '3rem', fontWeight: 700 }}
        >
          {isPositive ? 'Goede Geinige Eigenschappen' : 'Misschien iets Minder goede Eigenschappen'}
        </h1>

        <div className="grid grid-cols-4 gap-4 flex-1 auto-rows-min">
          {traits.map((trait, i) => {
            const subs = getSubmissionsForTrait(trait.id);
            const color = TILE_COLORS[i % TILE_COLORS.length];
            return (
              <div
                key={trait.id}
                className="rounded-xl p-4 flex flex-col shadow-lg"
                style={{
                  backgroundColor: color,
                  opacity: subs.length > 0 ? 1 : 0.4,
                  transition: 'all 0.3s ease',
                }}
              >
                <div className="text-lg font-bold text-gray-900 mb-2">
                  {getTraitLabel(trait, state.language)}
                </div>
                {subs.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {subs.map((sub) => (
                      <span
                        key={sub.playerId}
                        className="bg-black/20 text-white text-xs px-2 py-1 rounded-full font-medium"
                      >
                        {sub.playerName}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Voting view: traits appear one by one with pop animation
  const revealed = shuffled.slice(0, state.revealedIndex);

  return (
    <div
      className="min-h-screen p-8 flex flex-col"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: isPositive
          ? 'linear-gradient(135deg, #0A1752 0%, #1a3a6b 50%, #2d5a4e 100%)'
          : 'linear-gradient(135deg, #0A1752 0%, #4a1a3a 50%, #6b1a1a 100%)',
      }}
    >
      <h1
        className="text-center text-white mb-8"
        style={{ fontSize: '3rem', fontWeight: 700 }}
      >
        {isPositive ? 'Goede Geinige Eigenschappen' : 'Misschien iets Minder goede Eigenschappen'}
      </h1>

      <div className="grid grid-cols-6 gap-3 flex-1 auto-rows-min content-start">
        {revealed.map((trait, i) => {
          const color = TILE_COLORS[i % TILE_COLORS.length];
          const isLatest = i === revealed.length - 1;
          return (
            <div
              key={trait.id}
              className="rounded-xl p-4 flex items-center justify-center text-center shadow-lg"
              style={{
                backgroundColor: color,
                animation: isLatest ? 'krakendePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                minHeight: '80px',
              }}
            >
              <span className="text-lg font-bold text-gray-900">
                {getTraitLabel(trait, state.language)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Waiting indicator when not all revealed */}
      {state.revealedIndex < shuffled.length && (
        <div className="text-center mt-4 text-white/50 text-lg">
          {state.revealedIndex} / {shuffled.length}
        </div>
      )}

      {/* Pop animation keyframes */}
      <style jsx>{`
        @keyframes krakendePop {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.2);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

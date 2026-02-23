'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel, shuffleTraits } from '@/modules/krakende-karakters/logic';

interface KrakendeDisplayProps {
  state: KrakendeState;
  totalPlayers: number;
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

export default function KrakendeDisplay({ state, totalPlayers }: KrakendeDisplayProps) {
  const isPositive = state.phase === 'positive-voting' || state.phase === 'positive-results';
  const isResults = state.phase === 'positive-results' || state.phase === 'negative-results';
  const traits = isPositive ? state.positiveTraits : state.negativeTraits;

  // Track submissions for the metric
  const posSubmissions = state.submissions.filter((s) => s.positiveTrait).length;
  const negSubmissions = state.submissions.filter((s) => s.negativeTrait).length;
  const currentSubmissions = isPositive ? posSubmissions : negSubmissions;

  // Shuffle traits once per phase (stable order via ref)
  const shuffledRef = useRef<typeof traits>([]);
  const phaseRef = useRef(state.phase);
  if (phaseRef.current !== state.phase || shuffledRef.current.length === 0) {
    shuffledRef.current = shuffleTraits(traits);
    phaseRef.current = state.phase;
  }
  const shuffled = shuffledRef.current;

  // Auto-reveal logic for Voting phases
  const [autoRevealIndex, setAutoRevealIndex] = useState(0);

  // Reset auto-reveal when phase changes, or fast-forward if it's results
  useEffect(() => {
    if (isResults) {
      setAutoRevealIndex(traits.length);
    } else {
      setAutoRevealIndex(0);
    }
  }, [state.phase, isResults, traits.length]);

  // The interval to auto-reveal traits one by one
  useEffect(() => {
    if (isResults || autoRevealIndex >= traits.length) return;

    const timer = setInterval(() => {
      setAutoRevealIndex((prev) => {
        const next = prev + 1;
        playPopSound();
        return next;
      });
    }, 1500); // 1.5 seconds between each pop

    return () => clearInterval(timer);
  }, [isResults, autoRevealIndex, traits.length]);

  // Results view: show all traits purely (no names attached)
  if (isResults) {
    return (
      <div
        className="min-h-screen p-8 flex flex-col relative"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: isPositive
            ? 'linear-gradient(135deg, #0A1752 0%, #1a3a6b 50%, #2d5a4e 100%)'
            : 'linear-gradient(135deg, #0A1752 0%, #4a1a3a 50%, #6b1a1a 100%)',
        }}
      >
        <img src="/pics/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
        <h1
          className="text-center text-white mb-8 drop-shadow-lg"
          style={{ fontSize: '3.5rem', fontWeight: 700 }}
        >
          {isPositive ? 'Alle Goede Eigenschappen' : 'Alle Minder Goede Eigenschappen'}
        </h1>

        <div className="grid grid-cols-4 gap-4 flex-1 auto-rows-min">
          {shuffled.map((trait, i) => {
            const color = TILE_COLORS[i % TILE_COLORS.length];
            return (
              <div
                key={trait.id}
                className="rounded-xl p-6 flex flex-col justify-center items-center shadow-lg transform transition-transform"
                style={{
                  backgroundColor: color,
                  minHeight: '120px',
                }}
              >
                <div className="text-2xl font-bold text-gray-900 text-center uppercase">
                  {getTraitLabel(trait, state.language)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Voting view: traits appear one by one with pop animation
  const revealed = shuffled.slice(0, autoRevealIndex);

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
      <img src="/pics/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-4 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" />
      <h1
        className="text-center text-white mb-6 drop-shadow-lg"
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

      <div className="mt-8 flex justify-center fixed bottom-10 left-0 right-0">
        <div className="bg-black/40 backdrop-blur-md px-10 py-5 rounded-3xl border border-white/20 shadow-2xl flex items-center gap-6">
          <span className="text-white/80 text-xl font-medium uppercase tracking-widest">
            Spelers Gekozen
          </span>
          <div className="text-5xl font-bold text-white bg-white/10 px-6 py-2 rounded-2xl">
            <span className={currentSubmissions === totalPlayers ? "text-green-400" : "text-white"}>{currentSubmissions}</span>
            <span className="text-white/40 mx-2">/</span>
            <span className="text-white/80">{totalPlayers}</span>
          </div>
        </div>
      </div>

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

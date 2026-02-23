'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel, shuffleTraits, splitLabelForTwoLines } from '@/modules/krakende-karakters/logic';

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

// Solid grey color for trait tiles
const TILE_COLOR = '#808080';

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
    }, 700); // 0.7 seconds between each pop

    return () => clearInterval(timer);
  }, [isResults, autoRevealIndex, traits.length]);

  // Results view: show all traits purely (no names attached)
  if (isResults) {
    return (
      <div
        className="min-h-screen flex flex-col relative"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(to bottom right, #facc15, #ec4899, #9333ea)',
        }}
      >
        {/* Horizontal Band Header */}
        <div
          className="relative z-10 w-full h-32 bg-cover bg-center bg-no-repeat flex items-center justify-between px-6 mb-8"
          style={{ backgroundImage: 'url(/assets/band.webp)' }}
        >
          {/* Logo - Left */}
          <div className="flex items-center">
            <img src="/assets/ranking_logo.webp" alt="Ranking Logo" className="h-24 w-auto object-contain" />
          </div>
          {/* Centered Text Overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
              {isPositive ? 'Alle Goede Eigenschappen' : 'Alle Minder Goede Eigenschappen'}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 flex-1 auto-rows-min px-8 pb-8">
          {shuffled.map((trait, i) => {
            return (
              <div
                key={trait.id}
                className="rounded-xl p-4 flex flex-col justify-center items-center shadow-lg transform transition-transform border-[3px] border-white"
                style={{
                  backgroundColor: TILE_COLOR,
                  minHeight: '120px',
                }}
              >
                <div className="text-center uppercase w-full flex flex-col items-center justify-center font-barlow text-white drop-shadow-md" style={{ fontWeight: 300 }}>
                  {(() => {
                    const [line1, line2] = splitLabelForTwoLines(getTraitLabel(trait, 'nl'));
                    return (
                      <>
                        <span style={{ fontSize: '3rem', lineHeight: '1.1' }}>{line1}</span>
                        {line2 && <span style={{ fontSize: '3rem', lineHeight: '1.1' }}>{line2}</span>}
                      </>
                    );
                  })()}
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
      className="min-h-screen flex flex-col"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(to bottom right, #facc15, #ec4899, #9333ea)',
      }}
    >
      {/* Horizontal Band Header */}
      <div
        className="relative z-10 w-full h-32 bg-cover bg-center bg-no-repeat flex items-center justify-between px-6 mb-8"
        style={{ backgroundImage: 'url(/assets/band.webp)' }}
      >
        {/* Logo - Left */}
        <div className="flex items-center">
          <img src="/assets/ranking_logo.webp" alt="Ranking Logo" className="h-24 w-auto object-contain" />
        </div>
        {/* Centered Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl font-light text-white drop-shadow-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
            {isPositive ? 'Goede Geinige Eigenschappen' : 'Misschien iets Minder goede Eigenschappen'}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4 flex-1 auto-rows-min content-start px-8">
        {revealed.map((trait, i) => {
          const isLatest = i === revealed.length - 1;
          return (
            <div
              key={trait.id}
              className="rounded-xl p-4 flex items-center justify-center text-center shadow-lg border-[3px] border-white"
              style={{
                backgroundColor: TILE_COLOR,
                animation: isLatest ? 'krakendePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                minHeight: '80px',
              }}
            >
              <div className="w-full flex justify-center items-center uppercase font-barlow text-center flex-col text-white drop-shadow-md" style={{ fontWeight: 300 }}>
                {(() => {
                  const [line1, line2] = splitLabelForTwoLines(getTraitLabel(trait, 'nl'));
                  return (
                    <>
                      <span style={{ fontSize: '3rem', lineHeight: '1.1' }}>{line1}</span>
                      {line2 && <span style={{ fontSize: '3rem', lineHeight: '1.1' }}>{line2}</span>}
                    </>
                  );
                })()}
              </div>
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

'use client';

import React, { useState, useEffect } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';

interface KrakendeDisplayProps {
  state: KrakendeState;
  allPlayerNames?: string[];
  sessionId?: string;
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
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    setTimeout(() => ctx.close(), 300);
  } catch {
    // silent
  }
}

export default function KrakendeDisplay({ state, allPlayerNames = [], sessionId }: KrakendeDisplayProps) {
  // Inject keyframe animations once
  useEffect(() => {
    if (document.getElementById('krakende-kf')) return;
    const s = document.createElement('style');
    s.id = 'krakende-kf';
    s.textContent = `
      @keyframes krakendePop {
        0%   { transform: scale(0.6); opacity: 0; }
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

  // Poll vote count from krakende_votes collection
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

  // Auto-reveal logic: reveal cards sequentially in voting mode
  const [autoRevealIndex, setAutoRevealIndex] = useState(0);

  useEffect(() => {
    if (isResults) {
      setAutoRevealIndex(traits.length);
    } else {
      setAutoRevealIndex(0);
    }
  }, [state.phase, isResults, traits.length]);

  useEffect(() => {
    if (isResults || autoRevealIndex >= traits.length) return;

    const timer = setInterval(() => {
      setAutoRevealIndex((prev) => {
        const next = prev + 1;
        playPopSound();
        return next;
      });
    }, 450);

    return () => clearInterval(timer);
  }, [isResults, autoRevealIndex, traits.length]);

  return (
    <div
      className="min-h-screen w-screen flex flex-col justify-between p-8 select-none"
      style={{
        background: isPositive
          ? 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 35%, #fde047 100%)'
          : 'linear-gradient(180deg, #ea580c 0%, #f97316 40%, #fb923c 100%)',
        fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif',
      }}
    >
      {/* Top Banner: Keynote Style Giant White Header */}
      <div className="flex justify-between items-baseline px-4 pt-2 pb-4">
        <h1
          className="text-white font-black tracking-tight uppercase leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
          style={{
            fontFamily: '"DIN Condensed", "Barlow Semi Condensed", "Impact", sans-serif',
            fontSize: 'clamp(3.5rem, 6.5vw, 6.5rem)',
            letterSpacing: '0.01em',
          }}
        >
          {isPositive ? '24 GOEDE EIGENSCHAPPEN' : '24 MINDER GOEDE EIGENSCHAPPEN'}
        </h1>

        {/* Live Vote Tracker Badge */}
        {!isResults && (
          <div className="bg-black/50 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/20 shadow-xl flex items-center gap-3">
            <span className="text-white/80 font-bold tracking-wider text-sm uppercase">Gekozen:</span>
            <span className="text-white font-extrabold text-2xl">
              {voteCount} / {totalPlayers || '–'}
            </span>
          </div>
        )}
      </div>

      {/* 6 Columns x 4 Rows Keynote Replica Grid */}
      <div className="flex-1 grid grid-cols-6 grid-rows-4 gap-3 px-4 pb-4">
        {traits.map((trait, i) => {
          const isRevealed = isResults || i < autoRevealIndex;
          const isLatest = i === autoRevealIndex - 1 && !isResults;

          const line1 = trait.line1 || trait.nl.split(' ')[0] || trait.nl;
          const line2 =
            trait.line2 !== undefined
              ? trait.line2
              : trait.nl.split(' ').slice(1).join(' ');

          if (!isRevealed) {
            return (
              <div
                key={trait.id}
                className="rounded-lg bg-black/10 border border-black/10 transition-opacity"
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
              <div
                className="text-black font-extrabold tracking-tight leading-tight"
                style={{
                  fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif',
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
  );
}

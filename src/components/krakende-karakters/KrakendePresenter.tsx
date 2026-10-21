'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { KrakendeState, KrakendePhase } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import { krakendeVoteService, KrakendeVote } from '@/lib/pocketbase';

interface KrakendePresenterProps {
  sessionId: string;
  state: KrakendeState;
  onStateChange: (state: KrakendeState) => void;
  totalPlayers: number;
}

export default function KrakendePresenter({
  sessionId,
  state,
  onStateChange,
  totalPlayers,
}: KrakendePresenterProps) {
  // Keyboard shortcuts (1: pos voting, 2: pos results, 3: neg voting, 4: neg results)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const phaseMap: Record<string, KrakendePhase> = {
        '1': 'positive-voting',
        '2': 'positive-results',
        '3': 'negative-voting',
        '4': 'negative-results',
      };

      const targetPhase = phaseMap[e.key];
      if (targetPhase) {
        krakendeLogic.setPhase(sessionId, state, targetPhase).then(onStateChange);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionId, state, onStateChange]);

  const handleReset = () => {
    if (window.confirm('Weet je zeker dat je alle keuzes wilt wissen en wilt herstarten?')) {
      krakendeVoteService.clearVotes(sessionId).catch(() => {});
      krakendeLogic.resetState(sessionId, state).then(onStateChange);
    }
  };

  // Poll live votes from krakende_votes collection
  const [posVotes, setPosVotes] = useState<KrakendeVote[]>([]);
  const [negVotes, setNegVotes] = useState<KrakendeVote[]>([]);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const [pos, neg] = await Promise.all([
          krakendeVoteService.getVotes(sessionId, 'positive'),
          krakendeVoteService.getVotes(sessionId, 'negative'),
        ]);
        if (!active) return;
        setPosVotes(pos);
        setNegVotes(neg);
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
  }, [sessionId]);

  const isPositive = state.phase.includes('positive');
  const isResults = state.phase.endsWith('-results');
  const activeVotes = isPositive ? posVotes : negVotes;

  // Map votes by trait_id for fast lookup
  const votesByTrait = useMemo(() => {
    const map = new Map<string, KrakendeVote[]>();
    activeVotes.forEach((v) => {
      const arr = map.get(v.trait_id) || [];
      arr.push(v);
      map.set(v.trait_id, arr);
    });
    return map;
  }, [activeVotes]);

  const traits = isPositive ? state.positiveTraits : state.negativeTraits;
  const currentSubmissions = activeVotes.length;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl overflow-hidden shadow-2xl"
      style={{ fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif' }}
    >
      {/* Top control bar: Phase Switcher & Live Stats */}
      <div className="bg-[#0b1329] px-5 py-3 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Module title + Phase buttons */}
        <div className="flex items-center gap-3">
          <span className="text-white font-extrabold text-xl tracking-wide uppercase">
            Krakende Karakters
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-gray-700/60">
            <button
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'positive-voting').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'positive-voting'
                  ? 'bg-amber-400 text-black shadow-md font-black scale-105'
                  : 'text-amber-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              1. 24 Goede (Stemmen)
            </button>
            <button
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'positive-results').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'positive-results'
                  ? 'bg-amber-400 text-black shadow-md font-black scale-105'
                  : 'text-amber-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              2. Goede Resultaten
            </button>
            <button
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'negative-voting').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'negative-voting'
                  ? 'bg-orange-500 text-white shadow-md font-black scale-105'
                  : 'text-orange-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              3. 24 Minder Goede (Stemmen)
            </button>
            <button
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'negative-results').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'negative-results'
                  ? 'bg-orange-500 text-white shadow-md font-black scale-105'
                  : 'text-orange-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              4. Minder Goede Resultaten
            </button>
          </div>
        </div>

        {/* Right: Vote counter + Reset */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-md border border-gray-700">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPositive ? 'bg-amber-400 animate-pulse' : 'bg-orange-500 animate-pulse'
              }`}
            />
            <span className="text-white/70 text-xs font-semibold uppercase">Gestemd:</span>
            <span className="text-white font-extrabold text-sm">
              {currentSubmissions} / {totalPlayers || '–'}
            </span>
          </div>

          <button
            onClick={handleReset}
            className="bg-red-600/80 hover:bg-red-600 text-white text-xs px-3 py-1 rounded font-bold transition-all border border-red-500/50"
            title="Herstart en wis alle ontvangen keuzes"
          >
            Reset
          </button>
        </div>
      </div>

      {/* KEYNOTE REPLICA BOARD */}
      <div
        className="relative w-full p-6 transition-colors duration-300 shadow-inner"
        style={{
          background: isPositive
            ? 'linear-gradient(180deg, #f59e0b 0%, #fbbf24 35%, #fde047 100%)'
            : 'linear-gradient(180deg, #ea580c 0%, #f97316 40%, #fb923c 100%)',
        }}
      >
        {/* Giant Condensed White Title matching Keynote */}
        <div className="mb-4 flex justify-between items-end">
          <h1
            className="text-white font-extrabold tracking-tight uppercase leading-none drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]"
            style={{
              fontFamily: '"DIN Condensed", "Barlow Semi Condensed", "Impact", sans-serif',
              fontSize: 'clamp(2rem, 3.8vw, 3.75rem)',
              letterSpacing: '0.02em',
            }}
          >
            {isPositive ? '24 GOEDE EIGENSCHAPPEN' : '24 MINDER GOEDE EIGENSCHAPPEN'}
          </h1>
          <div className="text-black/80 font-bold text-xs uppercase tracking-wider bg-white/40 px-3 py-1 rounded-full backdrop-blur-sm">
            {isResults ? '🏆 Resultaten Fase' : '📱 Live Speler Stemmen'}
          </div>
        </div>

        {/* 6 Columns x 4 Rows Grid Replica */}
        <div
          className="grid grid-cols-6 grid-rows-4 gap-[2px] bg-black/40 p-[2px] rounded-lg overflow-hidden border-2 border-black/40 shadow-2xl"
          style={{ minHeight: '380px' }}
        >
          {traits.slice(0, 24).map((trait) => {
            const votes = votesByTrait.get(trait.id) || [];
            const voteCount = votes.length;
            const hasVotes = voteCount > 0;

            // Split into lines if line1 not set
            const line1 = trait.line1 || trait.nl.split(' ')[0] || trait.nl;
            const line2 =
              trait.line2 !== undefined
                ? trait.line2
                : trait.nl.split(' ').slice(1).join(' ');

            return (
              <div
                key={trait.id}
                className={`relative flex flex-col items-center justify-center p-2 text-center transition-all select-none ${
                  hasVotes
                    ? isPositive
                      ? 'bg-[#fef08a] ring-2 ring-blue-600 shadow-md z-10'
                      : 'bg-[#fed7aa] ring-2 ring-red-600 shadow-md z-10'
                    : isPositive
                    ? 'bg-[#fed766] hover:bg-[#fee085]'
                    : 'bg-[#fb923c] hover:bg-[#f97316]'
                }`}
                style={{ minHeight: '90px' }}
              >
                {/* Vote Count Badge */}
                {hasVotes && (
                  <div
                    className={`absolute top-1 right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full font-black text-xs text-white shadow-md ${
                      isPositive ? 'bg-blue-600 ring-1 ring-white' : 'bg-red-700 ring-1 ring-white'
                    }`}
                  >
                    {voteCount}
                  </div>
                )}

                {/* Trait Text: 2 lines centered bold black */}
                <div
                  className="text-black font-extrabold tracking-tight leading-tight"
                  style={{
                    fontFamily: '"Barlow Semi Condensed", "DIN Alternate", "Arial Narrow", sans-serif',
                    fontSize: 'clamp(0.85rem, 1.1vw, 1.25rem)',
                  }}
                >
                  <div>{line1}</div>
                  {line2 && <div className="mt-0.5">{line2}</div>}
                </div>

                {/* Player Name Chips (shown on presenter screen) */}
                {hasVotes && (
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1 max-w-full">
                    {votes.map((v) => (
                      <span
                        key={v.id || v.player_id}
                        className="bg-black/80 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm truncate max-w-[120px]"
                        title={`${v.player_name} (Team ${v.team_nr})`}
                      >
                        {v.player_name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

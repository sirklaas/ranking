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
  // Keyboard shortcuts (1: 13/02 pos voting, 2: 13/03 neg voting, 3: 13/04 pos results, 4: 13/05 neg results)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const phaseMap: Record<string, KrakendePhase> = {
        '1': 'positive-voting',
        '2': 'negative-voting',
        '3': 'positive-results',
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

  const currentSubmissions = activeVotes.length;

  return (
    <div
      className="flex flex-col gap-3 rounded-xl overflow-hidden shadow-2xl"
      style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
    >
      {/* Top control bar: Phase Switcher & Live Stats */}
      <div className="bg-[#0b1329] px-5 py-4 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Left: Module title + Phase buttons */}
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-xl tracking-wide uppercase">
            Krakende Karakters
          </span>
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-lg border border-gray-700/60">
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
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'negative-voting').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'negative-voting'
                  ? 'bg-orange-500 text-white shadow-md font-black scale-105'
                  : 'text-orange-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              2. 24 Minder Goede (Stemmen)
            </button>
            <button
              onClick={() => krakendeLogic.setPhase(sessionId, state, 'positive-results').then(onStateChange)}
              className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wider transition-all ${
                state.phase === 'positive-results'
                  ? 'bg-amber-400 text-black shadow-md font-black scale-105'
                  : 'text-amber-300/80 hover:text-white hover:bg-white/10'
              }`}
            >
              3. Goede Resultaten
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
          <div className="flex items-center gap-2 bg-black/50 px-3.5 py-1.5 rounded-md border border-gray-700">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPositive ? 'bg-amber-400 animate-pulse' : 'bg-orange-500 animate-pulse'
              }`}
            />
            <span className="text-white/70 text-xs font-semibold uppercase">Gestemd:</span>
            <span className="text-white font-extrabold text-base">
              {currentSubmissions} / {totalPlayers || '–'}
            </span>
          </div>

          <button
            onClick={handleReset}
            className="bg-red-600/80 hover:bg-red-600 text-white text-xs px-3.5 py-1.5 rounded font-bold transition-all border border-red-500/50"
            title="Herstart en wis alle ontvangen keuzes"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

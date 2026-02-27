'use client';

import React, { useState, useEffect } from 'react';
import { KrakendeState, KrakendeTrait, KrakendePhase } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import { krakendeVoteService, KrakendeVote } from '@/lib/pocketbase';

interface KrakendePresenterProps {
  sessionId: string;
  state: KrakendeState;
  onStateChange: (state: KrakendeState) => void;
  totalPlayers: number;
}

const PHASE_LABELS: Record<KrakendePhase, string> = {
  'positive-voting': 'Positieve Eigenschappen',
  'negative-voting': 'Negatieve Eigenschappen',
  'positive-results': 'Resultaten Positief',
  'negative-results': 'Resultaten Negatief',
};

export default function KrakendePresenter({ sessionId, state, onStateChange, totalPlayers }: KrakendePresenterProps) {
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
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
      // Clear votes from krakende_votes collection + reset state
      krakendeVoteService.clearVotes(sessionId).catch(() => {});
      krakendeLogic.resetState(sessionId, state).then(onStateChange);
    }
  };

  const renderPhaseButton = (targetPhase: KrakendePhase, label: string, num: number, color: 'blue' | 'red') => {
    const isActive = state.phase === targetPhase;
    const isCompleted = state.completedPhases.includes(targetPhase) && !isActive;
    const colorClass = color === 'blue' ? 'blue' : 'red';

    return (
      <button
        onClick={() => krakendeLogic.setPhase(sessionId, state, targetPhase).then(onStateChange)}
        className={`h-40 flex flex-col items-center justify-center p-4 rounded-xl font-bold tracking-wider transition-all active:scale-95 border-2 ${isActive
          ? `bg-${colorClass}-500 text-white border-${colorClass}-300 shadow-[0_0_20px_rgba(${color === 'blue' ? '37,99,235' : '239,68,68'},0.6)]`
          : `bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:border-gray-500`
          }`}
      >
        <span className="text-4xl mb-2">{num}</span>
        <span className="text-xs text-center">{label}</span>
      </button>
    );
  };

  // Poll vote counts from krakende_votes collection (scalable)
  const [posVotes, setPosVotes] = useState<KrakendeVote[]>([]);
  const [negVotes, setNegVotes] = useState<KrakendeVote[]>([]);
  useEffect(() => {
    let active = true;
    const poll = async () => {
      const [pos, neg] = await Promise.all([
        krakendeVoteService.getVotes(sessionId, 'positive'),
        krakendeVoteService.getVotes(sessionId, 'negative'),
      ]);
      if (!active) return;
      setPosVotes(pos);
      setNegVotes(neg);
    };
    poll();
    const timer = setInterval(poll, 10000);
    return () => { active = false; clearInterval(timer); };
  }, [sessionId]);

  const posSubmissions = posVotes.length;
  const negSubmissions = negVotes.length;

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Top bar: Phase + Metric */}
      <div className="bg-[#0A1752] p-4 rounded-lg text-white shadow-lg border border-blue-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-3xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Krakende Karakters
            </h3>
            <button
              onClick={handleReset}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1 rounded-md font-bold transition-all active:scale-95 border border-red-400"
            >
              RESET GAME (Leegmaken)
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="block text-sm text-blue-300 font-bold tracking-wider">POS Gekozen</span>
              <span className="text-3xl font-bold">{posSubmissions} / {totalPlayers}</span>
            </div>
            <div className="text-center ml-4">
              <span className="block text-sm text-red-300 font-bold  tracking-wider">NEG Gekozen</span>
              <span className="text-3xl font-bold">{negSubmissions} / {totalPlayers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submissions preview (from krakende_votes collection) */}
      <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
        <h4 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Keuzes ({posSubmissions + negSubmissions} stemmen)
        </h4>
        <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
          {/* Show unique players across both phases */}
          {(() => {
            const allVotes = [...posVotes, ...negVotes];
            const playerMap = new Map<string, { name: string; pos?: string; neg?: string }>();
            allVotes.forEach(v => {
              const entry = playerMap.get(v.player_id) || { name: v.player_name };
              if (v.fase === 'positive') entry.pos = v.trait_id;
              if (v.fase === 'negative') entry.neg = v.trait_id;
              playerMap.set(v.player_id, entry);
            });
            const entries = Array.from(playerMap.entries());
            if (entries.length === 0) return <div className="text-gray-500 text-sm col-span-3">Nog geen keuzes gemaakt</div>;
            return entries.map(([pid, info]) => {
              const posTrait = state.positiveTraits.find(t => t.id === info.pos);
              const negTrait = state.negativeTraits.find(t => t.id === info.neg);
              return (
                <div key={pid} className="bg-gray-800/50 rounded p-2 text-sm">
                  <div className="text-white font-medium">{info.name}</div>
                  <div className="text-blue-400 text-xs">
                    + {posTrait ? krakendeLogic.getTraitLabel(posTrait, state.language) : '—'}
                  </div>
                  <div className="text-red-400 text-xs">
                    − {negTrait ? krakendeLogic.getTraitLabel(negTrait, state.language) : '—'}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Manual Phase Overrides - 4 IN A ROW */}
      <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4 mt-2">
        <h4 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Besturingspaneel: Spelverloop
        </h4>
        <div className="grid grid-cols-4 gap-4">
          {renderPhaseButton('positive-voting', '1. Positief Stemmen', 1, 'blue')}
          {renderPhaseButton('negative-voting', '2. Negatief Stemmen', 2, 'red')}
          {renderPhaseButton('positive-results', '3. Positief Resultaten', 3, 'blue')}
          {renderPhaseButton('negative-results', '4. Negatief Resultaten', 4, 'red')}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { KrakendeState, KrakendeTrait, KrakendePhase } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';

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
  // Count submissions
  const posSubmissions = state.submissions.filter((s) => s.positiveTrait).length;
  const negSubmissions = state.submissions.filter((s) => s.negativeTrait).length;

  const isPositivePhase = state.phase === 'positive-voting' || state.phase === 'positive-results';
  const currentTraits = isPositivePhase ? state.positiveTraits : state.negativeTraits;
  const maxTraits = currentTraits.length;

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Top bar: Phase + Metric */}
      <div className="bg-[#0A1752] p-4 rounded-lg text-white shadow-lg border border-blue-800">
        <div className="flex justify-between items-center">
          <h3 className="text-3xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Krakende Karakters
          </h3>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <span className="block text-sm text-teal-300 font-bold uppercase tracking-wider">POS Gekozen</span>
              <span className="text-3xl font-bold">{posSubmissions} / {totalPlayers}</span>
            </div>
            <div className="text-center ml-4">
              <span className="block text-sm text-red-300 font-bold uppercase tracking-wider">NEG Gekozen</span>
              <span className="text-3xl font-bold">{negSubmissions} / {totalPlayers}</span>
            </div>
          </div>
        </div>
      </div>



      {/* Submissions preview */}
      <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
        <h4 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Keuzes ({state.submissions.length} spelers)
        </h4>
        <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
          {state.submissions.map((sub) => {
            const posTrait = state.positiveTraits.find((t) => t.id === sub.positiveTrait);
            const negTrait = state.negativeTraits.find((t) => t.id === sub.negativeTrait);
            return (
              <div key={sub.playerId} className="bg-gray-800/50 rounded p-2 text-sm">
                <div className="text-white font-medium">{sub.playerName}</div>
                <div className="text-teal-400 text-xs">
                  + {posTrait ? krakendeLogic.getTraitLabel(posTrait, state.language) : '—'}
                </div>
                <div className="text-red-400 text-xs">
                  − {negTrait ? krakendeLogic.getTraitLabel(negTrait, state.language) : '—'}
                </div>
              </div>
            );
          })}
          {state.submissions.length === 0 && (
            <div className="text-gray-500 text-sm col-span-3">Nog geen keuzes gemaakt</div>
          )}
        </div>
      </div>

      {/* Manual Phase Overrides */}
      <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4 mt-2">
        <h4 className="text-white font-bold text-lg mb-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Besturingspaneel: Forceer Fase
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => krakendeLogic.setPhase(sessionId, state, 'positive-voting').then(onStateChange)}
            className={`p-4 rounded-xl font-bold uppercase tracking-wider transition-transform active:scale-95 border-2 ${state.phase === 'positive-voting' ? 'bg-teal-500 text-white border-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.6)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
          >
            1. Positief Stemmen
          </button>
          <button
            onClick={() => krakendeLogic.setPhase(sessionId, state, 'negative-voting').then(onStateChange)}
            className={`p-4 rounded-xl font-bold uppercase tracking-wider transition-transform active:scale-95 border-2 ${state.phase === 'negative-voting' ? 'bg-red-500 text-white border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
          >
            2. Negatief Stemmen
          </button>
          <button
            onClick={() => krakendeLogic.setPhase(sessionId, state, 'positive-results').then(onStateChange)}
            className={`p-4 rounded-xl font-bold uppercase tracking-wider transition-transform active:scale-95 border-2 ${state.phase === 'positive-results' ? 'bg-teal-500 text-white border-teal-300 shadow-[0_0_15px_rgba(20,184,166,0.6)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
          >
            3. Positief Allemaal
          </button>
          <button
            onClick={() => krakendeLogic.setPhase(sessionId, state, 'negative-results').then(onStateChange)}
            className={`p-4 rounded-xl font-bold uppercase tracking-wider transition-transform active:scale-95 border-2 ${state.phase === 'negative-results' ? 'bg-red-500 text-white border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.6)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
              }`}
          >
            4. Negatief Allemaal
          </button>
        </div>
      </div>
    </div>
  );
}

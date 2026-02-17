'use client';

import React, { useState } from 'react';
import { KrakendeState, KrakendeTrait, KrakendePhase } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';

interface KrakendePresenterProps {
  sessionId: string;
  state: KrakendeState;
  onStateChange: (state: KrakendeState) => void;
}

const PHASE_LABELS: Record<KrakendePhase, string> = {
  'positive-voting': 'Positieve Eigenschappen',
  'negative-voting': 'Negatieve Eigenschappen',
  'positive-results': 'Resultaten Positief',
  'negative-results': 'Resultaten Negatief',
};

export default function KrakendePresenter({ sessionId, state, onStateChange }: KrakendePresenterProps) {
  const [editingPositive, setEditingPositive] = useState(false);
  const [editingNegative, setEditingNegative] = useState(false);
  const [localPositive, setLocalPositive] = useState<KrakendeTrait[]>(state.positiveTraits);
  const [localNegative, setLocalNegative] = useState<KrakendeTrait[]>(state.negativeTraits);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const showBanner = (msg: string) => {
    setSaveBanner(msg);
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleToggleLanguage = async () => {
    const newState = await krakendeLogic.toggleLanguage(sessionId, state);
    onStateChange(newState);
    showBanner(`Language → ${newState.language.toUpperCase()}`);
  };

  const handlePhaseChange = async (phase: KrakendePhase) => {
    const newState = await krakendeLogic.setPhase(sessionId, state, phase);
    onStateChange(newState);
  };

  const handleNextPhase = async () => {
    const newState = await krakendeLogic.nextPhase(sessionId, state);
    onStateChange(newState);
  };

  const handlePrevPhase = async () => {
    const newState = await krakendeLogic.prevPhase(sessionId, state);
    onStateChange(newState);
  };

  const handleRevealNext = async () => {
    const newState = await krakendeLogic.revealNextTrait(sessionId, state);
    onStateChange(newState);
  };

  const handleSaveTraits = async () => {
    const newState = await krakendeLogic.updateTraits(sessionId, state, localPositive, localNegative);
    onStateChange(newState);
    setEditingPositive(false);
    setEditingNegative(false);
    showBanner('Traits saved');
  };

  const handleTraitEdit = (
    list: KrakendeTrait[],
    setList: React.Dispatch<React.SetStateAction<KrakendeTrait[]>>,
    index: number,
    field: 'nl' | 'en',
    value: string
  ) => {
    const updated = [...list];
    updated[index] = { ...updated[index], [field]: value };
    setList(updated);
  };

  // Count submissions
  const posSubmissions = state.submissions.filter((s) => s.positiveTrait).length;
  const negSubmissions = state.submissions.filter((s) => s.negativeTrait).length;

  const isPositivePhase = state.phase === 'positive-voting' || state.phase === 'positive-results';
  const currentTraits = isPositivePhase ? state.positiveTraits : state.negativeTraits;
  const maxTraits = currentTraits.length;

  return (
    <div className="flex flex-col gap-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Save banner */}
      {saveBanner && (
        <div className="bg-blue-600 text-white text-center py-2 rounded text-sm font-medium animate-pulse">
          {saveBanner}
        </div>
      )}

      {/* Top bar: Phase + Language + Controls */}
      <div className="bg-[#0A1752] p-4 rounded-lg text-white shadow-lg border border-blue-800">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-2xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Krakende Karakters
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-300">
              Positief: {posSubmissions} | Negatief: {negSubmissions} keuzes
            </span>
            <button
              onClick={handleToggleLanguage}
              className="px-4 py-2 rounded font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-all"
            >
              {state.language === 'nl' ? '🇳🇱 NL → EN' : '🇬🇧 EN → NL'}
            </button>
          </div>
        </div>

        {/* Phase navigation */}
        <div className="flex gap-2 mb-3">
          {(Object.keys(PHASE_LABELS) as KrakendePhase[]).map((phase) => (
            <button
              key={phase}
              onClick={() => handlePhaseChange(phase)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
                state.phase === phase
                  ? 'bg-white text-[#0A1752]'
                  : 'bg-blue-900/50 text-blue-300 hover:bg-blue-800'
              }`}
            >
              {PHASE_LABELS[phase]}
            </button>
          ))}
        </div>

        {/* Arrow + reveal controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevPhase}
            className="px-4 py-2 rounded font-bold text-sm bg-gray-600 hover:bg-gray-500 text-white"
          >
            ← Vorige fase
          </button>
          <button
            onClick={handleNextPhase}
            className="px-4 py-2 rounded font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white"
          >
            Volgende fase →
          </button>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-blue-200">
              Revealed: {state.revealedIndex}/{maxTraits}
            </span>
            <button
              onClick={handleRevealNext}
              disabled={state.revealedIndex >= maxTraits}
              className={`px-4 py-2 rounded font-bold text-sm transition-all ${
                state.revealedIndex >= maxTraits
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-yellow-500 hover:bg-yellow-400 text-black'
              }`}
            >
              Reveal volgende eigenschap
            </button>
          </div>
        </div>
      </div>

      {/* Trait editing panels */}
      <div className="grid grid-cols-2 gap-4">
        {/* Positive traits */}
        <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-teal-400 font-bold text-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              24 Positieve Eigenschappen
            </h4>
            <button
              onClick={() => setEditingPositive(!editingPositive)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {editingPositive ? 'Annuleer' : 'Bewerk'}
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {(editingPositive ? localPositive : state.positiveTraits).map((trait, i) => (
              <div key={trait.id} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-6 text-right">{i + 1}</span>
                {editingPositive ? (
                  <>
                    <input
                      value={localPositive[i]?.nl || ''}
                      onChange={(e) => handleTraitEdit(localPositive, setLocalPositive, i, 'nl', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                      placeholder="NL"
                    />
                    <input
                      value={localPositive[i]?.en || ''}
                      onChange={(e) => handleTraitEdit(localPositive, setLocalPositive, i, 'en', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                      placeholder="EN"
                    />
                  </>
                ) : (
                  <span className="text-white text-sm">
                    {trait.nl} <span className="text-gray-500">/ {trait.en}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Negative traits */}
        <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-red-400 font-bold text-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              24 Negatieve Eigenschappen
            </h4>
            <button
              onClick={() => setEditingNegative(!editingNegative)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              {editingNegative ? 'Annuleer' : 'Bewerk'}
            </button>
          </div>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {(editingNegative ? localNegative : state.negativeTraits).map((trait, i) => (
              <div key={trait.id} className="flex items-center gap-2">
                <span className="text-gray-500 text-xs w-6 text-right">{i + 1}</span>
                {editingNegative ? (
                  <>
                    <input
                      value={localNegative[i]?.nl || ''}
                      onChange={(e) => handleTraitEdit(localNegative, setLocalNegative, i, 'nl', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                      placeholder="NL"
                    />
                    <input
                      value={localNegative[i]?.en || ''}
                      onChange={(e) => handleTraitEdit(localNegative, setLocalNegative, i, 'en', e.target.value)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                      placeholder="EN"
                    />
                  </>
                ) : (
                  <span className="text-white text-sm">
                    {trait.nl} <span className="text-gray-500">/ {trait.en}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save button (visible when editing) */}
      {(editingPositive || editingNegative) && (
        <div className="flex justify-center">
          <button
            onClick={handleSaveTraits}
            className="px-8 py-2 rounded font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all"
          >
            Opslaan
          </button>
        </div>
      )}

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
    </div>
  );
}

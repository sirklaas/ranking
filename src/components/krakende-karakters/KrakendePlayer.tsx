'use client';

import React, { useState, useEffect } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel } from '@/modules/krakende-karakters/logic';

interface KrakendePlayerProps {
  state: KrakendeState;
  playerId: string;
  playerName: string;
  teamNumber: number;
  onSubmitChoice: (traitId: string) => void;
}

export default function KrakendePlayer({
  state,
  playerId,
  playerName,
  teamNumber,
  onSubmitChoice,
}: KrakendePlayerProps) {
  const isPositive = state.phase === 'positive-voting';
  const isNegative = state.phase === 'negative-voting';
  const isVoting = isPositive || isNegative;
  const isResults = state.phase === 'positive-results' || state.phase === 'negative-results';

  const traits = isPositive || state.phase === 'positive-results'
    ? state.positiveTraits
    : state.negativeTraits;

  // Find this player's existing submission
  const mySub = state.submissions.find((s) => s.playerId === playerId);
  const myChoice = isPositive || state.phase === 'positive-results'
    ? mySub?.positiveTrait
    : mySub?.negativeTrait;

  const [selected, setSelected] = useState<string | null>(myChoice || null);
  const [submitted, setSubmitted] = useState(!!myChoice);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset state when phase changes
  useEffect(() => {
    const newChoice = isPositive || state.phase === 'positive-results'
      ? mySub?.positiveTrait
      : mySub?.negativeTrait;
    setSelected(newChoice || null);
    setSubmitted(!!newChoice);
    setShowConfirmation(false);
  }, [state.phase, mySub, isPositive]);

  const handleSelect = (traitId: string) => {
    if (submitted) return;
    setSelected(traitId);
  };

  const handleConfirm = () => {
    if (!selected || submitted) return;
    onSubmitChoice(selected);
    setSubmitted(true);
    setShowConfirmation(true);
  };

  const selectedTrait = traits.find((t) => t.id === selected);

  // Results view — show what you picked
  if (isResults) {
    const chosenTrait = traits.find((t) => t.id === myChoice);
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: state.phase === 'positive-results'
            ? 'linear-gradient(135deg, #0A1752 0%, #2d5a4e 100%)'
            : 'linear-gradient(135deg, #0A1752 0%, #6b1a1a 100%)',
        }}
      >
        <div className="text-white text-center">
          <p className="text-lg opacity-70 mb-2">
            {state.phase === 'positive-results' ? 'Jouw positieve eigenschap' : 'Jouw minder goede eigenschap'}
          </p>
          <h2 className="text-4xl font-bold mb-4">
            {chosenTrait ? getTraitLabel(chosenTrait, state.language) : 'Geen keuze gemaakt'}
          </h2>
          <p className="text-lg opacity-50">{playerName} — Team {teamNumber}</p>
        </div>
      </div>
    );
  }

  // Confirmation popup
  if (showConfirmation && selectedTrait) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: isPositive
            ? 'linear-gradient(135deg, #0A1752 0%, #2d5a4e 100%)'
            : 'linear-gradient(135deg, #0A1752 0%, #6b1a1a 100%)',
        }}
      >
        <div
          className="text-center"
          style={{ animation: 'krakendePopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="text-6xl mb-4">{isPositive ? '✨' : '😈'}</div>
          <p className="text-white text-lg opacity-70 mb-2">{playerName}, jouw keuze is:</p>
          <div
            className="rounded-2xl px-8 py-6 mx-auto inline-block shadow-2xl mb-4"
            style={{
              backgroundColor: isPositive ? '#4ECDC4' : '#FF6B6B',
            }}
          >
            <span className="text-3xl font-bold text-gray-900">
              {getTraitLabel(selectedTrait, state.language)}
            </span>
          </div>
          <p className="text-white/50 text-sm mt-4">Wacht op de resultaten...</p>
        </div>

        <style jsx>{`
          @keyframes krakendePopIn {
            0% { transform: scale(0) rotate(-10deg); opacity: 0; }
            60% { transform: scale(1.1) rotate(2deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // Voting view — pick a trait
  return (
    <div
      className="min-h-screen flex flex-col p-4"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: isPositive
          ? 'linear-gradient(135deg, #0A1752 0%, #2d5a4e 100%)'
          : 'linear-gradient(135deg, #0A1752 0%, #6b1a1a 100%)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h2 className="text-white text-2xl font-bold">
          {isPositive ? 'Goede Geinige Eigenschappen' : 'Minder goede Eigenschappen'}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          Kies de eigenschap die bij jou past, {playerName}
        </p>
      </div>

      {/* Trait grid */}
      <div className="grid grid-cols-2 gap-2 flex-1 overflow-y-auto pb-20">
        {traits.map((trait, i) => {
          const isSelected = selected === trait.id;
          const baseColor = isPositive ? '#4ECDC4' : '#FF6B6B';
          return (
            <button
              key={trait.id}
              onClick={() => handleSelect(trait.id)}
              disabled={submitted}
              className="rounded-xl p-3 text-center font-bold transition-all active:scale-95"
              style={{
                backgroundColor: isSelected ? baseColor : 'rgba(255,255,255,0.1)',
                color: isSelected ? '#0A1752' : 'white',
                border: isSelected ? `3px solid ${baseColor}` : '3px solid transparent',
                opacity: submitted && !isSelected ? 0.3 : 1,
                fontSize: '0.95rem',
              }}
            >
              {getTraitLabel(trait, state.language)}
            </button>
          );
        })}
      </div>

      {/* Confirm button — fixed at bottom */}
      {isVoting && !submitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A1752] via-[#0A1752]/95 to-transparent">
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="w-full py-4 rounded-xl text-xl font-bold transition-all active:scale-95"
            style={{
              backgroundColor: selected ? '#0A1752' : '#333',
              color: 'white',
              border: selected ? '2px solid white' : '2px solid #555',
              opacity: selected ? 1 : 0.5,
            }}
          >
            {selected
              ? `Bevestig: ${getTraitLabel(traits.find((t) => t.id === selected)!, state.language)}`
              : 'Kies een eigenschap'}
          </button>
        </div>
      )}
    </div>
  );
}

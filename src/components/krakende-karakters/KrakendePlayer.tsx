'use client';

import React, { useState, useEffect } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel, splitLabelForTwoLines } from '@/modules/krakende-karakters/logic';

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
  const isRevealPhase = state.phase === 'positive-results' || state.phase === 'negative-results';

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
  const [showReveal, setShowReveal] = useState(false);

  // Persistence keys
  const LS_POS = `krakende_${playerId}_pos`;
  const LS_NEG = `krakende_${playerId}_neg`;

  // Restore from localStorage if session is missing the choice
  const [localPos, setLocalPos] = useState<string | null>(null);
  const [localNeg, setLocalNeg] = useState<string | null>(null);

  useEffect(() => {
    setLocalPos(localStorage.getItem(LS_POS));
    setLocalNeg(localStorage.getItem(LS_NEG));
  }, [LS_POS, LS_NEG]);

  const effectiveChoice = myChoice || (isPositive || state.phase === 'positive-results' ? localPos : localNeg);

  // Reset picked state when switching around
  useEffect(() => {
    const resChoice = isPositive || state.phase === 'positive-results'
      ? mySub?.positiveTrait
      : mySub?.negativeTrait;
    const finalChoice = resChoice || (isPositive || state.phase === 'positive-results' ? localStorage.getItem(LS_POS) : localStorage.getItem(LS_NEG));
    setSelected(finalChoice || null);
    setSubmitted(!!finalChoice);
  }, [state.phase, mySub?.positiveTrait, mySub?.negativeTrait, isPositive]);

  // Only reset popup/reveal visibility when the actual phase changes
  useEffect(() => {
    setShowConfirmation(false);
    setShowReveal(false);
  }, [state.phase]);

  const handleSelect = (traitId: string) => {
    if (submitted) return;
    setSelected(traitId);
  };

  const handleConfirm = () => {
    if (!selected || submitted) return;
    onSubmitChoice(selected);

    // Save locally
    if (isPositive) localStorage.setItem(LS_POS, selected);
    else if (isNegative) localStorage.setItem(LS_NEG, selected);

    setSubmitted(true);
    setShowConfirmation(true);
  };

  // Clear localStorage if server state has NO submissions (reset by presenter)
  useEffect(() => {
    if (state.submissions.length === 0) {
      localStorage.removeItem(LS_POS);
      localStorage.removeItem(LS_NEG);
      setLocalPos(null);
      setLocalNeg(null);
    }
  }, [state.submissions.length, LS_POS, LS_NEG]);

  const selectedTrait = traits.find((t) => t.id === selected);

  const [readyForReveal, setReadyForReveal] = useState(false);
  useEffect(() => {
    setReadyForReveal(false);
    if (isRevealPhase) {
      const timer = setTimeout(() => setReadyForReveal(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, isRevealPhase]);

  // Reveal Phase (Step 5/6) — button to explode trait fullscreen
  if (isRevealPhase) {
    const chosenTrait = traits.find((t) => t.id === effectiveChoice);

    if (showReveal && chosenTrait) {
      return (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
          onClick={() => setShowReveal(false)}
        >
          {/* Rotated Container for Landscape Text */}
          <div
            className="flex flex-col items-center justify-center w-[100vh] h-[100vw] rotate-90 origin-center"
          >
            <h2 className="text-white text-center font-bold tracking-tighter leading-none whitespace-nowrap px-4 w-full"
              style={{
                fontSize: 'calc(95vw)', // Use viewport width (which is height in landscape) to set size
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                lineHeight: 0.8
              }}>
              {getTraitLabel(chosenTrait, 'nl')}
            </h2>
            <p className="text-white/20 absolute bottom-4 text-sm font-light tracking-widest uppercase">
              Tik om te sluiten
            </p>
          </div>
        </div>
      );
    }

    if (!chosenTrait) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
          style={{
            fontFamily: 'Barlow Semi Condensed, sans-serif',
            background: 'linear-gradient(135deg, #1a2a6c, #b21f1f, #fdbb2d)',
          }}
        >
          <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 w-full max-w-sm">
            <h2 className="text-4xl font-bold text-white mb-4">Niet gestemd</h2>
            <p className="text-white/70">
              Je hebt in deze ronde geen eigenschap gekozen. Wacht op de volgende fase.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: state.phase === 'positive-results'
            ? 'linear-gradient(135deg, #0A1752 0%, #2d5a4e 100%)'
            : 'linear-gradient(135deg, #0A1752 0%, #6b1a1a 100%)',
        }}
      >
        <button
          onClick={() => setShowReveal(true)}
          disabled={!readyForReveal}
          className={`w-full py-10 px-6 rounded-3xl text-4xl font-bold shadow-2xl transition-transform border-4 border-white ${readyForReveal ? 'active:scale-95' : 'opacity-40 grayscale cursor-not-allowed'}`}
          style={{
            backgroundColor: !readyForReveal ? '#666' : (state.phase === 'positive-results' ? '#4ECDC4' : '#FF6B6B'),
            color: '#0A1752',
          }}
        >
          {readyForReveal
            ? (state.phase === 'positive-results' ? 'BEKIJK POSITIEF' : 'BEKIJK NEGATIEF')
            : 'EVEN GEDULD...'}
        </button>
        <p className="text-white/60 mt-8 text-center text-lg">
          {readyForReveal
            ? 'Druk op de knop om jouw gekozen eigenschap aan de rest te laten zien!'
            : 'Wacht tot de presentator alle eigenschappen heeft laten zien...'}
        </p>
      </div>
    );
  }

  // Generic "Choice Saved" popup during voting
  if (showConfirmation || (submitted && isVoting)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: isPositive
            ? 'linear-gradient(135deg, #0A1752 0%, #1a3a6b 100%)'
            : 'linear-gradient(135deg, #4a1a3a 0%, #1a0a1a 100%)',
        }}
      >
        <div className="text-center" style={{ animation: 'fadeHold 0.5s ease-out' }}>
          <div className="text-7xl mb-6">{isPositive ? '✅' : '✔️'}</div>
          <h2 className="text-3xl font-bold text-white mb-2">Keuze Opgeslagen!</h2>
          <p className="text-white/70 text-lg">Wacht tot iedereen gekozen heeft...</p>
        </div>
        <style jsx>{`
          @keyframes fadeHold {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: isPositive
          ? 'linear-gradient(135deg, #0A1752 0%, #2d5a4e 100%)'
          : 'linear-gradient(135deg, #0A1752 0%, #6b1a1a 100%)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-white text-4xl font-bold tracking-tight mb-1 uppercase" style={{ fontWeight: 700 }}>
          Krakende Karakters
        </h1>
        <h2 className="text-white/90 text-xl font-medium">
          {isPositive ? 'Goede Geinige Eigenschappen' : 'Minder goede Eigenschappen'}
        </h2>
        <p className="text-white/50 text-xs mt-1">
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
              className="rounded-lg p-2 text-center font-bold transition-all active:scale-95 leading-tight flex items-center justify-center min-h-[50px]"
              style={{
                backgroundColor: isSelected ? baseColor : 'rgba(255,255,255,0.1)',
                color: isSelected ? '#0A1752' : 'white',
                border: isSelected ? `2px solid ${baseColor}` : '2px solid transparent',
                opacity: submitted && !isSelected ? 0.3 : 1,
                fontSize: '0.85rem',
              }}
            >
              <div className="flex flex-col items-center justify-center w-full font-barlow" style={{ fontWeight: 300 }}>
                {(() => {
                  const [line1, line2] = splitLabelForTwoLines(getTraitLabel(trait, 'nl'));
                  return (
                    <>
                      <span>{line1}</span>
                      {line2 && <span>{line2}</span>}
                    </>
                  );
                })()}
              </div>
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
              ? `Bevestig: ${getTraitLabel(traits.find((t) => t.id === selected)!, 'nl')}`
              : 'Kies een eigenschap'}
          </button>
        </div>
      )}
    </div>
  );
}

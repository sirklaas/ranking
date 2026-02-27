'use client';

import React, { useState, useEffect } from 'react';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import { getTraitLabel, splitLabelForTwoLines } from '@/modules/krakende-karakters/logic';

interface KrakendePlayerProps {
  state: KrakendeState;
  sessionId?: string;
  playerId: string;
  playerName: string;
  teamNumber: number;
  onSubmitChoice: (traitId: string) => void;
}

export default function KrakendePlayer({
  state,
  sessionId,
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

    // Save locally AND update React state so effectiveChoice works in results phase
    if (isPositive) {
      localStorage.setItem(LS_POS, selected);
      setLocalPos(selected);
    } else if (isNegative) {
      localStorage.setItem(LS_NEG, selected);
      setLocalNeg(selected);
    }

    setSubmitted(true);
    setShowConfirmation(true);
  };

  // Clear localStorage when game is reset:
  // 1. Transitioning FROM results back to voting (new round)
  // 2. Fresh reset detected (completedPhases empty + positive-voting = presenter hit reset)
  const prevPhaseRef = React.useRef(state.phase);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    prevPhaseRef.current = state.phase;
    const fromResults = prev === 'negative-results' || prev === 'positive-results';
    const freshReset = state.phase === 'positive-voting' && state.completedPhases.length === 0;
    if (state.phase === 'positive-voting' && (fromResults || freshReset)) {
      localStorage.removeItem(LS_POS);
      localStorage.removeItem(LS_NEG);
      setLocalPos(null);
      setLocalNeg(null);
      setSelected(null);
      setSubmitted(false);
      setShowConfirmation(false);
    }
  }, [state.phase, state.completedPhases.length, LS_POS, LS_NEG]);

  const selectedTrait = traits.find((t) => t.id === selected);

  const [readyForReveal, setReadyForReveal] = useState(false);
  useEffect(() => {
    setReadyForReveal(false);
    if (isRevealPhase) {
      const timer = setTimeout(() => setReadyForReveal(true), 6000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, isRevealPhase]);

  // ~12s delay before showing voting grid (24 traits × 0.5s = 12s on display)
  const [votingReady, setVotingReady] = useState(false);
  useEffect(() => {
    setVotingReady(false);
    if (isVoting) {
      const timer = setTimeout(() => setVotingReady(true), 12000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, isVoting]);

  // Reveal Phase (Step 5/6) — button to explode trait fullscreen
  if (isRevealPhase) {
    const chosenTrait = traits.find((t) => t.id === effectiveChoice);

    if (showReveal && chosenTrait) {
      return (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)' }}
          onClick={() => setShowReveal(false)}
        >
          {/* Rotated container for landscape text */}
          <div
            className="flex flex-col items-center justify-center w-[100vh] h-[100vw] rotate-90 origin-center"
          >
            <h2 className="text-white text-center font-bold tracking-tighter px-8 w-full"
              style={{
                fontSize: 'clamp(3rem, 18vh, 12rem)',
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                fontWeight: 400,
                textTransform: 'uppercase',
                lineHeight: 0.95,
              }}>
              {getTraitLabel(chosenTrait, 'nl')}
            </h2>
            <p className="text-white/40 absolute bottom-4 text-sm font-light tracking-widest uppercase">
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
            background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
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
          background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
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
            ? (state.phase === 'positive-results' ? 'SHOW YOUR POSITIVE' : 'SHOW YOUR NEGATIVE')
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

  // Waiting screen while display reveals traits (6s)
  if (isVoting && !votingReady && !submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
        }}
      >
        <div className="text-center" style={{ animation: 'fadeHold 0.5s ease-out' }}>
          <div className="text-7xl mb-6">⏳</div>
          <h2 className="text-3xl font-bold text-white mb-2">Even geduld...</h2>
          <p className="text-white/70 text-lg">De eigenschappen worden getoond op het scherm</p>
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

  // Generic "Choice Saved" popup during voting
  if (showConfirmation || (submitted && isVoting)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
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
      className="h-screen flex flex-col overflow-hidden"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
      }}
    >
      {/* Header — compact */}
      <div className="text-center py-3 px-4 shrink-0">
        <h1 className="text-white text-2xl font-bold tracking-tight uppercase" style={{ fontWeight: 700 }}>
          Krakende Karakters
        </h1>
        <h2 className="text-white/90 text-base font-medium">
          {isPositive ? 'Goede Geinige Eigenschappen' : 'Minder goede Eigenschappen'}
        </h2>
        <p className="text-white/50 text-xs">
          Kies de eigenschap die bij jou past, {playerName}
        </p>
      </div>

      {/* Trait grid — matches step 1/2: grid-cols-2 gap-2 px-4, scrollable */}
      <div className="grid grid-cols-2 gap-2 px-4 overflow-y-auto flex-1 pb-20 content-start">
        {traits.map((trait, i) => {
          const isSelected = selected === trait.id;
          const baseColor = isPositive ? '#4ECDC4' : '#FF6B6B';
          return (
            <button
              key={trait.id}
              onClick={() => handleSelect(trait.id)}
              disabled={submitted}
              className="rounded-lg px-3 py-2 text-center font-semibold transition-all active:scale-95 leading-tight shadow-md border-2 border-white overflow-hidden"
              style={{
                backgroundColor: isSelected ? baseColor : 'rgba(255,255,255,0.1)',
                color: isSelected ? '#0A1752' : 'white',
                borderColor: isSelected ? baseColor : 'rgba(255,255,255,0.5)',
                opacity: submitted && !isSelected ? 0.3 : 1,
                fontSize: '0.9rem',
              }}
            >
              <div className="flex flex-col items-center justify-center w-full" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
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
            className="w-full py-3 rounded-lg text-lg font-semibold transition-all active:scale-95 border-2 border-white shadow-md"
            style={{
              backgroundColor: selected ? '#0A1752' : '#333',
              color: 'white',
              borderColor: selected ? 'white' : '#555',
              opacity: selected ? 1 : 0.5,
              fontFamily: 'Barlow Semi Condensed, sans-serif',
              fontWeight: 400,
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

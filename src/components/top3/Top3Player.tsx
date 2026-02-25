'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Top3State } from '@/modules/top3/types';
import { hasPlayerVoted } from '@/modules/top3/logic';

interface Top3PlayerProps {
  state: Top3State;
  playerId: string;
  playerName: string;
  teamNumber: number;
  heading?: string;
  mediaUrl?: string;
  onVote: (chosenPlayerId: string, chosenPlayerName: string) => void;
}

export default function Top3Player({
  state,
  playerId,
  playerName,
  teamNumber,
  heading,
  mediaUrl,
  onVote,
}: Top3PlayerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const alreadyVoted = hasPlayerVoted(state, playerId);
  const isVoting = state.currentQuestion.phase === 'voting';
  const isResults = state.currentQuestion.phase === 'results';

  // Filter out the current player from the list
  const otherPlayers = state.allPlayerNames.filter(
    (name) => name !== playerName
  );

  const handleSelect = (name: string) => {
    if (submitted || alreadyVoted) return;
    setSelected(name);
  };

  const handleConfirm = () => {
    if (!selected || submitted || alreadyVoted) return;
    onVote(selected, selected);
    setSubmitted(true);
  };

  // Already voted or just submitted
  if (alreadyVoted || submitted) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
        }}
      >
        <div
          className="text-center"
          style={{ animation: 'top3PopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <div className="text-6xl mb-4">✅</div>
          <p className="text-white text-3xl font-bold">Je hebt gestemd.</p>
          <p className="text-white/50 text-sm mt-4">Wacht op de resultaten...</p>
        </div>
      </div>
    );
  }

  // Results phase — show waiting screen
  if (isResults) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
        }}
      >
        <div className="text-white text-center">
          <p className="text-lg opacity-70 mb-2">De resultaten worden getoond</p>
          <h2 className="text-4xl font-bold">Kijk op het grote scherm!</h2>
        </div>
      </div>
    );
  }

  // Waiting for voting to start — show branded intro with image + heading
  if (!isVoting) {
    const isVideoMedia = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
    return (
      <div
        className="min-h-screen flex flex-col overflow-hidden"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
        }}
      >
        {/* Logo band */}
        <div
          className="relative bg-cover bg-center bg-no-repeat shrink-0"
          style={{ backgroundImage: 'url(/assets/band.webp)', height: '14vh' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Image src="/assets/ranking_logo.webp" alt="Ranking Logo" width={256} height={128} className="h-full max-h-28 w-auto object-contain p-2" priority />
          </div>
        </div>

        {/* Heading (two lines) */}
        {heading && (
          <div className="text-center px-6 pt-6 pb-2">
            <h1 className="text-white text-2xl leading-snug whitespace-pre-line" style={{ fontWeight: 300, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
              {heading}
            </h1>
          </div>
        )}

        {/* Media image */}
        {mediaUrl && !isVideoMedia && (
          <div className="flex-1 flex items-center justify-center px-6 py-4">
            <img src={mediaUrl} alt={heading || 'Top 3'} className="max-h-[50vh] w-auto rounded-2xl shadow-2xl object-contain" />
          </div>
        )}

        {!mediaUrl && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-white/60 text-lg">Wacht tot het stemmen begint...</p>
          </div>
        )}
      </div>
    );
  }

  // Voting view — show list of other players with radio buttons
  return (
    <div
      className="min-h-screen flex flex-col p-4"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-4 pt-2">
        <h2 className="text-white text-2xl font-bold">Kies iemand!</h2>
        <p className="text-white/60 text-sm mt-1">
          {playerName}, kies een persoon
        </p>
      </div>

      {/* Player list with radio buttons */}
      <div className="flex-1 overflow-y-auto pb-24 space-y-2">
        {otherPlayers.map((name) => {
          const isSelected = selected === name;
          return (
            <button
              key={name}
              onClick={() => handleSelect(name)}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                border: isSelected ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
              }}
            >
              {/* Radio button */}
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  borderColor: isSelected ? '#4ECDC4' : 'rgba(255,255,255,0.3)',
                  backgroundColor: isSelected ? '#4ECDC4' : 'transparent',
                }}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </div>

              {/* Player name */}
              <span
                className="text-lg font-medium"
                style={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.8)' }}
              >
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Confirm button — fixed at bottom */}
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
          {selected ? `Bevestig: ${selected}` : 'Kies een persoon'}
        </button>
      </div>
    </div>
  );
}

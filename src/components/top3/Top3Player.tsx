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

  // Reset local submitted state if questionIndex changes (prevents "Je hebt gestemd" lingering on next slide)
  useEffect(() => {
    setSubmitted(false);
    setSelected(null);
  }, [state.currentQuestion.questionIndex]);

  const alreadyVoted = hasPlayerVoted(state, playerId);

  // Inject keyframes once
  useEffect(() => {
    if (document.getElementById('top3p-kf')) return;
    const s = document.createElement('style');
    s.id = 'top3p-kf';
    s.textContent = `
      @keyframes top3PopIn {
        0% { transform: scale(0) rotate(-10deg); opacity: 0; }
        60% { transform: scale(1.1) rotate(2deg); opacity: 1; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes top3HeadIn {
        0%   { opacity:0; transform: scale(0.6) translateY(20px); }
        100% { opacity:1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }, []);
  const isVoting = state.currentQuestion.phase === 'voting';
  const isResults = state.currentQuestion.phase === 'results';

  // Filter out the current player from the list
  const otherPlayers = state.allPlayerNames.filter(
    (name) => name !== playerName
  );

  const handleSelect = (name: string) => {
    if (submitted || alreadyVoted) return;
    setSelected(name);
    onVote(name, name);
    setSubmitted(true);
  };

  const isVideoMedia = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

  // Video phase (trailer) on phone - Never play videos or show voting lists here!
  if (isVideoMedia) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
        }}
      >
        <div className="text-5xl mb-4 animate-pulse">🍿</div>
        <h2 className="text-white text-3xl font-bold mb-2">Kijk naar het grote scherm!</h2>
        <p className="text-white/70 text-lg">De trailer speelt daar af.</p>
      </div>
    );
  }

  // Already voted or just submitted (Show popup)
  if (alreadyVoted || submitted) {
    return (
      <div
        className="min-h-screen flex flex-col p-4"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
        }}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div
            className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
            style={{ animation: 'top3PopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="text-6xl mb-4">✅</div>
            <p className="text-white text-3xl font-bold mb-2">Je hebt gestemd!</p>
            <p className="text-white/70 text-sm">Wacht op de volgende slide.</p>
          </div>
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
            <h1 className="text-white text-2xl leading-snug whitespace-pre-line" style={{ fontWeight: 300, textShadow: '0 2px 12px rgba(0,0,0,0.6)', animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {heading}
            </h1>
          </div>
        )}

        {/* Media image */}
        {mediaUrl && (
          <div className="flex-1 flex items-center justify-center px-6 py-4" style={{ animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both', animationDelay: '0.2s' }}>
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

      {/* Player list with radio buttons (Grid/Row layout) */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="flex flex-col gap-3 max-w-md mx-auto">
          {otherPlayers.map((name) => {
            const isSelected = selected === name;
            return (
              <label
                key={name}
                className="flex items-center gap-3 p-3 rounded-xl transition-all select-none cursor-pointer"
                style={{
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)',
                  border: isSelected ? '2px solid rgba(255,255,255,0.5)' : '2px solid transparent',
                }}
              >
                {/* Real radio button visually hidden but accessible */}
                <input
                  type="radio"
                  name="top3vote"
                  value={name}
                  checked={isSelected}
                  onChange={() => handleSelect(name)}
                  className="hidden"
                />

                {/* Custom radio circle */}
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: isSelected ? '#4ECDC4' : 'rgba(255,255,255,0.3)',
                    backgroundColor: isSelected ? '#4ECDC4' : 'transparent',
                  }}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>

                {/* Player name */}
                <span
                  className="text-base font-medium truncate"
                  style={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.8)' }}
                >
                  {name}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

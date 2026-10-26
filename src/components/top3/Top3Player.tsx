'use client';

import React, { useState, useEffect } from 'react';
import { Top3State } from '@/modules/top3/types';
import { hasPlayerVoted } from '@/modules/top3/logic';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';

interface Top3PlayerProps {
  state: Top3State;
  playerId: string;
  playerName: string;
  teamNumber: number;
  heading?: string;
  mediaUrl?: string;
  allPlayerNames?: string[];
  faseKey?: string;
  onVote: (chosenPlayerId: string, chosenPlayerName: string) => void;
}

export default function Top3Player({
  state,
  playerId,
  playerName,
  teamNumber,
  heading,
  mediaUrl,
  allPlayerNames,
  faseKey,
  onVote,
}: Top3PlayerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Reset local submitted state if questionIndex or faseKey changes (prevents "Je hebt gestemd" lingering on next slide)
  useEffect(() => {
    setSubmitted(false);
    setSelected(null);
  }, [state?.currentQuestion?.questionIndex, faseKey]);

  // Also reset if the server state clears the votes (e.g. game reset / presenter starts vote phase again)
  useEffect(() => {
    if (state?.currentQuestion?.votes?.length === 0) {
      setSubmitted(false);
      setSelected(null);
    }
  }, [state?.currentQuestion?.votes?.length]);

  const alreadyVoted = hasPlayerVoted(state, playerId, playerName);

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

  const formatName = (name: unknown) => {
    if (typeof name !== 'string') return '';
    return name.replace(/^\s*\d+[\s_-]*/, '');
  };

  const isResults = state?.currentQuestion?.phase === 'results';
  const isTrailer = faseKey === '10/01' || (!faseKey && !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl));
  // On question slides (10/05..10/13), voting is open by default so players always see names to choose
  const isVoting = !isResults && !isTrailer;

  // Pool of players to choose from: prefer fresh allPlayerNames from session
  const rawPool: string[] = Array.isArray(allPlayerNames) && allPlayerNames.length > 0
    ? allPlayerNames
    : Array.isArray(state?.allPlayerNames) && state.allPlayerNames.length > 0
    ? state.allPlayerNames
    : [];

  const cleanPlayerName = formatName(playerName).toLowerCase().trim();

  // Filter out self so player cannot vote for themselves
  const otherPlayers = rawPool
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
    .filter((name) => {
      if (!cleanPlayerName || cleanPlayerName === 'speler') return true;
      return formatName(name).toLowerCase().trim() !== cleanPlayerName;
    });

  const handleSelect = (name: string) => {
    if (submitted || alreadyVoted) return;
    setSelected(name);
    onVote(name, formatName(name));
    setSubmitted(true);
  };

  const isVideoMedia = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

  // Video phase (trailer) on phone - Never play videos or show voting lists here!
  if (isVideoMedia) {
    return <TrailerTitleCard title="Top 3" fase="10/01" />;
  }

  // Already voted or just submitted (Show popup)
  if (alreadyVoted || submitted) {
    return (
      <div
        className="min-h-screen flex flex-col p-4"
        style={{
          fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
          background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
        }}
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div
            className="bg-white/10 border border-white/20 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl flex flex-col items-center"
            style={{ animation: 'top3PopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Blue tick box instead of green tick */}
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg border border-white/40 mb-4">
              <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p
              className="text-white text-3xl font-normal mb-2 uppercase tracking-wide"
              style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif', fontWeight: 400 }}
            >
              Je hebt gestemd!
            </p>
            <p
              className="text-white/80 text-sm font-normal"
              style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif', fontWeight: 400 }}
            >
              Wacht op de volgende slide.
            </p>
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
        {/* Media image - Fill screen request */}
        {mediaUrl && (
          <div className="absolute inset-0 z-0 h-full w-full pointer-events-none" style={{ animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both', animationDelay: '0.2s' }}>
            {/* Dark overlay to make text pop over the full-screen image if needed */}
            <div className="absolute inset-0 bg-black/20 z-10" />
            <img src={mediaUrl} alt={heading || 'Top 3'} className="w-full h-full object-cover z-0" />
          </div>
        )}

        {/* Logo band - bring forward */}
        <div
          className="relative z-20 shrink-0 bg-cover bg-center bg-no-repeat py-2.5 flex items-center justify-center"
          style={{ backgroundImage: 'url(/assets/band.webp)', minHeight: '85px' }}
        >
          <CreepyRankingLogo size="md" />
        </div>

        {/* Heading - bring forward */}
        {heading && (
          <div className="relative z-20 text-center px-6 pt-6 pb-2">
            <h1 className="text-white text-2xl leading-snug whitespace-pre-line" style={{ fontWeight: 300, textShadow: '0 2px 12px rgba(0,0,0,0.6)', animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both' }}>
              {heading}
            </h1>
          </div>
        )}

        {!mediaUrl && (
          <div className="relative z-20 flex-1 flex items-center justify-center">
            <p className="text-white/60 text-lg">Wacht tot het stemmen begint...</p>
          </div>
        )}
      </div>
    );
  }

  // Voting view — show list of other players with radio buttons in 2 columns with white outlines
  return (
    <div
      className="min-h-screen flex flex-col p-4"
      style={{
        fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
        fontWeight: 400,
        background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
      }}
    >
      {/* Header */}
      <div className="text-center mb-3 pt-2">
        <h2
          className="text-white text-3xl tracking-wide uppercase"
          style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif', fontWeight: 400 }}
        >
          Kies iemand!
        </h2>
        <p
          className="text-white/80 text-base mt-0.5"
          style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif', fontWeight: 400 }}
        >
          {cleanPlayerName && cleanPlayerName !== 'speler' ? `${formatName(playerName)}, kies een persoon` : 'Kies een persoon'}
        </p>
      </div>

      {/* Player list in 2 columns with gradient name blocks and refined 1px white outline */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto w-full">
          {otherPlayers.map((name) => {
            const isSelected = selected === name;
            return (
              <label
                key={name}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all select-none cursor-pointer border border-white/80 shadow-md active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-r from-pink-400 to-purple-500 shadow-white/40'
                    : 'bg-gradient-to-r from-pink-300 to-purple-400 hover:from-pink-400 hover:to-purple-500'
                }`}
                style={{
                  fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
                  fontWeight: 400,
                  boxShadow: isSelected ? '0 0 10px rgba(255, 255, 255, 0.6)' : undefined,
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
                  className="w-4 h-4 rounded-full border border-gray-700/60 flex items-center justify-center flex-shrink-0 transition-all bg-white/40"
                  style={{
                    borderColor: isSelected ? '#1f2937' : 'rgba(31, 41, 55, 0.5)',
                  }}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-gray-900" />
                  )}
                </div>

                {/* Player name */}
                <span
                  className="text-base sm:text-lg truncate flex-1 uppercase tracking-wide leading-tight text-gray-800 font-normal"
                  style={{
                    fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
                    fontWeight: 400,
                  }}
                >
                  {formatName(name)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

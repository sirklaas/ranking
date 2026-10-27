"use client";
import React, { useState, useEffect, useMemo } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { ENDGAME_CARDS, EndgameState, DEFAULT_ENDGAME_STATE } from './endgameData';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';

const STORAGE_KEY = 'ranking_endgame_state';

const PlayerView: React.FC<FaseCommonProps> = ({
  sessionId,
  moduleStateJson,
  playerInfo,
}) => {
  const [localEndgameState, setLocalEndgameState] = useState<EndgameState | null>(null);

  // Sync incoming props from parent / PB
  useEffect(() => {
    if (!moduleStateJson) return;
    try {
      const parsed = typeof moduleStateJson === 'string' ? JSON.parse(moduleStateJson) : moduleStateJson;
      if (parsed) {
        setLocalEndgameState((prev) => {
          if (!prev?.timestamp || (parsed.timestamp && parsed.timestamp >= prev.timestamp)) {
            return parsed;
          }
          return prev;
        });
      }
    } catch {}
  }, [moduleStateJson]);

  // Fast localStorage sync for same-machine testing (Safari/Chrome side-by-side or test-phones)
  useEffect(() => {
    let lastTs = 0;
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const fresh = JSON.parse(saved);
          if (fresh.timestamp && fresh.timestamp > lastTs) {
            lastTs = fresh.timestamp;
            setLocalEndgameState(fresh);
          }
        }
      } catch {}
    }, 150);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue);
          setLocalEndgameState(fresh);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Parse endgame state from local state or fallback
  const state = useMemo<EndgameState>(() => {
    const base = localEndgameState || (moduleStateJson ? (typeof moduleStateJson === 'string' ? JSON.parse(moduleStateJson) : moduleStateJson) : DEFAULT_ENDGAME_STATE);
    return {
      selectedCard: base?.selectedCard || null,
      playbackState: base?.playbackState || 'grid',
      usedCards: Array.isArray(base?.usedCards) ? base.usedCards : [],
      teamSelections: base?.teamSelections || {},
      revealedCards: Array.isArray(base?.revealedCards) ? base.revealedCards : [],
      timestamp: base?.timestamp
    };
  }, [moduleStateJson, localEndgameState]);

  const teamNumber = playerInfo?.teamNumber || 1;
  const playerName = playerInfo?.playerName || '';

  const activeCard = useMemo(() => {
    if (!state.selectedCard) return null;
    return ENDGAME_CARDS.find(c => c.id === state.selectedCard) || null;
  }, [state.selectedCard]);

  // 1. When presenter triggers End Card (via 'e' or button): show thank you & Photo App screen
  if (state.playbackState === 'endtitle') {
    return (
      <div
        className="min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #07060a 0%, #150a24 50%, #0d080c 100%)',
          color: '#ffffff'
        }}
      >
        <div className="relative w-full min-h-[105px] py-3 flex-shrink-0 overflow-hidden shadow-lg flex items-center justify-center">
          <img
            src="/assets/band.webp"
            alt="Ranking Header"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 w-full">
            <CreepyRankingLogo />
          </div>
        </div>

        <div className="flex-1 w-full max-w-sm mx-auto px-4 py-8 flex flex-col items-center justify-center text-center z-10 animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-4xl shadow-[0_0_35px_rgba(249,115,22,0.6)] mb-4">
            🏆
          </div>
          <h2
            className="text-white text-3xl font-bold uppercase tracking-wider mb-2"
            style={{ fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif' }}
          >
            Bedankt voor het spelen!
          </h2>
          <p className="text-orange-200 text-base mb-6 font-medium">
            Vond je het leuk? Geef ons dan veul sterren! Scan de QR-code op het grote scherm.
          </p>

          <div className="w-full flex flex-col items-center text-center">
            <a
              href={`https://www.pinkmilk.eu/phone/media.html?showId=${encodeURIComponent(sessionId || '')}&playerName=${encodeURIComponent(playerName || '')}&team=${encodeURIComponent(teamNumber || '1')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-full bg-[#0A1752] text-white font-bold border-2 border-white shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:bg-[#08134A] transition-all text-lg"
              style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
            >
              <span>Photo App {teamNumber ? `[ Team ${teamNumber} ]` : ''}</span>
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <div className="mt-2.5 text-white/90 text-sm font-semibold leading-snug drop-shadow" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
              Deel je mooiste foto&apos;s en filmpjes!
            </div>
            <div className="text-yellow-300 text-xs font-bold drop-shadow tracking-wide mt-0.5" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
              [ vooral van de quizmaster want die tellen dubbel ]
            </div>
          </div>
        </div>

        <div className="w-full py-3 px-4 text-center text-xs text-gray-500 border-t border-white/5 flex-shrink-0">
          Ranking De Finale · Team {teamNumber} ({playerName})
        </div>
      </div>
    );
  }

  // 2. When a card is chosen: show the card on the phone!
  // Active during 'paused' (chosen, unrevealed), 'playing' (revealing), 'finished' (revealed)
  const isCardActive = !!activeCard && (state.playbackState === 'paused' || state.playbackState === 'playing' || state.playbackState === 'finished');

  if (isCardActive && activeCard) {
    const isRevealed = state.playbackState === 'playing' || state.playbackState === 'finished';

    return (
      <div
        className="min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #07060a 0%, #150a24 50%, #0d080c 100%)',
          color: '#ffffff'
        }}
      >
        {/* Header Band */}
        <div className="relative w-full min-h-[90px] py-2.5 flex-shrink-0 overflow-hidden shadow-lg flex items-center justify-center">
          <img
            src="/assets/band.webp"
            alt="Ranking Header"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 w-full">
            <CreepyRankingLogo />
          </div>
        </div>

        {/* Card Content Container */}
        <div className="flex-1 w-full max-w-sm mx-auto px-5 py-4 flex flex-col items-center justify-center text-center z-10 animate-fadeIn">
          {/* Status Badge */}
          {isRevealed ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-mono uppercase tracking-widest mb-3 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span className="text-sm">✨</span> Onthuld!
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-mono uppercase tracking-widest mb-3">
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
              Gekozen Kaart
            </div>
          )}

          {/* Card Image */}
          <div
            className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-700 w-full max-w-[240px] aspect-square shadow-2xl ${
              isRevealed
                ? 'border-amber-400 shadow-[0_0_35px_rgba(251,191,36,0.5)] scale-102'
                : 'border-orange-500/80 shadow-[0_0_25px_rgba(255,117,24,0.4)]'
            }`}
            style={{
              background: 'rgba(20, 15, 30, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <img
              src={activeCard.image}
              alt={activeCard.name}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Card Name */}
          <h2
            className="text-white text-3xl font-normal uppercase tracking-wider mt-3.5 mb-1"
            style={{
              fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
              textShadow: '0 0 20px rgba(255,117,24,0.8)'
            }}
          >
            {activeCard.name}
          </h2>

          {/* Suspense text or Revealed Outcome */}
          {isRevealed ? (
            <div className="mt-2 w-full max-w-[260px] px-4 py-3 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-950/90 via-orange-950/90 to-amber-950/90 shadow-[0_0_25px_rgba(251,191,36,0.3)] animate-fadeIn">
              <div className="text-amber-300 text-xs font-mono uppercase tracking-widest font-bold">
                {activeCard.line1}
              </div>
              <div
                className="text-white text-xl font-black uppercase tracking-wide mt-1"
                dangerouslySetInnerHTML={{ __html: activeCard.line2 }}
              />
            </div>
          ) : (
            <p className="text-orange-200/80 text-sm font-medium animate-pulse mt-1">
              Kijk naar het grote scherm voor de ontknoping...
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="w-full py-2.5 px-4 text-center text-xs text-gray-500 border-t border-white/5 flex-shrink-0">
          Ranking De Finale · Team {teamNumber} ({playerName})
        </div>
      </div>
    );
  }

  // 3. Grid / Trailer / Default: Card is taken away, back to "Kijk naar het grote scherm"
  return (
    <TrailerTitleCard
      title="Fnuikende Finale"
      subtitle="Kijk naar het grote scherm"
      fase="20/01"
    />
  );
};

export default PlayerView;

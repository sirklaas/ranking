"use client";
import React, { useMemo } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { EndgameState, DEFAULT_ENDGAME_STATE } from './endgameData';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';

const PlayerView: React.FC<FaseCommonProps> = ({
  sessionId,
  moduleStateJson,
  playerInfo,
}) => {
  // Parse endgame state
  const state = useMemo<EndgameState>(() => {
    if (!moduleStateJson) return DEFAULT_ENDGAME_STATE;
    try {
      const parsed = typeof moduleStateJson === 'string' ? JSON.parse(moduleStateJson) : moduleStateJson;
      return {
        selectedCard: parsed?.selectedCard || null,
        playbackState: parsed?.playbackState || 'grid',
        usedCards: Array.isArray(parsed?.usedCards) ? parsed.usedCards : [],
        teamSelections: parsed?.teamSelections || {},
        revealedCards: Array.isArray(parsed?.revealedCards) ? parsed.revealedCards : []
      };
    } catch {
      return DEFAULT_ENDGAME_STATE;
    }
  }, [moduleStateJson]);

  const teamNumber = playerInfo?.teamNumber || 1;
  const playerName = playerInfo?.playerName || '';

  // When presenter triggers End Card (via 'e' or button): show thank you & Photo App screen
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

  // Simple, rock-solid version: Kijk naar het grote scherm!
  return (
    <TrailerTitleCard
      title="Fnuikende Finale"
      subtitle="Kijk naar het grote scherm"
      fase="20/01"
    />
  );
};

export default PlayerView;

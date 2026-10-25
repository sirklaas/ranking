"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { ENDGAME_CARDS, EndgameState, DEFAULT_ENDGAME_STATE, EndgameCard } from './endgameData';

const STORAGE_KEY = 'ranking_endgame_state';

const PresenterView: React.FC<FaseCommonProps> = ({
  sessionId,
  moduleStateJson,
  onModuleStateJson
}) => {
  // Parse state from props or fallback to default
  const parsedState = useMemo<EndgameState>(() => {
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

  const [state, setState] = useState<EndgameState>(parsedState);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const endTitleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync incoming props to local state
  useEffect(() => {
    setState(parsedState);
  }, [parsedState]);

  // Sync to backend and local storage
  const syncState = useCallback(async (newState: EndgameState) => {
    const stateWithTs = { ...newState, timestamp: Date.now() };
    setState(stateWithTs);

    // Fast 0ms localStorage sync for presenter/display on same machine
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithTs));
    } catch {
      // Ignore localStorage errors
    }

    // Pass to parent
    if (onModuleStateJson) {
      onModuleStateJson(JSON.stringify(stateWithTs));
    }

    // Persist to PocketBase
    if (sessionId) {
      try {
        await fetch('/api/session-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId,
            data: { endgame_state: stateWithTs }
          })
        });
      } catch (err) {
        console.error('[Endgame Presenter] Error saving state:', err);
      }
    }
  }, [sessionId, onModuleStateJson]);

  // Listen to localStorage changes for instant dual-window updates
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const fresh = JSON.parse(e.newValue);
          setState(fresh);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isCardUsed = useCallback((id: string) => {
    return state.usedCards.includes(id);
  }, [state.usedCards]);

  const handleCardClick = (card: EndgameCard) => {
    if (state.playbackState !== 'grid') return;
    if (isCardUsed(card.id)) return;

    // Select card and pause at first frame
    const next: EndgameState = {
      ...state,
      selectedCard: card.id,
      playbackState: 'paused'
    };
    syncState(next);
  };

  const handlePlayVideo = useCallback(() => {
    if (state.playbackState === 'paused' && state.selectedCard) {
      const card = ENDGAME_CARDS.find(c => c.id === state.selectedCard);
      const next: EndgameState = {
        ...state,
        playbackState: 'playing'
      };
      syncState(next);

      // Play audio on presenter screen
      if (card && audioPlayerRef.current) {
        audioPlayerRef.current.src = card.video;
        audioPlayerRef.current.currentTime = 0;
        audioPlayerRef.current.play().catch(e => console.log('Audio autoplay prevented on presenter:', e));
      }
    }
  }, [state, syncState]);

  const handleReturnToGrid = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    const newUsed = state.selectedCard && !state.usedCards.includes(state.selectedCard)
      ? [...state.usedCards, state.selectedCard]
      : state.usedCards;

    const newRevealed = state.selectedCard && !state.revealedCards.includes(state.selectedCard)
      ? [...state.revealedCards, state.selectedCard]
      : state.revealedCards;

    const next: EndgameState = {
      ...state,
      selectedCard: null,
      playbackState: 'grid',
      usedCards: newUsed,
      revealedCards: newRevealed
    };
    syncState(next);
  }, [state, syncState]);

  const handleShowEndTitle = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (endTitleAudioRef.current) {
      endTitleAudioRef.current.currentTime = 0;
      endTitleAudioRef.current.play().catch(e => console.log('End title audio autoplay blocked:', e));
    }
    const next: EndgameState = {
      ...state,
      selectedCard: null,
      playbackState: 'endtitle'
    };
    syncState(next);
  };

  const handleReset = useCallback(() => {
    if (window.confirm('Alle kaarten resetten? Dit wist alle gespeelde kaarten en keuzes.')) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      if (endTitleAudioRef.current) {
        endTitleAudioRef.current.pause();
        endTitleAudioRef.current.currentTime = 0;
      }
      syncState({
        selectedCard: null,
        playbackState: 'grid',
        usedCards: [],
        teamSelections: {},
        revealedCards: []
      });
    }
  }, [syncState]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (state.playbackState === 'paused') {
          handlePlayVideo();
        } else if (state.playbackState === 'playing' || state.playbackState === 'finished') {
          handleReturnToGrid();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.playbackState, handlePlayVideo, handleReturnToGrid, handleReset]);

  // Which teams picked which card?
  const getTeamsForCard = (cardId: string): string[] => {
    const teams: string[] = [];
    Object.entries(state.teamSelections || {}).forEach(([teamNum, chosenId]) => {
      if (chosenId === cardId) {
        teams.push(`Team ${teamNum}`);
      }
    });
    return teams;
  };

  const selectedCardObj = ENDGAME_CARDS.find(c => c.id === state.selectedCard);

  return (
    <div
      className="w-full h-full flex flex-col select-none overflow-y-auto p-4 md:p-6"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#ffffff'
      }}
    >
      {/* Hidden audio players */}
      <audio ref={audioPlayerRef} />
      <audio ref={endTitleAudioRef} src="/endgame/Lawineboys.m4a" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-white/10">
        <div>
          <div className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Presenter · Finale</div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-wide">
            Endgame Presenter
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleShowEndTitle}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
              state.playbackState === 'endtitle'
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/40'
                : 'bg-purple-950/60 text-purple-200 border-purple-600/40 hover:bg-purple-800/80 hover:text-white'
            }`}
          >
            🎬 Show End Title
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-sm font-semibold bg-red-950/50 hover:bg-red-800 text-red-200 border border-red-700/40 transition-all flex items-center gap-1.5"
            title="Reset alle kaarten"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Control Banner when a card is active */}
      {selectedCardObj && (
        <div className="mb-4 p-3.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <img src={selectedCardObj.image} alt={selectedCardObj.name} className="w-12 h-12 rounded-lg object-cover border border-indigo-400/50" />
            <div>
              <div className="text-xs text-indigo-300 font-semibold uppercase">Actieve Kaart</div>
              <div className="text-xl font-bold text-white">{selectedCardObj.name}</div>
            </div>
            {getTeamsForCard(selectedCardObj.id).length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 text-xs font-bold">
                👑 Gekozen door: {getTeamsForCard(selectedCardObj.id).join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {state.playbackState === 'paused' && (
              <button
                onClick={handlePlayVideo}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-base shadow-lg shadow-green-900/50 flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>▶</span> Speel Video (Display)
              </button>
            )}

            {(state.playbackState === 'playing' || state.playbackState === 'finished') && (
              <button
                onClick={handleReturnToGrid}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-base shadow-lg shadow-indigo-900/50 flex items-center gap-2 transition-all hover:scale-105"
              >
                <span>⏹</span> Terug naar Grid
              </button>
            )}
          </div>
        </div>
      )}

      {/* 8 Cards Grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-h-[72vh] items-stretch">
        {ENDGAME_CARDS.map(card => {
          const used = isCardUsed(card.id);
          const isSelected = state.selectedCard === card.id;
          const teams = getTeamsForCard(card.id);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 flex flex-col aspect-square group ${
                used
                  ? 'opacity-35 grayscale cursor-not-allowed border-gray-700 bg-black/40'
                  : isSelected
                  ? 'border-indigo-400 ring-4 ring-indigo-500/40 scale-[1.02] shadow-2xl shadow-indigo-500/30 cursor-pointer bg-indigo-950/40'
                  : 'border-white/15 hover:border-indigo-400/70 hover:scale-[1.02] cursor-pointer bg-slate-900/60 shadow-lg'
              }`}
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Team Pick Badge */}
              {teams.length > 0 && (
                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[11px] font-bold shadow-md flex items-center gap-1">
                  👑 {teams.join(', ')}
                </div>
              )}

              {/* Bottom Label */}
              <div className="absolute inset-x-0 bottom-0 pt-6 pb-2 px-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-end">
                <span className="text-white text-base md:text-lg font-normal tracking-wide text-center drop-shadow-md">
                  {card.name}
                </span>
                {used && <span className="text-[10px] text-gray-400 uppercase font-semibold">Gespeeld</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Instructions bar */}
      <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-indigo-300">Klik Kaart</kbd>
            <span>Selecteer</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-indigo-300">→</kbd>
            <span>Speel Video / Terug</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-indigo-300">R</kbd>
            <span>Reset</span>
          </span>
        </div>

        <div className="text-right text-gray-500 text-[11px]">
          Fase: 20/01 · Dual-Screen Sync Actief
        </div>
      </div>
    </div>
  );
};

export default PresenterView;

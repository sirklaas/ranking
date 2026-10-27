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

  // Ensure Lawineboys audio only plays when in endtitle state
  useEffect(() => {
    if (state.playbackState !== 'endtitle' && endTitleAudioRef.current && !endTitleAudioRef.current.paused) {
      endTitleAudioRef.current.pause();
      endTitleAudioRef.current.currentTime = 0;
    }
  }, [state.playbackState]);

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
    const targetId = sessionId || 'latest';
    try {
      await fetch('/api/session-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          data: { endgame_state: stateWithTs }
        })
      });
    } catch (err) {
      console.error('[Endgame Presenter] Error saving state:', err);
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

    // Immediately start reveal animation on display and play audio on presenter
    const next: EndgameState = {
      ...state,
      selectedCard: card.id,
      playbackState: 'playing'
    };
    syncState(next);

    if (audioPlayerRef.current) {
      audioPlayerRef.current.src = '/endgame/endcard_audio.mp3';
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.play().catch(e => console.log('Audio autoplay prevented on presenter:', e));
    }
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
        audioPlayerRef.current.src = '/endgame/endcard_audio.mp3';
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
    if (endTitleAudioRef.current) {
      endTitleAudioRef.current.pause();
      endTitleAudioRef.current.currentTime = 0;
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
        } else if (state.playbackState === 'playing' || state.playbackState === 'finished' || state.selectedCard) {
          handleReturnToGrid();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleReset();
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        if (state.playbackState === 'endtitle') {
          handleReturnToGrid();
        } else {
          handleShowEndTitle();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.playbackState, state.selectedCard, handlePlayVideo, handleReturnToGrid, handleReset, handleShowEndTitle]);

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
            onClick={state.playbackState === 'endtitle' ? handleReturnToGrid : handleShowEndTitle}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
              state.playbackState === 'endtitle'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-500/40'
                : 'bg-purple-950/60 text-purple-200 border-purple-600/40 hover:bg-purple-800/80 hover:text-white'
            }`}
          >
            {state.playbackState === 'endtitle' ? '⏹ Terug naar Grid (e)' : '🎬 Show End Card (e)'}
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

      {/* End Card Active Banner */}
      {state.playbackState === 'endtitle' && (
        <div className="mb-4 p-4 rounded-xl bg-purple-950/80 border border-purple-500/50 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <div className="text-white font-bold text-sm uppercase tracking-wider">End Card Actief op Scherm</div>
              <div className="text-purple-300 text-xs">Review QR Code wordt getoond met &lsquo;Wat zullen we drinken&rsquo;</div>
            </div>
          </div>
          <button
            onClick={handleReturnToGrid}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
          >
            Terug naar Kaarten
          </button>
        </div>
      )}

      {/* Control Banner when a card is active */}
      {selectedCardObj && (
        <div className="mb-4 p-3.5 rounded-xl bg-orange-950/60 border border-orange-500/50 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <img src={selectedCardObj.image} alt={selectedCardObj.name} className="w-14 h-14 rounded-lg object-cover border border-orange-400" />
            <div>
              <div className="text-xs text-orange-400 font-semibold uppercase tracking-wider">Actieve Kaart · Uitkomst</div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <span>{selectedCardObj.name}</span>
                <span className="text-orange-300 font-normal text-base bg-orange-950/80 px-2.5 py-0.5 rounded border border-orange-600/40">
                  {selectedCardObj.line1} {selectedCardObj.line2.replace(/<[^>]+>/g, '')}
                </span>
              </div>
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
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-base shadow-lg shadow-orange-900/50 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>✨</span> Start Coded Reveal (Display)
              </button>
            )}

            {(state.playbackState === 'playing' || state.playbackState === 'finished' || state.selectedCard) && (
              <button
                onClick={handleReturnToGrid}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-base border border-zinc-600 shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>⏹</span> Terug naar Grid (→)
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
                  ? 'opacity-35 grayscale cursor-not-allowed border-zinc-800 bg-black/40'
                  : isSelected
                  ? 'border-orange-500 ring-4 ring-orange-500/50 scale-[1.02] shadow-2xl shadow-orange-500/40 cursor-pointer bg-orange-950/40'
                  : 'border-orange-500/30 hover:border-orange-500 hover:scale-[1.02] cursor-pointer bg-zinc-900/70 shadow-lg'
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

              {/* Bottom Label with Munten Outcome */}
              <div className="absolute inset-x-0 bottom-0 pt-6 pb-2.5 px-2 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col items-center justify-end text-center">
                <span className="text-white text-base md:text-lg font-bold tracking-wide drop-shadow-md">
                  {card.name}
                </span>
                <span className="text-xs text-orange-300 font-medium line-clamp-1">
                  {card.line1} {card.line2.replace(/<[^>]+>/g, '')}
                </span>
                {used && <span className="text-[10px] text-zinc-400 uppercase font-semibold mt-0.5">Gespeeld</span>}
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
          <span className="flex items-center gap-1.5">
            <kbd className="px-2 py-0.5 rounded bg-white/10 border border-white/20 font-mono text-indigo-300">E</kbd>
            <span>Show End Card (QR)</span>
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

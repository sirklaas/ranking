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
        playbackState: parsed?.playbackState || (parsed?.usedCards?.length > 0 ? 'grid' : 'trailer'),
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
  const trailerAudioRef = useRef<HTMLAudioElement | null>(null);

  // Sync incoming props to local state
  useEffect(() => {
    setState(parsedState);
  }, [parsedState]);

  // Ensure trailer audio plays on MacBook when in trailer state
  useEffect(() => {
    const ta = trailerAudioRef.current;
    if (!ta) return;
    if (state.playbackState === 'trailer') {
      ta.currentTime = 0;
      ta.volume = 1;
      ta.muted = false;
      ta.play().catch(e => console.log('Trailer audio autoplay blocked on presenter:', e));
    } else {
      ta.pause();
    }
  }, [state.playbackState]);

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

    // Select card and pause - displays the unrevealed card large on screen; reveals ONLY on ->
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
    if (trailerAudioRef.current) {
      trailerAudioRef.current.pause();
      trailerAudioRef.current.currentTime = 0;
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

  const handleReplayTrailer = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    if (endTitleAudioRef.current) {
      endTitleAudioRef.current.pause();
      endTitleAudioRef.current.currentTime = 0;
    }
    const next: EndgameState = {
      ...state,
      selectedCard: null,
      playbackState: 'trailer'
    };
    syncState(next);
  };

  const handleShowEndTitle = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    if (trailerAudioRef.current) {
      trailerAudioRef.current.pause();
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
      if (trailerAudioRef.current) {
        trailerAudioRef.current.pause();
        trailerAudioRef.current.currentTime = 0;
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
        if (state.playbackState === 'trailer') {
          handleReturnToGrid();
        } else if (state.playbackState === 'paused') {
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
      className="w-full h-full flex flex-col select-none overflow-hidden p-2.5 md:p-3"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        color: '#ffffff'
      }}
    >
      {/* Hidden audio players */}
      <audio ref={audioPlayerRef} />
      <audio ref={endTitleAudioRef} src="/endgame/Lawineboys.m4a" />
      <audio ref={trailerAudioRef} src="/pics/HaloweenTrailer/trailercreepy.m4v" />

      {/* Header - Slim single line to preserve vertical space */}
      <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-widest text-orange-400 font-bold bg-orange-950/60 px-2 py-0.5 rounded border border-orange-500/30">Finale 20/01</span>
          <h1 className="text-base md:text-lg font-normal text-white tracking-wide">
            De Finale · Kaartenkeuze
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReplayTrailer}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              state.playbackState === 'trailer'
                ? 'bg-orange-600 text-white border-orange-400 shadow-md shadow-orange-500/40'
                : 'bg-orange-950/60 text-orange-200 border-orange-600/40 hover:bg-orange-800/80 hover:text-white'
            }`}
            title="Herstart de finale trailer"
          >
            🎬 Trailer
          </button>

          <button
            onClick={state.playbackState === 'endtitle' ? handleReturnToGrid : handleShowEndTitle}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
              state.playbackState === 'endtitle'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/40'
                : 'bg-purple-950/60 text-purple-200 border-purple-600/40 hover:bg-purple-800/80 hover:text-white'
            }`}
          >
            {state.playbackState === 'endtitle' ? '⏹ Terug naar Grid (e)' : '🎬 Show End Card (e)'}
          </button>

          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-950/50 hover:bg-red-800 text-red-200 border border-red-700/40 transition-all flex items-center gap-1 cursor-pointer"
            title="Reset alle kaarten"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Reset
          </button>
        </div>
      </div>

      {/* Trailer Active Banner - Slim */}
      {state.playbackState === 'trailer' && (
        <div className="mb-2 py-1.5 px-3 rounded-lg bg-orange-950/80 border border-orange-500/50 flex items-center justify-between gap-2 shadow-md flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse">🎬</span>
            <div>
              <div className="text-white font-bold text-xs uppercase tracking-wider">Trailer Actief op Scherm</div>
              <div className="text-orange-300 text-[11px]">Trailer speelt af op beamer en speakers</div>
            </div>
          </div>
          <button
            onClick={handleReturnToGrid}
            className="px-3.5 py-1 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow flex items-center gap-1.5 cursor-pointer"
          >
            <span>⏭</span> Naar Kaarten Grid (→)
          </button>
        </div>
      )}

      {/* End Card Active Banner - Slim */}
      {state.playbackState === 'endtitle' && (
        <div className="mb-2 py-1.5 px-3 rounded-lg bg-purple-950/80 border border-purple-500/50 flex items-center justify-between gap-2 shadow-md flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-base">🎉</span>
            <div>
              <div className="text-white font-bold text-xs uppercase tracking-wider">End Card Actief op Scherm</div>
              <div className="text-purple-300 text-[11px]">Review QR Code &amp; Lawineboys actief</div>
            </div>
          </div>
          <button
            onClick={handleReturnToGrid}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer"
          >
            Terug naar Kaarten
          </button>
        </div>
      )}

      {/* Control Banner when a card is active - Slim */}
      {selectedCardObj && (
        <div className="mb-2 py-1.5 px-3 rounded-lg bg-orange-950/70 border border-orange-500/50 flex items-center justify-between gap-2 shadow-md flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={selectedCardObj.image} alt={selectedCardObj.name} className="w-9 h-9 rounded object-cover border border-orange-400 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-orange-400 font-semibold uppercase tracking-wider">Actieve Kaart</div>
              <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                <span>{selectedCardObj.name}</span>
                <span className="text-orange-300 font-normal text-xs bg-orange-950/80 px-2 py-0.5 rounded border border-orange-600/40 truncate">
                  {selectedCardObj.line1} {selectedCardObj.line2.replace(/<[^>]+>/g, '')}
                </span>
              </div>
            </div>
            {getTeamsForCard(selectedCardObj.id).length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 text-[10px] font-bold flex-shrink-0">
                👑 Team: {getTeamsForCard(selectedCardObj.id).join(', ')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {state.playbackState === 'paused' && (
              <button
                onClick={handlePlayVideo}
                className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-900/50 flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>✨</span> Start Reveal (→)
              </button>
            )}

            {(state.playbackState === 'playing' || state.playbackState === 'finished') && (
              <button
                onClick={handleReturnToGrid}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-600 shadow flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <span>⏹</span> Terug naar Grid (→)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 8 Cards Grid - Fits 100% on MacBook Screen Without Scrolling */}
      <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden">
        {ENDGAME_CARDS.map(card => {
          const used = isCardUsed(card.id);
          const isSelected = state.selectedCard === card.id;
          const teams = getTeamsForCard(card.id);

          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 flex flex-col h-full w-full group ${
                used
                  ? 'opacity-30 grayscale cursor-not-allowed border-zinc-800 bg-black/40'
                  : isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500/50 scale-[1.01] shadow-lg shadow-orange-500/40 cursor-pointer bg-orange-950/40'
                  : 'border-orange-500/30 hover:border-orange-500 hover:scale-[1.01] cursor-pointer bg-zinc-900/70 shadow'
              }`}
            >
              <img
                src={card.image}
                alt={card.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-102"
              />

              {/* Team Pick Badge */}
              {teams.length > 0 && (
                <div className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-bold shadow flex items-center gap-1">
                  👑 {teams.join(', ')}
                </div>
              )}

              {/* Bottom Label with Munten Outcome */}
              <div className="absolute inset-x-0 bottom-0 pt-4 pb-1 px-1 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col items-center justify-end text-center">
                <span className="text-white text-xs md:text-sm font-bold tracking-wide drop-shadow-md">
                  {card.name}
                </span>
                <span className="text-[11px] text-orange-300 font-medium line-clamp-1">
                  {card.line1} {card.line2.replace(/<[^>]+>/g, '')}
                </span>
                {used && <span className="text-[9px] text-zinc-400 uppercase font-semibold">Gespeeld</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Instructions bar - Ultra compact single line */}
      <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[11px] text-gray-400 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.2 rounded bg-white/10 border border-white/20 font-mono text-orange-300">Klik</kbd>
            <span>Kies</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.2 rounded bg-white/10 border border-white/20 font-mono text-orange-300">→</kbd>
            <span>Reveal / Terug</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.2 rounded bg-white/10 border border-white/20 font-mono text-orange-300">R</kbd>
            <span>Reset</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.2 rounded bg-white/10 border border-white/20 font-mono text-orange-300">E</kbd>
            <span>End Card (QR)</span>
          </span>
        </div>

        <div className="text-right text-gray-500 text-[10px]">
          Fase: 20/01 · Geen Scrollen Nodig
        </div>
      </div>
    </div>
  );
};

export default PresenterView;

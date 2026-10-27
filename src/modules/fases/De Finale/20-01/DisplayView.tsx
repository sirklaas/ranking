"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { ENDGAME_CARDS, EndgameState, DEFAULT_ENDGAME_STATE } from './endgameData';
import CodedEndgameReveal from '@/components/endgame/CodedEndgameReveal';
import SpookyTrailerTitle from '@/components/common/SpookyTrailerTitle';

const STORAGE_KEY = 'ranking_endgame_state';

const DisplayView: React.FC<FaseCommonProps> = ({
  sessionId,
  moduleStateJson,
  onModuleStateJson
}) => {
  // Parse state from props
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
  const trailerVideoRef = useRef<HTMLVideoElement | null>(null);

  // Play creepy trailer first when entering Finale if no card is selected
  const [showTrailer, setShowTrailer] = useState<boolean>(() => {
    return !parsedState.selectedCard && (parsedState.revealedCards || []).length === 0 && parsedState.playbackState === 'grid';
  });

  // If a card is selected from presenter or sync, dismiss trailer
  useEffect(() => {
    if (state.selectedCard || (state.revealedCards || []).length > 0 || state.playbackState !== 'grid') {
      setShowTrailer(false);
    }
  }, [state.selectedCard, state.revealedCards, state.playbackState]);

  // Handle trailer video - strictly muted on display (Presenter plays the audio)
  useEffect(() => {
    if (!showTrailer) return;
    const tv = trailerVideoRef.current;
    if (!tv) return;

    tv.muted = true;
    tv.volume = 0;
    tv.play().catch(() => {});
  }, [showTrailer]);

  // Sync incoming props
  useEffect(() => {
    setState(parsedState);
  }, [parsedState]);

  // Fast localStorage sync for same-machine dual display
  useEffect(() => {
    let lastTs = 0;
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const fresh = JSON.parse(saved);
          if (fresh.timestamp && fresh.timestamp !== lastTs) {
            lastTs = fresh.timestamp;
            setState(fresh);
          }
        }
      } catch {
        // ignore
      }
    }, 100);

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

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const activeCard = useMemo(() => {
    return ENDGAME_CARDS.find(c => c.id === state.selectedCard) || null;
  }, [state.selectedCard]);

  // Keyboard shortcut 'e' or 'E' on display to toggle End Card with QR code & Lawineboys
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        const nextPlayback = state.playbackState === 'endtitle' ? 'grid' : 'endtitle';
        const nextState: EndgameState = {
          ...state,
          selectedCard: null,
          playbackState: nextPlayback,
          timestamp: Date.now()
        };
        setState(nextState);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
        } catch {}
        if (onModuleStateJson) onModuleStateJson(JSON.stringify(nextState));
        if (sessionId) {
          fetch('/api/session-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: sessionId,
              data: { endgame_state: nextState }
            })
          }).catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [state, sessionId, onModuleStateJson]);

  // Notify backend when reveal animation has finished
  const handleRevealEnded = useCallback(async () => {
    if (state.selectedCard) {
      console.log('[Endgame Display] Coded reveal finished for card:', state.selectedCard);
      const cardId = state.selectedCard;

      const newRevealed = !state.revealedCards?.includes(cardId)
        ? [...(state.revealedCards || []), cardId]
        : (state.revealedCards || []);

      const newUsed = !state.usedCards.includes(cardId)
        ? [...state.usedCards, cardId]
        : state.usedCards;

      const nextState: EndgameState = {
        ...state,
        playbackState: 'finished',
        revealedCards: newRevealed,
        usedCards: newUsed,
        timestamp: Date.now()
      };

      setState(nextState);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      } catch {
        // ignore
      }

      if (onModuleStateJson) {
        onModuleStateJson(JSON.stringify(nextState));
      }

      if (sessionId) {
        try {
          await fetch('/api/session-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: sessionId,
              data: { endgame_state: nextState }
            })
          });
        } catch (err) {
          console.error('[Endgame Display] Error notifying end:', err);
        }
      }
    }
  }, [state, sessionId, onModuleStateJson]);

  const handleCloseReveal = useCallback(() => {
    const nextState: EndgameState = {
      ...state,
      selectedCard: null,
      playbackState: 'grid',
      timestamp: Date.now()
    };
    setState(nextState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {}
    if (onModuleStateJson) onModuleStateJson(JSON.stringify(nextState));
  }, [state, onModuleStateJson]);

  const isRevealActive = (state.playbackState === 'paused' || state.playbackState === 'playing' || state.playbackState === 'finished') && activeCard !== null;
  const isEndTitle = state.playbackState === 'endtitle';

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #07060a 0%, #150a24 50%, #0d080c 100%)',
        fontFamily: 'Barlow Semi Condensed, sans-serif'
      }}
    >
      {/* 8 Cards Grid view */}
      <div
        className={`w-full h-full pt-6 md:pt-10 pb-8 px-6 md:px-12 flex flex-col justify-start items-center transition-all duration-700 ${
          isRevealActive || isEndTitle ? 'opacity-0 scale-90 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'
        }`}
      >
        {/* Heading moved higher */}
        <div className="text-center mb-4 md:mb-6">
          <span className="text-orange-500 text-xs font-mono tracking-[0.3em] uppercase block mb-0.5">
            De Grote Ontknoping · Munten Verdeling
          </span>
          <h2
            className="text-white text-3xl md:text-5xl font-normal uppercase tracking-wider"
            style={{
              fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
              textShadow: '0 0 20px rgba(255,117,24,0.8)'
            }}
          >
            Kies een Kaart
          </h2>
        </div>

        {/* 8 Cards Grid - Identical row and column spacing */}
        <div
          className="grid grid-cols-4 max-w-[85vw] mx-auto w-full"
          style={{
            gap: '28px',
            rowGap: '28px',
            columnGap: '28px',
          }}
        >
          {ENDGAME_CARDS.map(card => {
            const used = state.usedCards.includes(card.id);
            const isSelected = state.selectedCard === card.id;

            return (
              <div
                key={card.id}
                className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-500 aspect-square shadow-2xl flex flex-col w-full ${
                  used
                    ? 'opacity-25 grayscale border-white/10'
                    : isSelected
                    ? 'border-orange-500 ring-6 ring-orange-500/40 scale-105 shadow-orange-500/50'
                    : 'border-orange-500/30 hover:border-orange-500 hover:scale-102 shadow-lg shadow-black/80'
                }`}
                style={{
                  background: 'rgba(20, 15, 30, 0.9)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <img
                  src={card.image}
                  alt={card.name}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Coded Pure Animation Endgame Reveal */}
      {isRevealActive && activeCard && (
        <CodedEndgameReveal
          card={activeCard}
          playbackState={state.playbackState === 'playing' ? 'playing' : 'paused'}
          onFinished={handleRevealEnded}
          onClose={handleCloseReveal}
        />
      )}

      {/* Creepy Trailer Video Overlay (First time entering Finale before card selection) */}
      {showTrailer && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <video
            ref={trailerVideoRef}
            src="/pics/HaloweenTrailer/trailercreepy.m4v"
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
            onError={(e) => {
              // Fallback to /pics/trailercreepy.m4v if subfolder path fails
              const target = e.currentTarget;
              if (!target.src.endsWith('/pics/trailercreepy.m4v')) {
                target.src = '/pics/trailercreepy.m4v';
                target.play().catch(() => {});
              }
            }}
            onTimeUpdate={(e) => {
              const vid = e.currentTarget;
              if (vid.duration > 0 && vid.duration - vid.currentTime < 0.3) {
                setShowTrailer(false);
              }
            }}
            onEnded={() => setShowTrailer(false)}
          />
          <SpookyTrailerTitle faseKey="20/01" customHeading="FNUIKENDE FINALE" />
          <button
            onClick={() => setShowTrailer(false)}
            className="absolute bottom-6 right-6 z-50 bg-white/10 hover:bg-white/20 border border-white/30 text-white/70 hover:text-white px-5 py-2 rounded-full text-sm font-mono tracking-wider backdrop-blur-sm transition-all"
          >
            Overslaan ✕
          </button>
        </div>
      )}

      {/* End Title / End Card with Review QR Code Container */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-1000 ${
          isEndTitle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          background: 'linear-gradient(135deg, #07060a 0%, #150a24 50%, #0d080c 100%)'
        }}
      >
        <img
          src="/pics/End/end_card_qr.webp"
          alt="Einde Ranking - Review QR Code"
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default DisplayView;

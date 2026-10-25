"use client";
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { ENDGAME_CARDS, EndgameState, DEFAULT_ENDGAME_STATE } from './endgameData';

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
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const endTitleVideoRef = useRef<HTMLVideoElement | null>(null);

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

  // Handle video element operations when state changes
  useEffect(() => {
    const video = videoPlayerRef.current;
    if (!video) return;

    if (state.playbackState === 'grid') {
      video.pause();
      video.currentTime = 0;
    } else if (state.playbackState === 'paused' && activeCard) {
      if (!video.src.includes(activeCard.id)) {
        video.src = activeCard.video;
        video.load();
        video.currentTime = 0;
      }
      video.pause();
    } else if (state.playbackState === 'playing' && activeCard) {
      if (!video.src.includes(activeCard.id)) {
        video.src = activeCard.video;
        video.load();
      }
      video.muted = false;
      video.volume = 1;
      video.play().catch(e => {
        console.warn('[Endgame Display] Video unmuted autoplay failed, trying muted:', e);
        video.muted = true;
        video.play().catch(err => console.error('[Endgame Display] Video playback failed:', err));
      });
    }
  }, [state.playbackState, activeCard]);

  // Handle end title video
  useEffect(() => {
    const endVideo = endTitleVideoRef.current;
    if (!endVideo) return;

    if (state.playbackState === 'endtitle') {
      endVideo.currentTime = 0;
      endVideo.play().catch(e => console.log('[Endgame Display] End title video play error:', e));
    } else {
      endVideo.pause();
    }
  }, [state.playbackState]);

  // Notify backend when video has ended
  const handleVideoEnded = useCallback(async () => {
    if (state.playbackState === 'playing' && state.selectedCard) {
      console.log('[Endgame Display] Video finished for card:', state.selectedCard);
      const cardId = state.selectedCard;

      const newRevealed = !state.revealedCards.includes(cardId)
        ? [...state.revealedCards, cardId]
        : state.revealedCards;

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
          console.error('[Endgame Display] Error notifying video end:', err);
        }
      }
    }
  }, [state, sessionId, onModuleStateJson]);

  const isVideoActive = state.playbackState === 'paused' || state.playbackState === 'playing' || state.playbackState === 'finished';
  const isEndTitle = state.playbackState === 'endtitle';

  return (
    <div
      className="fixed inset-0 w-full h-full overflow-hidden select-none"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
        fontFamily: 'Barlow Semi Condensed, sans-serif'
      }}
    >
      {/* 8 Cards Grid view */}
      <div
        className={`w-full h-full p-8 md:p-14 flex flex-col justify-center transition-all duration-700 ${
          isVideoActive || isEndTitle ? 'opacity-0 scale-90 blur-xl pointer-events-none' : 'opacity-100 scale-100 blur-0'
        }`}
      >
        <div className="grid grid-cols-4 gap-6 md:gap-10 max-w-[94vw] mx-auto w-full max-h-[82vh] items-center">
          {ENDGAME_CARDS.map(card => {
            const used = state.usedCards.includes(card.id);
            const isSelected = state.selectedCard === card.id;

            return (
              <div
                key={card.id}
                className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-500 aspect-square shadow-2xl flex flex-col ${
                  used
                    ? 'opacity-30 grayscale border-white/10'
                    : isSelected
                    ? 'border-indigo-400 ring-8 ring-indigo-500/40 scale-105 shadow-indigo-500/50'
                    : 'border-white/20 hover:border-indigo-400/50'
                }`}
                style={{
                  background: 'rgba(25, 25, 40, 0.85)',
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

      {/* Fullscreen Video Player Container */}
      <div
        className={`fixed inset-0 bg-black z-40 flex items-center justify-center transition-opacity duration-700 ${
          isVideoActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {activeCard && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Title overlay - visible in paused state, hides when playing */}
            <div
              className={`absolute top-10 left-1/2 -translate-x-1/2 z-50 text-white font-normal uppercase tracking-wider transition-opacity duration-500 ${
                state.playbackState === 'paused' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                fontSize: 'clamp(44px, 5.5vw, 84px)',
                textShadow: '0 4px 24px rgba(0,0,0,0.9)'
              }}
            >
              {activeCard.name}
            </div>

            <video
              ref={videoPlayerRef}
              className="w-full h-full object-contain"
              playsInline
              onEnded={handleVideoEnded}
              onError={() => {
                const v = videoPlayerRef.current;
                if (v && activeCard.fallbackVideoUrl && !v.src.includes('www.end.pinkmilk.eu')) {
                  console.log('[Endgame Display] Falling back to remote video url:', activeCard.fallbackVideoUrl);
                  v.src = activeCard.fallbackVideoUrl;
                  v.load();
                  if (state.playbackState === 'playing') v.play().catch(() => {});
                }
              }}
            />
          </div>
        )}
      </div>

      {/* End Title Video Container */}
      <div
        className={`fixed inset-0 bg-black z-50 flex items-center justify-center transition-opacity duration-1000 ${
          isEndTitle ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <video
          ref={endTitleVideoRef}
          src="/pics/end.m4v"
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
          loop
          onError={(e) => {
            const v = e.currentTarget;
            if (!v.src.includes('/endgame/end.m4v')) {
              v.src = '/endgame/end.m4v';
              v.play().catch(() => {});
            }
          }}
        />
      </div>
    </div>
  );
};

export default DisplayView;

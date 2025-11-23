'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { rankingService } from '@/lib/pocketbase';
import { RankingSession, EliminationState } from '@/types';
import { DotsTimer } from '@/components/elimination/DotsTimer';
import { EliminationDisplay } from '@/components/elimination/EliminationDisplay';

export default function DisplayPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [eliminationState, setEliminationState] = useState<EliminationState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load the most recent session
  const loadSessionData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const sessions = await rankingService.getAllSessions();
      if (sessions.length === 0) {
        setError('No active sessions found');
        return;
      }

      const latestShallow = sessions[0] as unknown as RankingSession;
      setCurrentSession(latestShallow);

      if (latestShallow.elimination_state) {
        try {
          setEliminationState(JSON.parse(latestShallow.elimination_state));
        } catch (e) {
          console.error("Failed to parse elimination state", e);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fullscreen functionality
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    loadSessionData();

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
      if (e.key === 'r' || e.key === 'R') {
        loadSessionData();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(link);
    };
  }, [loadSessionData]);

  // Subscribe to PocketBase session updates
  useEffect(() => {
    type PBEvent = { record?: Partial<RankingSession> } | Partial<RankingSession>;
    const unsub = rankingService.subscribeToRankings(async (e: unknown) => {
      try {
        const evt = e as PBEvent;
        const rec = (evt && ('record' in evt ? evt.record : evt)) as Partial<RankingSession> | undefined;
        if (!rec || !currentSession) return;

        // Only update if it matches our current session
        if (rec.id !== currentSession.id) return;

        // Parse elimination_state if present
        if (rec.elimination_state) {
          try {
            setEliminationState(JSON.parse(rec.elimination_state as string));
          } catch (e) {
            console.error('[Display] Failed to parse elimination_state', e);
          }
        }
      } catch {
        // ignore
      }
    });

    return () => {
      try {
        if (typeof unsub === 'function') (unsub as unknown as () => void)();
      } catch {
        // ignore
      }
    };
  }, [currentSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A1752] flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading game data...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-[#0A1752] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">{error || 'No session data available'}</p>
          <button
            onClick={loadSessionData}
            className="bg-white text-blue-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Always render Elimination Display
  return (
    <div className="min-h-screen bg-[#0A1752] text-white flex flex-col font-sans">
      {/* Top Section: Logo and DotsTimer */}
      <div className="bg-[#0A1752] border-b border-blue-900 shadow-lg relative z-10">
        <div className="flex justify-center p-4">
          <Image
            src="/assets/ranking_logo.webp"
            alt="Ranking Logo"
            width={240}
            height={120}
            className="h-24 w-auto object-contain"
            priority
          />
        </div>

        {/* DOTS TIMER - FULL WIDTH AT TOP */}
        <div className="px-8 pb-4">
          {eliminationState && (
            <DotsTimer
              duration={eliminationState.timerDuration || 20}
              startTime={eliminationState.status === 'voting' ? eliminationState.timerStart : undefined}
            />
          )}
        </div>
      </div>

      {/* Main Content: Elimination Display */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-[url('/assets/band.webp')] bg-cover bg-center opacity-10 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-7xl">
          {eliminationState ? (
            <EliminationDisplay state={eliminationState} />
          ) : (
            <div className="text-center text-white/50 text-2xl">
              Waiting for game state...
            </div>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 text-white/30 text-xs">
        <p>Press &apos;F&apos; for fullscreen • Press &apos;R&apos; to refresh</p>
      </div>
    </div>
  );
}

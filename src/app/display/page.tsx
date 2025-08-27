'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';

interface PlayersByTeam {
  [teamNumber: number]: string[];
}

export default function DisplayPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [playersByTeam, setPlayersByTeam] = useState<PlayersByTeam>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>('');
  const [currentMedia, setCurrentMedia] = useState<
    | null
    | { url: string; name: string; type: 'video' | 'image'; fallbackLocalUrl?: string }
  >(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // const [needsInteraction, setNeedsInteraction] = useState(false);
  const [userEnabledSound, setUserEnabledSound] = useState(false);
  const [motherMeta, setMotherMeta] = useState<{ collection: string; recordId: string; baseUrl: string } | null>(null);

  // Generate a random 4-digit game code
  const generateGameCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Get team assignments from prefixed player names (rock-solid approach)
  const getTeamAssignments = (session: RankingSession): PlayersByTeam => {
    // Add fallback for missing or empty playernames
    if (!session.playernames || session.playernames.trim() === '') {
      console.log('No player names found in session');
      return {};
    }
    
    try {
      const playerNames = teamService.parsePlayerNames(session.playernames);
      if (playerNames.length === 0) {
        console.log('No valid player names after parsing');
        return {};
      }
      
      return teamService.generateTeamAssignments(playerNames, session.nr_teams || 1);
    } catch (error) {
      console.error('Error generating team assignments:', error);
      return {};
    }
  };

  // Load the most recent session and distribute players
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
      // Fetch full record to ensure fields like current_fase are present
      try {
        const full = await rankingService.getSessionById(latestShallow.id);
        setCurrentSession(full as unknown as RankingSession);
      } catch {
        // Fallback to shallow if detail fetch fails
        setCurrentSession(latestShallow);
      }
      
      const teamAssignments = getTeamAssignments(latestShallow);
      setPlayersByTeam(teamAssignments);
      
      // Generate game code if not exists
      if (!gameCode) {
        setGameCode(generateGameCode());
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  }, [gameCode]);

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

    // Preload motherfile and capture meta for reliable media URLs
    void (async () => {
      try {
        const res = await fetch('/api/pb-motherfile', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const collection = json?.meta?.collection || 'motherfile';
          const recordId = json?.meta?.recordId;
          const baseUrl = json?.meta?.baseUrl || (window.location?.protocol === 'https:' ? 'https://pinkmilk.pockethost.io' : 'http://127.0.0.1:8090');
          if (collection && recordId && baseUrl) {
            setMotherMeta({ collection, recordId, baseUrl });
            // also set in service for other callers
            motherfileService.setRecordId(recordId);
          } else {
            console.warn('[Display] motherfile meta missing', json?.meta);
          }
        } else {
          console.warn('[Display] motherfile GET failed', res.status);
        }
      } catch (e) {
        console.warn('[Display] motherfile GET error', e);
      }
    })();

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
      if (e.key === 'r' || e.key === 'R') {
        loadSessionData();
      }
      // Removed M to toggle mute/unmute
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(link);
    };
  }, [loadSessionData]);

  // Try to start playback with sound; if blocked (Safari/iOS policy), ask for user interaction
  useEffect(() => {
    const v = videoRef.current;
    // Compute locally if media overlay is allowed for the current fase
    const faseStr = currentSession?.current_fase || '';
    const allow = (() => {
      const m = faseStr.match(/^01\/(\d{2})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        return n >= 4; // allow from 01/04 and later
      }
      return true; // other groups unaffected
    })();

    if (!currentMedia || currentMedia.type !== 'video' || !allow || !v) {
      return;
    }
    try {
      v.muted = false;
      v.volume = 1;
      const p = v.play();
      if (p && typeof (p as Promise<void>).then === 'function') {
        (p as Promise<void>).then(() => {/* ok */}).catch(() => {/* blocked if not userEnabledSound */});
      }
    } catch {
      // ignore; overlay is on intro screen only
    }
  }, [currentMedia, currentSession, userEnabledSound]);

  // Subscribe to PocketBase session updates (current_fase changes)
  useEffect(() => {
    type PBEvent = { record?: Partial<RankingSession> } | Partial<RankingSession>;
    const unsub = rankingService.subscribeToRankings(async (e: unknown) => {
      try {
        const evt = e as PBEvent;
        const rec = (evt && ('record' in evt ? evt.record : evt)) as Partial<RankingSession> | undefined;
        if (!rec || !currentSession) return;
        const same = rec.id === currentSession.id;
        // Better debug output to avoid confusion when PB omits unchanged fields
        console.log('[Display] PB event:', {
          incomingId: rec.id,
          currentId: currentSession?.id,
          current_fase_incoming: rec.current_fase,
          current_fase_prev: currentSession?.current_fase,
        });
        if (!same) return;
        // If PocketBase event doesn't include current_fase, fetch the full record to get the latest value
        if (typeof rec.current_fase === 'undefined') {
          try {
            const fresh = await rankingService.getSessionById(rec.id as string);
            setCurrentSession(prev => ({ ...(prev as RankingSession), ...(fresh as unknown as RankingSession) }));
          } catch {
            // Fallback: merge what we have
            setCurrentSession(prev => ({ ...(prev as RankingSession), ...(rec as RankingSession) }));
          }
        } else {
          // Merge to keep other fields stable when we do have current_fase
          setCurrentSession(prev => ({ ...(prev as RankingSession), ...(rec as RankingSession) }));
        }
      } catch {
        // ignore
      }
    });
    // Best-effort cleanup if supported
    return () => {
      try {
        if (typeof unsub === 'function') (unsub as unknown as () => void)();
      } catch {
        // ignore
      }
    };
  }, [currentSession]);

  // Compute current media whenever session/current_fase or motherMeta changes
  useEffect(() => {
    if (!currentSession) return;
    const headings = faseService.parseHeadings(currentSession.headings || '{}');
    const faseKey = currentSession.current_fase as string | undefined;
    if (!faseKey) {
      setCurrentMedia(null);
      return;
    }
    const item = headings[faseKey];
    const fileName = item?.image?.trim();

    const baseUrl =
      process.env.NEXT_PUBLIC_PB_URL ||
      process.env.NEXT_PUBLIC_POCKETBASE_URL ||
      (typeof window !== 'undefined' && window.location?.protocol === 'https:'
        ? 'https://pinkmilk.pockethost.io'
        : 'http://127.0.0.1:8090');

    // Helper: prefer Ranking collection file, then local assets, then Motherfile fallback
    const resolveFromRanking = (name: string) => {
      if (/^https?:\/\//i.test(name)) return name; // absolute URL
      if (!currentSession?.id) return '';
      return `${baseUrl}/api/files/ranking/${currentSession.id}/${encodeURIComponent(name)}`;
    };

    const resolveFromLocal = (name: string) => {
      if (!name) return '';
      return `/pics/${name}`; // requires file to exist under public/pics
    };

    if (!fileName) {
      // No media in ranking headings → Motherfile fallback
      const keys = Object.keys(headings);
      console.log('[Display] No media for fase', faseKey, 'item:', item, 'Available keys:', keys);
      void (async () => {
        try {
          const mother = await motherfileService.get();
          const mfItem = mother?.fases?.[faseKey];
          const mfFileName = mfItem?.image?.trim();
          if (!mfFileName) {
            console.log('[Display] Motherfile also missing media for', faseKey, 'mfItem:', mfItem);
            setCurrentMedia(null);
            return;
          }
          // We only use Motherfile to discover the filename; then resolve from ranking or local
          const isVideoMf = /(\.mp4|\.mov|\.avi|\.m4v|\.webm)$/i.test(mfFileName);
          const rankingUrlMf = resolveFromRanking(mfFileName);
          const localUrlMf = resolveFromLocal(mfFileName);
          const chosenUrlMf = rankingUrlMf || localUrlMf;
          console.log('[Display] Resolved media via Motherfile filename (ranking/local URL)', { faseKey, mfFileName, isVideoMf, rankingUrlMf, localUrlMf });
          setCurrentMedia({ url: chosenUrlMf, name: mfFileName, type: isVideoMf ? 'video' : 'image', fallbackLocalUrl: localUrlMf });
        } catch (e) {
          console.log('[Display] Motherfile fallback failed', e);
          setCurrentMedia(null);
        }
      })();
      return;
    }

    const isVideo = /(\.mp4|\.mov|\.avi|\.m4v|\.webm)$/i.test(fileName);
    // Primary: Ranking collection file URL
    const rankingUrl = resolveFromRanking(fileName);
    const localUrl = resolveFromLocal(fileName);

    // Optimistic set with ranking URL; video/image elements will log error events if truly 404
    const chosenUrl = rankingUrl || localUrl;
    console.log('[Display] Resolved media (ranking first)', { faseKey, fileName, isVideo, rankingUrl, localUrl });
    setCurrentMedia({ url: chosenUrl, name: fileName, type: isVideo ? 'video' : 'image', fallbackLocalUrl: localUrl });

    // Add a light-weight preload hint for smoother start
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = isVideo ? 'video' : 'image';
      link.href = chosenUrl;
      document.head.appendChild(link);
      setTimeout(() => {
        try { document.head.removeChild(link); } catch {}
      }, 5000);
    } catch {}
  }, [currentSession, motherMeta]);

  // Removed mute state syncing; videos play with sound by default

  // Generate QR code URL for joining (bigger)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`https://ranking.pinkmilk.eu/player?code=${gameCode}`)}`;

  // Only show media overlay from fase 01/04 onwards; keep intro screen before that
  const currentFaseStr = currentSession?.current_fase || '';
  const allowMediaOverlay = (() => {
    const m = currentFaseStr.match(/^01\/(\d{2})$/);
    if (m) {
      const n = parseInt(m[1], 10);
      return n >= 4; // allow from 01/04 and later
    }
    return true; // other groups unaffected
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading game data...</p>
        </div>
      </div>
    );
  }

  if (error || !currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-xl mb-4">{error || 'No session data available'}</p>
          <button 
            onClick={loadSessionData}
            className="bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 relative overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Media overlay: plays current fase video when available */}
      {currentMedia?.type === 'video' && currentMedia.url && allowMediaOverlay && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            key={currentMedia.url}
            ref={videoRef}
            src={currentMedia.url}
            className="w-full h-full object-contain"
            autoPlay
            muted={false}
            playsInline
            onLoadedMetadata={() => console.log('[Display] video loadedmetadata', currentMedia)}
            onPlay={() => console.log('[Display] video play', currentMedia)}
            onError={(e) => {
              console.log('[Display] video error', e);
              setCurrentMedia((cm) => (cm?.fallbackLocalUrl ? { ...cm, url: cm.fallbackLocalUrl } : cm));
            }}
            onEnded={() => { console.log('[Display] video ended'); setCurrentMedia(null); }}
          />
          {/* Removed in-video needsInteraction button; sound enable is provided on intro screen */}
          <div className="absolute top-2 left-3 text-white text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Fase {currentSession?.current_fase} — {currentMedia.name}
          </div>
          {/* Removed local-fallback badge and sound toggle */}
        </div>
      )}
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-70 animate-pulse"></div>
      
      {/* Horizontal Band with Background + Overlaid Text and Logo */}
      <div 
        className="relative z-10 w-full h-48 bg-cover bg-center bg-no-repeat flex items-center justify-between px-8"
        style={{ 
          backgroundImage: 'url(/assets/band.webp)',
          marginTop: '50px'
        }}
      >
        {/* Logo - Left side of band - Much Larger */}
        <div className="flex items-center">
          <Image
            src="/assets/ranking_logo.webp"
            alt="Ranking Logo"
            width={320}
            height={160}
            className="h-40 w-auto object-contain"
            priority
          />
        </div>
        
        {/* Centered Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-2xl md:text-3xl text-white/90 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
            Quizmaster Klaas presenteert
          </p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
            {currentSession.showname} - {currentSession.city}
          </h1>
          <p className="text-2xl md:text-3xl text-white/90" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
            De teams van vandaag zijn:
          </p>
        </div>
        
        {/* QR Code - Right side of band (bigger) */}
        <div className="bg-white p-2 rounded-lg shadow-lg">
          <Image
            src={qrCodeUrl}
            alt="Join Game QR Code"
            width={160}
            height={160}
            className="w-40 h-40"
            unoptimized
          />
        </div>
      </div>
      
      <div className="relative z-10 w-full px-4 py-8">
        
        {/* Teams Display - Single Row Layout */}
        <div className="flex justify-center items-start overflow-hidden w-full px-2">
          {Array.from({ length: currentSession.nr_teams }, (_, index) => {
            const teamNumber = index + 1;
            const teamPlayers = playersByTeam[teamNumber] || [];
            
            return (
              <div 
                key={teamNumber} 
                className="flex flex-col items-center flex-shrink-0"
                style={{ 
                  width: `calc((100vw - 2rem) / ${currentSession.nr_teams})`,
                  maxWidth: 'none',
                  padding: '0 4px'
                }}
              >
                {/* Team Circle with 15px outline */}
                <div 
                  className="bg-white rounded-full flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    width: `min(150px, calc((100vw - 8rem) / ${currentSession.nr_teams}))`,
                    height: `min(150px, calc((100vw - 8rem) / ${currentSession.nr_teams}))`,
                    border: '12px solid black',
                    minWidth: '80px',
                    minHeight: '80px'
                  }}
                >
                  <span 
                    className="font-bold text-black text-2xl"
                    style={{ 
                      fontSize: `min(3rem, calc((100vw - 12rem) / ${currentSession.nr_teams} * 0.35))`
                    }}
                  >
                    {teamNumber}
                  </span>
                </div>
                
                {/* Player Names */}
                <div className="flex flex-col gap-1 w-full px-1">
                  {teamPlayers.map((player, playerIndex) => (
                    <div 
                      key={playerIndex}
                      className="bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800 px-3 py-2 rounded-lg text-center font-semibold border-2 border-white shadow-md overflow-hidden"
                      style={{ 
                        fontFamily: 'Barlow Semi Condensed, sans-serif', 
                        fontWeight: 500,
                        fontSize: '1.125rem' // 1.5x bigger than text-sm (0.875rem * 1.5 ≈ 1.125rem)
                      }}
                    >
                      <span className="block truncate" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{player}</span>
                    </div>
                  ))}
                  
                  {/* Empty slots if team has fewer players */}
                  {teamPlayers.length === 0 && (
                    <div className="bg-gray-200 text-gray-500 px-2 py-1 rounded-lg text-center italic border-2 border-gray-300 text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                      No players yet
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Footer Info */}
        <div className="text-center mt-16 text-white/80">
          <p className="text-lg">
            Total Players: {Object.values(playersByTeam).flat().length} | 
            Teams: {currentSession.nr_teams} | 
            Location: {currentSession.city}
          </p>
        </div>
      </div>
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>Press &apos;F&apos; for fullscreen</p>
        <p>Press &apos;R&apos; to refresh</p>
      </div>

      {/* Intro-screen sound enable button (only before 01/04 and when no overlay) */}
      {!allowMediaOverlay && (
        <button
          onClick={() => {
            try {
              setUserEnabledSound(true);
              // Attempt to unlock audio on Safari/iOS by resuming AudioContext if supported
              const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
              const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
              if (AC) {
                const ctx = new AC();
                // create and stop a silent buffer
                const osc = ctx.createOscillator(); osc.frequency.value = 0.0001; osc.connect(ctx.destination); osc.start(0); osc.stop(0.01);
                if (ctx.state === 'suspended') ctx.resume().catch(() => {});
              }
            } catch {}
          }}
          className="fixed bottom-4 right-4 z-20 h-10 px-4 rounded-md bg-white/95 text-black text-sm font-semibold shadow hover:bg-white"
          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
        >
          Enable sound
        </button>
      )}
    </div>
  );
}

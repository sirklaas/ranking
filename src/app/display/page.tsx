'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';
import { safeJsonStr } from '@/lib/jsonUtils';

const APP_VERSION = 'v9.2';

interface PlayersByTeam {
  [teamNumber: number]: string[];
}

export default function DisplayPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [playersByTeam, setPlayersByTeam] = useState<PlayersByTeam>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>('');
  const [currentMedia, setCurrentMedia] = useState<
    | null
    | { url: string; name: string; type: 'video' | 'image'; fallbackLocalUrl?: string }
  >(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastPlayedUrl = useRef<string>('');
  // const [needsInteraction, setNeedsInteraction] = useState(false);
  const [userEnabledSound, setUserEnabledSound] = useState(false);
  const soundUnlockedRef = useRef(false); // Ref to avoid stale closure in event listeners
  const lockedSessionId = useRef<string | null>(null);
  const currentSessionRef = useRef<RankingSession | null>(null);
  const [motherMeta, setMotherMeta] = useState<{ collection: string; recordId: string; baseUrl: string } | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});
  const [pollDebug, setPollDebug] = useState({ count: 0, lastPbFase: '?', error: '' });

  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Sync module states from session on load / session change
  useEffect(() => {
    if (!currentSession) return;
    const newStates: Record<string, string> = {};
    Object.values(FASES).forEach((mod) => {
      const sf = mod.stateField;
      if (!sf) return;

      const str = safeJsonStr((currentSession as Record<string, unknown>)[sf]);
      if (str) newStates[sf] = str;
    });
    setModuleStates((prev) => ({ ...prev, ...newStates }));
  }, [currentSession]);

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
    setIsMounted(true);
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    loadSessionData();

    // Event listener for audio context unlock
    const forceUnlockAudio = () => {
      if (soundUnlockedRef.current) return;
      soundUnlockedRef.current = true;
      console.log('[Display] Global unlock triggered via event');
      setUserEnabledSound(true);
      lastPlayedUrl.current = '';

      try {
        const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
        const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
        if (AC) {
          const ctx = new AC();
          const buf = ctx.createBuffer(1, 1, 22050);
          const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0);
          if (ctx.state === 'suspended') ctx.resume().catch(() => { });
        }
      } catch (err) { console.warn('[Display] AudioContext unlock error:', err); }

      setTimeout(() => {
        try {
          const v = videoRef.current;
          if (v && v.src) {
            v.muted = false;
            v.volume = 1;
            const p = v.play();
            if (p) p.catch(() => { v.muted = true; v.play().catch(() => { }); });
          }
        } catch (err) { }
      }, 100);
    };

    // Removed global mousedown/touchstart listeners.
    // The explicit Start buttons on the overlay now handle audio unlocking,
    // preventing the overlay from unmounting before the click event finishes.

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        toggleFullScreen();
      }
      if (e.key === 'r' || e.key === 'R') {
        loadSessionData();
      }
      // Spacebar or Enter to unlock audio if overlay is present
      if (!userEnabledSound && (e.key === ' ' || e.key === 'Enter')) {
        forceUnlockAudio();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(link);
    };
  }, [loadSessionData]);

  // Play video only when the media URL actually changes AND user has clicked start
  useEffect(() => {
    const v = videoRef.current;
    if (!userEnabledSound) return; // Don't play until user clicks start button
    if (!currentMedia || currentMedia.type !== 'video' || !v) return;
    if (currentMedia.url === lastPlayedUrl.current) return; // already playing this URL
    lastPlayedUrl.current = currentMedia.url;

    console.log(`[Display ${APP_VERSION}] Playing new video: ${currentMedia.name}`);
    try {
      v.muted = false;
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.catch((e) => {
          console.warn('[Display] Autoplay blocked, falling back to muted.', e);
          v.muted = true;
          v.play().catch(() => { });
        });
      }
    } catch (e) {
      console.error('[Display] Video play error:', e);
    }
  }, [currentMedia, userEnabledSound]);

  // Poll session state via cached server proxy (never hits PB directly from browser)
  useEffect(() => {
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        // Use URL param if provided, otherwise locked session, otherwise latest
        const urlParams = new URLSearchParams(window.location.search);
        const targetId = urlParams.get('session') || lockedSessionId.current || 'latest';

        const res = await fetch(`/api/session-state?id=${targetId}`);
        if (!active || !res.ok) return;
        const { session: fresh } = await res.json();
        if (!active || !fresh) return;

        // (if targetId === 'latest'), so there's no need to lock it and ignore presenter updates
        // to a new session ID if they switch.

        const freshFase = fresh.current_fase || '?';
        setPollDebug(prev => ({ ...prev, count: prev.count + 1, lastPbFase: freshFase, error: '' }));

        setCurrentSession((prev) => {
          if (!prev) return fresh;
          if (fresh.id !== prev.id) {
            console.log(`[Display] Switched to new active game session: ${fresh.id}`);
            return fresh;
          }
          if (fresh.current_fase === prev.current_fase && fresh.headings === prev.headings
            && JSON.stringify(fresh.teamleaders) === JSON.stringify((prev as Record<string, unknown>).teamleaders)) {
            let changed = false;
            Object.values(FASES).forEach((mod) => {
              const sf = mod.stateField;
              if (!sf) return;
              // Compare the stringified JSON deeply to detect internal module state changes (like Top 3 results arrays)
              if (JSON.stringify((fresh as Record<string, unknown>)[sf]) !== JSON.stringify((prev as Record<string, unknown>)[sf])) changed = true;
            });
            if (!changed) return prev;
          }
          return { ...prev, ...fresh };
        });
      } catch (e) {
        setPollDebug(prev => ({ ...prev, error: String(e) }));
      }
    };

    const timer = setInterval(poll, 3000);
    poll(); // immediate first poll
    return () => { active = false; clearInterval(timer); };
  }, []);

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
    let fileName = item?.image?.trim() || '';



    const resolveMedia = (name: string) => {
      if (!name) return '';
      if (/^https?:\/\//i.test(name)) return name; // absolute URL
      return `/pics/${encodeURIComponent(name)}`;
    };

    if (!fileName) {
      // No media in ranking headings → skip (no motherfile fallback needed)
      console.log('[Display] No media for fase', faseKey);
      setCurrentMedia(null);
      return;
    }

    const isVideo = /(\.mp4|\.mov|\.avi|\.m4v|\.webm)$/i.test(fileName);
    const mediaUrl = resolveMedia(fileName);

    console.log('[Display] Resolved media from local pics folder', { faseKey, fileName, isVideo, mediaUrl });
    setCurrentMedia({ url: mediaUrl, name: fileName, type: isVideo ? 'video' : 'image', fallbackLocalUrl: mediaUrl });

  }, [currentSession]);

  // Removed mute state syncing; videos play with sound by default

  // Generate QR code URL for joining (bigger)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`https://ranking.pinkmilk.eu/player?code=${gameCode}`)}`;

  // Only show media overlay if there's a file
  const allowMediaOverlay = true;

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

  // Version badge (shown on all paths)
  const versionBadge = (
    <div className="fixed z-[9999] text-white/50 text-xs" style={{ fontFamily: 'monospace', bottom: '10px', left: '50%', transform: 'translateX(-50%)' }}>
      {APP_VERSION} | fase: {currentSession?.current_fase || '?'} | poll#{pollDebug.count} pb:{pollDebug.lastPbFase} {pollDebug.error ? '❌' + pollDebug.error : ''}
    </div>
  );

  // Render logging removed to reduce console spam

  // Render module DisplayView if a registered fase module matches the current fase
  if (currentSession?.current_fase) {
    let mod = findFaseModule(currentSession.current_fase);

    // Display explicitly skips rendering early phases or trailers if configured
    if (mod && currentSession.current_fase) {
      const [group, subStr] = currentSession.current_fase.split('/');
      const subNum = parseInt(subStr, 10);
      const modSub = parseInt(mod.key.split('/')[1], 10);

      if (mod.skipTrailer && subNum === 1) {
        mod = undefined;
      } else if (subNum < modSub) {
        mod = undefined;
      }
    }

    // Render module if it has a DisplayView AND either:
    // - no stateField required, OR state exists, OR this is NOT the trailer slot (*/01)
    // On question slides (e.g. 10/05), render the module even without state — DisplayView handles the fallback
    const isTrailerSlot = currentSession.current_fase.endsWith('/01');
    const stateReady = !mod?.stateField || !!moduleStates[mod.stateField];
    if (mod?.DisplayView && (stateReady || !isTrailerSlot)) {
      const headingsJson = currentSession.headings || '{}';
      const heading = faseService.getCurrentHeading(headingsJson, currentSession.current_fase) || '';
      const imageName = faseService.getCurrentImage(headingsJson, currentSession.current_fase) || '';
      const mediaUrl = imageName ? motherfileService.fileUrl(imageName) : '';
      const ModDisplay = mod.DisplayView;
      const allPlayerNames = currentSession.playernames ? teamService.parsePlayerNames(currentSession.playernames) : [];
      console.log(`[Display ${APP_VERSION}] Rendering module`, mod.title, 'for', currentSession.current_fase);
      return (
        <>
          <ModDisplay
            faseKey={currentSession.current_fase}
            sessionId={currentSession.id}
            moduleStateJson={mod.stateField ? moduleStates[mod.stateField] : undefined}
            heading={heading}
            mediaUrl={mediaUrl}
            allPlayerNames={allPlayerNames}
          />
          {versionBadge}
        </>
      );
    }
  }

  console.log(`[Display ${APP_VERSION}] Falling through to media overlay for fase`, currentSession?.current_fase);
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 relative overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {versionBadge}

      {/* Media overlay: plays current fase video/image when available */}
      {currentMedia && currentMedia.url && allowMediaOverlay && (
        <div className={`fixed inset-0 z-50 bg-black ${!userEnabledSound ? 'pointer-events-none' : ''}`}>
          {currentMedia.type === 'video' ? (
            <video
              key={currentMedia.url}
              ref={videoRef}
              src={currentMedia.url}
              className="w-full h-full object-contain"
              playsInline
              onLoadedMetadata={() => console.log('[Display] video loadedmetadata', currentMedia)}
              onPlay={() => console.log('[Display] video play', currentMedia)}
              onError={(e) => {
                console.log('[Display] video error encountered, falling back');
                setCurrentMedia((cm) => (cm?.fallbackLocalUrl ? { ...cm, url: cm.fallbackLocalUrl } : cm));
              }}
              onTimeUpdate={(e) => {
                const vid = e.currentTarget;
                // Pause 0.5s before end to freeze on last visible frame (prevent black)
                if (vid.duration - vid.currentTime < 0.5 && !vid.paused) {
                  vid.pause();
                  // If this is the ending trailer (20/01), redirect to the standalone ending app
                  if (currentSession?.current_fase === '20/01') {
                    window.location.href = 'https://end.pinkmilk.eu/display.html';
                  }
                }
              }}
              onEnded={(e) => {
                e.currentTarget.pause();
                console.log('[Display] video ended');
                if (currentSession?.current_fase === '20/01') {
                  window.location.href = 'https://end.pinkmilk.eu/display.html';
                }
              }}
            />
          ) : (
            <img src={currentMedia.url} alt={currentMedia.name} className="w-full h-full object-contain" />
          )}
          {/* Heading overlay: top center 100px for normal fases, bottom for trailers (xx/01) */}
          {(() => {
            // "Zitten en staan" = groep 07, Krakende = groep 13 no headings here per request.
            // 01/04-01/06: heading only on phones, not on display.
            if (currentSession?.current_fase?.startsWith('07/') || currentSession?.current_fase?.startsWith('13/')) return null;
            if (['01/04', '01/05', '01/06'].includes(currentSession?.current_fase || '')) return null;

            // Hardcoded heading overrides for fases that need text over their trailer video
            const TRAILER_HEADING_OVERRIDES: Record<string, string> = {
              '17/01': 'Kies iemand uit een ander team!',
              '17/02': 'Kies iemand uit een ander team!',
              '17/03': 'Kies iemand uit een ander team!',
              '17/04': 'Kies iemand uit een ander team!',
            };
            const overrideHeading = TRAILER_HEADING_OVERRIDES[currentSession?.current_fase || ''];
            const headings = faseService.parseHeadings(currentSession?.headings || '{}');
            const headingText = overrideHeading || headings[currentSession?.current_fase || '']?.heading || '';
            const isTrailer = currentSession?.current_fase?.endsWith('/01');
            return headingText ? (
              <div
                className={`absolute left-0 right-0 flex items-center justify-center px-8 text-center ${isTrailer ? 'bottom-[75px]' : 'top-[100px]'}`}
                style={{
                  background: isTrailer
                    ? 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)'
                    : 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                  paddingTop: isTrailer ? '40px' : '20px',
                  paddingBottom: isTrailer ? '20px' : '40px',
                }}
              >
                <h1
                  className="text-white font-light whitespace-pre-line"
                  style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)', fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, fontSize: '10rem' }}
                >
                  {headingText}
                </h1>
              </div>
            ) : null;
          })()}
        </div>
      )}

      {currentSession?.current_fase?.startsWith('01/') && (
        <>
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-70 animate-pulse"></div>

          {/* Horizontal Band with Background + Overlaid Text and Logo */}
          <div
            className="relative z-10 w-full h-32 bg-cover bg-center bg-no-repeat flex items-center justify-between px-6"
            style={{
              backgroundImage: 'url(/assets/band.webp)',
              marginTop: '10px'
            }}
          >
            {/* Logo - Left side of band */}
            <div className="flex items-center">
              <Image
                src="/assets/ranking_logo.webp"
                alt="Ranking Logo"
                width={256}
                height={128}
                className="h-28 w-auto object-contain"
                priority
              />
            </div>

            {/* Centered Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-xl md:text-2xl text-white/90 mb-0" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
                Quizmaster Klaas presenteert
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-0" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
                {currentSession.showname} - {currentSession.city}
              </h1>
              <p className="text-xl md:text-2xl text-white/90" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
                De teams van vandaag zijn:
              </p>
            </div>

            {/* QR Code - Right side of band (smaller) */}
            <div className="bg-white p-2 rounded-lg shadow-lg z-20">
              <Image
                src={qrCodeUrl}
                alt="Join Game QR Code"
                width={112}
                height={112}
                className="w-28 h-28"
                unoptimized
              />
            </div>
          </div>

          <div className="relative z-10 w-full px-4 py-8">

            {/* Teams Display - Single Row Layout */}
            <div className="flex justify-center items-start overflow-hidden w-full px-2">
              {Array.from({ length: currentSession.nr_teams }, (_, index) => {
                const maxPlayersInAnyTeam = currentSession.nr_teams
                  ? Math.max(...Array.from({ length: currentSession.nr_teams }).map((_, i) => (playersByTeam[i + 1] || []).length))
                  : 1;
                const teamNumber = index + 1;
                let teamPlayers = playersByTeam[teamNumber] || [];

                // Find top player for highlighting (with alphabetical tie-breaker)
                let highestVotes = 0;
                let topPlayer = '';

                try {
                  const teamVotes = ((currentSession.teamleaders as Record<string, Record<string, number>> | null)?.[`team_${teamNumber}`]) || {};

                  teamPlayers.forEach(p => {
                    const v = teamVotes[p] || 0;
                    if (v > highestVotes) {
                      highestVotes = v;
                      topPlayer = p;
                    } else if (v === highestVotes && highestVotes > 0) {
                      if (p < topPlayer) topPlayer = p;
                    }
                  });

                  if (highestVotes === 0) topPlayer = '';

                } catch (e) {
                  console.error('Failed to parse team leader votes');
                }

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

                    {/* Player Names — animated via transform, not array reorder */}
                    <div className="relative w-full px-1 pb-4" style={{ height: '70vh' }}>
                      {(() => {
                        const playerCount = Math.max(maxPlayersInAnyTeam, 1);
                        // Single consistent slot unit: total height / player count
                        // Each slot = slotH tall. Card fills most of it, with a small gap.
                        const gapPx = 4;

                        // Build a sorted index map: for each player, what visual slot should they be in?
                        const teamVotes = ((currentSession.teamleaders as Record<string, Record<string, number>> | null)?.[`team_${teamNumber}`]) || {};

                        // Create sorted order by votes
                        const sortedPlayers = [...teamPlayers].sort((a, b) => {
                          const votesA = teamVotes[a] || 0;
                          const votesB = teamVotes[b] || 0;
                          if (votesB !== votesA) return votesB - votesA;
                          if (a === topPlayer) return -1;
                          if (b === topPlayer) return 1;
                          return a.localeCompare(b);
                        });

                        // Map each player to their target visual slot index
                        const slotMap: Record<string, number> = {};
                        sortedPlayers.forEach((p, i) => slotMap[p] = i);

                        return teamPlayers.map((player) => {
                          const isLeader = player === topPlayer && highestVotes > 0;
                          const targetSlot = slotMap[player] ?? 0;
                          const originalSlot = teamPlayers.indexOf(player);
                          const slotDiff = targetSlot - originalSlot;

                          // slotH = 70vh / playerCount — one consistent unit
                          // card top = originalSlot * slotH, card height = slotH - gapPx
                          return (
                            <div
                              key={player}
                              className={`absolute left-1 right-1 rounded-lg text-center border-2 border-white shadow-md overflow-hidden flex items-center justify-center ${isLeader
                                ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-black z-10'
                                : 'bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800'
                                }`}
                              style={{
                                fontFamily: 'Barlow Semi Condensed, sans-serif',
                                fontWeight: 400,
                                fontSize: `min(32px, 4vh, calc(70vh / ${playerCount} * 0.5))`,
                                height: `calc(min(100px, 70vh / ${playerCount}) - ${gapPx}px)`,
                                padding: '0 4px',
                                lineHeight: '1',
                                top: `calc(${originalSlot} * min(100px, 70vh / ${playerCount}))`,
                                transform: `translateY(calc(${slotDiff} * min(100px, 70vh / ${playerCount})))`,
                                transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1), background 1s ease, box-shadow 1s ease',
                                boxShadow: isLeader ? '0 0 20px rgba(234, 179, 8, 0.5)' : undefined,
                              }}
                            >
                              <span className="block truncate w-full" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                                {isLeader && <span className="mr-2" style={{
                                  display: 'inline-block',
                                  animation: isLeader ? 'crownReveal 1s ease-out' : 'none'
                                }}>👑</span>}
                                {player}
                              </span>
                            </div>
                          );
                        });
                      })()}

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
          </div>
        </>
      )}

      {/* Keyboard hints */}
      <div className="fixed bottom-6 left-6 z-20 text-white/40 text-xs space-y-1 pointer-events-none">
        <p>Press &apos;F&apos; for fullscreen</p>
        <p>Press &apos;R&apos; to refresh</p>
        <p>Press &apos;→&apos; / &apos;←&apos; to navigate fases</p>
      </div>

      {/* Forced Interaction Overlay to Unlock Sound */}
      {isMounted && !userEnabledSound && <div
        className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center"
      >
        <h2 className="text-white text-3xl font-light mb-12 tracking-widest pointer-events-none">Display Systeem</h2>

        <div className="flex gap-6">
          {/* Safe Start Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()} // Prevent global unlock from swallowing click
            onClick={async () => {
              soundUnlockedRef.current = true;
              setUserEnabledSound(true);
              console.log('[Display] Resume clicked — enabling audio only');

              try {
                const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
                const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
                if (AC) {
                  const ctx = new AC();
                  const buf = ctx.createBuffer(1, 1, 22050);
                  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0);
                  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
                }
              } catch (err) { console.warn('[Display] AudioContext unlock error:', err); }
            }}
            className="px-10 py-6 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-2xl text-2xl transition-all shadow-lg flex flex-col items-center gap-2 cursor-pointer"
            style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
          >
            <span>▶ START / RESUME</span>
            <span className="text-sm font-normal opacity-80">(Alleen geluid activeren)</span>
          </button>

          {/* Hard Reset Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()} // Prevent global unlock from swallowing click
            onClick={async () => {
              // Confirm dialog to prevent accidental wipes
              if (!window.confirm("WEET JE ZEKER DAT JE ALLES WILT WISSEN?\n\nDit wist alle scores, teamleaders, top 3, top 10 en krakende karakters.")) return;

              soundUnlockedRef.current = true;
              setUserEnabledSound(true);
              console.log('[Display] Reset clicked — running hard reset');

              // Audio unlock
              try {
                const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
                const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
                if (AC) {
                  const ctx = new AC();
                  const buf = ctx.createBuffer(1, 1, 22050);
                  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0);
                  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
                }
              } catch (err) { console.warn('[Display] AudioContext unlock error:', err); }

              // HARD RESET AND LOCK
              const sess = currentSessionRef.current;
              if (sess) {
                lockedSessionId.current = sess.id;

                // Step 1: Instant React clear
                setCurrentSession(prev => prev ? {
                  ...prev,
                  teamleaders: {},
                  current_fase: '01/01',
                  top3_state: '{}',
                  top10_state: '{}',
                  krakende_state: '{}'
                } as unknown as RankingSession : prev);

                // Step 2: PB Persist
                try {
                  await fetch(`/api/krakende-vote?sessionId=${sess.id}`, { method: 'DELETE' });
                  const patchRes = await fetch('/api/session-state', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      id: sess.id,
                      data: {
                        teamleaders: {},
                        current_fase: '01/01',
                        top3_state: '{}',
                        top10_state: '{}',
                        krakende_state: '{}'
                      }
                    })
                  });
                  const patchJson = await patchRes.json();
                  if (patchJson?.session) {
                    setCurrentSession(patchJson.session as unknown as RankingSession);
                  }
                } catch (e) {
                  console.error('[Display] Hard reset failed:', e);
                }
              }
            }}
            className="px-10 py-6 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white font-bold rounded-2xl text-2xl transition-all shadow-[0_0_30px_rgba(220,38,38,0.5)] flex flex-col items-center gap-2 cursor-pointer"
            style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
          >
            <span>♻️ NIEUWE SHOW</span>
            <span className="text-sm font-normal opacity-80">(Wist ALLE score data)</span>
          </button>
        </div>
      </div>}
    </div>
  );
}

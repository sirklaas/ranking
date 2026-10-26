'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';
import { safeJsonStr } from '@/lib/jsonUtils';
import SpookyTrailerTitle from '@/components/common/SpookyTrailerTitle';

const APP_VERSION = "v9.4.20";

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
      // Fetch fresh session via server API to ensure joined_players & latest state
      try {
        const res = await fetch('/api/session-state?id=latest');
        if (res.ok) {
          const json = await res.json();
          if (json?.session) {
            // If on 01/01 and there are joined players from previous test/show, clear them
            if (json.session.current_fase === '01/01' && Array.isArray(json.session.joined_players) && json.session.joined_players.length > 0) {
              fetch('/api/session-state', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: json.session.id, action: 'reset_joined_players' })
              }).catch(() => {});
              json.session.joined_players = [];
            }
            setCurrentSession(json.session);
            const teamAssignments = getTeamAssignments(json.session);
            setPlayersByTeam(teamAssignments);
          }
        }
      } catch {
        // Fallback to PB client direct if API route is unavailable
        try {
          const full = await rankingService.getSessionById(latestShallow.id);
          setCurrentSession(full as unknown as RankingSession);
        } catch {
          setCurrentSession(latestShallow);
        }
        const teamAssignments = getTeamAssignments(latestShallow);
        setPlayersByTeam(teamAssignments);
      }

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
    if (!currentMedia) {
      lastPlayedUrl.current = '';
      return;
    }
    const v = videoRef.current;
    if (!userEnabledSound) return; // Don't play until user clicks start button
    if (currentMedia.type !== 'video' || !v) return;
    if (currentMedia.url === lastPlayedUrl.current) return; // already playing this URL
    lastPlayedUrl.current = currentMedia.url;

    console.log(`[Display ${APP_VERSION}] Playing new video: ${currentMedia.name}`);
    try {
      v.currentTime = 0;
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
          if (fresh.current_fase === '01/01' && prev.current_fase !== '01/01') {
            fresh.joined_players = [];
          }
          if (fresh.current_fase === prev.current_fase && fresh.headings === prev.headings
            && JSON.stringify(fresh.teamleaders) === JSON.stringify((prev as Record<string, unknown>).teamleaders)
            && JSON.stringify((fresh as Record<string, unknown>).joined_players) === JSON.stringify((prev as Record<string, unknown>).joined_players)) {
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

    const timer = setInterval(poll, 1500);
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
      return motherfileService.fileUrl(name);
    };

    if (!fileName) {
      // No media in ranking headings → skip (no motherfile fallback needed)
      console.log('[Display] No media for fase', faseKey);
      setCurrentMedia(null);
      return;
    }

    const mediaUrl = resolveMedia(fileName);
    const isVideo = /(\.mp4|\.mov|\.avi|\.m4v|\.webm)$/i.test(mediaUrl || fileName);

    console.log('[Display] Resolved media from local pics folder', { faseKey, fileName, isVideo, mediaUrl });
    setCurrentMedia({ url: mediaUrl, name: fileName, type: isVideo ? 'video' : 'image', fallbackLocalUrl: mediaUrl });

  }, [currentSession]);

  // Removed mute state syncing; videos play with sound by default

  // Generate QR code URL for joining (uses current origin dynamically)
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_DOMAIN ? `https://${process.env.NEXT_PUBLIC_DOMAIN}` : 'https://ranking.pinkmilk.eu');
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(`${currentOrigin}/player?code=${gameCode}`)}`;

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
    // - for 20/01 (De Finale), it is the main endgame module itself (not a trailer), so always render
    const isTrailerSlot = currentSession.current_fase.endsWith('/01') && currentSession.current_fase !== '20/01';
    const stateReady = !mod?.stateField || !!moduleStates[mod.stateField];
    if (mod?.DisplayView && (stateReady || !isTrailerSlot || currentSession.current_fase === '20/01')) {
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
    <div className="min-h-screen bg-[#07060a] bg-gradient-to-br from-[#0c0817] via-[#140822] to-[#1a0802] relative overflow-hidden text-white" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
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
              autoPlay
              onCanPlay={(e) => {
                if (userEnabledSound) {
                  const vid = e.currentTarget;
                  if (vid.paused) {
                    vid.muted = false;
                    vid.volume = 1;
                    vid.play().catch(() => {
                      vid.muted = true;
                      vid.play().catch(() => {});
                    });
                  }
                }
              }}
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
                }
              }}
              onEnded={(e) => {
                e.currentTarget.pause();
                console.log('[Display] video ended');
              }}
            />
          ) : (
            <img src={currentMedia.url} alt={currentMedia.name} className="w-full h-full object-contain" />
          )}
          {/* Heading overlay: animated spooky overlay for trailers (xx/01), top center for normal fases */}
          {currentSession?.current_fase?.endsWith('/01') ? (
            <SpookyTrailerTitle
              faseKey={currentSession.current_fase}
              customHeading={faseService.parseHeadings(currentSession?.headings || '{}')[currentSession.current_fase]?.heading}
            />
          ) : (() => {
            // "Zitten en staan" = groep 07, Krakende = groep 13 no headings here per request.
            // 01/04-01/06: heading only on phones, not on display.
            if (currentSession?.current_fase?.startsWith('07/') || currentSession?.current_fase?.startsWith('13/') || currentSession?.current_fase?.startsWith('20/')) return null;
            if (['01/04', '01/05', '01/06'].includes(currentSession?.current_fase || '')) return null;

            const headings = faseService.parseHeadings(currentSession?.headings || '{}');
            const headingText = headings[currentSession?.current_fase || '']?.heading || '';
            return headingText ? (
              <div
                className="absolute left-0 right-0 flex items-center justify-center px-8 text-center top-[100px]"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                  paddingTop: '20px',
                  paddingBottom: '40px',
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
          {/* Animated Halloween background */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-950 via-zinc-950 to-orange-950 opacity-80 animate-pulse"></div>

          {/* Horizontal Band with Background + Overlaid Text and Spooky Logo */}
          <div
            className="relative z-10 w-full h-32 bg-cover bg-center bg-no-repeat flex items-center justify-between px-6 border-b border-orange-500/30"
            style={{
              backgroundImage: 'url(/assets/band.webp)',
              marginTop: '10px'
            }}
          >
            {/* Spooky Logo - Left side of band */}
            <div className="flex items-center space-x-3">
              <span className="text-4xl animate-bounce">🎃</span>
              <div className="flex flex-col">
                <span
                  className="text-orange-500 text-3xl font-normal uppercase tracking-wider leading-none"
                  style={{
                    fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
                    textShadow: '0 0 20px rgba(255, 117, 24, 0.9), 0 0 35px rgba(255, 69, 0, 0.8)'
                  }}
                >
                  Creepy Ranking
                </span>
                <span className="text-[11px] font-mono tracking-[0.3em] text-orange-300 uppercase">
                  Halloween Edition
                </span>
              </div>
            </div>

            {/* Centered Text Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <p className="text-xl md:text-2xl text-orange-300/90 mb-0 font-medium" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Quizmaster Klaas presenteert
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-0 uppercase tracking-wide" style={{ fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif', textShadow: '0 0 15px rgba(255,117,24,0.6)' }}>
                {currentSession.showname} - {currentSession.city}
              </h1>
              <p className="text-xl md:text-2xl text-orange-200/90 font-medium" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
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
                    {/* Team Circle with outline */}
                    <div
                      className="bg-zinc-950 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(255,117,24,0.35)]"
                      style={{
                        width: `min(100px, calc((100vw - 6rem) / ${currentSession.nr_teams}))`,
                        height: `min(100px, calc((100vw - 6rem) / ${currentSession.nr_teams}))`,
                        border: '6px solid #f97316',
                        minWidth: '60px',
                        minHeight: '60px'
                      }}
                    >
                      <span
                        className="font-bold text-orange-400"
                        style={{
                          fontSize: `min(2.5rem, calc((100vw - 12rem) / ${currentSession.nr_teams} * 0.35))`
                        }}
                      >
                        {teamNumber}
                      </span>
                    </div>

                    {/* Player Names — dynamic height ensuring entire view and subheading fit on screen */}
                    {(() => {
                      const playerCount = Math.max(maxPlayersInAnyTeam, 1);
                      const gapPx = 4;
                      // Each slot is capped at 65px or fits within 45vh so everything stays on screen
                      const slotHeight = Math.min(65, Math.floor((45 * (typeof window !== 'undefined' ? window.innerHeight : 900) / 100) / playerCount));

                      // Build a sorted index map: only sort by votes if in teamleader fase or votes exist
                      const teamVotes = ((currentSession.teamleaders as Record<string, Record<string, number>> | null)?.[`team_${teamNumber}`]) || {};
                      const hasAnyVotes = Object.values(teamVotes).some(v => v > 0);

                      const sortedPlayers = (hasAnyVotes || currentSession.current_fase === '01/07')
                        ? [...teamPlayers].sort((a, b) => {
                            const votesA = teamVotes[a] || 0;
                            const votesB = teamVotes[b] || 0;
                            if (votesB !== votesA) return votesB - votesA;
                            if (a === topPlayer) return -1;
                            if (b === topPlayer) return 1;
                            return a.localeCompare(b);
                          })
                        : [...teamPlayers]; // Keep original team order during onboarding!

                      const slotMap: Record<string, number> = {};
                      sortedPlayers.forEach((p, i) => slotMap[p] = i);

                      // Set of player names that have joined via their phone (normalized for robust matching)
                      const joinedRaw = (currentSession as Record<string, unknown>)?.joined_players;
                      const joinedList: string[] = Array.isArray(joinedRaw)
                        ? (joinedRaw as string[])
                        : (typeof joinedRaw === 'object' && joinedRaw !== null
                            ? Object.keys(joinedRaw as Record<string, unknown>)
                            : []);
                      const joinedSet = new Set<string>(joinedList.map(n => String(n).trim().toLowerCase()));

                      return (
                        <div
                          className="relative w-full px-1"
                          style={{ height: `${playerCount * slotHeight}px` }}
                        >
                          {teamPlayers.map((player) => {
                            const isLeader = player === topPlayer && highestVotes > 0;
                            const isJoined = joinedSet.has(player.trim().toLowerCase());
                            const targetSlot = slotMap[player] ?? 0;
                            const originalSlot = teamPlayers.indexOf(player);
                            const slotDiff = targetSlot - originalSlot;

                            return (
                              <div
                                key={player}
                                className={`absolute left-1 right-1 rounded-lg text-center border shadow-md overflow-hidden flex items-center justify-center ${isLeader
                                  ? 'bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 text-black border-amber-200 z-10 shadow-[0_0_20px_rgba(255,117,24,0.7)]'
                                  : 'bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-orange-200 border-orange-500/30'
                                }`}
                                style={{
                                  fontFamily: 'Barlow Semi Condensed, sans-serif',
                                  fontWeight: 400,
                                  fontSize: `min(28px, calc(${slotHeight}px * 0.45))`,
                                  height: `${slotHeight - gapPx}px`,
                                  padding: '0 8px',
                                  lineHeight: '1',
                                  top: `${originalSlot * slotHeight}px`,
                                  transform: `translateY(${slotDiff * slotHeight}px)`,
                                  transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1), background 1s ease, box-shadow 1s ease',
                                  boxShadow: isLeader ? '0 0 25px rgba(249, 115, 22, 0.6)' : undefined,
                                }}
                              >
                                <span className="block truncate w-full px-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
                                  {isLeader && <span className="mr-2" style={{
                                    display: 'inline-block',
                                    animation: isLeader ? 'crownReveal 1s ease-out' : 'none'
                                  }}>👑</span>}
                                  {player}
                                </span>

                                {/* Glowing orange dot in lower right corner when player has joined via phone */}
                                {isJoined && (
                                  <span
                                    className="absolute bottom-2 right-2 w-[8px] h-[8px] rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]"
                                    title={`${player} is ingelogd`}
                                  />
                                )}
                              </div>
                            );
                          })}

                          {/* Empty slots if team has fewer players */}
                          {teamPlayers.length === 0 && (
                            <div className="bg-gray-200 text-gray-500 px-2 py-1 rounded-lg text-center italic border-2 border-gray-300 text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
                              No players yet
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>

            {/* Subheading under the rectangles */}
            <div className="w-full text-center mt-6 mb-2 z-20">
              <h2
                className="text-2xl md:text-3xl text-white tracking-wide drop-shadow-md"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}
              >
                Iedereen in het juiste team!
              </h2>
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

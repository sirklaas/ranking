'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';
import { safeJsonStr } from '@/lib/jsonUtils';

const APP_VERSION = 'v4.4';

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
  const lastPlayedUrl = useRef<string>('');
  // const [needsInteraction, setNeedsInteraction] = useState(false);
  const [userEnabledSound, setUserEnabledSound] = useState(false);
  const [motherMeta, setMotherMeta] = useState<{ collection: string; recordId: string; baseUrl: string } | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});
  const [pollDebug, setPollDebug] = useState({ count: 0, lastPbFase: '?', error: '' });

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
      // Arrow keys removed — display follows PB only, presenter controls slides
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
    if (!currentSession) return;
    const sessionId = currentSession.id;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await fetch(`/api/session-state?id=${encodeURIComponent(sessionId)}`);
        if (!active || !res.ok) return;
        const { session: fresh } = await res.json();
        if (!active || !fresh) return;

        const freshFase = fresh.current_fase || '?';
        setPollDebug(prev => ({ ...prev, count: prev.count + 1, lastPbFase: freshFase, error: '' }));

        setCurrentSession((prev) => {
          if (!prev) return prev;
          if (fresh.current_fase === prev.current_fase && fresh.headings === prev.headings) {
            let changed = false;
            Object.values(FASES).forEach((mod) => {
              const sf = mod.stateField;
              if (!sf) return;
              if ((fresh as Record<string, unknown>)[sf] !== (prev as Record<string, unknown>)[sf]) changed = true;
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
    return () => { active = false; clearInterval(timer); };
  }, [currentSession?.id]);

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

    // Add a light-weight preload hint for smoother start
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = isVideo ? 'video' : 'image';
      link.href = mediaUrl;
      document.head.appendChild(link);
      setTimeout(() => {
        try { document.head.removeChild(link); } catch { }
      }, 5000);
    } catch { }
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
        <div className="fixed inset-0 z-50 bg-black">
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
            className="relative z-10 w-full h-48 bg-cover bg-center bg-no-repeat flex items-center justify-between px-6"
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
                let teamPlayers = playersByTeam[teamNumber] || [];

                // Sort players based on team leader votes
                let highestVotes = 0;
                let topPlayer = '';

                try {
                  const currentVotes = JSON.parse((currentSession.team_leader_votes as string) || '{}');
                  const teamKey = `team_${teamNumber}`;
                  const teamVotes = currentVotes[teamKey] || {};

                  // Sort players: highest votes first
                  teamPlayers.sort((a, b) => {
                    const votesA = teamVotes[a] || 0;
                    const votesB = teamVotes[b] || 0;
                    if (votesA > highestVotes) {
                      highestVotes = votesA;
                      topPlayer = a;
                    }
                    if (votesB > highestVotes) {
                      highestVotes = votesB;
                      topPlayer = b;
                    }
                    return votesB - votesA; // Descending order
                  });

                  // If multiple have same highest votes, the first one encountered stays topPlayer
                  // if highestVotes is 0, topPlayer is empty
                  if (highestVotes === 0) topPlayer = '';

                } catch (e) {
                  console.error('Failed to parse team leader votes for display sorting');
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

                    {/* Player Names */}
                    <div className="flex flex-col gap-1 w-full px-1" style={{ height: 'calc(100vh - 350px)' }}>
                      {teamPlayers.map((player, playerIndex) => {
                        const isLeader = player === topPlayer && highestVotes > 0;

                        return (
                          <div
                            key={playerIndex}
                            className={`rounded-lg text-center font-semibold border-2 border-white shadow-md overflow-hidden transition-all duration-1000 flex items-center justify-center ${isLeader
                              ? 'bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 text-black transform scale-[1.05] z-10'
                              : 'bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800'
                              }`}
                            style={{
                              fontFamily: 'Barlow Semi Condensed, sans-serif',
                              fontWeight: isLeader ? 700 : 500,
                              fontSize: isLeader ? 'min(48px, 6vh)' : 'min(40px, 5vh)',
                              flex: 1,
                              minHeight: 0,
                              maxHeight: '65px',
                              padding: '2px 8px'
                            }}
                          >
                            <span className="block truncate w-full" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                              {isLeader && <span className="mr-2">👑</span>}
                              {player}
                            </span>
                          </div>
                        );
                      })}

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
      {!userEnabledSound && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center backdrop-blur-sm">
          <h2 className="text-white text-3xl font-light mb-8 tracking-widest">Display Systeem</h2>
          <button
            onClick={() => {
              // IMMEDIATELY dismiss overlay
              setUserEnabledSound(true);
              lastPlayedUrl.current = '';

              // Unlock audio (all sync, in user-gesture context)
              try {
                const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
                const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
                if (AC) {
                  const ctx = new AC();
                  const buf = ctx.createBuffer(1, 1, 22050);
                  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0);
                  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
                }
              } catch (e) { console.warn('[Display] AudioContext unlock error:', e); }

              // Play video with sound (sync call in user gesture)
              try {
                const v = videoRef.current;
                if (v && v.src) {
                  v.muted = false;
                  v.volume = 1;
                  v.currentTime = 0;
                  const p = v.play();
                  if (p) p.catch(() => { v.muted = true; v.play().catch(() => { }); });
                }
              } catch (e) { console.warn('[Display] Video play error:', e); }

              // Reset Krakende state + clear votes collection (async, fire-and-forget)
              import('@/modules/krakende-karakters/logic').then(({ getInitialState, resetState }) => {
                const fresh = getInitialState();
                if (currentSession) resetState(currentSession.id, fresh).catch(() => { });
              }).catch(() => { });
              if (currentSession) {
                import('@/lib/pocketbase').then(({ krakendeVoteService }) => {
                  krakendeVoteService.clearVotes(currentSession.id).catch(() => { });
                }).catch(() => { });
              }
            }}
            className="px-12 py-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-3xl text-4xl shadow-[0_0_50px_rgba(236,72,153,0.5)] hover:scale-105 transition-transform active:scale-95 flex flex-col items-center gap-2"
            style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
          >
            <span>▶ KLIK HIER OM TE STARTEN</span>
            <span className="text-xl font-normal opacity-80">(Activeert geluid voor de rest van de sessie)</span>
          </button>
        </div>
      )}
    </div>
  );
}

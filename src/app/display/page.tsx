'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';

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
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});

  // Sync module states from session on load / session change
  useEffect(() => {
    if (!currentSession) return;
    const newStates: Record<string, string> = {};
    Object.values(FASES).forEach((mod) => {
      const sf = mod.stateField;
      if (!sf) return;

      let json = (currentSession as Record<string, unknown>)[sf];

      if (!json && currentSession.headings) {
        try {
          const hObj = typeof currentSession.headings === 'string' ? JSON.parse(currentSession.headings) : currentSession.headings;
          if (hObj[sf]) {
            json = typeof hObj[sf] === 'string' ? hObj[sf] : JSON.stringify(hObj[sf]);
          }
        } catch (e) { }
      }

      if (typeof json === 'string' && json) {
        newStates[sf] = json;
      }
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
      // Arrow navigation: advance/retreat current_fase
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSession(prev => {
          if (!prev) return prev;
          const headings = faseService.parseHeadings(prev.headings || '{}');
          const keys = Object.keys(headings);
          if (keys.length === 0) return prev;
          const curIdx = keys.indexOf(prev.current_fase || '');
          let nextIdx: number;
          if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            nextIdx = curIdx < keys.length - 1 ? curIdx + 1 : curIdx;
          } else {
            nextIdx = curIdx > 0 ? curIdx - 1 : 0;
          }
          const nextFase = keys[nextIdx];
          if (nextFase !== prev.current_fase) {
            rankingService.updateSession(prev.id, { current_fase: nextFase }).catch(() => { });
          }
          return { ...prev, current_fase: nextFase };
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(link);
    };
  }, [loadSessionData]);

  // Try to start playback with sound; if user enabled sound, it works natively
  useEffect(() => {
    const v = videoRef.current;

    // Compute locally if media overlay is allowed for the current fase
    // We allow media overlays on basically any fase that has a video (e.g. */01 trailers or 01/04 intro)
    const faseStr = currentSession?.current_fase || '';
    const allow = (() => {
      // Allow video trailers to play anytime they exist
      return true;
    })();

    if (!currentMedia || currentMedia.type !== 'video' || !allow || !v) {
      return;
    }

    try {
      v.muted = false;
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.then === 'function') {
        p.catch((e) => {
          console.warn('[Display] Autoplay blocked by browser. Falling back to muted.', e);
          v.muted = true;
          v.play().catch((err) => console.error('[Display] Even muted autoplay blocked:', err));
        });
      }
    } catch (e) {
      console.error('[Display] Video play error:', e);
    }
  }, [currentMedia, currentSession, userEnabledSound]);

  // Subscribe to PocketBase session updates (current_fase and elimination_state changes)
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

        // Parse all registered module states generically
        Object.values(FASES).forEach((mod) => {
          const sf = mod.stateField;
          if (!sf) return;

          let jsonStr = rec[sf] as string | undefined;

          // Fallback: If PB dropped it, unpack from 'headings'
          if (!jsonStr && rec.headings) {
            try {
              const hObj = JSON.parse(rec.headings);
              if (hObj[sf]) {
                jsonStr = typeof hObj[sf] === 'string' ? hObj[sf] : JSON.stringify(hObj[sf]);
              }
            } catch (e) { }
          }

          if (jsonStr) {
            try {
              setModuleStates((prev) => ({ ...prev, [sf]: jsonStr! }));
            } catch (e) {
              console.error(`[Display] Failed to parse ${sf}`, e);
            }
          }
        });

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

    if (mod?.DisplayView && (!mod.stateField || moduleStates[mod.stateField])) {
      const headingsJson = currentSession.headings || '{}';
      const heading = faseService.getCurrentHeading(headingsJson, currentSession.current_fase) || '';
      const imageName = faseService.getCurrentImage(headingsJson, currentSession.current_fase) || '';
      const mediaUrl = imageName ? motherfileService.fileUrl(imageName) : '';
      const ModDisplay = mod.DisplayView;
      const allPlayerNames = currentSession.playernames ? teamService.parsePlayerNames(currentSession.playernames) : [];
      return (
        <ModDisplay
          faseKey={currentSession.current_fase}
          moduleStateJson={mod.stateField ? moduleStates[mod.stateField] : undefined}
          heading={heading}
          mediaUrl={mediaUrl}
          allPlayerNames={allPlayerNames}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 relative overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
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
                // Pause before the end to prevent native black transitions. Increased to 0.4s 
                // to make sure `timeupdate` fires in time before the browser hides the frame.
                if (vid.duration - vid.currentTime < 0.2 && !vid.paused) {
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
          {/* Heading overlay in top 1/3 */}
          {(() => {
            // "Zitten en staan" = groep 07, no headings here per request.
            if (currentSession?.current_fase?.startsWith('07/')) return null;

            const headings = faseService.parseHeadings(currentSession?.headings || '{}');
            const headingText = headings[currentSession?.current_fase || '']?.heading || '';
            return headingText ? (
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-center px-8 text-center"
                style={{ height: '33%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}
              >
                <h1
                  className="text-white text-5xl font-light whitespace-pre-line"
                  style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)', fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}
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
              try {
                setUserEnabledSound(true);
                // Attempt to unlock audio on Safari/iOS by resuming AudioContext if supported
                const anyWin = window as unknown as { webkitAudioContext?: typeof AudioContext };
                const AC = window.AudioContext || (anyWin && anyWin.webkitAudioContext);
                if (AC) {
                  const ctx = new AC();
                  // create and stop a silent buffer
                  const osc = ctx.createOscillator(); osc.frequency.value = 0.0001; osc.connect(ctx.destination); osc.start(0); osc.stop(0.01);
                  if (ctx.state === 'suspended') ctx.resume().catch(() => { });
                }
              } catch { }
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

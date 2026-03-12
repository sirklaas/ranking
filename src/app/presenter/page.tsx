'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import RankingSessionForm from '@/components/game/RankingSessionForm';
import RankingSessionList from '@/components/game/RankingSessionList';
import { RankingSession } from '@/types';
import { teamService, faseService, rankingService, motherfileService, MotherfileFases } from '@/lib/pocketbase';
import { safeJsonStr } from '@/lib/jsonUtils';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';

const APP_VERSION = 'v9.0';

export default function PresenterPage() {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'manage' | 'game'>('list');
  const [selectedSession, setSelectedSession] = useState<RankingSession | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingHeadings, setEditingHeadings] = useState<Record<string, { heading: string; image?: string }>>({});
  const [currentFase, setCurrentFase] = useState('01/01');
  const [, setGameStarted] = useState(false);
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [gameTime, setGameTime] = useState('00:00');
  const [isClient, setIsClient] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});
  const [pbStatus, setPbStatus] = useState<string>('init');
  const localWriteTs = useRef<number>(0); // timestamp of last local module state write

  // Reliable PB write with logging + retry
  const writeFaseToPB = useCallback(async (sessionId: string, fase: string) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await rankingService.updateSession(sessionId, { current_fase: fase });
        setPbStatus(`✓ ${fase}`);
        console.log(`[Presenter] PB write OK: ${fase} (attempt ${attempt})`);
        return;
      } catch (e) {
        console.error(`[Presenter] PB write FAILED attempt ${attempt}:`, e);
        setPbStatus(`✗ ${fase} #${attempt}`);
        if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
    setPbStatus(`FAIL ${fase}`);
  }, []);


  // Subscribe to PB real-time updates for the active session (to show live votes arriving)
  useEffect(() => {
    if (!selectedSession) return;
    type PBEvent = { record?: Partial<RankingSession> } | Partial<RankingSession>;
    const unsub = rankingService.subscribeToRankings(async (e: unknown) => {
      try {
        const evt = e as PBEvent;
        const rec = (evt && ('record' in evt ? evt.record : evt)) as Partial<RankingSession> | undefined;
        if (!rec || rec.id !== selectedSession.id) return;

        // Merge incoming PB state directly into selectedSession
        setSelectedSession((prev) => prev ? { ...prev, ...rec } : null);
      } catch (err) { }
    });
    return () => { unsub.then(u => u()).catch(() => { }); };
  }, [selectedSession?.id]);

  // Sync all module states from session (generic)
  useEffect(() => {
    if (selectedSession && selectedSession.current_fase && selectedSession.current_fase !== currentFase) {
      setCurrentFase(selectedSession.current_fase);
    }
  }, [selectedSession?.current_fase]);

  // Sync all module states from session (generic) — top-level PB fields only
  // SKIP if a local write happened < 3s ago (prevents PB subscription from reverting V/R state)
  useEffect(() => {
    if (!selectedSession) return;
    if (Date.now() - localWriteTs.current < 3000) {
      console.log('[Presenter] Skipping PB module state sync (local write lockout)');
      return;
    }
    const newStates: Record<string, string> = {};
    Object.values(FASES).forEach((mod) => {
      const sf = mod.stateField;
      if (!sf) return;
      const str = safeJsonStr((selectedSession as Record<string, unknown>)[sf]);
      if (str) newStates[sf] = str;
    });
    setModuleStates((prev) => ({ ...prev, ...newStates }));
  }, [selectedSession]);

  // Simplified preview for the Next panel (no upload UI, no file path)
  const renderNextPreview = (media: { type: 'video' | 'image', path: string, name: string, heading?: string, fase?: string } | null) => {
    if (!media) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white">
          <div className="text-4xl mb-2">⏭️</div>
          <div className="text-sm opacity-80">No upcoming media</div>
        </div>
      );
    }
    if (media.type === 'video') {
      return (
        <div className="w-full h-full flex flex-col">
          {media.heading && (
            <div className="text-center py-2 px-4 bg-black/30 rounded-t text-white">
              <div style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, fontSize: '22px', lineHeight: 1.2 }}>
                {media.heading}
              </div>
              {media.fase && (
                <div className="text-xs opacity-70">Fase {media.fase}</div>
              )}
            </div>
          )}
          <div className="flex-1 rounded-b flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F5B800' }}>
            <video
              src={media.path}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              playsInline
              onLoadedMetadata={(e) => {
                const v = e.currentTarget; v.currentTime = 0.1;
              }}
              onError={() => { /* silent */ }}
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-0.5 rounded text-[10px] tracking-wide">VIDEO</div>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full h-full flex flex-col">
        {media.heading && (
          <div className="text-center py-2 px-4 bg-black/30 rounded-t text-white">
            <div style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, fontSize: '22px', lineHeight: 1.2 }}>
              {media.heading}
            </div>
            {media.fase && (
              <div className="text-xs opacity-70">Fase {media.fase}</div>
            )}
          </div>
        )}
        <div className="flex-1 rounded-b flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F5B800' }}>
          <Image src={media.path} alt={media.name} fill className="object-cover" />
        </div>
      </div>
    );
  };

  // Initialize client-side state to prevent hydration errors
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
  }, []);

  // Load Google Font
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      if (gameStartTime) {
        const elapsed = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setGameTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [gameStartTime]);



  // Define fase groups
  const faseGroups = {
    '1': { name: 'Intro', fases: ['01/01', '01/02', '01/03', '01/04', '01/05', '01/06', '01/07'] },
    '4': { name: 'Guilty Pleasures', fases: ['04/01', '04/02'] },
    '7': { name: 'Zitten en Staan', fases: ['07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15'] },
    '10': { name: 'De Top 3', fases: ['10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13'] },
    '13': { name: 'Krakende Karakters', fases: ['13/01', '13/02', '13/03', '13/06', '13/05', '13/09'] },
    '17': { name: 'Top 10', fases: ['17/01', '17/02', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14'] },
    '20': { name: 'De Finale', fases: ['20/01'] }
  };

  // Get current fase group
  const getCurrentFaseGroup = () => {
    for (const [groupKey, group] of Object.entries(faseGroups)) {
      if (group.fases.includes(currentFase)) {
        return groupKey;
      }
    }
    return '1';
  };

  // Get filtered fases based on current selection
  const getFilteredFases = () => {
    const currentGroup = getCurrentFaseGroup();
    return faseGroups[currentGroup as keyof typeof faseGroups]?.fases || [];
  };

  const handleSessionCreated = (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    setRefreshTrigger(prev => prev + 1);
  };

  const loadMasterTemplate = async () => {
    // Use built-in default headings (motherfile API was removed)
    try {
      return faseService.parseHeadings(faseService.createDefaultHeadings());
    } catch (error) {
      console.log('Could not load master template, using defaults', error);
      return null;
    }
  };



  const handleStartRankingGame = () => {
    console.log('Start Ranking Game clicked!', { selectedSession, currentView });
    if (!selectedSession) {
      console.log('No selected session - returning');
      return;
    }

    console.log('Setting game started and changing view to game');
    setGameStarted(true);
    setGameStartTime(new Date());
    setCurrentView('game');
    setCurrentFase('01/01');

    // Claim priority=1 for this session so the Display automatically follows it
    const claimPriorityAndStart = async () => {
      try {
        const all = await rankingService.getAllSessions();
        for (const s of all) {
          if ((s as unknown as Record<string, unknown>).priority === 1 && s.id !== selectedSession.id) {
            await rankingService.updateSession(s.id, { priority: 0 });
          }
        }
        const headingsObj = JSON.parse(selectedSession.headings || '{}');
        headingsObj._lastActivated = Date.now();
        await rankingService.updateSession(selectedSession.id, {
          current_fase: '01/01',
          headings: JSON.stringify(headingsObj),
          priority: 1
        });
        console.log('Successfully claimed priority=1 for new active game');
      } catch (e) {
        console.error('Failed to claim priority:', e);
        writeFaseToPB(selectedSession.id, '01/01');
      }
    };
    claimPriorityAndStart();

    console.log('State updated - should show game interface now');
  };

  const handlePhaseNavigation = (fase: string) => {
    setCurrentFase(fase);
    // Update the session's current fase in the database
    if (selectedSession) {
      writeFaseToPB(selectedSession.id, fase);
    }
  };


  const getCurrentDisplay = () => {
    if (!selectedSession) return 'No session selected';
    const headings = faseService.parseHeadings(selectedSession.headings || '{}');
    return headings[currentFase]?.heading || `Fase ${currentFase}`;
  };

  // Removed unused getNextDisplay

  const getNextMedia = () => {
    if (!selectedSession) {
      console.log('No selected session');
      return null;
    }

    // Use currently edited headings as source of truth (falls back to session JSON)
    const headings = Object.keys(editingHeadings).length
      ? editingHeadings
      : faseService.parseHeadings(selectedSession.headings || '{}');

    // If headings are empty, use fallback data for testing
    if (Object.keys(headings).length === 0) {
      const fallbackHeadings = {
        '01/01': { heading: 'Welkom', image: '' },
        '01/02': { heading: 'In welk team zit je?', image: '' },
        '01/03': { heading: 'Wat is jouw naam?', image: '' },
        '01/04': { heading: 'Wat wordt jullie Teamnaam?', image: 'RankingNaam.mp4' }
      };

      // Find the next fase with a non-empty image/Picture field
      const currentFaseIndex = Object.keys(fallbackHeadings).indexOf(currentFase);
      const faseKeys = Object.keys(fallbackHeadings).slice(currentFaseIndex + 1);

      for (const faseKey of faseKeys) {
        const faseData = fallbackHeadings[faseKey as keyof typeof fallbackHeadings];
        if (faseData?.image && faseData.image.trim() !== '') {
          // Determine file type
          const fileName = faseData.image;
          const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi');
          const path = fileName.startsWith('/') ? fileName : `/pics/${fileName}`;

          return {
            type: isVideo ? 'video' as const : 'image' as const,
            path: path,
            name: fileName,
            heading: faseData.heading || `Fase ${faseKey}`,
            fase: faseKey
          };
        }
      }
    }

    // Find the next fase with a non-empty image/Picture field
    const currentFaseIndex = Object.keys(headings).indexOf(currentFase);
    const faseKeys = Object.keys(headings).slice(currentFaseIndex + 1);

    for (const faseKey of faseKeys) {
      const faseData = headings[faseKey];
      if (faseData?.image && faseData.image.trim() !== '') {
        // Determine file type
        const fileName = faseData.image;
        const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi');
        const path = motherfileService.fileUrl(fileName);

        return {
          type: isVideo ? 'video' as const : 'image' as const,
          path: path,
          name: fileName,
          heading: faseData.heading || `Fase ${faseKey}`,
          fase: faseKey
        };
      }
    }
    return null;
  };


  const handleSessionSelect = async (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    // Load existing headings or import master template if empty
    let headings = faseService.parseHeadings(session.headings || '{}');



    setEditingHeadings(headings);
    setCurrentFase(session.current_fase || '01/01');
  };

  const handleHeadingUpdate = (fase: string, heading: string, image?: string) => {
    setEditingHeadings(prev => ({
      ...prev,
      [fase]: { heading, image }
    }));
  };

  const updateMasterTemplate = async (_headings: Record<string, { heading: string; image?: string }>) => {
    // No-op: media is now served from pinkmilk.eu, headings are saved per-session
    return { success: true, message: 'Headings saved to session (pinkmilk.eu for media)' };
  };

  const saveHeadings = async (options?: { updateMotherfile?: boolean }) => {
    if (!selectedSession) return;

    try {
      const headingsJson = JSON.stringify(editingHeadings);

      // Save to current session
      await rankingService.updateSession(selectedSession.id, {
        headings: headingsJson,
        current_fase: currentFase
      });

      // Update local session
      setSelectedSession(prev => prev ? {
        ...prev,
        headings: headingsJson,
        current_fase: currentFase
      } : null);

      // Optionally update the motherfile (global defaults)
      if (options?.updateMotherfile) {
        const masterResult = await updateMasterTemplate(editingHeadings);
        if (!masterResult.success) {
          console.warn('Motherfile update warning:', masterResult.message);
        }
      }

      // Show subtle inline banner instead of alerts
      setSaveBanner(options?.updateMotherfile
        ? 'Saved. Global defaults updated.'
        : 'Saved. This show only.');
      setTimeout(() => setSaveBanner(null), 3500);
    } catch (error) {
      console.error('Error saving headings:', error);
      setSaveBanner('Failed to save. See console for details.');
      setTimeout(() => setSaveBanner(null), 5000);
    }
  };

  // Removed unused loadNewStructure

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedSession(null);
  };

  // State for real display data
  // (Removed unused displayData and loadDisplayData to satisfy lint)
  // const [displayData, setDisplayData] = useState<{playersByTeam: Record<number, string[]>, gameCode: string} | null>(null);
  // const loadDisplayData = useCallback(async () => {
  //   if (!selectedSession) return;
  //   try {
  //     // Get the same team assignments as the Display page
  //     const playerNames = teamService.parsePlayerNames(selectedSession.playernames || '');
  //     const teamAssignments = teamService.generateTeamAssignments(playerNames, selectedSession.nr_teams || 1);
  //     const gameCode = Math.floor(1000 + Math.random() * 9000).toString();
  //     
  //     setDisplayData({
  //       playersByTeam: teamAssignments,
  //       gameCode: gameCode
  //     });
  //   } catch (error) {
  //     console.error('Error loading display data:', error);
  //   }
  // }, [selectedSession]);



  const getHeadingsSource = useCallback(() => {
    if (!selectedSession) return {} as Record<string, { heading: string; image?: string }>;
    const parsed = faseService.parseHeadings(selectedSession.headings || '{}');
    return Object.keys(editingHeadings).length ? editingHeadings : parsed;
  }, [selectedSession, editingHeadings]);

  // Ordered fase keys globally across explicitly configured groups
  const getOrderedFasesGlobal = useCallback(() => {
    const fg = {
      '1': ['01/01', '01/02', '01/03', '01/04', '01/05', '01/06', '01/07'],
      '4': ['04/01', '04/02'],
      '7': ['07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15'],
      '10': ['10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13'],
      '13': ['13/01', '13/02', '13/03', '13/06', '13/05', '13/09'],
      '17': ['17/01', '17/02', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14'],
      '20': ['20/01']
    };
    const keys: string[] = [];
    const orderedGroups = ['1', '4', '7', '10', '13', '17', '20'];
    orderedGroups.forEach(g => {
      keys.push(...(fg[g as keyof typeof fg] || []));
    });
    return keys;
  }, []);

  // Build media descriptor for a specific fase key from headings/motherfile
  const getMediaForFase = useCallback((faseKey: string) => {
    const headings = getHeadingsSource();
    const item = headings[faseKey];
    if (!item?.image || item.image.trim() === '') return null;
    let fileName = item.image;



    const isVideo = /\.(mp4|mov|avi|m4v|webm)$/i.test(fileName);
    return {
      type: isVideo ? 'video' as const : 'image' as const,
      path: motherfileService.fileUrl(fileName),
      name: fileName,
      heading: item.heading || `Fase ${faseKey}`,
      fase: faseKey,
    };
  }, [getHeadingsSource]);

  const getNextFaseGlobal = useCallback((faseKey: string) => {
    const ordered = getOrderedFasesGlobal();
    const idx = ordered.indexOf(faseKey);
    if (idx === -1 || idx === ordered.length - 1) return faseKey;
    return ordered[idx + 1];
  }, [getOrderedFasesGlobal]);

  const getPrevFaseGlobal = useCallback((faseKey: string) => {
    const ordered = getOrderedFasesGlobal();
    const idx = ordered.indexOf(faseKey);
    if (idx === -1 || idx === 0) return faseKey;
    return ordered[idx - 1];
  }, [getOrderedFasesGlobal]);

  const currentVideoRef = useRef<HTMLVideoElement | null>(null);

  const formatHeading = (text?: string) => {
    if (!text) return '';
    // Replace '/n' tokens with new lines
    return text.replaceAll('/n', '\n');
  };
  // Generic Arrow navigation globally
  useEffect(() => {
    if (currentView !== 'game') return;
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs/textareas/selects or contentEditable
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const isEditable = !!(target && (target.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'));
      if (isEditable) return;

      const isNext = e.key === 'ArrowRight' || e.key === ']' || e.key === 'PageDown';
      const isPrev = e.key === 'ArrowLeft' || e.key === '[' || e.key === 'PageUp';
      if (!isNext && !isPrev) return;

      e.preventDefault();
      if (isNext) {
        let next = getNextFaseGlobal(currentFase);
        setCurrentFase(next);
        if (selectedSession) {
          writeFaseToPB(selectedSession.id, next);
        }
        if (next === '20/01') {
          setTimeout(() => {
            window.location.href = 'https://www.end.pinkmilk.eu';
          }, 500);
        }
      } else if (isPrev) {
        const prev = getPrevFaseGlobal(currentFase);
        setCurrentFase(prev);
        if (selectedSession) {
          writeFaseToPB(selectedSession.id, prev);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentView, currentFase, selectedSession, getNextFaseGlobal, getPrevFaseGlobal, writeFaseToPB]);

  // No presenter-side autoplay; Display page handles playback

  // No Space shortcut in presentation mode

  const renderGameInterface = () => {
    console.log('renderGameInterface called', { selectedSession, currentView });
    if (!selectedSession) {
      console.log('renderGameInterface: No selected session');
      return null;
    }

    const phaseButtons = [
      { label: '1', name: 'Intro', fases: faseGroups['1'].fases },
      { label: '2', name: 'Guilty Pleasures', fases: faseGroups['4'].fases },
      { label: '3', name: 'Zitten en Staan', fases: faseGroups['7'].fases },
      { label: '4', name: 'De Top 3', fases: faseGroups['10'].fases },
      { label: '5', name: 'Krakende Karakters', fases: faseGroups['13'].fases },
      { label: '6', name: 'Top 10', fases: faseGroups['17'].fases },
      { label: '7', name: 'De Finale', fases: faseGroups['20'].fases }
    ];

    const nextMedia = getNextMedia();

    return (
      <div className="h-screen bg-gray-100" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div style={{ margin: '0 2%' }}>
          {/* Header with game info - with 2% side margins */}
          <div className="bg-white shadow-md p-6">
            <div className="flex justify-between items-center">
              {/* Left side - Game info in one line */}
              <div className="flex items-center gap-8">
                <h1 className="text-3xl text-gray-900" style={{ fontWeight: 300 }}>{selectedSession.showname || 'Game Title'}</h1>
                <span className="text-xl font-semibold text-gray-700">{currentTime ? currentTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : '--:--'} [time]</span>
                <span className="text-xl font-semibold text-gray-700">{gameTime} [game time]</span>
              </div>
              <button
                onClick={() => setCurrentView('manage')}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-semibold"
              >
                ← Back to Setup
              </button>
            </div>
          </div>

          {/* Module-specific controls (resolved from fase registry) */}
          {(() => {
            const mod = findFaseModule(currentFase);
            if (!mod || !selectedSession) return null;
            const allPlayerNames = teamService.parsePlayerNames(selectedSession.playernames);
            return (
              <mod.PresenterView
                key={mod.stateField || currentFase}
                faseKey={currentFase}
                sessionId={selectedSession.id}
                moduleStateJson={mod.stateField ? moduleStates[mod.stateField] : undefined}
                onModuleStateJson={(json) => { if (mod.stateField) { localWriteTs.current = Date.now(); setModuleStates((prev) => ({ ...prev, [mod.stateField!]: json })); } }}
                allPlayerNames={allPlayerNames}
              />
            );
          })()}
          {/* Main content grid: 48% | 44% | 8% (no outer spacers) */}
          <div
            className="grid mt-4 gap-4 pr-6"
            style={{ gridTemplateColumns: '48% 44% 8%', height: 'calc(100vh - 200px)' }}
          >
            {/* Current Display (43%) */}
            <div className="flex flex-col">
              {/* Current Display - Left screen (16:9) */}
              <div>
                <div className="relative w-full aspect-[16/9] bg-black overflow-hidden">
                  {(() => {
                    const media = getMediaForFase(currentFase);
                    const headingText = getHeadingsSource()[currentFase]?.heading || `Fase ${currentFase}`;
                    return (
                      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: '#1a1a2e' }}>
                        {/* Media: video or image */}
                        {media?.type === 'video' && media.path ? (
                          <video
                            ref={currentVideoRef}
                            src={media.path}
                            className="absolute inset-0 w-full h-full object-contain"
                            preload="auto"
                            muted
                            playsInline
                            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.01; }}
                          />
                        ) : media?.type === 'image' && media.path ? (
                          <img src={media.path} alt={headingText} className="absolute inset-0 w-full h-full object-contain" />
                        ) : null}
                        {/* Heading overlay in top 1/3 */}
                        <div className="absolute top-0 left-0 right-0 flex items-center justify-center px-4 text-center" style={{ height: '33%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
                          <div className="text-white text-xl whitespace-pre-line" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
                            {formatHeading(headingText)}
                          </div>
                        </div>
                        {/* Fase indicator */}
                        <div className="absolute bottom-1 right-2 text-white/50 text-xs" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{currentFase}</div>
                      </div>
                    );
                  })()}
                </div>
                <h3 className="text-xl mt-2 text-gray-900 text-center tracking-wide" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>Current</h3>
              </div>
            </div>

            {/* Next Display (43%) */}
            <div className="flex flex-col">
              <div>
                <div className="relative w-full aspect-[16/9] bg-black overflow-hidden rounded">
                  {renderNextPreview(nextMedia)}
                </div>
                <h3 className="text-xl mt-2 text-gray-900 text-center tracking-wide" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>Next</h3>
              </div>
            </div>

            {/* Fases (8%) */}
            <div className="space-y-3 flex flex-col">
              {phaseButtons.map((phase) => (
                <button
                  key={phase.label}
                  onClick={() => handlePhaseNavigation(phase.fases[0])}
                  className={`w-full h-24 rounded-lg text-3xl font-bold text-white transition-colors flex flex-col items-center justify-center ${phase.fases.includes(currentFase)
                    ? 'bg-orange-600 shadow-lg'
                    : 'bg-orange-400 hover:bg-orange-500'
                    }`}
                >
                  <div>{phase.label}</div>
                  <div className="text-sm font-normal opacity-90">[{phase.name}]</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const playerNames = teamService.parsePlayerNames(selectedSession.playernames);

    return (
      <div className="bg-white rounded-lg shadow-md p-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-medium text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>{selectedSession.showname || 'Game Session'} - {selectedSession.city || 'City'}</h2>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleStartRankingGame}
              className="bg-[#0A1752] text-white px-6 py-3 rounded-lg hover:bg-[#0A1752]/90 transition-colors font-bold text-lg"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Start Ranking game
            </button>
            <button
              onClick={handleBackToList}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              ← Back to List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0A1752]/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-[#0A1752]" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_players}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Players</div>
          </div>
          <div className="bg-[#0A1752]/10 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-[#0A1752]" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.nr_teams}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Teams</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-purple-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{playerNames.length}</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Named Players</div>
          </div>
          <div className="bg-pink-50 rounded-lg p-2 text-center">
            <div className="text-2xl font-bold text-pink-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Active</div>
            <div className="text-sm text-gray-600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Status</div>
          </div>
        </div>

        {selectedSession.teamname && (
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Team Name</h3>
            <p className="text-gray-700 bg-gray-50 rounded-lg p-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{selectedSession.teamname}</p>
          </div>
        )}





        {/* JSON Heading Editor */}
        <div className="mb-6 bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>JSON Heading Dashboard</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => saveHeadings({ updateMotherfile: false })}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                title="Save only to this show (PocketBase)"
              >
                Save This Show Only
              </button>
              <button
                onClick={() => saveHeadings({ updateMotherfile: true })}
                className="bg-[#0A1752] text-white px-4 py-2 rounded-lg hover:bg-[#0A1752]/90 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                title="Save to this show and update global motherfile"
              >
                Save Global (Motherfile)
              </button>
            </div>
          </div>

          {saveBanner && (
            <div className="mb-3 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              {saveBanner}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Current Fase Group:
            </label>
            <select
              value={getCurrentFaseGroup()}
              onChange={(e) => {
                const selectedGroup = e.target.value;
                const firstFase = faseGroups[selectedGroup as keyof typeof faseGroups]?.fases[0] || '01/01';
                setCurrentFase(firstFase);
              }}
              className="w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-gray-900"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
            >
              {Object.entries(faseGroups).map(([key, group]) => (
                <option key={key} value={key}>
                  Fase {key} - {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            {getFilteredFases().map((fase) => {
              // Detect if this is the first fase of a group (trailer slot) — groups 2+ only
              const groupPrefix = fase.split('/')[0];
              const isFirstInGroup = fase.endsWith('/01') && groupPrefix !== '01';
              const mediaLabel = isFirstInGroup ? '🎬 Trailer:' : 'Media:';

              return (
                <div key={fase} className={`bg-white rounded-lg p-3 border ${isFirstInGroup ? 'border-purple-300 bg-purple-50' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                        {fase} - Heading Text:
                      </label>
                      <input
                        type="text"
                        value={editingHeadings[fase]?.heading || ''}
                        onChange={(e) => handleHeadingUpdate(fase, e.target.value, editingHeadings[fase]?.image)}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-sm text-gray-900"
                        style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
                        placeholder="Enter heading text"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className={`block text-sm font-medium mb-1 ${isFirstInGroup ? 'text-purple-700 font-bold' : 'text-gray-700'}`} style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                        {mediaLabel}
                      </label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingHeadings[fase]?.image || ''}
                            onChange={(e) => handleHeadingUpdate(fase, editingHeadings[fase]?.heading || '', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] text-sm text-gray-900"
                            style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', color: '#111827' }}
                            placeholder={isFirstInGroup ? 'trailer.mp4' : 'video.mp4 or image.jpg'}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>


      </div>
    );
  }; // end of renderSessionDetails

  return (
    <div className="min-h-screen bg-gray-100 p-0" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      <div className="fixed z-[9999] text-gray-400 text-xs" style={{ fontFamily: 'monospace', bottom: '50px', left: '75px' }}>{APP_VERSION} | fase: {currentFase} | PB: {pbStatus}</div>
      <div className="w-full">
        {currentView === 'list' && (
          <div className="flex justify-end mb-8">
            <button
              onClick={() => setCurrentView('create')}
              className="bg-[#0A1752] text-white px-6 py-3 rounded-lg hover:bg-[#0A1752]/90 transition-colors font-semibold"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              + Create New Session
            </button>
          </div>
        )}

        {currentView === 'list' && (
          <RankingSessionList
            onSessionSelect={handleSessionSelect}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'create' && (
          <RankingSessionForm
            onSessionCreated={handleSessionCreated}
            onCancel={() => setCurrentView('list')}
          />
        )}

        {currentView === 'manage' && renderSessionDetails()}

        {currentView === 'game' && isClient && renderGameInterface()}
      </div>
    </div>
  );
}

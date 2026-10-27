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

const APP_VERSION = "v9.4.34";

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
  const [isResetting, setIsResetting] = useState(false);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const localWriteTs = useRef<number>(0); // timestamp of last local module state write

  // Show name and player management state
  const [sessionShowName, setSessionShowName] = useState('');
  const [showNameSaveStatus, setShowNameSaveStatus] = useState<string | null>(null);
  const [playerItems, setPlayerItems] = useState<Array<{ id: string; team: number; name: string }>>([]);
  const [activeTeamFilter, setActiveTeamFilter] = useState<number | 'all'>('all');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState<number>(1);
  const [isSavingPlayers, setIsSavingPlayers] = useState(false);
  const [playerSaveStatus, setPlayerSaveStatus] = useState<string | null>(null);

  // Auto-load latest session when view=game or fase is passed in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedFase = params.get('fase');
    const autoGame = params.get('view') === 'game' || Boolean(requestedFase);

    if (autoGame && currentView === 'list') {
      (async () => {
        try {
          const res = await fetch('/api/session-state?id=latest');
          if (res.ok) {
            const data = await res.json();
            if (data?.session) {
              setSelectedSession(data.session);
              setCurrentFase(requestedFase || data.session.current_fase || '01/01');
              setCurrentView('game');
            }
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [currentView]);

  const handleResetGameData = async () => {
    if (!selectedSession) return;
    setIsResetting(true);
    setResetStatus('Resetting...');
    try {
      // 1. Reset main session data
      const res = await fetch('/api/session-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedSession.id,
          action: 'reset_joined_players'
        }),
      });

      // 2. Clear zitten_votes specifically
      fetch(`/api/zitten-vote?sessionId=${selectedSession.id}`, { method: 'DELETE' }).catch(() => {});

      // 3. Clear endgame local storage
      try {
        localStorage.removeItem('ranking_endgame_state');
      } catch {}

      if (res.ok) {
        setSelectedSession((prev) => prev ? {
          ...prev,
          joined_players: [],
          teamleaders: {},
          top3_state: {},
          top10_state: {},
          krakende_state: {},
          endgame_state: { selectedCard: null, playbackState: 'trailer', usedCards: [], teamSelections: {} }
        } : null);
        setResetStatus('✓ Data gereset! (0 spelers / stippen / stemmen)');
        setTimeout(() => setResetStatus(null), 3000);
      } else {
        setResetStatus('Fout bij reset');
      }
    } catch (e) {
      console.error('Failed to reset game data:', e);
      setResetStatus('Fout bij reset');
    } finally {
      setIsResetting(false);
    }
  };

  // Reliable PB write with logging + retry
  const writeFaseToPB = useCallback(async (sessionId: string, fase: string) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const updateData: Record<string, unknown> = { current_fase: fase };
        if (fase === '01/01') {
          updateData.joined_players = [];
          updateData.teamleaders = {};
        }
        if (fase.startsWith('17/')) {
          const qIdx = parseInt(fase.split('/')[1] || '0', 10);
          updateData.top10_state = JSON.stringify({
            currentFase: fase,
            currentQuestion: {
              questionIndex: qIdx,
              phase: 'voting',
              votes: [],
              results: []
            }
          });
        }
        if (fase.startsWith('10/')) {
          const qIdx = parseInt(fase.split('/')[1] || '0', 10);
          updateData.top3_state = JSON.stringify({
            currentFase: fase,
            currentQuestion: {
              questionIndex: qIdx,
              phase: 'voting',
              votes: [],
              results: []
            }
          });
        }
        if (fase === '20/01') {
          const cur = (selectedSession as Record<string, unknown> | null)?.endgame_state as { usedCards?: string[] } | undefined;
          if (!cur?.usedCards?.length) {
            updateData.endgame_state = { selectedCard: null, playbackState: 'trailer', usedCards: [], teamSelections: {} };
          }
        }
        if (fase.startsWith('07/')) {
          // Immediately wipe any old counter data for this slide so new slide -> counters to zero
          fetch(`/api/zitten-vote?sessionId=${encodeURIComponent(sessionId)}&fase=${encodeURIComponent(fase)}`, {
            method: 'DELETE',
          }).catch(() => {});
        }
        await rankingService.updateSession(sessionId, updateData);
        // Also update via server-side /api/session-state to immediately bust cache for Display
        try {
          await fetch('/api/session-state', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: sessionId, data: updateData })
          });
        } catch {
          // ignore API error
        }
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

  // Ensure active session claims priority=1 so Display polls and connects to this session
  useEffect(() => {
    if (selectedSession && currentView === 'game') {
      const sess = selectedSession as unknown as Record<string, unknown>;
      if (sess.priority !== 1) {
        rankingService.updateSession(selectedSession.id, { priority: 1 }).catch(() => {});
        fetch('/api/session-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedSession.id, data: { priority: 1 } })
        }).catch(() => {});
      }
    }
  }, [currentView, selectedSession?.id]);


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
          <div className="text-sm opacity-80">Einde van de show</div>
        </div>
      );
    }
    if (!media.path) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-white px-4 text-center" style={{ backgroundColor: '#1a1a2e' }}>
          <div className="text-xs uppercase tracking-wider text-yellow-400 font-bold mb-2">Fase {media.fase} (Volgende)</div>
          <div className="text-2xl font-light whitespace-pre-line" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            {formatHeading(media.heading || '')}
          </div>
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
    '1': { name: 'Intro', fases: ['01/01', '01/02', '01/04', '01/05', '01/06', '01/07'] },
    '7': { name: 'Zitten en Staan', fases: ['07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15'] },
    '10': { name: 'De Top 3', fases: ['10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13'] },
    '13': { name: 'Krakende Karakters', fases: ['13/01', '13/02', '13/03', '13/04', '13/05'] },
    '17': { name: 'Top 10', fases: ['17/01', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14'] },
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
        const headingsObj = typeof selectedSession.headings === 'string'
          ? JSON.parse(selectedSession.headings || '{}')
          : { ...((selectedSession.headings as Record<string, unknown>) || {}) };
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

    const nextFaseKey = getNextFaseGlobal(currentFase);
    if (!nextFaseKey || nextFaseKey === currentFase) {
      return null;
    }

    // Use currently edited headings as source of truth (falls back to session JSON)
    const headings = Object.keys(editingHeadings).length
      ? editingHeadings
      : faseService.parseHeadings(selectedSession.headings || '{}');

    const item = headings[nextFaseKey] || { heading: `Fase ${nextFaseKey}`, image: '' };
    const fileName = item.image || '';
    const path = fileName ? motherfileService.fileUrl(fileName) : '';
    const isVideo = /\.(mp4|mov|avi|m4v|webm)$/i.test(path || fileName);

    return {
      type: isVideo ? ('video' as const) : ('image' as const),
      path,
      name: fileName,
      heading: item.heading || `Fase ${nextFaseKey}`,
      fase: nextFaseKey,
    };
  };


  const handleSessionSelect = async (session: RankingSession) => {
    setSelectedSession(session);
    setCurrentView('manage');
    // Load existing headings or import master template if empty
    let headings = faseService.parseHeadings(session.headings || '{}');



    setEditingHeadings(headings);
    setCurrentFase(session.current_fase || '01/01');
    setSessionShowName(session.showname || '');

    const rawList = teamService.parsePlayerNames(session.playernames || '');
    const items = rawList.map((raw, idx) => {
      const teamNum = teamService.getPlayerTeamNumber(raw) || ((idx % (session.nr_teams || 4)) + 1);
      const cleanName = teamService.getDisplayPlayerName(raw);
      return { id: `p_${idx}_${Date.now()}_${raw}`, team: teamNum, name: cleanName };
    });
    setPlayerItems(items);
  };

  const handlePlayerNameChange = (id: string, newName: string) => {
    setPlayerItems(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
  };

  const handlePlayerTeamChange = (id: string, newTeam: number) => {
    setPlayerItems(prev => prev.map(p => p.id === id ? { ...p, team: newTeam } : p));
  };

  const handleDeletePlayer = (id: string) => {
    setPlayerItems(prev => prev.filter(p => p.id !== id));
  };

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newId = `p_new_${Date.now()}`;
    setPlayerItems(prev => [...prev, { id: newId, team: newPlayerTeam, name: newPlayerName.trim() }]);
    setNewPlayerName('');
  };

  const handleSavePlayers = async () => {
    if (!selectedSession) return;
    setIsSavingPlayers(true);
    setPlayerSaveStatus('Opslaan...');
    try {
      const formatted = playerItems
        .filter(p => p.name.trim().length > 0)
        .map(p => `${p.team.toString().padStart(3, '0')} ${p.name.trim()}`)
        .join(', ');

      await rankingService.updateSession(selectedSession.id, {
        playernames: formatted,
        nr_players: playerItems.length,
      });

      setSelectedSession(prev => prev ? {
        ...prev,
        playernames: formatted,
        nr_players: playerItems.length,
      } : null);

      setPlayerSaveStatus('✓ Spelerslijst opgeslagen!');
      setTimeout(() => setPlayerSaveStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save players:', e);
      setPlayerSaveStatus('Fout bij opslaan');
    } finally {
      setIsSavingPlayers(false);
    }
  };

  const handleSaveShowName = async () => {
    if (!selectedSession || !sessionShowName.trim()) return;
    try {
      await rankingService.updateSession(selectedSession.id, {
        showname: sessionShowName.trim(),
      });
      setSelectedSession(prev => prev ? {
        ...prev,
        showname: sessionShowName.trim(),
      } : null);
      setShowNameSaveStatus('✓ Naam opgeslagen!');
      setTimeout(() => setShowNameSaveStatus(null), 3000);
    } catch (e) {
      console.error('Failed to save show name:', e);
      setShowNameSaveStatus('Fout bij opslaan');
    }
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
      '1': ['01/01', '01/02', '01/04', '01/05', '01/06', '01/07'],
      '7': ['07/01', '07/05', '07/06', '07/07', '07/08', '07/09', '07/10', '07/11', '07/12', '07/13', '07/14', '07/15'],
      '10': ['10/01', '10/05', '10/06', '10/07', '10/08', '10/09', '10/10', '10/11', '10/12', '10/13'],
      '13': ['13/01', '13/02', '13/03', '13/04', '13/05'],
      '17': ['17/01', '17/05', '17/06', '17/07', '17/08', '17/09', '17/10', '17/11', '17/12', '17/13', '17/14'],
      '20': ['20/01']
    };
    const keys: string[] = [];
    const orderedGroups = ['1', '7', '10', '13', '17', '20'];
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

    const path = motherfileService.fileUrl(fileName);
    const isVideo = /\.(mp4|mov|avi|m4v|webm)$/i.test(path || fileName);
    return {
      type: isVideo ? 'video' as const : 'image' as const,
      path,
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
  const [presenterAudio, setPresenterAudio] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('presenter_audio_enabled');
      if (saved !== null) return saved === 'true';
    }
    return true; // Default ON: MacBook is connected to amplifier/speakers!
  });

  // Global gesture unlock on presenter to ensure audio permission is active without restarting paused video
  useEffect(() => {
    const handleGesture = () => {
      const v = currentVideoRef.current;
      if (v && presenterAudio) {
        v.muted = false;
        v.volume = 1;
      }
    };
    window.addEventListener('click', handleGesture, { capture: true });
    window.addEventListener('keydown', handleGesture, { capture: true });
    return () => {
      window.removeEventListener('click', handleGesture, { capture: true });
      window.removeEventListener('keydown', handleGesture, { capture: true });
    };
  }, [presenterAudio]);

  // Play video with sound whenever currentFase changes; do NOT reset currentTime if currentFase did not change!
  const playedFaseRef = useRef<string>('');
  useEffect(() => {
    const v = currentVideoRef.current;
    if (!v) return;
    if (currentFase !== playedFaseRef.current) {
      playedFaseRef.current = currentFase;
      v.currentTime = 0;
      v.muted = !presenterAudio;
      v.volume = 1;
      v.play().catch(() => {});
    } else {
      v.muted = !presenterAudio;
      v.volume = 1;
    }
  }, [currentFase, presenterAudio]);

  const formatHeading = (text?: string) => {
    if (!text) return '';
    // Replace '/n' or '/N' tokens with new lines
    return text.replace(/\/n/gi, '\n');
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

      // In finale (20/01), ArrowRight is used inside PresenterView to return from card reveal to grid
      if (currentFase === '20/01') return;

      e.preventDefault();
      if (isNext) {
        let next = getNextFaseGlobal(currentFase);
        setCurrentFase(next);
        if (selectedSession) {
          writeFaseToPB(selectedSession.id, next);
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
      { label: '2', name: 'Zitten en Staan', fases: faseGroups['7'].fases },
      { label: '3', name: 'De Top 3', fases: faseGroups['10'].fases },
      { label: '4', name: 'Krakende Karakters', fases: faseGroups['13'].fases },
      { label: '5', name: 'Top 10', fases: faseGroups['17'].fases },
      { label: '6', name: 'De Finale', fases: faseGroups['20'].fases }
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
                {currentFase === '01/01' && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleResetGameData}
                      disabled={isResetting}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg shadow-md flex items-center gap-2 active:scale-95 transition-all text-base border border-white"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                      title="Wist alle aangemelde spelers (blauwe stippen op display) en stemmen"
                    >
                      <span>🗑️ Reset Game Data (01/01)</span>
                    </button>
                    {resetStatus && (
                      <span className="text-sm font-bold text-green-600 animate-fade-in">{resetStatus}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/test-phones"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
                  title="Open 6 test telefoons matrix in nieuw tabblad"
                >
                  📱 6 Test Phones
                </a>
                <a
                  href="/display"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 text-sm transition-all hover:scale-105 active:scale-95"
                  title="Open Display scherm in nieuw tabblad"
                >
                  🖥️ Display
                </a>
                <button
                  onClick={() => setCurrentView('manage')}
                  className="bg-gray-600 text-white px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors font-semibold text-sm"
                >
                  ← Setup
                </button>
              </div>
            </div>
          </div>

          {/* Module-specific controls (resolved from fase registry) - except 20/01 which renders in full grid below */}
          {currentFase !== '20/01' && (() => {
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
          {/* Main content grid */}
          {currentFase === '20/01' ? (
            <div className="mt-4 flex gap-4 pr-6" style={{ height: 'calc(100vh - 160px)' }}>
              <div className="flex-1 h-full rounded-2xl overflow-hidden shadow-2xl">
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
              </div>
              <div className="space-y-3 flex flex-col w-[8%] min-w-[120px]">
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
          ) : currentFase.startsWith('13/') ? (
            <div className="mt-4 flex justify-end pr-6">
              <div className="space-y-3 flex flex-col w-[8%] min-w-[120px]">
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
          ) : (
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
                            <>
                              <video
                                key={media.path}
                                ref={currentVideoRef}
                                src={media.path}
                                className="absolute inset-0 w-full h-full object-contain"
                                preload="auto"
                                autoPlay
                                muted={!presenterAudio}
                                playsInline
                                onCanPlay={(e) => {
                                  const vid = e.currentTarget;
                                  vid.muted = !presenterAudio;
                                  vid.volume = 1;
                                  if (vid.paused) {
                                    vid.play().catch(() => {});
                                  }
                                }}
                                onLoadedMetadata={(e) => {
                                  const vid = e.currentTarget;
                                  vid.muted = !presenterAudio;
                                  vid.volume = 1;
                                  if (vid.paused) {
                                    vid.play().catch(() => {});
                                  }
                                }}
                                onTimeUpdate={(e) => {
                                  const vid = e.currentTarget;
                                  if (vid.duration > 2 && vid.duration - vid.currentTime < 0.5 && !vid.paused) {
                                    vid.pause();
                                  }
                                }}
                                onEnded={(e) => {
                                  e.currentTarget.pause();
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPresenterAudio((prev) => {
                                    const next = !prev;
                                    localStorage.setItem('presenter_audio_enabled', String(next));
                                    if (currentVideoRef.current) {
                                      currentVideoRef.current.muted = !next;
                                      currentVideoRef.current.volume = 1;
                                      if (next && currentVideoRef.current.paused) {
                                        currentVideoRef.current.play().catch(() => {});
                                      }
                                    }
                                    return next;
                                  });
                                }}
                                className={`absolute top-2 right-2 z-20 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 ${
                                  presenterAudio
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-300'
                                    : 'bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/50'
                                }`}
                                title={presenterAudio ? 'Geluid speelt af via MacBook audio-uitgang naar versterker' : 'Geluid is gedempt'}
                              >
                                <span>{presenterAudio ? '🔊' : '🔇'}</span>
                                <span>{presenterAudio ? 'MacBook Audio: AAN' : 'MacBook Audio: UIT'}</span>
                              </button>
                            </>
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
          )}
        </div>
      </div>
    );
  };

  const renderSessionDetails = () => {
    if (!selectedSession) return null;

    const playerNames = teamService.parsePlayerNames(selectedSession.playernames);

    return (
      <div className="bg-white rounded-lg shadow-md p-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Show Naam:</label>
              {showNameSaveStatus && <span className="text-xs font-bold text-green-600 animate-fade-in">{showNameSaveStatus}</span>}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sessionShowName}
                onChange={(e) => setSessionShowName(e.target.value)}
                className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-3 py-1 bg-white hover:border-[#0A1752] focus:border-[#0A1752] focus:ring-2 focus:ring-[#0A1752]/20 outline-none transition-all min-w-[260px]"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                placeholder="Voer show naam in"
              />
              <button
                onClick={handleSaveShowName}
                className="bg-[#0A1752] hover:bg-[#0A1752]/90 text-white text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                title="Sla show naam op in PocketBase"
              >
                Opslaan
              </button>
              <span className="text-gray-500 text-sm ml-2">({selectedSession.city || 'Stad'})</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleResetGameData}
              disabled={isResetting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-bold transition-colors border border-white text-base shadow-sm"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              title="Wist alle aangemelde spelers (blauwe stippen op display) en stemmen"
            >
              {isResetting ? 'Resetting...' : '🗑️ Reset Game Data'}
            </button>
            {resetStatus && (
              <span className="text-sm font-bold text-green-600 animate-fade-in">{resetStatus}</span>
            )}
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





        {/* Player Management Card */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-3 border-b border-gray-200">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                👥 Spelerslijst Beheer
                <span className="text-sm font-normal text-gray-500">({playerItems.length} spelers)</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pas namen aan, verwijder spelers of voeg nieuwe toe. Klik op &quot;Spelerslijst Opslaan&quot; om te synchroniseren.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {playerSaveStatus && (
                <span className="text-sm font-bold text-green-600 animate-fade-in">{playerSaveStatus}</span>
              )}
              <button
                onClick={handleSavePlayers}
                disabled={isSavingPlayers}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center gap-2"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                💾 {isSavingPlayers ? 'Bezig met opslaan...' : 'Spelerslijst Opslaan'}
              </button>
            </div>
          </div>

          {/* Add Player Bar */}
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <span className="text-sm font-semibold text-gray-700">Nieuwe speler:</span>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPlayer(); }}
              placeholder="Spelersnaam..."
              className="flex-1 min-w-[160px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#0A1752] focus:border-[#0A1752] outline-none"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Team:</span>
              <select
                value={newPlayerTeam}
                onChange={(e) => setNewPlayerTeam(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                {Array.from({ length: selectedSession.nr_teams || 4 }, (_, i) => i + 1).map((t) => (
                  <option key={t} value={t}>Team {t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddPlayer}
              className="bg-[#0A1752] hover:bg-[#0A1752]/90 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors shadow-sm"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              + Toevoegen
            </button>
          </div>

          {/* Team Filter Tabs */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setActiveTeamFilter('all')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTeamFilter === 'all'
                ? 'bg-[#0A1752] text-white shadow-sm'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Alle ({playerItems.length})
            </button>
            {Array.from({ length: selectedSession.nr_teams || 4 }, (_, i) => i + 1).map((t) => {
              const count = playerItems.filter(p => p.team === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setActiveTeamFilter(t)}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${activeTeamFilter === t
                    ? 'bg-[#0A1752] text-white shadow-sm'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                >
                  Team {t} ({count})
                </button>
              );
            })}
          </div>

          {/* Player Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[380px] overflow-y-auto p-1 bg-white rounded-lg border border-gray-200">
            {playerItems
              .filter(p => activeTeamFilter === 'all' || p.team === activeTeamFilter)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 p-2 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <select
                      value={p.team}
                      onChange={(e) => handlePlayerTeamChange(p.id, Number(e.target.value))}
                      className="px-1.5 py-0.5 text-xs font-bold bg-[#0A1752] text-white rounded cursor-pointer border-none outline-none"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                      title="Wijzig team"
                    >
                      {Array.from({ length: selectedSession.nr_teams || 4 }, (_, i) => i + 1).map((t) => (
                        <option key={t} value={t}>T{t}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handlePlayerNameChange(p.id, e.target.value)}
                      className="w-full px-2 py-1 text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded focus:border-[#0A1752] focus:ring-1 focus:ring-[#0A1752] outline-none"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                    />
                  </div>
                  <button
                    onClick={() => handleDeletePlayer(p.id)}
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors text-sm"
                    title="Verwijder speler"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            {playerItems.length === 0 && (
              <div className="col-span-full text-center py-6 text-gray-400 text-sm">
                Geen spelers in deze lijst. Voeg er een toe met de balk hierboven.
              </div>
            )}
          </div>
        </div>

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

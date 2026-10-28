'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';
import { rankingService, teamService, faseService, motherfileService, MotherfileFases } from '@/lib/pocketbase';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';
import { safeJsonStr } from '@/lib/jsonUtils';

const APP_VERSION = 'v9.4.43';

function getPlayerStorageKey(baseKey: string): string {
  if (typeof window === 'undefined') return baseKey;
  const slot = new URLSearchParams(window.location.search).get('slot');
  return slot ? `${baseKey}_slot${slot}` : baseKey;
}

interface RankingSession {
  id: string;
  gamename: string;
  city: string;
  playernames: string;
  nr_teams: number;
  nr_players: number;
  photocircle: string;
  headings: string; // JSON string for fase headings
  current_fase: string; // Current fase (e.g., "01/00")
  [key: string]: unknown;
}

// Extracted TypewriterHeading to avoid re-definition on every render
const TypewriterHeading = ({ lines, visible, animate, onStart, onDone }: { lines: string[]; visible: boolean; animate: boolean; onStart?: () => void; onDone?: () => void }) => {
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [lastLines, setLastLines] = useState<string[]>([]);

  useEffect(() => {
    // Do not reset on visibility changes; only re-run when lines actually change.
    if (!visible) {
      return;
    }

    // Check if lines have actually changed
    const linesChanged = JSON.stringify(lines) !== JSON.stringify(lastLines);

    // If lines changed, reset animation
    if (linesChanged) {
      setLastLines(lines);
      if (animate) {
        if (onStart) onStart();
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsTyping(true);
        setHasAnimated(false);
      } else {
        setDisplayedLines(lines);
        setIsTyping(false);
        setHasAnimated(true);
      }
      return;
    }

    // If already animated or animation disabled, just show the complete text
    if (hasAnimated || !animate) {
      setDisplayedLines(lines);
      setIsTyping(false);
      return;
    }

    if (currentLineIndex >= lines.length) {
      setIsTyping(false);
      setHasAnimated(true);
      if (onDone) onDone();
      return;
    }

    const currentLine = lines[currentLineIndex];
    if (currentCharIndex <= currentLine.length) {
      const timer = setTimeout(() => {
        setDisplayedLines(prev => {
          const newLines = [...prev];
          newLines[currentLineIndex] = currentLine.slice(0, currentCharIndex);
          return newLines;
        });
        setCurrentCharIndex(prev => prev + 1);
      }, 50); // Typewriter speed

      return () => clearTimeout(timer);
    } else {
      // Move to next line
      const timer = setTimeout(() => {
        setCurrentLineIndex(prev => prev + 1);
        setCurrentCharIndex(0);
      }, 300); // Pause between lines

      return () => clearTimeout(timer);
    }
  }, [visible, currentLineIndex, currentCharIndex, hasAnimated, lastLines, lines, animate, onStart, onDone]);

  return (
    <div
      className={`transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'
        }`}
    >
      {displayedLines.map((line, index) => (
        <div key={index} className="text-3xl text-white text-center leading-tight"
          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 400 }}>
          {line}
          {index === currentLineIndex && isTyping && (
            <span className="animate-pulse">|</span>
          )}
        </div>
      ))}
    </div>
  );
};

// Memoized version
const MemoTypewriterHeading = React.memo(
  TypewriterHeading,
  (prevProps, nextProps) => (
    JSON.stringify(prevProps.lines) === JSON.stringify(nextProps.lines) && prevProps.visible === nextProps.visible && prevProps.animate === nextProps.animate
  )
);

export default function PlayerPage() {
  const [teamNumber, setTeamNumber] = useState('');
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Player onboarding flow states
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'team' | 'team_wait' | 'name' | 'intro_step' | 'teamleader' | 'complete'>('team');
  const [, setPlayerData] = useState<{ teamNumber: string, playerName: string } | null>(null);
  const [votedTeamLeader, setVotedTeamLeader] = useState<string | null>(null);

  // Dynamic heading states
  const [currentHeading, setCurrentHeading] = useState<string[]>([]);
  const [headingVisible, setHeadingVisible] = useState(true);
  const [motherfile, setMotherfile] = useState<MotherfileFases | null>(null);
  const fadeDurationMs = 1000; // 1s fade for heading transitions

  // Generic module states (keyed by stateField name)
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});

  // Ensure teamMembers is kept in sync with teamNumber and session player names
  useEffect(() => {
    if (teamNumber && currentSession?.playernames) {
      const playerNames = teamService.parsePlayerNames(currentSession.playernames);
      const teamAssignments = teamService.generateTeamAssignments(playerNames, currentSession.nr_teams || 1);
      const members = teamAssignments[parseInt(teamNumber)] || [];
      setTeamMembers(members);
    }
  }, [teamNumber, currentSession?.playernames, currentSession?.nr_teams]);

  // Follow presenter lead during intro fases (01/01 to 01/07) and auto-switch to game when leaving 01
  useEffect(() => {
    if (!currentSession?.current_fase) return;
    const fase = currentSession.current_fase;

    if (fase === '01/01') {
      if (selectedPlayerName) {
        if (currentPhase !== 'name' && currentPhase !== 'complete') {
          setCurrentPhase('name');
        }
      } else if (teamNumber) {
        // Player confirmed team on 01/01 -> show waiting screen (no names to accidentally double-click)
        if (currentPhase !== 'team_wait') {
          setCurrentPhase('team_wait');
        }
      } else {
        if (currentPhase !== 'team') {
          setCurrentPhase('team');
        }
      }
    } else if (fase === '01/02' || fase === '01/03') {
      if (selectedPlayerName) {
        if (currentPhase !== 'name' && currentPhase !== 'complete') {
          setCurrentPhase('name');
        }
      } else if (teamNumber) {
        // Quizmaster asks "Wat is jouw naam?" -> unlock name selection!
        if (currentPhase !== 'name') {
          setCurrentPhase('name');
        }
      } else {
        if (currentPhase !== 'team') {
          setCurrentPhase('team');
        }
      }
    } else if (fase === '01/04' || fase === '01/05' || fase === '01/06') {
      setCurrentPhase('intro_step');
    } else if (fase === '01/07') {
      setCurrentPhase('teamleader');
    } else {
      // Game phases (07/*, 10/*, 13/*, 17/*, 20/*)
      setCurrentPhase('complete');
    }
  }, [currentSession?.current_fase, teamNumber, selectedPlayerName, currentPhase]);

  // Load PocketBase session based on URL code or latest
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        const sessions = await rankingService.getAllSessions();
        if (sessions && sessions.length > 0) {
          let selectedSession = sessions[0] as unknown as RankingSession;

          if (code) {
            const found = sessions.find(s => s.id === code || s.id.startsWith(code));
            if (found) selectedSession = found as unknown as RankingSession;
          }

          setCurrentSession(selectedSession);
        }
      } catch (error) {
        console.error('Failed to load session data (PocketBase):', error);
      }
    };
    loadSessionData();
  }, []);

  // Load headings from session data (motherfile API was removed)
  useEffect(() => {
    if (!currentSession) return;
    try {
      const headingsJson = (currentSession.headings as string) || '{}';
      const parsed = faseService.parseHeadings(headingsJson);
      if (Object.keys(parsed).length > 0) {
        setMotherfile(parsed);
      } else {
        // Fallback to built-in defaults
        setMotherfile(faseService.parseHeadings(faseService.createDefaultHeadings()));
      }
    } catch (err) {
      console.error('Error parsing session headings:', err);
      setMotherfile({
        '01/01': { heading: 'In welk team zit je?' },
        '01/02': { heading: 'Wat is jouw naam?' },
        '01/03': { heading: 'Wat is jouw naam?' }
      });
    }
  }, [currentSession]);

  // Hook for test phones auto-login and real player localStorage persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);

      // Support quick URL reset (?reset, ?reset=1, ?reset=true) for testing
      if (params.has('reset')) {
        console.log('[Player] Quick reset triggered via URL parameter (?reset)');
        try {
          localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
          localStorage.removeItem(getPlayerStorageKey('rankingSessionId'));
          localStorage.removeItem('krakende_pos_choice');
          localStorage.removeItem('krakende_neg_choice');
          localStorage.removeItem('me_player_data');
        } catch (e) {
          console.warn('[Player] Error clearing localStorage:', e);
        }
        setTeamNumber('');
        setSelectedPlayerName('');
        setTeamMembers([]);
        setShowTeamInfo(false);
        setVotedTeamLeader(null);
        setCurrentPhase('team');

        // Remove ?reset parameter from URL cleanly without page reload
        params.delete('reset');
        const remainingQuery = params.toString() ? `?${params.toString()}` : '';
        window.history.replaceState({}, '', `${window.location.pathname}${remainingQuery}`);
        setIsInitializing(false);
        return;
      }

      const testName = params.get('testName');
      const testTeam = params.get('testTeam');
      if (testName && testTeam) {
        setTeamNumber(testTeam);
        setSelectedPlayerName(testName);
        setShowTeamInfo(true);
        setCurrentPhase('complete');
        setIsInitializing(false);
        return; // Skip localStorage for test accounts
      }

      // Load real player from localStorage (skipped on 01/01 so phone always starts fresh)
      const isFase0101 = currentSession?.current_fase === '01/01';
      if (isFase0101) {
        try {
          localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
          localStorage.removeItem('krakende_pos_choice');
          localStorage.removeItem('krakende_neg_choice');
          localStorage.removeItem('me_player_data');
        } catch (e) {}
      }

      const savedStr = isFase0101 ? null : localStorage.getItem(getPlayerStorageKey('rankingPlayerData'));
      let currentPlayerData = null;

      if (savedStr) {
        try {
          currentPlayerData = JSON.parse(savedStr);
          if (currentPlayerData.playerName && currentPlayerData.teamNumber) {
            setTeamNumber(currentPlayerData.teamNumber);
            setSelectedPlayerName(currentPlayerData.playerName);
            setShowTeamInfo(true);
            setCurrentPhase('complete');
          }
        } catch (e) { }
      }

      // Ensure persistent unique playerId (UUID-like)
      if (!currentPlayerData?.playerId) {
        const newId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        const data = { ...currentPlayerData, playerId: newId };
        localStorage.setItem(getPlayerStorageKey('rankingPlayerData'), JSON.stringify(data));
      }
      // Finished loading session state from localStorage
      setIsInitializing(false);
    }
  }, [currentSession?.current_fase]);

  // Effect to handle session change invalidation and automatic 01/01 reset
  useEffect(() => {
    if (!currentSession || typeof window === 'undefined') return;

    // Auto-clear player data whenever on 01/01
    if (currentSession.current_fase === '01/01') {
      try {
        localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
        localStorage.removeItem('krakende_pos_choice');
        localStorage.removeItem('krakende_neg_choice');
        localStorage.removeItem('me_player_data');
      } catch (e) {}
      if (currentPhase === 'complete') {
        setTeamNumber('');
        setSelectedPlayerName('');
        setTeamMembers([]);
        setShowTeamInfo(false);
        setCurrentPhase('team');
      }
    }

    const lastSessionId = localStorage.getItem(getPlayerStorageKey('rankingSessionId'));
    if (lastSessionId && lastSessionId !== currentSession.id) {
      console.log('New game session detected. Clearing player data.');
      localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
      setTeamNumber('');
      setSelectedPlayerName('');
      setTeamMembers([]);
      setShowTeamInfo(false);
      setCurrentPhase('team');
    }
    localStorage.setItem(getPlayerStorageKey('rankingSessionId'), currentSession.id);
  }, [currentSession]);

  // Track which heading keys have animated, so we never animate the same content twice
  const animatedKeysRef = useRef<Set<string>>(new Set());
  const startedKeysRef = useRef<Set<string>>(new Set());
  const [currentHeadingKey, setCurrentHeadingKey] = useState<string>('');
  const [welcomePopupFadingOut, setWelcomePopupFadingOut] = useState(false);

  // Update heading when phase or motherfile changes – guard to avoid redundant updates
  const lastHeadingRef = useRef<string>('');
  useEffect(() => {
    if (!motherfile) return;
    // For onboarding phases, use fixed text
    let faseKey = '';
    if (currentPhase === 'intro') faseKey = ''; // Handled manually
    if (currentPhase === 'team') faseKey = ''; // Handled manually
    if (currentPhase === 'name') faseKey = ''; // Handled manually
    if (currentPhase === 'teamleader') faseKey = ''; // Handled manually

    if (!faseKey && currentPhase === 'complete' && currentSession?.current_fase?.startsWith('01/')) {
      faseKey = currentSession.current_fase;
    }
    if (!faseKey) return;
    try {
      const headingText = faseService.getCurrentHeading(JSON.stringify(motherfile), faseKey);
      const formatted = faseService.formatHeadingText(headingText || '');
      const hash = JSON.stringify(formatted || []);
      if (hash !== lastHeadingRef.current) {
        lastHeadingRef.current = hash;
        setCurrentHeading(formatted && formatted.length ? formatted : ['']);
        setCurrentHeadingKey(`${faseKey}:${hash}`);
      }
    } catch (e) {
      console.error('Failed to parse heading from motherfile', e);
    }
  }, [currentPhase, motherfile, currentSession?.current_fase]);

  // Helper to advance phases with fade-out/in of heading
  const advancePhase = (next: typeof currentPhase) => {
    setHeadingVisible(false);
    setTimeout(() => {
      setCurrentPhase(next);
      // Allow Typewriter to mount new text, then fade in
      requestAnimationFrame(() => {
        setHeadingVisible(true);
      });
    }, fadeDurationMs);
  };

  const handleTeamSubmit = () => {
    if (!teamNumber || !currentSession) return;

    setIsLoading(true);

    // Get team assignments from prefixed player names (rock-solid approach)
    const playerNames = teamService.parsePlayerNames(currentSession.playernames);
    const teamAssignments = teamService.generateTeamAssignments(playerNames, currentSession.nr_teams || 1);

    const selectedTeamMembers = teamAssignments[parseInt(teamNumber)] || [];

    setTeamMembers(selectedTeamMembers);

    if (typeof window !== 'undefined') {
      try {
        const saved = JSON.parse(localStorage.getItem(getPlayerStorageKey('rankingPlayerData')) || '{}');
        localStorage.setItem(getPlayerStorageKey('rankingPlayerData'), JSON.stringify({ ...saved, teamNumber }));
      } catch {}
    }

    setIsLoading(false);

    // If session is on 01/01, wait until quizmaster asks "Wat is jouw naam?" (01/02)
    // This stops rapid taps from accidentally double-clicking player names!
    if (currentSession.current_fase === '01/01') {
      advancePhase('team_wait');
    } else {
      advancePhase('name');
    }
  };

  // Poll session state via cached server proxy (no direct PB connections from phones)
  useEffect(() => {
    if (!currentSession) return;
    const sessionId = currentSession.id;

    const parseModuleStates = (data: Record<string, unknown>) => {
      Object.values(FASES).forEach((mod) => {
        const sf = mod.stateField;
        if (!sf) return;
        const str = safeJsonStr(data[sf]);
        if (str) setModuleStates((prev) => (prev[sf] === str ? prev : { ...prev, [sf]: str }));
      });
    };

    parseModuleStates(currentSession as Record<string, unknown>);

    let active = true;
    const poll = async () => {
      if (!active) return;
      try {
        // If the player scanned a specific game QR, stick to it. If they just went to /player, track the latest show!
        const params = new URLSearchParams(window.location.search);
        const pollId = params.get('code') ? sessionId : 'latest';

        const res = await fetch(`/api/session-state?id=${encodeURIComponent(pollId)}`);
        if (!active || !res.ok) return;
        const { session: fresh } = await res.json();
        if (!active || !fresh) return;

        // Handle full session replacement if a new game took over the 'latest' slot
        if (fresh.id !== currentSession.id) {
          setCurrentSession(fresh);
          return;
        }

        parseModuleStates(fresh as Record<string, unknown>);
        setCurrentSession((prev: RankingSession | null) => {
          if (!prev) return fresh;
          const prevJoined = JSON.stringify(prev.joined_players || []);
          const freshJoined = JSON.stringify(fresh.joined_players || []);
          const prevLeaders = JSON.stringify((prev as Record<string, unknown>).teamleaders || {});
          const freshLeaders = JSON.stringify((fresh as Record<string, unknown>).teamleaders || {});
          
          if (fresh.current_fase === '01/01' && prev.current_fase !== '01/01') {
            try {
              localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
              localStorage.removeItem('krakende_pos_choice');
              localStorage.removeItem('krakende_neg_choice');
              localStorage.removeItem('me_player_data');
            } catch (e) {}
            setTeamNumber('');
            setSelectedPlayerName('');
            setTeamMembers([]);
            setShowTeamInfo(false);
            setVotedTeamLeader(null);
            setCurrentPhase('team');
          }

          if (
            prev.current_fase === fresh.current_fase &&
            prevJoined === freshJoined &&
            prevLeaders === freshLeaders
          ) {
            return prev;
          }
          return {
            ...prev,
            ...fresh,
          };
        });
      } catch { /* silent */ }
    };
    const timer = setInterval(poll, 1000);
    poll();

    return () => { active = false; clearInterval(timer); };
  }, [currentSession?.id]);

  // Fade out and close the welcome popup (1s)
  const closeWelcomePopup = () => {
    setWelcomePopupFadingOut(true);
    setTimeout(() => {
      setShowWelcomePopup(false);
      setWelcomePopupFadingOut(false);
    }, 1000);
  };

  const handleManualReset = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(getPlayerStorageKey('rankingPlayerData'));
        localStorage.removeItem(getPlayerStorageKey('rankingSessionId'));
        localStorage.removeItem('krakende_pos_choice');
        localStorage.removeItem('krakende_neg_choice');
        localStorage.removeItem('me_player_data');
      } catch (e) {
        console.warn('[Player] Error clearing localStorage:', e);
      }
      setTeamNumber('');
      setSelectedPlayerName('');
      setTeamMembers([]);
      setShowTeamInfo(false);
      setVotedTeamLeader(null);
      setCurrentPhase('team');
      window.location.reload();
    }
  };

  const submitTeamLeaderVote = async (leaderName: string) => {
    if (!currentSession) return;
    const clean = (n: string) => (n || '').replace(/^\d+[\s_-]*/, '').trim().toLowerCase();
    if (selectedPlayerName && clean(leaderName) === clean(selectedPlayerName)) {
      console.warn('Cannot vote for yourself as team leader');
      return;
    }
    setVotedTeamLeader(leaderName);

    try {
      // Fetch fresh vote state via server API
      const freshRes = await fetch(`/api/session-state?id=${currentSession.id}`);
      const freshJson = await freshRes.json();
      // teamleaders is a JSON-type field in PocketBase — read as object directly
      const currentVotes: Record<string, Record<string, number>> =
        (freshJson?.session?.teamleaders as Record<string, Record<string, number>>) || {};

      const teamKey = `team_${teamNumber}`;
      if (!currentVotes[teamKey]) currentVotes[teamKey] = {};
      if (!currentVotes[teamKey][leaderName]) currentVotes[teamKey][leaderName] = 0;
      currentVotes[teamKey][leaderName] += 1;

      // Write back as actual object — PocketBase JSON field requires an object, not a string
      await fetch('/api/session-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentSession.id, data: { teamleaders: currentVotes } }),
      });
    } catch (e) {
      console.error('Failed to save team leader vote', e);
    }
  };

  const handleNameSelection = async (name: string) => {
    setSelectedPlayerName(name);
    // Store in localStorage for persistence
    const savedStr = localStorage.getItem(getPlayerStorageKey('rankingPlayerData'));
    let existing = {};
    try { existing = JSON.parse(savedStr || '{}'); } catch (e) { }
    const data = {
      ...existing,
      teamNumber,
      playerName: name
    };
    setPlayerData(data as any);
    localStorage.setItem(getPlayerStorageKey('rankingPlayerData'), JSON.stringify(data));

    // Register this player on the server session so the display shows the blue dot
    if (currentSession?.id) {
      try {
        await fetch('/api/session-state', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: currentSession.id,
            action: 'join_player',
            playerName: name
          }),
        });
      } catch (err) {
        console.warn('Failed to notify server of player join:', err);
      }
    }
  };

  // Render module PlayerView if a registered fase module matches the current fase
  // Always render game modules (outside 01/) so players are never locked out
  if (currentSession?.current_fase && (!currentSession.current_fase.startsWith('01/') || currentPhase === 'complete')) {
    const mod = findFaseModule(currentSession.current_fase);
    if (mod?.PlayerView) {
      const allPlayerNames = teamService.parsePlayerNames(currentSession.playernames as string);
      const headingsJson = currentSession.headings as string || '{}';
      const heading = faseService.getCurrentHeading(headingsJson, currentSession.current_fase) || '';
      let imageName = faseService.getCurrentImage(headingsJson, currentSession.current_fase) || '';



      const mediaUrl = imageName ? motherfileService.fileUrl(imageName) : '';

      let savedPlayerId: string | null = null;
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(getPlayerStorageKey('rankingPlayerData'));
          if (raw) savedPlayerId = JSON.parse(raw)?.playerId || null;
        } catch {
          savedPlayerId = null;
        }
      }

      return (
        <mod.PlayerView
          faseKey={currentSession.current_fase}
          sessionId={currentSession.id}
          moduleStateJson={mod.stateField ? moduleStates[mod.stateField] : undefined}
          onModuleStateJson={(json) => { if (mod.stateField) setModuleStates((prev) => ({ ...prev, [mod.stateField!]: json })); }}
          heading={heading}
          mediaUrl={mediaUrl}
          playerInfo={{
            playerId: savedPlayerId || selectedPlayerName || `anon_${teamNumber}`,
            playerName: selectedPlayerName || 'Speler',
            teamNumber: parseInt(teamNumber) || 0,
          }}
          allPlayerNames={allPlayerNames}
        />
      );
    }
  }

  // Prevent flash of onboarding screens if localStorage is still being checked
  if (isInitializing) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex items-center justify-center text-white text-xl"
        style={{
          fontFamily: 'Barlow Semi Condensed, sans-serif',
          background: 'linear-gradient(135deg, #0d0814 0%, #1a0a26 30%, #260c18 60%, #170709 85%, #08060a 100%)'
        }}
      >
        <div className="animate-pulse text-orange-400 font-bold">Even geduld...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden text-white"
      style={{
        fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
        background: 'linear-gradient(135deg, #0d0814 0%, #1a0a26 30%, #260c18 60%, #170709 85%, #08060a 100%)'
      }}
    >
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;500;600;700;800;900&display=swap"
      />
      <div
        onClick={() => {
          if (window.confirm('Reset iPhone local storage for this session?')) {
            handleManualReset();
          }
        }}
        className="fixed z-[9999] text-white/40 text-xs cursor-pointer select-none active:opacity-100 hover:text-white"
        style={{ fontFamily: 'monospace', bottom: '20px', left: '100px' }}
        title="Tap to reset player data"
      >
        {APP_VERSION} | {currentSession?.current_fase || ''}
      </div>
      {/* 12-Section Grid Container */}
      <div className="h-screen grid grid-rows-12 gap-0 relative z-10">

        {/* Sections 1-3: Logo Background + Logo Overlay - Sticky Header */}
        <div
          className="row-span-3 relative bg-cover bg-center bg-no-repeat sticky top-0 z-50 sticky-header flex items-center justify-center py-2"
          style={{
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '120px'
          }}
        >
          <CreepyRankingLogo />
        </div>

        {/* Sections 4-5: Dynamic Heading with Typewriter Animation */}
        <div className="row-span-2 flex items-center justify-center px-4">
          <MemoTypewriterHeading
            lines={
              currentPhase === 'team'
                ? ['In welk team zit je?']
                : currentPhase === 'team_wait'
                ? [`Team ${teamNumber} gekozen!`, 'Wacht op quizmaster...']
                : currentPhase === 'name'
                ? (selectedPlayerName ? [`Welkom ${selectedPlayerName}!`, 'Je zit in:'] : ['Hoe heet je ?'])
                : currentPhase === 'teamleader' || currentSession?.current_fase === '01/07'
                ? ['Wie is jullie', 'Teamleider?']
                : currentSession?.current_fase === '01/01'
                ? ['In welk team zit je?']
                : currentSession?.current_fase === '01/02' || currentSession?.current_fase === '01/03'
                ? (selectedPlayerName ? [`Welkom ${selectedPlayerName}!`, 'Je zit in:'] : ['Hoe heet je ?'])
                : currentSession?.current_fase === '01/04'
                ? ['Wat wordt jullie', 'Teamnaam?']
                : currentSession?.current_fase === '01/05'
                ? ['Wat wordt jullie Teamyell?', 'Kort maar Krachtig']
                : currentSession?.current_fase === '01/06'
                ? ['Maak een selfie Video', 'en zet die in de Photo App']
                : (currentPhase === 'complete' && currentSession?.current_fase?.startsWith('01/'))
                ? ['Heel veel plezier vandaag', 'met de show!']
                : currentHeading
            }
            visible={headingVisible}
            animate={true}
          />
        </div>

        {/* Sections 6-12: Team Selection Buttons & Actions */}
        {currentPhase === 'team' && (
          <div className="row-span-7 flex flex-col items-center justify-center px-4 py-2 gap-4">
            {(() => {
              const nrTeams = Math.max(1, currentSession?.nr_teams || 4);
              const teams = Array.from({ length: nrTeams }, (_, i) => i + 1);

              let gridCols = 'grid-cols-2 gap-4 max-w-[260px]';
              let badgeSize = 'w-24 h-24 text-5xl border-[6px]';
              if (nrTeams > 4 && nrTeams <= 6) {
                gridCols = 'grid-cols-3 gap-3 max-w-[300px]';
                badgeSize = 'w-20 h-20 text-4xl border-[5px]';
              } else if (nrTeams > 6 && nrTeams <= 8) {
                gridCols = 'grid-cols-4 gap-2.5 max-w-[320px]';
                badgeSize = 'w-16 h-16 text-3xl border-[4px]';
              } else if (nrTeams > 8) {
                gridCols = 'grid-cols-4 sm:grid-cols-5 gap-2 max-w-[340px]';
                badgeSize = 'w-14 h-14 text-2xl border-[3px]';
              }

              return (
                <>
                  <div className={`grid ${gridCols} w-full place-items-center`}>
                    {teams.map((t) => {
                      const isSelected = teamNumber === String(t);
                      return (
                        <button
                          key={t}
                          onClick={() => setTeamNumber(String(t))}
                          className={`rounded-full flex items-center justify-center font-bold transition-all active:scale-95 shadow-xl ${
                            isSelected
                              ? 'bg-yellow-50 border-black ring-4 ring-yellow-400 scale-105'
                              : 'bg-white border-black hover:scale-105'
                          } ${badgeSize}`}
                          style={{
                            fontFamily: 'Barlow Semi Condensed, sans-serif',
                            color: '#ec4899',
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm & Go Back / Change controls */}
                  <div className="w-full max-w-xs flex flex-col items-center gap-2 mt-2 min-h-[85px] justify-center">
                    {teamNumber ? (
                      <>
                        <button
                          onClick={handleTeamSubmit}
                          disabled={isLoading}
                          className="w-full py-3 px-6 rounded-full text-2xl font-bold bg-[#0A1752] text-white border-2 border-white shadow-xl active:scale-95 transition-all animate-scale-in flex items-center justify-center hover:bg-[#08134A]"
                          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                        >
                          Bevestig Team {teamNumber}
                        </button>
                        <button
                          onClick={() => setTeamNumber('')}
                          className="text-white/80 hover:text-white underline text-sm font-semibold tracking-wide active:opacity-75 transition-all"
                          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                        >
                          Kies een ander team
                        </button>
                      </>
                    ) : (
                      <p
                        className="text-white/70 text-sm font-medium tracking-wide text-center"
                        style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                      >
                        Tik op jouw teamnummer
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Waiting for Quizmaster to advance to "Wat is jouw naam?" (Fase 01/02) */}
        {currentPhase === 'team_wait' && (
          <div className="row-span-7 flex flex-col items-center justify-center px-4 py-2 gap-4 text-center">
            <div className="bg-white/20 backdrop-blur-md px-6 py-6 rounded-2xl border-2 border-white/40 shadow-xl text-white max-w-xs w-full animate-fade-in flex flex-col items-center">
              <div
                className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg mb-3"
                style={{ border: '8px solid black' }}
              >
                <span className="text-5xl font-bold text-pink-500" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                  {teamNumber}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Team {teamNumber} bevestigd!
              </div>
              <p className="text-white/90 text-sm font-medium mb-5 leading-relaxed" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Wacht tot de quizmaster vraagt:<br />
                <span className="text-yellow-300 font-bold text-base">&quot;Wat is jouw naam?&quot;</span>
              </p>
              <button
                onClick={() => {
                  setTeamNumber('');
                  setTeamMembers([]);
                  advancePhase('team');
                }}
                className="text-white/80 hover:text-white underline text-xs font-semibold active:opacity-75 transition-all"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                ← Kies een ander team
              </button>
            </div>
          </div>
        )}

        {/* Intro steps (Teamnaam, Teamyell, Selfie) */}
        {currentPhase === 'intro_step' && (
          <div className="row-span-6 flex flex-col items-center justify-center px-4 text-center">
            <div className="bg-white/20 backdrop-blur-md px-6 py-5 rounded-2xl border-2 border-white/40 shadow-xl text-white max-w-xs w-full animate-fade-in flex flex-col items-center">
              <div className="text-3xl font-black tracking-wide">
                {teamNumber ? `Team ${teamNumber}` : 'Jouw Team'}
              </div>
              {selectedPlayerName && (
                <div className="text-xl font-semibold opacity-95 mt-1">{selectedPlayerName}</div>
              )}
              {currentSession?.current_fase === '01/06' ? (
                <div className="w-full flex flex-col items-center mt-3 pt-3 border-t border-white/20 gap-3">
                  {(() => {
                    let photoShowId = currentSession?.id || '';
                    if (currentSession?.photocircle) {
                      if (currentSession.photocircle.includes('showId=')) {
                        const m = currentSession.photocircle.match(/showId=([a-zA-Z0-9]+)/);
                        if (m) photoShowId = m[1];
                      } else if (!currentSession.photocircle.includes('http') && currentSession.photocircle.trim().length > 5) {
                        photoShowId = currentSession.photocircle.trim();
                      }
                    }
                    const photoAppHref = `https://www.pinkmilk.eu/phone/media.html?showId=${photoShowId}&playerName=${encodeURIComponent(selectedPlayerName || '')}&team=${teamNumber || '1'}`;
                    return (
                      <div className="w-full flex flex-col items-center gap-2">
                        <a
                          href={photoAppHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 px-4 rounded-full bg-[#0A1752] text-white font-bold border-2 border-white shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:bg-[#08134A] transition-all text-xl"
                          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                        >
                          <span>Photo App [ {teamNumber ? `Team ${teamNumber}` : 'Jouw Team'} ]</span>
                          <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <div className="mt-1 text-white/95 text-sm font-bold leading-snug drop-shadow" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                          Vergeet niet om filmpjes en foto&apos;s te delen.
                        </div>
                        <div className="text-yellow-300 text-xs font-bold drop-shadow tracking-wide" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                          [ vooral van de quizmaster want die tellen dubbel ]
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-sm opacity-80 mt-3 font-normal border-t border-white/20 pt-2">
                  Overleg nu met je teamgenoten!
                </div>
              )}
              <button
                onClick={() => {
                  setTeamNumber('');
                  setSelectedPlayerName('');
                  setTeamMembers([]);
                  setShowTeamInfo(false);
                  advancePhase('team');
                }}
                className="mt-3 text-white/80 hover:text-white underline text-xs font-semibold active:opacity-75 transition-all"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                ← Kies een ander team / naam
              </button>
            </div>
          </div>
        )}

        {/* Sections 6-12: Team Members Display (Name & Teamleader selection) */}
        <div className="row-span-7 overflow-hidden w-full flex flex-col px-2 pt-1">
          {(currentPhase === 'name' || currentPhase === 'teamleader' || currentSession?.current_fase === '01/07') && (!teamNumber || teamMembers.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white text-center">
              <p className="text-lg font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Geen team geselecteerd
              </p>
              <button
                onClick={() => {
                  setTeamNumber('');
                  setTeamMembers([]);
                  advancePhase('team');
                }}
                className="px-6 py-2.5 rounded-full bg-[#0A1752] text-white text-lg font-bold border-2 border-white shadow-md active:scale-95"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Kies je team
              </button>
            </div>
          )}
          {/* Confirmed Player View: Once a player assigns their name, that phone is assigned to that player. Rest of the names are not there anymore! */}
          {currentPhase === 'name' && selectedPlayerName && (
            <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
              <div className="bg-white/20 backdrop-blur-md px-6 py-6 rounded-2xl border-2 border-white/40 shadow-xl text-white max-w-xs w-full animate-fade-in flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-lg mb-4" style={{ border: '8px solid black' }}>
                  <span className="text-5xl font-bold text-pink-500" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    {teamNumber}
                  </span>
                </div>
                <div className="text-sm uppercase tracking-wider opacity-80 font-bold">Team {teamNumber}</div>
                <div className="text-3xl font-black tracking-wide mt-1 text-yellow-300 uppercase" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                  {selectedPlayerName}
                </div>
                <div className="text-base opacity-95 mt-4 font-bold border-t border-white/20 pt-3 flex items-center justify-center">
                  <span>Je bent ingelogd!</span>
                </div>
                <div className="text-xs opacity-75 mt-1 font-normal">
                  Kijk op het grote scherm.
                </div>
              </div>
            </div>
          )}

          {/* Confirmed Team Leader Vote View */}
          {(currentPhase === 'teamleader' || currentSession?.current_fase === '01/07') && votedTeamLeader && (
            <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
              <div className="bg-white/20 backdrop-blur-md px-6 py-6 rounded-2xl border-2 border-white/40 shadow-xl text-white max-w-xs w-full animate-fade-in flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 border border-white/40 flex items-center justify-center shadow-lg mb-3">
                  <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-sm uppercase tracking-wider opacity-80 font-bold">Je hebt gestemd op:</div>
                <div className="text-3xl font-black tracking-wide mt-1 text-yellow-300 uppercase" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                  {votedTeamLeader}
                </div>
                <div className="text-base opacity-95 mt-4 font-bold border-t border-white/20 pt-3">
                  Teamleider Team {teamNumber}
                </div>
                <div className="text-xs opacity-75 mt-1 font-normal">
                  Kijk op het grote scherm voor de uitslag!
                </div>
              </div>
            </div>
          )}

          {/* Grid of names: shown during 'name' phase (if player hasn't chosen yet) OR during 'teamleader' phase (if not voted yet) */}
          {((currentPhase === 'name' && !selectedPlayerName) || ((currentPhase === 'teamleader' || currentSession?.current_fase === '01/07') && !votedTeamLeader)) && teamNumber && teamMembers.length > 0 && (
            <div className="w-full h-full flex flex-col overflow-y-auto">
              {(() => {
                const isLeaderPhase = currentPhase === 'teamleader' || currentSession?.current_fase === '01/07';
                // Names already claimed by another phone (from session.joined_players)
                const joinedSet = new Set<string>(
                  Array.isArray(currentSession?.joined_players)
                    ? currentSession.joined_players
                    : (typeof currentSession?.joined_players === 'object' && currentSession?.joined_players !== null
                        ? Object.keys(currentSession.joined_players)
                        : [])
                );

                const cleanName = (n: string) => (n || '').replace(/^\d+[\s_-]*/, '').trim().toLowerCase();
                const myCleanName = cleanName(selectedPlayerName || (() => {
                  try {
                    const s = localStorage.getItem(getPlayerStorageKey('rankingPlayerData'));
                    return s ? JSON.parse(s).playerName : '';
                  } catch { return ''; }
                })());

                // Available members for this screen:
                // - In 'name' phase: exclude names already claimed by another phone (1 phone per player)
                // - In 'teamleader' phase: strictly exclude self (cannot vote for yourself)
                const availableMembers = isLeaderPhase
                  ? teamMembers.filter(m => cleanName(m) !== myCleanName)
                  : teamMembers.filter(m => !joinedSet.has(m) || cleanName(m) === myCleanName);

                const rowCount = Math.max(Math.ceil(availableMembers.length / 2), 1);

                if (availableMembers.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full text-white text-center px-4">
                      <p className="text-lg font-bold">
                        {isLeaderPhase ? 'Geen andere teamleden gevonden' : `Alle spelers in Team ${teamNumber} zijn al ingelogd!`}
                      </p>
                      {!isLeaderPhase && (
                        <button
                          onClick={() => {
                            setTeamNumber('');
                            setTeamMembers([]);
                            advancePhase('team');
                          }}
                          className="mt-4 text-white/80 hover:text-white text-xs underline font-medium active:opacity-75 transition-all"
                          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                        >
                          ← Kies een ander team
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col h-full w-full justify-between pb-2">
                    <div
                      className="grid grid-cols-2 gap-2 max-w-sm mx-auto w-full flex-1"
                      style={{ gridTemplateRows: `repeat(${rowCount}, 1fr)` }}
                    >
                      {availableMembers.map((member, index) => {
                        return (
                          <button
                            key={`${member}-${isLeaderPhase ? 'leader' : 'name'}`}
                            onClick={() => isLeaderPhase ? submitTeamLeaderVote(member) : handleNameSelection(member)}
                            className="w-full h-full bg-gradient-to-r from-pink-300 to-purple-400 text-gray-800 rounded-lg text-center font-bold border-2 border-white shadow-md overflow-hidden animate-fade-in hover:from-pink-400 hover:to-purple-500 transition-all active:scale-95 flex items-center justify-center uppercase tracking-wide leading-tight"
                            style={{
                              fontFamily: 'Barlow Semi Condensed, sans-serif',
                              fontSize: `clamp(14px, calc(45vh / ${rowCount} * 0.4), 28px)`,
                              animationDelay: `${index * 80}ms`,
                              animationFillMode: 'both',
                              padding: '4px'
                            }}
                          >
                            <span className="truncate w-full px-1">{member}</span>
                          </button>
                        );
                      })}
                    </div>
                    {!isLeaderPhase && currentPhase === 'name' && (
                      <div className="flex justify-center pt-2">
                        <button
                          onClick={() => {
                            setTeamNumber('');
                            setTeamMembers([]);
                            advancePhase('team');
                          }}
                          className="text-white/80 hover:text-white text-xs underline font-medium active:opacity-75 transition-all"
                          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                        >
                          ← Kies een ander team (nu in Team {teamNumber})
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Welcome Popup - Shows after name selection */}
      {showWelcomePopup && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-1000 ${welcomePopupFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center justify-center px-4">
            <div
              className="p-8 rounded-2xl shadow-2xl max-w-md w-full relative animate-scale-in"
              style={{
                background: 'linear-gradient(135deg, #cc6344 0%, #cc8f5d 25%, #6782bb 50%, #6262ab 75%, #6fb7b3 100%)',
                border: '4px solid white',
                minHeight: '320px'
              }}
            >
              {/* Close X button - Twice as big */}
              <button
                onClick={closeWelcomePopup}
                className="absolute top-4 right-4 w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10 leading-none"
                style={{ fontSize: '3.75rem', fontWeight: 300, lineHeight: 1 }}
              >
                ×
              </button>

              <div className="text-center text-white space-y-6 pt-16 px-2">
                <h3 className="text-3xl" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
                  Welkom {selectedPlayerName}!
                </h3>

                <div className="text-lg leading-relaxed" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                  <p>Je bent nu ingelogd in team {teamNumber}.</p>
                  <p></p>
                  <p>Heel veel plezier vandaag met de show!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scale-in {
          from { 
            opacity: 0; 
            transform: scale(0.8); 
          }
          to { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        
        .animate-scale-in {
          animation: scale-in 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Remove number input spinners */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .no-spinner[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Global styles to handle keyboard-open sticky behavior */}
      <style jsx global>{`
        body.keyboard-open .sticky-header { position: fixed !important; top: 0; left: 0; right: 0; }
      `}</style>
    </div>
  );
}

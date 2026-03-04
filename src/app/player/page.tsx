'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { rankingService, teamService, faseService, motherfileService, MotherfileFases } from '@/lib/pocketbase';
import '@/modules/fases/auto-register';
import { FASES, findFaseModule } from '@/modules/fases';
import { safeJsonStr } from '@/lib/jsonUtils';

const APP_VERSION = 'v6.4';

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
  const [showPopup, setShowPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Player onboarding flow states
  const [currentPhase, setCurrentPhase] = useState<'intro' | 'team' | 'photocircle_ask' | 'photocircle_popup' | 'name' | 'teamleader' | 'complete'>('team');
  const [hasPhotoCircleAccount, setHasPhotoCircleAccount] = useState<boolean | null>(null);
  const [, setPlayerData] = useState<{ teamNumber: string, playerName: string, hasPhotoCircle: boolean } | null>(null);
  const [votedTeamLeader, setVotedTeamLeader] = useState<string | null>(null);

  // Dynamic heading states
  const [currentHeading, setCurrentHeading] = useState<string[]>([]);
  const [headingVisible, setHeadingVisible] = useState(true);
  const [motherfile, setMotherfile] = useState<MotherfileFases | null>(null);
  const fadeDurationMs = 1000; // 1s fade for heading transitions

  // Generic module states (keyed by stateField name)
  const [moduleStates, setModuleStates] = useState<Record<string, string>>({});

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
        '01/02': { heading: "Heb je 'n PhotoCircle account?" },
        '01/03': { heading: 'Wat is jouw naam?' }
      });
    }
  }, [currentSession]);

  // Hook for test phones auto-login and real player localStorage persistence
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const testName = params.get('testName');
      const testTeam = params.get('testTeam');
      if (testName && testTeam) {
        setTeamNumber(testTeam);
        setSelectedPlayerName(testName);
        setShowTeamInfo(true);
        setCurrentPhase('complete');
        return; // Skip localStorage for test accounts
      }

      // Load real player from localStorage
      const savedStr = localStorage.getItem('rankingPlayerData');
      let currentPlayerData = null;

      if (savedStr) {
        try {
          currentPlayerData = JSON.parse(savedStr);
          if (currentPlayerData.playerName && currentPlayerData.teamNumber) {
            setTeamNumber(currentPlayerData.teamNumber);
            setSelectedPlayerName(currentPlayerData.playerName);
            setHasPhotoCircleAccount(currentPlayerData.hasPhotoCircle);
            setShowTeamInfo(true);
            setCurrentPhase('complete');
          }
        } catch (e) { }
      }

      // Ensure persistent unique playerId (UUID-like)
      if (!currentPlayerData?.playerId) {
        const newId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
        const data = { ...currentPlayerData, playerId: newId };
        localStorage.setItem('rankingPlayerData', JSON.stringify(data));
      }
      // Finished loading session state from localStorage
      setIsInitializing(false);
    }
  }, []);

  // Effect to handle session change invalidation
  useEffect(() => {
    if (!currentSession || typeof window === 'undefined') return;
    const lastSessionId = localStorage.getItem('rankingSessionId');
    if (lastSessionId && lastSessionId !== currentSession.id) {
      console.log('New game session detected. Clearing player data.');
      localStorage.removeItem('rankingPlayerData');
      setTeamNumber('');
      setSelectedPlayerName('');
      setTeamMembers([]);
      setShowTeamInfo(false);
      setCurrentPhase('team');
    }
    localStorage.setItem('rankingSessionId', currentSession.id);
  }, [currentSession]);

  // Track which heading keys have animated, so we never animate the same content twice
  const animatedKeysRef = useRef<Set<string>>(new Set());
  const startedKeysRef = useRef<Set<string>>(new Set());
  const [currentHeadingKey, setCurrentHeadingKey] = useState<string>('');
  const [popupFadingOut, setPopupFadingOut] = useState(false);
  const [welcomePopupFadingOut, setWelcomePopupFadingOut] = useState(false);

  // Update heading when phase or motherfile changes – guard to avoid redundant updates
  const lastHeadingRef = useRef<string>('');
  useEffect(() => {
    if (!motherfile) return;
    // For onboarding phases, use fixed text
    let faseKey = '';
    if (currentPhase === 'intro') faseKey = ''; // Handled manually
    if (currentPhase === 'team') faseKey = ''; // Handled manually
    if (currentPhase === 'photocircle_ask' || currentPhase === 'photocircle_popup') faseKey = ''; // Handled manually
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
    const teamAssignments = teamService.generateTeamAssignments(playerNames, currentSession.nr_teams);

    const selectedTeamMembers = teamAssignments[parseInt(teamNumber)] || [];

    setTeamMembers(selectedTeamMembers);
    setShowPopup(true);
    advancePhase('photocircle_popup');
    setIsLoading(false);
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
        if (fresh.current_fase) {
          setCurrentSession((prev: RankingSession | null) => {
            if (!prev) return prev;
            if (fresh.current_fase === prev.current_fase) return prev;
            return { ...prev, current_fase: fresh.current_fase as string };
          });
        }
      } catch { /* silent */ }
    };
    const timer = setInterval(poll, 1000);
    poll();

    return () => { active = false; clearInterval(timer); };
  }, [currentSession?.id]);

  const closePopup = () => {
    // Fade out popup, then move to photocircle check
    setPopupFadingOut(true);
    setTimeout(() => {
      setShowPopup(false);
      setPopupFadingOut(false);
      advancePhase('photocircle_ask');
    }, 1000);
  };

  // Fade out and close the welcome popup (1s)
  const closeWelcomePopup = () => {
    setWelcomePopupFadingOut(true);
    setTimeout(() => {
      setShowWelcomePopup(false);
      setWelcomePopupFadingOut(false);
    }, 1000);
  };

  const handlePhotoCircleResponse = (hasAccount: boolean) => {
    setHasPhotoCircleAccount(hasAccount);
    // Both JA and NEE advance to name selection according to the new flow
    advancePhase('name');
  };

  const submitTeamLeaderVote = async (leaderName: string) => {
    if (!currentSession) return;
    setVotedTeamLeader(leaderName);

    // Read current votes from session, add vote, save to session
    try {
      const currentVotes = JSON.parse((currentSession.team_leader_votes as string) || '{}');
      const teamKey = `team_${teamNumber}`;
      if (!currentVotes[teamKey]) {
        currentVotes[teamKey] = {};
      }
      if (!currentVotes[teamKey][leaderName]) {
        currentVotes[teamKey][leaderName] = 0;
      }
      currentVotes[teamKey][leaderName] += 1;

      await rankingService.updateSession(currentSession.id, {
        team_leader_votes: JSON.stringify(currentVotes)
      });
    } catch (e) {
      console.error('Failed to save team leader vote', e);
    }

    // Move to complete
    setShowWelcomePopup(true);
    setCurrentPhase('complete');
    setShowTeamInfo(true);
  };

  const handleNameSelection = (name: string) => {
    setSelectedPlayerName(name);
    // Store in localStorage for persistence
    const savedStr = localStorage.getItem('rankingPlayerData');
    let existing = {};
    try { existing = JSON.parse(savedStr || '{}'); } catch (e) { }
    const data = {
      ...existing,
      teamNumber,
      playerName: name,
      hasPhotoCircle: hasPhotoCircleAccount || false
    };
    setPlayerData(data as any);
    localStorage.setItem('rankingPlayerData', JSON.stringify(data));

    // Move to team leader voting
    advancePhase('teamleader');
  };

  // Render module PlayerView if a registered fase module matches the current fase
  // GUARD: Only show game modules if onboarding is complete
  if (currentSession?.current_fase && currentPhase === 'complete') {
    const mod = findFaseModule(currentSession.current_fase);
    if (mod?.PlayerView) {
      const allPlayerNames = teamService.parsePlayerNames(currentSession.playernames as string);
      const headingsJson = currentSession.headings as string || '{}';
      const heading = faseService.getCurrentHeading(headingsJson, currentSession.current_fase) || '';
      let imageName = faseService.getCurrentImage(headingsJson, currentSession.current_fase) || '';



      const mediaUrl = imageName ? motherfileService.fileUrl(imageName) : '';
      return (
        <>
          <mod.PlayerView
            faseKey={currentSession.current_fase}
            sessionId={currentSession.id}
            moduleStateJson={mod.stateField ? moduleStates[mod.stateField] : undefined}
            onModuleStateJson={(json) => { if (mod.stateField) setModuleStates((prev) => ({ ...prev, [mod.stateField!]: json })); }}
            heading={heading}
            mediaUrl={mediaUrl}
            playerInfo={{
              playerId: (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('rankingPlayerData') || '{}').playerId : null) || selectedPlayerName || `anon_${teamNumber}`,
              playerName: selectedPlayerName || 'Speler',
              teamNumber: parseInt(teamNumber) || 0,
            }}
            allPlayerNames={allPlayerNames}
          />
          <div className="fixed top-4 right-4 z-[9999]">
            <button
              onClick={() => {
                localStorage.removeItem('rankingPlayerData');
                window.location.reload();
              }}
              className="bg-black/30 hover:bg-black/50 text-white/50 hover:text-white px-3 py-1 rounded text-xs backdrop-blur-sm transition-colors border border-white/20"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Afmelden
            </button>
          </div>
        </>
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
          background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)'
        }}
      >
        <div className="animate-pulse">Even geduld...</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)'
      }}
    >
      <div className="fixed z-[9999] text-white/40 text-xs" style={{ fontFamily: 'monospace', bottom: '50px', left: '50px' }}>{APP_VERSION} | {currentSession?.current_fase || ''}</div>
      {/* 12-Section Grid Container */}
      <div className="h-screen grid grid-rows-12 gap-0 relative z-10">

        {/* Sections 1-3: Logo Background + Logo Overlay - Sticky Header */}
        <div
          className="row-span-3 relative bg-cover bg-center bg-no-repeat sticky top-0 z-50 sticky-header"
          style={{
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '20vh' // Ensure proper height
          }}
        >
          {/* Logo Overlay - Much Bigger */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/assets/ranking_logo.webp"
              alt="Ranking Logo"
              width={256}
              height={128}
              className="h-full max-h-32 w-auto object-contain p-2"
              priority
            />
          </div>
        </div>

        {/* Sections 4-6: Dynamic Heading with Typewriter Animation */}
        <div className="row-span-3 flex items-center justify-center px-4">
          <MemoTypewriterHeading
            lines={
              currentPhase === 'team' ? ['In welk team zit je?', 'Kijk op het grote scherm,', 'en vul dit hier in:'] :
                currentPhase === 'photocircle_ask' ? ['Heb je een Photo circle', 'account aangemaakt?'] :
                  currentPhase === 'name' ? ['Wat is jouw naam?'] :
                    currentPhase === 'teamleader' ? ['Wie kies jij', 'als Teamleider?'] :
                      (currentPhase === 'complete' && currentSession?.current_fase?.startsWith('01/')) ? ['Heel veel plezier vandaag', 'met de show!'] :
                        currentHeading
            }
            visible={headingVisible}
            animate={true}
          />
        </div>

        {/* Sections 7-12: Team Number Input Circle & Action Button */}
        {currentPhase === 'team' && (
          <div className="row-span-6 flex flex-col items-center justify-start pt-4 gap-8">
            {!showTeamInfo ? (
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg" style={{ border: '12px solid black' }}>
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => {
                    setTeamNumber(e.target.value);
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleTeamSubmit()}
                  className="w-20 h-20 text-5xl font-bold text-center border-none outline-none bg-transparent text-pink-500 no-spinner"
                  style={{
                    fontFamily: 'Barlow Semi Condensed, sans-serif',
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield'
                  }}
                  placeholder="?"
                  min="1"
                  max={currentSession?.nr_teams || 10}
                />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg" style={{ border: '12px solid black' }}>
                <span className="text-5xl font-bold text-pink-500" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{teamNumber}</span>
              </div>
            )}

            {/* Section 6: Dynamic Action Button */}
            {!showTeamInfo && teamNumber && (
              <button
                onClick={handleTeamSubmit}
                disabled={!teamNumber || isLoading}
                className="text-white w-48 h-48 rounded-full text-4xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg border-[8px] border-white active:scale-95 flex items-center justify-center animate-scale-in"
                style={{ backgroundColor: '#0A1752', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#08134A'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1752'}
              >
                <div className="flex flex-col items-center">
                  <span>Enter</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* PhotoCircle Account Check Phase */}
        {currentPhase === 'photocircle_ask' && (
          <div className="row-span-6 flex items-center justify-center px-4 gap-8">
            <button
              onClick={() => handlePhotoCircleResponse(true)}
              className="text-white w-32 h-32 rounded-full text-3xl font-bold transition-all border-4 border-white active:scale-95 shadow-lg flex flex-col items-center justify-center"
              style={{ backgroundColor: '#0A1752', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#08134A'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1752'}
            >
              JA
              <span className="text-sm font-normal opacity-70 mt-1 uppercase tracking-widest block text-center -ml-1">Ik heb een<br />account</span>
            </button>
            <button
              onClick={() => handlePhotoCircleResponse(false)}
              className="bg-red-600 text-white w-32 h-32 rounded-full text-3xl font-bold hover:bg-red-700 transition-all border-4 border-white active:scale-95 shadow-lg flex flex-col items-center justify-center"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              NEE
              <span className="text-sm font-normal opacity-70 mt-1 uppercase tracking-widest block text-center">Probeer<br />opnieuw</span>
            </button>
          </div>
        )}

        {/* Sections 7-12: Team Members Display (Name & Teamleader selection) */}
        <div className="row-span-6 overflow-hidden w-full flex flex-col justify-start px-2">
          {(currentPhase === 'name' || currentPhase === 'teamleader') && teamMembers.length > 0 && (
            <div className="w-full pt-2 pb-6">
              <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto w-full">
                {teamMembers.map((member, index) => {
                  // In teamleader phase, don't show the player's own name
                  if (currentPhase === 'teamleader' && member === selectedPlayerName) {
                    return null;
                  }

                  const rowCount = Math.max(Math.ceil(teamMembers.length / 2), 1);

                  return (
                    <button
                      key={`${member}-${currentPhase}`}
                      onClick={() => currentPhase === 'name' ? handleNameSelection(member) : submitTeamLeaderVote(member)}
                      className="bg-gradient-to-r from-pink-300 to-purple-400 text-gray-800 rounded-lg text-center font-bold border-[1.5px] border-white shadow-md overflow-hidden animate-fade-in hover:from-pink-400 hover:to-purple-500 transition-all transform hover:scale-[1.03] flex items-center justify-center uppercase tracking-wide leading-tight"
                      style={{
                        fontFamily: 'Barlow Semi Condensed, sans-serif',
                        fontSize: `min(1.1rem, calc(40vh / ${rowCount} * 0.4))`,
                        animationDelay: `${index * 150}ms`,
                        animationFillMode: 'both',
                        height: `min(60px, calc(45vh / ${rowCount}))`,
                        minHeight: '28px',
                        padding: '2px 4px'
                      }}
                    >
                      <span className="truncate w-full px-1">{member}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PhotoCircle Popup */}
      {showPopup && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-1000 ${popupFadingOut ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-center justify-center px-4">
            <div
              className="p-8 rounded-2xl shadow-2xl max-w-md w-full relative animate-scale-in"
              style={{
                background: 'linear-gradient(135deg, #cc6344 0%, #cc8f5d 25%, #6782bb 50%, #6262ab 75%, #6fb7b3 100%)',
                border: '4px solid white',
                minHeight: '320px'
              }}
            >
              {/* Close X button - centered and thinner */}
              <button
                onClick={closePopup}
                className="absolute top-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10 leading-none border border-white/60"
                style={{ fontSize: '2.5rem', fontWeight: 300, lineHeight: 1 }}
                aria-label="Close"
              >
                ×
              </button>

              <div className="text-center text-white space-y-6 pt-16 px-2">
                <h3 className="text-3xl" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
                  Download nu deze App:
                </h3>

                {currentSession?.photocircle && (
                  <a
                    href={currentSession.photocircle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', backgroundColor: '#0A1752' }}
                  >
                    PhotoCircle App
                  </a>
                )}

                <div className="text-lg leading-relaxed" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                  <p>Maak daar een account aan</p>
                  <p>en kom dan hier terug.</p>
                  <p></p>
                  <p>Als je hulp nodig hebt laat het me weten</p>
                  <p>en dan kom ik je graag helpen.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

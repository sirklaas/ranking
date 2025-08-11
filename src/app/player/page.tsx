'use client';

import React, { useState, useEffect, useRef } from 'react';
import { rankingService, teamService, faseService } from '@/lib/pocketbase';

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
}

export default function PlayerPage() {
  const [teamNumber, setTeamNumber] = useState('');
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Player onboarding flow states
  const [currentPhase, setCurrentPhase] = useState<'team' | 'photocircle' | 'name' | 'complete'>('team');
  const [hasPhotoCircleAccount, setHasPhotoCircleAccount] = useState<boolean | null>(null);
  const [, setPlayerData] = useState<{teamNumber: string, playerName: string, hasPhotoCircle: boolean} | null>(null);
  
  // Dynamic heading states
  const [currentHeading, setCurrentHeading] = useState<string[]>([]);
  const [headingVisible, setHeadingVisible] = useState(true);
  type Motherfile = Record<string, { heading: string; image?: string }> | { fases: Record<string, string> };
  const [motherfile, setMotherfile] = useState<Motherfile | null>(null);
  const fadeDurationMs = 500;

  // Load PocketBase session ONCE (for team members and links) - no polling
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessions = await rankingService.getAllSessions();
        if (sessions && sessions.length > 0) {
          const latestSession = sessions[0] as unknown as RankingSession;
          setCurrentSession(latestSession);
        }
      } catch (error) {
        console.error('Failed to load session data (PocketBase):', error);
      }
    };
    loadSessionData();
  }, []);

  // Load headings motherfile ONCE
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_MOTHERFILE_URL || '/assets/fases.json';
    fetch(url as string)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load motherfile');
        return res.json();
      })
      .then((json) => {
        setMotherfile(json);
      })
      .catch((err) => {
        console.error('Error loading motherfile:', err);
        // Minimal fallback
        setMotherfile({
          fases: {
            '01/01': 'In welk team zit je?',
            '01/02': "Heb je 'n PhotoCircle account?",
            '01/03': 'Wat is jouw naam?'
          }
        });
      });
  }, []);

  // Update heading when phase or motherfile changes – guard to avoid redundant updates
  const lastHeadingRef = useRef<string>('');
  useEffect(() => {
    if (!motherfile) return;
    const faseKey = currentPhase === 'team' ? '01/01' : currentPhase === 'photocircle' ? '01/02' : currentPhase === 'name' ? '01/03' : '';
    if (!faseKey) return;
    try {
      const headingText = faseService.getCurrentHeading(JSON.stringify(motherfile), faseKey);
      const formatted = faseService.formatHeadingText(headingText || '');
      const hash = JSON.stringify(formatted || []);
      if (hash !== lastHeadingRef.current) {
        lastHeadingRef.current = hash;
        setCurrentHeading(formatted && formatted.length ? formatted : ['']);
      }
    } catch (e) {
      console.error('Failed to parse heading from motherfile', e);
    }
  }, [currentPhase, motherfile]);

  // Helper to advance phases with fade-out/in of heading
  const advancePhase = (next: 'photocircle' | 'name' | 'complete') => {
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
    // Show popup only; do NOT change phase yet to avoid re-animating 01/01.
    setShowPopup(true);
    setIsLoading(false);
  };

  const closePopup = () => {
    // Close popup and start fase 01/02 now (only once, on X press)
    setShowPopup(false);
    advancePhase('photocircle');
  };

  const handlePhotoCircleResponse = (hasAccount: boolean) => {
    setHasPhotoCircleAccount(hasAccount);
    if (!hasAccount) {
      // Show popup again if no account
      setShowPopup(true);
    } else {
      // Move to name selection phase with fade
      advancePhase('name');
    }
  };

  const handleNameSelection = (name: string) => {
    setSelectedPlayerName(name);
    // Store player data in memory for later use
    const data = {
      teamNumber,
      playerName: name,
      hasPhotoCircle: hasPhotoCircleAccount || false
    };
    setPlayerData(data);
    
    // Store in localStorage for persistence
    localStorage.setItem('rankingPlayerData', JSON.stringify(data));
    
    // Show welcome popup first, then complete the phase
    setShowWelcomePopup(true);
    setCurrentPhase('complete');
    setShowTeamInfo(true);
  };

  // TypewriterHeading Component with animations
  const TypewriterHeading = ({ lines, visible }: { lines: string[]; visible: boolean }) => {
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
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsTyping(true);
        setHasAnimated(false);
        return;
      }

      // If already animated and lines haven't changed, just show the complete text
      if (hasAnimated) {
        setDisplayedLines(lines);
        setIsTyping(false);
        return;
      }

      if (currentLineIndex >= lines.length) {
        setIsTyping(false);
        setHasAnimated(true);
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
    }, [visible, currentLineIndex, currentCharIndex, hasAnimated, lastLines]); // 'lines' intentionally omitted to avoid re-animating unless changed

    return (
      <div 
        className={`transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
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

  // Memoized version to avoid rerenders if lines/visible are unchanged
  const MemoTypewriterHeading = React.memo(
    TypewriterHeading,
    (prevProps, nextProps) => (
      JSON.stringify(prevProps.lines) === JSON.stringify(nextProps.lines) && prevProps.visible === nextProps.visible
    )
  );

  return (
    <div 
      className="min-h-screen relative overflow-hidden" 
      style={{ 
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #ff7e5f 0%, #feb47b 25%, #86a8e7 50%, #7f7fd5 75%, #91eae4 100%)'
      }}
    >
      {/* 12-Section Grid Container */}
      <div className="h-screen grid grid-rows-12 gap-0 relative z-10">
        
        {/* Sections 1-2: Logo Background + Logo Overlay - Sticky Header */}
        <div 
          className="row-span-2 relative bg-cover bg-center bg-no-repeat sticky top-0 z-50 sticky-header"
          style={{ 
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '16.666667vh' // Ensure proper height
          }}
        >
          {/* Logo Overlay - Much Bigger */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/assets/ranking_logo.webp" 
              alt="Ranking Logo" 
              className="h-full max-h-32 w-auto object-contain p-2"
            />
          </div>
        </div>

        {/* Sections 3-4: Dynamic Heading with Typewriter Animation */}
        <div className="row-span-2 flex items-center justify-center px-4">
          <MemoTypewriterHeading lines={currentHeading} visible={headingVisible} />
        </div>

        {/* Sections 5-6: Team Number Input Circle - Moved lower for two-line headings */}
        <div className="row-span-2 flex items-center justify-center">
          {!showTeamInfo ? (
            <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg" style={{ border: '12px solid black' }}>
              <input
                type="number"
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
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
        </div>

        {/* Show button when team number is entered */}
        {/* Section 6: Dynamic Action Button */}
        {currentPhase === 'team' && !showTeamInfo && teamNumber && (
          <div className="flex items-center justify-center px-4 mt-6">
            <button
              onClick={handleTeamSubmit}
              disabled={!teamNumber || isLoading}
              className="text-white px-8 py-4 rounded-2xl text-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ backgroundColor: '#0A1752', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#08134A'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1752'}
            >
              {isLoading ? 'Loading...' : 'Dat is mijn team!'}
            </button>
          </div>
        )}
        
        {/* PhotoCircle Account Check Phase */}
        {currentPhase === 'photocircle' && (
          <div className="flex items-center justify-center px-4 gap-4">
            <button
              onClick={() => handlePhotoCircleResponse(true)}
              className="text-white px-6 py-3 rounded-xl text-lg font-bold transition-colors"
              style={{ backgroundColor: '#0A1752', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#08134A'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0A1752'}
            >
              Ja
            </button>
            <button
              onClick={() => handlePhotoCircleResponse(false)}
              className="bg-red-600 text-white px-6 py-3 rounded-xl text-lg font-bold hover:bg-red-700 transition-colors"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              Nee
            </button>
          </div>
        )}
        
        {/* Name Selection Phase */}
        {currentPhase === 'name' && (
          <div className="flex items-center justify-center px-4">
            <div className="text-center text-white">
              <p className="mb-4 text-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Kies je naam uit de lijst hieronder:
              </p>
            </div>
          </div>
        )}

        {/* Sections 7-12: Team Members Display */}
        <div className="row-span-6 overflow-y-auto px-4">
          {(showTeamInfo || currentPhase === 'name') && teamMembers.length > 0 && (
            <div className="h-full pt-4">
              {/* Two column grid for team members */}
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {teamMembers.map((member, index) => (
                  currentPhase === 'name' ? (
                    <button
                      key={index}
                      onClick={() => handleNameSelection(member)}
                      className="bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800 px-3 py-2 rounded-lg text-center font-semibold border-2 border-white shadow-md overflow-hidden animate-fade-in hover:from-pink-300 hover:to-purple-400 transition-all transform hover:scale-105"
                      style={{ 
                        fontFamily: 'Barlow Semi Condensed, sans-serif',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        animationDelay: `${index * 200}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {member}
                    </button>
                  ) : (
                    <div 
                      key={index}
                      className="bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800 px-3 py-2 rounded-lg text-center font-semibold border-2 border-white shadow-md overflow-hidden animate-fade-in"
                      style={{ 
                        fontFamily: 'Barlow Semi Condensed, sans-serif',
                        fontWeight: 400,
                        fontSize: '0.9rem',
                        animationDelay: `${index * 200}ms`,
                        animationFillMode: 'both'
                      }}
                    >
                      {member}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PhotoCircle Popup */}
      {showPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="flex items-center justify-center px-4">
            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-md w-full relative animate-scale-in"
              style={{ 
                background: 'linear-gradient(135deg, #e6714d 0%, #e5a269 25%, #7a96d1 50%, #7272c1 75%, #82d1cd 100%)',
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="flex items-center justify-center px-4">
            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-md w-full relative animate-scale-in"
              style={{ 
                background: 'linear-gradient(135deg, #e6714d 0%, #e5a269 25%, #7a96d1 50%, #7272c1 75%, #82d1cd 100%)',
                border: '4px solid white',
                minHeight: '320px'
              }}
            >
              {/* Close X button - Twice as big */}
              <button
                onClick={() => setShowWelcomePopup(false)}
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
                  <p>Veel plezier met de game!</p>
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
          animation: scale-in 0.3s ease-out;
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

'use client';

import React, { useState, useEffect } from 'react';
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
  const [headingVisible, ] = useState(true);

  // Load the latest session data and set up real-time updates
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        // Load session directly from PocketBase (same as presenter)
        console.log('Loading sessions from PocketBase...');
        const sessions = await rankingService.getAllSessions();
        console.log('PocketBase response:', sessions);
        
        if (sessions && sessions.length > 0) {
          const latestSession = sessions[0] as unknown as RankingSession;
          console.log('Latest session loaded:', latestSession);
          setCurrentSession(latestSession);
          
          // Update heading from PocketBase based on current phase
          console.log('=== DEBUGGING HEADING LOADING ===');
          console.log('latestSession:', latestSession);
          console.log('latestSession.headings:', latestSession.headings);
          console.log('latestSession.current_fase:', latestSession.current_fase);
          console.log('currentPhase:', currentPhase);
          
          if (latestSession.headings) {
            try {
              // Map onboarding phases to specific fases
              let faseToUse = '01/01'; // Default to team selection
              if (currentPhase === 'team') {
                faseToUse = '01/01'; // Team selection
              } else if (currentPhase === 'photocircle') {
                faseToUse = '01/02'; // PhotoCircle question
              } else if (currentPhase === 'name') {
                faseToUse = '01/03'; // Name selection
              }
              
              console.log('faseToUse:', faseToUse);
              
              // Handle headings - could be string (JSON) or object from PocketBase
              let headingsObj: Record<string, { heading: string; image?: string }>;
              if (typeof latestSession.headings === 'string') {
                // Parse JSON string
                headingsObj = JSON.parse(latestSession.headings);
              } else {
                // Already an object
                headingsObj = latestSession.headings as Record<string, { heading: string; image?: string }>;
              }
              
              const headingText = headingsObj[faseToUse]?.heading || 'In welk team zit je?';
              console.log('headingText from PocketBase:', headingText);
              
              if (headingText && headingText.trim()) {
                const formattedHeading = faseService.formatHeadingText(headingText);
                console.log('formattedHeading:', formattedHeading);
                if (formattedHeading && formattedHeading.length > 0 && formattedHeading[0].trim()) {
                  console.log('SUCCESS: Using PocketBase heading:', formattedHeading);
                  setCurrentHeading(formattedHeading);
                  return; // Successfully loaded from PocketBase
                }
              }
              console.log('FAILED: PocketBase heading validation failed');
            } catch (error) {
              console.error('Error loading heading from PocketBase:', error);
            }
          } else {
            console.log('FAILED: No session data or headings available');
          }
          
          // Only use fallback if PocketBase loading failed
          const fallbackHeadings = {
            'team': ['In welk team zit je?'],
            'photocircle': ['Heb je \'n PhotoCircle account?'],
            'name': ['Wat is jouw naam?']
          };
          setCurrentHeading(fallbackHeadings[currentPhase as keyof typeof fallbackHeadings] || ['Loading...']);
        }
      } catch (error) {
        console.error('Failed to load session data (likely CORS issue):', error);
        console.log('CORS ERROR: PocketBase server needs to allow https://ranking.pinkmilk.eu');
        console.log('Fix: Add https://ranking.pinkmilk.eu to PocketBase CORS settings');
      }
    };

    // Only load data once on mount
    if (!currentSession) {
      loadSessionData();
    }
  }, []); // Empty dependency array - load only once on mount
  
  // Separate effect for updating heading when phase changes (using existing session data)
  useEffect(() => {
    if (currentSession && currentSession.headings) {
      try {
        // Map onboarding phases to specific fases
        let faseToUse = '01/01'; // Default to team selection
        if (currentPhase === 'team') {
          faseToUse = '01/01'; // Team selection
        } else if (currentPhase === 'photocircle') {
          faseToUse = '01/02'; // PhotoCircle question
        } else if (currentPhase === 'name') {
          faseToUse = '01/03'; // Name selection
        }
        
        console.log('Phase changed - updating heading for faseToUse:', faseToUse);
        
        // Handle headings - could be string (JSON) or object from PocketBase
        let headingsObj: Record<string, { heading: string; image?: string }>;
        if (typeof currentSession.headings === 'string') {
          // Parse JSON string
          headingsObj = JSON.parse(currentSession.headings);
        } else {
          // Already an object
          headingsObj = currentSession.headings as Record<string, { heading: string; image?: string }>;
        }
        
        const headingText = headingsObj[faseToUse]?.heading || 'In welk team zit je?';
        console.log('Updated headingText for phase:', headingText);
        
        if (headingText && headingText.trim()) {
          const formattedHeading = faseService.formatHeadingText(headingText);
          setCurrentHeading(formattedHeading);
        }
      } catch (error) {
        console.error('Error updating heading for phase change:', error);
      }
    }
  }, [currentPhase, currentSession]); // Update heading when phase or session changes

  const handleTeamSubmit = () => {
    if (!teamNumber || !currentSession) return;
    
    setIsLoading(true);
    
    // Get team assignments from prefixed player names (rock-solid approach)
    const playerNames = teamService.parsePlayerNames(currentSession.playernames);
    const teamAssignments = teamService.generateTeamAssignments(playerNames, currentSession.nr_teams);
    
    const selectedTeamMembers = teamAssignments[parseInt(teamNumber)] || [];
    
    setTeamMembers(selectedTeamMembers);
    setShowPopup(true); // Show popup first
    setIsLoading(false);
  };

  const closePopup = () => {
    setShowPopup(false);
    // Move to PhotoCircle account check phase
    setCurrentPhase('photocircle');
    // Heading will be loaded from PocketBase based on current_fase
  };

  const handlePhotoCircleResponse = (hasAccount: boolean) => {
    setHasPhotoCircleAccount(hasAccount);
    if (!hasAccount) {
      // Show popup again if no account
      setShowPopup(true);
    } else {
      // Move to name selection phase
      setCurrentPhase('name');
      // Heading will be loaded from PocketBase based on current_fase
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
    
    // Show welcome popup
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
      if (!visible) {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsTyping(true);
        setHasAnimated(false);
        setLastLines([]);
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
    }, [visible, currentLineIndex, currentCharIndex, hasAnimated]); // Only essential dependencies to prevent re-animation

    return (
      <div 
        className={`transition-opacity duration-500 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {displayedLines.map((line, index) => (
          <div key={index} className="text-3xl text-white text-center leading-tight" 
               style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 300 }}>
            {line}
            {index === currentLineIndex && isTyping && (
              <span className="animate-pulse">|</span>
            )}
          </div>
        ))}
      </div>
    );
  };

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
        
        {/* Sections 1-2: Logo Background + Logo Overlay - STICKY */}
        <div 
          className="row-span-2 relative bg-cover bg-center bg-no-repeat fixed top-0 left-0 right-0 z-50"
          style={{ 
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '16.666667vh', // Use vh instead of % for proper height
            minHeight: '120px' // Ensure minimum height
          }}
        >
          {/* Logo Overlay - Sticky and Always Fit Height */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/assets/ranking_logo.webp" 
              alt="Ranking Logo" 
              className="h-full max-h-32 w-auto object-contain p-2"
            />
          </div>
        </div>

        {/* Sections 3-4: Dynamic Heading with Typewriter Animation */}
        <div className="row-span-2 flex items-center justify-center px-4" style={{ paddingTop: '16.666667vh' }}>
          <TypewriterHeading lines={currentHeading} visible={headingVisible} />
        </div>

        {/* Sections 5-6: Team Number Input Circle - Moved lower for two-line headings */}
        <div className="row-span-2 flex items-center justify-center">
          {!showTeamInfo ? (
            <div className="w-32 h-32 rounded-full bg-white flex items-center justify-center shadow-lg" style={{ border: '12px solid black' }}>
              <input
                type="number"
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTeamSubmit();
                  }
                }}
                className="w-20 h-20 text-5xl font-bold text-center border-none outline-none bg-transparent text-pink-500 no-spinner"
                style={{ 
                  fontFamily: 'Barlow Semi Condensed, sans-serif',
                  // Hide up/down arrows completely
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield',
                  // Additional arrow removal for all browsers
                  appearance: 'none',
                  // Center the text properly
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center'
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
        {/* Section 6: Dynamic Action Button - Added margin above */}
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

      {/* Animated Popup - Positioned in sections 3-6 */}
      {showPopup && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          {/* Position popup in sections 3-6 area */}
          <div className="h-screen grid grid-rows-12">
            <div className="row-span-2"></div> {/* Sections 1-2 spacer */}
            <div className="row-span-8 flex items-center justify-center px-4"> {/* Sections 3-10 - doubled height */}
              <div 
                className="p-8 rounded-2xl shadow-2xl max-w-md w-full relative animate-scale-in"
                style={{ 
                  background: 'linear-gradient(135deg, #e6714d 0%, #e5a269 25%, #7a96d1 50%, #7272c1 75%, #82d1cd 100%)',
                  border: '4px solid white',
                  minHeight: '320px'
                }}
              >
                {/* Close X button - Large but Thinner */}
                <button
                  onClick={closePopup}
                  className="absolute top-4 right-4 w-16 h-16 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
                  style={{ fontSize: '2.5rem', fontWeight: 300 }}
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
                      className="block text-white underline text-sm font-medium break-all hover:text-blue-200 transition-colors"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                    >
                      {currentSession.photocircle}
                    </a>
                  )}
                  
                  <div className="text-lg leading-relaxed" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    <p>Maak daar een account aan</p>
                    <p>en kom dan hier terug.</p>
                    <p>Als je hulp nodig hebt</p>
                    <p>kom ik je graag helpen.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="row-span-3"></div> {/* Sections 11-12 spacer */}
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
        
        /* Remove number input spinners completely */
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        
        .no-spinner[type=number] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
      
      {/* Welcome Popup after name selection */}
      {showWelcomePopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative animate-scale-in text-center" style={{
            background: 'linear-gradient(135deg, #e6714d 0%, #e5a269 25%, #7a96d1 50%, #7272c1 75%, #82d1cd 100%)',
            border: '4px solid white'
          }}>
            <div className="text-white space-y-4">
              <h2 className="text-3xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Hi {selectedPlayerName}!
              </h2>
              <p className="text-xl" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Welkom bij Ranking the Starzzz
              </p>
              <p className="text-lg" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Ik wens je veel plezier!
              </p>
              <button
                onClick={() => setShowWelcomePopup(false)}
                className="mt-6 bg-white text-blue-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Bedankt!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

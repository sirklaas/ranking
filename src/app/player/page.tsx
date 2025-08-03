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
  const [isLoading, setIsLoading] = useState(false);
  
  // Dynamic heading states
  const [currentHeading, setCurrentHeading] = useState<string[]>(['In welk team zit je?']);
  const [isHeadingAnimating, setIsHeadingAnimating] = useState(false);
  const [headingVisible, setHeadingVisible] = useState(true);

  // Load the latest session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessions = await rankingService.getAllSessions();
        if (sessions.length > 0) {
          const latestSession = sessions[0] as unknown as RankingSession;
          setCurrentSession(latestSession);
          
          // Update heading based on current fase
          if (latestSession.headings && latestSession.current_fase) {
            const headingText = faseService.getCurrentHeading(latestSession.headings, latestSession.current_fase);
            const formattedHeading = faseService.formatHeadingText(headingText);
            setCurrentHeading(formattedHeading);
          }
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };

    loadSessionData();
  }, []);

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
    setShowTeamInfo(true); // Then show team info
  };

  // TypewriterHeading Component with animations
  const TypewriterHeading = ({ lines, visible }: { lines: string[]; visible: boolean }) => {
    const [displayedLines, setDisplayedLines] = useState<string[]>([]);
    const [currentLineIndex, setCurrentLineIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const [isTyping, setIsTyping] = useState(true);

    useEffect(() => {
      if (!visible) {
        setDisplayedLines([]);
        setCurrentLineIndex(0);
        setCurrentCharIndex(0);
        setIsTyping(true);
        return;
      }

      if (currentLineIndex >= lines.length) {
        setIsTyping(false);
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
    }, [lines, visible, currentLineIndex, currentCharIndex]);

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
        
        {/* Sections 1-2: Logo Background + Logo Overlay */}
        <div 
          className="row-span-2 relative bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          {/* Logo Overlay - Much Bigger */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img 
              src="/assets/ranking_logo.webp" 
              alt="Ranking Logo" 
              className="h-32 w-auto object-contain"
            />
          </div>
        </div>

        {/* Sections 3-4: Dynamic Heading with Typewriter Animation */}
        <div className="row-span-2 flex items-center justify-center px-4">
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
                onKeyPress={(e) => e.key === 'Enter' && handleTeamSubmit()}
                className="w-20 h-20 text-5xl font-bold text-center border-none outline-none bg-transparent text-pink-500"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
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
        {teamNumber && !showTeamInfo && !showPopup && (
          <div className="row-span-1 flex items-center justify-center">
            <button
              onClick={handleTeamSubmit}
              disabled={isLoading}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              {isLoading ? 'Loading...' : 'Dat is mijn team!'}
            </button>
          </div>
        )}

        {/* Sections 7-12: Team Members Display */}
        <div className="row-span-6 overflow-y-auto px-4">
          {showTeamInfo && (
            <div className="h-full pt-4">
              {/* Two column grid for team members */}
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {teamMembers.map((member, index) => (
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
            <div className="row-span-4 flex items-center justify-center px-4"> {/* Sections 3-6 */}
              <div 
                className="bg-gradient-to-br from-blue-500 to-blue-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative animate-scale-in"
                style={{ border: '3px solid white' }}
              >
                {/* Close X button */}
                <button
                  onClick={closePopup}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white font-bold text-xl transition-colors"
                >
                  ×
                </button>
                
                <div className="text-center text-white space-y-4">
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
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
                  
                  <p className="text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    Maak daar een account aan en kom dan hier terug
                  </p>
                </div>
              </div>
            </div>
            <div className="row-span-7"></div> {/* Sections 6-12 spacer */}
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
      `}</style>
    </div>
  );
}

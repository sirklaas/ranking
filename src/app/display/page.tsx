'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { rankingService, teamService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';

interface PlayersByTeam {
  [teamNumber: number]: string[];
}

export default function DisplayPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [playersByTeam, setPlayersByTeam] = useState<PlayersByTeam>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>('');

  // Generate a random 4-digit game code
  const generateGameCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  // Distribute players randomly but equally across teams
  const distributePlayersToTeams = (playerNames: string[], numberOfTeams: number): PlayersByTeam => {
    if (!playerNames.length || numberOfTeams === 0) return {};
    
    // Shuffle players randomly
    const shuffledPlayers = [...playerNames].sort(() => Math.random() - 0.5);
    const teams: PlayersByTeam = {};
    
    // Initialize teams
    for (let i = 1; i <= numberOfTeams; i++) {
      teams[i] = [];
    }
    
    // Distribute players evenly
    shuffledPlayers.forEach((player, index) => {
      const teamNumber = (index % numberOfTeams) + 1;
      teams[teamNumber].push(player);
    });
    
    return teams;
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
      
      const latestSession = sessions[0] as unknown as RankingSession;
      setCurrentSession(latestSession);
      
      // Parse player names and distribute to teams
      const playerNames = teamService.parsePlayerNames(latestSession.playernames);
      const distributed = distributePlayersToTeams(playerNames, latestSession.nr_teams);
      setPlayersByTeam(distributed);
      
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
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.head.removeChild(link);
    };
  }, [loadSessionData]);

  // Generate QR code URL for joining
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://ranking.pinkmilk.eu/player?code=${gameCode}`)}`;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 relative overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-70 animate-pulse"></div>
      
      {/* Logo - Top Left */}
      <div className="absolute top-5 left-5 z-10">
        <img 
          src="/assets/ranking_logo.webp" 
          alt="Ranking Logo" 
          className="h-16 w-auto"
        />
      </div>
      
      {/* QR Code - Top Right */}
      <div className="absolute top-5 right-5 bg-white p-3 rounded-lg shadow-lg z-10">
        <img 
          src={qrCodeUrl} 
          alt="Join Game QR Code" 
          className="w-32 h-32"
        />
        <p className="text-center text-sm font-semibold text-gray-700 mt-2" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Code: {gameCode}</p>
      </div>
      
      <div className="relative z-10 w-full px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
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
                      className="bg-gradient-to-r from-pink-200 to-purple-300 text-gray-800 px-2 py-1 rounded-lg text-center font-semibold border-2 border-white shadow-md text-sm overflow-hidden"
                      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', fontWeight: 500 }}
                    >
                      <span className="text-xs text-gray-600 mr-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>{playerIndex + 1}</span>
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
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>Press &apos;F&apos; for fullscreen</p>
        <p>Press &apos;R&apos; to refresh</p>
      </div>
    </div>
  );
}

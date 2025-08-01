'use client';

import React, { useState, useEffect } from 'react';
import { rankingService, teamService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';

export default function PlayerPage() {
  const [teamNumber, setTeamNumber] = useState('');
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [photocircleLink, setPhotocircleLink] = useState('');
  const [showTeamInfo, setShowTeamInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load the latest session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const sessions = await rankingService.getAllSessions();
        if (sessions.length > 0) {
          const latestSession = sessions[0] as unknown as RankingSession;
          setCurrentSession(latestSession);
          setPhotocircleLink(latestSession.photocircle || '');
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
    
    // Parse player names and distribute to teams
    const playerNames = teamService.parsePlayerNames(currentSession.playernames);
    const distributePlayersToTeams = (players: string[], numTeams: number) => {
      const teams: { [key: number]: string[] } = {};
      
      // Initialize teams
      for (let i = 1; i <= numTeams; i++) {
        teams[i] = [];
      }
      
      // Shuffle players for random distribution
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      // Distribute players evenly
      shuffledPlayers.forEach((player, index) => {
        const teamNum = (index % numTeams) + 1;
        teams[teamNum].push(player);
      });
      
      return teams;
    };
    
    const distributed = distributePlayersToTeams(playerNames, currentSession.nr_teams);
    const selectedTeamMembers = distributed[parseInt(teamNumber)] || [];
    
    setTeamMembers(selectedTeamMembers);
    setShowTeamInfo(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 relative overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-70 animate-pulse"></div>
      
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

        {/* Section 3: Question Text */}
        <div className="row-span-1 bg-white/90 backdrop-blur-sm flex items-center justify-center px-4">
          <h1 className="text-xl font-bold text-gray-900 text-center" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            In welk Team zit je?
          </h1>
        </div>

        {/* Section 4: Team Number Input Circle */}
        <div className="row-span-1 bg-white/90 backdrop-blur-sm flex items-center justify-center">
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

        {/* Section 5: Download App Text */}
        <div className="row-span-1 bg-white/90 backdrop-blur-sm flex items-center justify-center px-4">
          <h2 className="text-lg font-semibold text-gray-900 text-center" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Download deze App:
          </h2>
        </div>

        {/* Section 6: Photocircle Link */}
        <div className="row-span-1 bg-white/90 backdrop-blur-sm flex items-center justify-center px-4">
          {photocircleLink ? (
            <a 
              href={photocircleLink} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 underline text-sm font-medium text-center break-all"
              style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
            >
              {photocircleLink}
            </a>
          ) : (
            <span className="text-gray-500 text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Loading app link...</span>
          )}
        </div>

        {/* Sections 7-12: Team Members Display */}
        <div className="row-span-6 bg-white/90 backdrop-blur-sm overflow-y-auto">
          {showTeamInfo ? (
            <div className="p-4 h-full">
              <div className="space-y-3 h-full flex flex-col justify-start">
                {teamMembers.map((member, index) => (
                  <div 
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-2 rounded-full text-center font-semibold text-lg shadow-md"
                    style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                  >
                    {member}
                  </div>
                ))}
                
                {/* Show team input button again */}
                <button
                  onClick={() => {
                    setShowTeamInfo(false);
                    setTeamNumber('');
                    setTeamMembers([]);
                  }}
                  className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                >
                  Change Team
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 h-full flex flex-col items-center justify-center">
              {teamNumber && (
                <button
                  onClick={handleTeamSubmit}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg"
                  style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                >
                  {isLoading ? 'Loading...' : 'Show My Team'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

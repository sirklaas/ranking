'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { rankingService, teamService, motherfileService, faseService } from '@/lib/pocketbase';
import { RankingSession } from '@/types';
import '@/modules/fases/auto-register';

interface PlayersByTeam {
  [teamNumber: number]: string[];
}

export default function DisplayPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [playersByTeam, setPlayersByTeam] = useState<PlayersByTeam>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>('');
  const [currentMedia, setCurrentMedia] = useState<null | { url: string; name: string; type: 'video' | 'image' }>(null);

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
      
      const latestSession = sessions[0] as unknown as RankingSession;
      setCurrentSession(latestSession);
      
      const teamAssignments = getTeamAssignments(latestSession);
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

    // Preload motherfile to set record id for media URLs
    void motherfileService.get().catch(() => {});

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

  // Subscribe to PocketBase session updates (current_fase changes)
  useEffect(() => {
    type PBEvent = { record?: Partial<RankingSession> } | Partial<RankingSession>;
    const unsub = rankingService.subscribeToRankings((e: unknown) => {
      try {
        const evt = e as PBEvent;
        const rec = (evt && ('record' in evt ? evt.record : evt)) as Partial<RankingSession> | undefined;
        if (!rec || !currentSession) return;
        if (rec.id === currentSession.id) {
          // Merge to keep other fields stable
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
  }, [currentSession]);

  // Compute current media whenever session/current_fase changes
  useEffect(() => {
    if (!currentSession) return;
    const headings = faseService.parseHeadings(currentSession.headings || '{}');
    const faseKey = currentSession.current_fase as string | undefined;
    if (!faseKey) {
      setCurrentMedia(null);
      return;
    }
    const item = headings[faseKey];
    let fileName = item?.image?.trim();
    // Fallbacks for known fases when no image is configured in session
    if (!fileName && faseKey === '01/04') {
      fileName = 'RankingKreet.mp4';
    }
    if (!fileName) {
      setCurrentMedia(null);
      return;
    }
    const isVideo = /\.(mp4|mov|avi|m4v|webm)$/i.test(fileName);
    const url = motherfileService.fileUrl(fileName);
    setCurrentMedia({ url, name: fileName, type: isVideo ? 'video' : 'image' });
  }, [currentSession]);

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
      {/* Media overlay: plays current fase video when available */}
      {currentMedia?.type === 'video' && currentMedia.url && (
        <div className="fixed inset-0 z-50 bg-black">
          <video
            key={currentMedia.url}
            src={currentMedia.url}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            onEnded={() => setCurrentMedia(null)}
          />
          <div className="absolute top-2 left-3 text-white text-sm" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Fase {currentSession?.current_fase} — {currentMedia.name}
          </div>
        </div>
      )}
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 opacity-70 animate-pulse"></div>
      
      {/* Horizontal Band with Background + Overlaid Text and Logo */}
      <div 
        className="relative z-10 w-full h-48 bg-cover bg-center bg-no-repeat flex items-center justify-between px-8"
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
        
        {/* QR Code - Right side of band */}
        <div className="bg-white p-2 rounded-lg shadow-lg">
          <Image
            src={qrCodeUrl}
            alt="Join Game QR Code"
            width={64}
            height={64}
            className="w-16 h-16"
            unoptimized
          />
          <p className="text-center text-xs font-semibold text-gray-700 mt-1" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Code: {gameCode}</p>
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
      
      {/* Keyboard hints */}
      <div className="absolute bottom-4 left-4 text-white/60 text-sm">
        <p>Press &apos;F&apos; for fullscreen</p>
        <p>Press &apos;R&apos; to refresh</p>
      </div>
    </div>
  );
}

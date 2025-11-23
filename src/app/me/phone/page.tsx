'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { rankingService, teamService } from '@/lib/pocketbase';
import { DotsTimer } from '@/components/elimination/DotsTimer';
import { EliminationVoting } from '@/components/elimination/EliminationVoting';
import { EliminationState, RankingSession } from '@/types';
import * as eliminationLogic from '@/modules/elimination/logic';

export default function PlayerPage() {
  const [currentSession, setCurrentSession] = useState<RankingSession | null>(null);
  const [eliminationState, setEliminationState] = useState<EliminationState | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  // Login State
  const [teamNumber, setTeamNumber] = useState('');
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [selectedPlayerName, setSelectedPlayerName] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginPhase, setLoginPhase] = useState<'team' | 'photocircle' | 'name'>('team');
  const [isLoading, setIsLoading] = useState(false);

  // Load Session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessions = await rankingService.getAllSessions();
        if (sessions && sessions.length > 0) {
          const latest = sessions[0] as unknown as RankingSession;
          setCurrentSession(latest);

          if (latest.elimination_state) {
            setEliminationState(JSON.parse(latest.elimination_state));
          }
        }
      } catch (e) {
        console.error("Failed to load session", e);
      }
    };
    loadSession();
  }, []);

  // Subscribe to updates
  useEffect(() => {
    if (!currentSession) return;

    const unsubscribe = rankingService.subscribeToSession(currentSession.id, (data: Record<string, unknown>) => {
      if (data.elimination_state) {
        try {
          const newState = JSON.parse(data.elimination_state as string);
          setEliminationState(newState);

          // Reset vote status on new round
          if (newState.status === 'waiting') {
            setHasVoted(false);
          }
        } catch (e) {
          console.error("Failed to parse elimination state update", e);
        }
      }
    });

    return () => {
      unsubscribe.then((unsub: () => void) => unsub());
    };
  }, [currentSession]);

  // Restore login from local storage
  useEffect(() => {
    const saved = localStorage.getItem('me_player_data');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.playerName && data.teamNumber) {
        setTeamNumber(data.teamNumber);
        setSelectedPlayerName(data.playerName);
        setIsLoggedIn(true);
      }
    }
  }, []);

  const handleTeamSubmit = () => {
    if (!teamNumber || !currentSession) return;
    setIsLoading(true);

    try {
      const playerNames = teamService.parsePlayerNames(currentSession.playernames);
      const assignments = teamService.generateTeamAssignments(playerNames, currentSession.nr_teams);
      const members = assignments[parseInt(teamNumber)] || [];
      setTeamMembers(members);
      setLoginPhase('photocircle');
    } catch (e) {
      console.error("Error getting team members", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameSelect = (name: string) => {
    setSelectedPlayerName(name);
    setIsLoggedIn(true);
    localStorage.setItem('me_player_data', JSON.stringify({
      teamNumber,
      playerName: name
    }));
  };

  // ------------------------------------------------------------------
  // RENDER: LOGIN FLOW
  // ------------------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 to-purple-600 font-sans text-white p-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <Image
              src="/assets/ranking_logo.webp"
              alt="Logo"
              width={200}
              height={100}
              className="mx-auto mb-8"
            />
            <h1 className="text-3xl font-bold mb-2">Masked Employee</h1>
            <p className="opacity-80">Join the game to vote!</p>
          </div>

          {/* Phase 1: Team Number */}
          {loginPhase === 'team' && (
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center">
              <h2 className="text-xl mb-6">What is your Team Number?</h2>
              <div className="flex justify-center mb-6">
                <input
                  type="number"
                  value={teamNumber}
                  onChange={(e) => setTeamNumber(e.target.value)}
                  className="w-24 h-24 text-center text-4xl font-bold bg-white text-purple-600 rounded-full shadow-lg outline-none focus:ring-4 focus:ring-purple-300"
                  placeholder="#"
                />
              </div>
              <button
                onClick={handleTeamSubmit}
                disabled={!teamNumber || isLoading}
                className="w-full py-4 bg-purple-800 hover:bg-purple-700 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Checking...' : 'Next →'}
              </button>
            </div>
          )}

          {/* Phase 2: PhotoCircle (Simplified) */}
          {loginPhase === 'photocircle' && (
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center">
              <h2 className="text-xl mb-6">Do you have the PhotoCircle App?</h2>
              <div className="space-y-4">
                <button
                  onClick={() => setLoginPhase('name')}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-lg transition-colors"
                >
                  Yes, I have it
                </button>
                <button
                  onClick={() => alert('Please download PhotoCircle first!')}
                  className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-lg transition-colors"
                >
                  No, not yet
                </button>
              </div>
            </div>
          )}

          {/* Phase 3: Name Selection */}
          {loginPhase === 'name' && (
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center">
              <h2 className="text-xl mb-6">Who are you?</h2>
              <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
                {teamMembers.map((member) => (
                  <button
                    key={member}
                    onClick={() => handleNameSelect(member)}
                    className="py-3 px-4 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors text-left"
                  >
                    {member}
                  </button>
                ))}
                {teamMembers.length === 0 && (
                  <p className="text-yellow-300">No members found for Team {teamNumber}</p>
                )}
              </div>
              <button
                onClick={() => setLoginPhase('team')}
                className="mt-6 text-sm opacity-60 hover:opacity-100 underline"
              >
                ← Back to Team Number
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: GAME INTERFACE (Logged In)
  // ------------------------------------------------------------------
  if (!eliminationState || !currentSession) {
    return (
      <div className="min-h-screen bg-[#0A1752] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1752] text-white flex flex-col font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-[#0A1752] border-b border-blue-900 shadow-lg">
        <div className="flex justify-between items-center p-4">
          <Image
            src="/assets/ranking_logo.webp"
            alt="Logo"
            width={100}
            height={50}
            className="h-10 w-auto object-contain"
          />
          <div className="text-right">
            <div className="text-xs text-gray-400">Player</div>
            <div className="font-bold text-sm">{selectedPlayerName}</div>
          </div>
        </div>

        {/* DOTS TIMER */}
        <div className="px-4 pb-2">
          <DotsTimer
            duration={eliminationState.timerDuration || 20}
            startTime={eliminationState.status === 'voting' ? eliminationState.timerStart : undefined}
          />
        </div>
      </div>

      {/* Main Voting Content */}
      <div className="flex-1 p-4 flex flex-col">
        <EliminationVoting
          options={eliminationState.options.filter(opt => !opt.eliminated)}
          isVotingOpen={eliminationState.status === 'voting'}
          hasVoted={hasVoted}
          onVote={async (optionId) => {
            if (currentSession && !hasVoted) {
              setHasVoted(true);
              await eliminationLogic.submitVote(currentSession.id, eliminationState, optionId, selectedPlayerName);
            }
          }}
        />
      </div>
    </div>
  );
}

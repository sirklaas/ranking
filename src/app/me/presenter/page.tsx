'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { RankingSession } from '@/types';
import { rankingService } from '@/lib/pocketbase';
import { EliminationState } from '@/types';
import * as eliminationLogic from '@/modules/elimination/logic';
import { DotsTimer } from '@/components/elimination/DotsTimer';

export default function PresenterPage() {
  const [sessions, setSessions] = useState<RankingSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<RankingSession | null>(null);
  const [eliminationState, setEliminationState] = useState<EliminationState>(eliminationLogic.getInitialState());
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const list = await rankingService.getAllSessions();
        setSessions(list as unknown as RankingSession[]);
      } catch (e) {
        console.error("Failed to load sessions", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, []);

  // Sync elimination state from session
  useEffect(() => {
    if (selectedSession?.elimination_state) {
      try {
        const parsed = JSON.parse(selectedSession.elimination_state);
        setEliminationState(parsed);
      } catch (e) {
        console.error("Failed to parse elimination state", e);
      }
    }
  }, [selectedSession]);

  const handleSessionSelect = (session: RankingSession) => {
    setSelectedSession(session);
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#0A1752] text-white flex items-center justify-center">Loading...</div>;
  }

  if (!selectedSession) {
    return (
      <div className="min-h-screen bg-[#0A1752] text-white p-8 font-sans">
        <h1 className="text-4xl font-bold mb-8 text-center">Masked Employee Presenter</h1>
        <div className="max-w-2xl mx-auto bg-white/10 rounded-xl p-6 backdrop-blur-sm">
          <h2 className="text-2xl mb-4">Select a Session</h2>
          <div className="space-y-4">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => handleSessionSelect(session)}
                className="w-full text-left p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-lg">{session.gamename || 'Untitled Game'}</div>
                  <div className="text-sm text-gray-400">{session.city} • {new Date(session.created).toLocaleDateString()}</div>
                </div>
                <div className="text-blue-300">Select →</div>
              </button>
            ))}
            {sessions.length === 0 && (
              <div className="text-center text-gray-400 py-8">No sessions found. Create one in the Ranking Presenter first.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1752] text-white p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 bg-white/5 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToSessions}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold">{selectedSession.gamename}</h1>
            <div className="text-sm text-gray-400">Masked Employee Control</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Session ID</div>
          <div className="font-mono text-sm">{selectedSession.id}</div>
        </div>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Game Controls */}
        <div className="lg:col-span-8 space-y-6">

          {/* Status Bar */}
          <div className="bg-blue-900/40 border border-blue-800 rounded-xl p-6 flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold mb-1">Round {eliminationState.round}</h2>
              <div className="text-blue-300 uppercase tracking-wider text-sm font-bold">Status: {eliminationState.status}</div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">Timer Duration</div>
                <input
                  type="number"
                  value={eliminationState.timerDuration || 20}
                  onChange={(e) => setEliminationState({ ...eliminationState, timerDuration: parseInt(e.target.value) || 20 })}
                  className="w-16 bg-gray-800 border border-blue-700 rounded px-2 py-1 text-center text-white"
                />
              </div>
              <div className="w-20 text-center">
                <div className="text-3xl font-mono text-cyan-300 font-bold">
                  {eliminationState.timerStart && eliminationState.status === 'voting'
                    ? Math.max(0, Math.ceil((eliminationState.timerDuration || 20) - (Date.now() - eliminationState.timerStart) / 1000)) + 's'
                    : (eliminationState.timerDuration || 20) + 's'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-4 gap-4">
            <button
              onClick={async () => {
                const newState = await eliminationLogic.startVoting(selectedSession.id, eliminationState);
                setEliminationState(newState);
              }}
              className={`p-4 rounded-xl font-bold text-lg transition-all shadow-lg ${eliminationState.status === 'voting'
                  ? 'bg-blue-900/50 text-blue-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'
                }`}
              disabled={eliminationState.status === 'voting'}
            >
              ▶ Start Voting
            </button>

            <button
              onClick={async () => {
                const newState = await eliminationLogic.showResults(selectedSession.id, eliminationState);
                setEliminationState(newState);
              }}
              className={`p-4 rounded-xl font-bold text-lg transition-all shadow-lg ${eliminationState.status !== 'voting'
                  ? 'bg-teal-900/50 text-teal-700 cursor-not-allowed'
                  : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/50'
                }`}
              disabled={eliminationState.status !== 'voting'}
            >
              📊 Show Results
            </button>

            <button
              onClick={async () => {
                const newState = await eliminationLogic.nextRound(selectedSession.id, eliminationState);
                setEliminationState(newState);
              }}
              className={`p-4 rounded-xl font-bold text-lg transition-all shadow-lg ${eliminationState.status !== 'reveal'
                  ? 'bg-purple-900/50 text-purple-700 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/50'
                }`}
              disabled={eliminationState.status !== 'reveal'}
            >
              ⏭ Next Round
            </button>

            <button
              onClick={async () => {
                if (confirm('Are you sure you want to reset the game? This cannot be undone.')) {
                  const newState = eliminationLogic.getInitialState();
                  setEliminationState(newState);
                  await rankingService.updateSession(selectedSession.id, {
                    elimination_state: JSON.stringify(newState)
                  });
                }
              }}
              className="p-4 rounded-xl font-bold text-lg bg-gray-700 hover:bg-gray-600 text-white transition-all shadow-lg"
            >
              ↺ Reset Game
            </button>
          </div>

          {/* Timer Preview */}
          <div className="bg-[#050b2b] rounded-xl p-8 flex justify-center border border-blue-900/50">
            <DotsTimer
              duration={eliminationState.timerDuration || 20}
              startTime={eliminationState.status === 'voting' ? eliminationState.timerStart : undefined}
            />
          </div>
        </div>

        {/* Right Column: Options Status */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xl font-bold text-gray-300">Options Status</h3>
          <div className="space-y-3">
            {eliminationState.options.map(opt => (
              <div
                key={opt.id}
                className={`relative overflow-hidden rounded-lg border transition-all ${opt.eliminated
                    ? 'bg-red-900/20 border-red-900/50 opacity-70'
                    : 'bg-white/5 border-white/10'
                  }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-lg">{opt.label}</span>
                    <span className="font-mono bg-black/30 px-2 py-1 rounded text-sm">
                      {opt.votes} votes
                    </span>
                  </div>

                  {/* Vote Bar */}
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${opt.eliminated ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${eliminationState.totalVotes > 0 ? (opt.votes / eliminationState.totalVotes) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {opt.eliminated && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px]">
                    <span className="text-red-500 font-bold uppercase tracking-widest border-2 border-red-500 px-4 py-1 -rotate-12">
                      Eliminated
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

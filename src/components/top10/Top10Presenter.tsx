'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import { rankingService } from '@/lib/pocketbase';

interface Top10PresenterProps {
  sessionId: string;
  state: Top10State;
  onStateChange: (state: Top10State) => void;
}

export default function Top10Presenter({ sessionId, state, onStateChange }: Top10PresenterProps) {
  const phase = state?.currentQuestion?.phase || 'intro';
  const votes = state?.currentQuestion?.votes || [];
  const totalPlayers = state?.allPlayerNames?.length || 0;
  const votedCount = votes.length;

  const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

  const handleStartVoting = useCallback(async () => {
    const newState = await top10Logic.startVoting(sessionId, state);
    onStateChange(newState);

    // If on trailer (17/01), jump to first question (17/05)
    if (state.currentFase === '17/01') {
      await rankingService.updateSession(sessionId, { current_fase: '17/05' });
    }
  }, [sessionId, state, onStateChange]);

  const handleShowResults = useCallback(async () => {
    const newState = await top10Logic.showResults(sessionId, state);
    onStateChange(newState);
  }, [sessionId, state, onStateChange]);

  // Auto-trigger results when all votes are in
  useEffect(() => {
    if (phase === 'voting' && votedCount >= totalPlayers && totalPlayers > 0) {
      handleShowResults();
    }
  }, [phase, votedCount, totalPlayers, handleShowResults]);

  const phaseRef = useRef(phase);
  const handleStartVotingRef = useRef(handleStartVoting);
  const handleShowResultsRef = useRef(handleShowResults);

  useEffect(() => {
    phaseRef.current = phase;
    handleStartVotingRef.current = handleStartVoting;
    handleShowResultsRef.current = handleShowResults;
  }, [phase, handleStartVoting, handleShowResults]);

  // Keyboard shortcuts: V = start voting, R = show results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

      const currentPhase = phaseRef.current;

      if ((e.key === 'v' || e.key === 'V') && currentPhase !== 'voting' && currentPhase !== 'results') {
        e.preventDefault();
        handleStartVotingRef.current();
      } else if ((e.key === 'r' || e.key === 'R') && currentPhase === 'voting') {
        e.preventDefault();
        handleShowResultsRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const PHASE_LABELS = {
    intro: 'Intro',
    voting: 'Stemmen',
    waiting: 'Wachten',
    results: 'Resultaten',
  };

  return (
    <div className="h-full w-full flex flex-col gap-3 min-h-0 overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Top bar */}
      <div className="bg-[#0A1752] p-3 rounded-lg text-white shadow-lg border border-blue-800 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold tracking-tight">
            Top 10
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-900 border border-blue-600 text-blue-200 uppercase font-semibold">
              Fase: {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
            </span>
            <span className={`text-xs font-bold ${votedCount >= totalPlayers ? 'text-green-300' : 'text-amber-300'}`}>
              Stemmen: {votedCount} / {totalPlayers || '–'}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartVoting}
            disabled={phase !== 'intro'}
            className={`px-4 py-2 rounded-lg font-bold text-base transition-all flex items-center gap-2 ${
              phase !== 'intro'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md active:scale-95'
            }`}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/20 text-xs font-mono font-bold">V</span>
            Start Stemmen
          </button>

          <button
            onClick={handleShowResults}
            disabled={phase !== 'voting'}
            className={`px-4 py-2 rounded-lg font-bold text-base transition-all flex items-center gap-2 ${
              phase !== 'voting'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 animate-pulse'
            }`}
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-white/20 text-xs font-mono font-bold">R</span>
            Toon Resultaten
          </button>

          {phase === 'voting' && (
            <div className="text-blue-200 animate-pulse text-xs font-medium ml-2">
              Resultaten verschijnen ook automatisch als iedereen heeft gestemd
            </div>
          )}
        </div>
      </div>

      {/* Results Preview (Keep for Presenter to see) */}
      {phase === 'results' && state?.currentQuestion?.results && state.currentQuestion.results.length > 0 && (
        <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-3 flex-1 min-h-0 flex flex-col shadow-lg overflow-hidden">
          <h4 className="text-white font-bold text-base mb-2 tracking-wider shrink-0">
            Top 10 Resultaten ({state.currentQuestion.results.length})
          </h4>
          <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
            {state.currentQuestion.results.map((result, i) => (
              <div key={result.playerName} className="flex items-center justify-between bg-gray-800/60 border border-gray-700/50 rounded p-2 text-xs">
                <span className="text-white font-medium">{i + 1}. {formatName(result.playerName)}</span>
                <span className="text-blue-400 font-bold">{result.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

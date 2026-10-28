'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';

interface Top3PresenterProps {
  sessionId: string;
  state: Top3State;
  heading?: string;
  mediaUrl?: string;
  onStateChange: (state: Top3State) => void;
}

export default function Top3Presenter({ sessionId, state, heading, mediaUrl, onStateChange }: Top3PresenterProps) {
  const phase = state?.currentQuestion?.phase || 'intro';
  const votes = state?.currentQuestion?.votes || [];
  const totalPlayers = state?.allPlayerNames?.length || 0;
  const votedCount = votes.length;

  const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

  const handleStartVoting = useCallback(async () => {
    const newState = await top3Logic.startVoting(sessionId, state);
    onStateChange(newState);
  }, [sessionId, state, onStateChange]);

  const handleShowResults = useCallback(async () => {
    const newState = await top3Logic.showResults(sessionId, state);
    onStateChange(newState);
  }, [sessionId, state, onStateChange]);

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
    <div className="h-full w-full flex gap-4 min-h-0 overflow-hidden" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Left column: Heading, Monster Image, and Results */}
      <div className="w-5/12 flex flex-col gap-2.5 min-h-0 h-full overflow-hidden">
        {heading && (
          <div className="bg-[#0A1752] border border-blue-800 rounded-lg p-2.5 shadow-lg text-center shrink-0">
            <h2 className="text-lg md:text-xl font-bold text-white whitespace-pre-line leading-snug">{heading}</h2>
          </div>
        )}

        {mediaUrl && (
          <div className="flex-1 min-h-[140px] max-h-[220px] bg-[#0e1629] border border-gray-800 rounded-lg p-2 flex justify-center items-center shadow-lg relative overflow-hidden shrink-0">
            {/\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl) ? (
              <video src={mediaUrl} className="max-w-full max-h-full object-contain rounded" muted playsInline autoPlay loop />
            ) : (
              <img src={mediaUrl} alt="Top 3 Media" className="max-w-full max-h-full object-contain rounded" />
            )}
          </div>
        )}

        {/* Results preview (when in results phase) */}
        {phase === 'results' && state?.currentQuestion?.results && state.currentQuestion.results.length > 0 && (
          <div className="flex-1 min-h-0 bg-[#0e1629] border border-gray-800 rounded-lg p-3 shadow-lg flex flex-col overflow-hidden">
            <h4 className="text-white font-bold text-base mb-2 shrink-0 flex items-center justify-between">
              <span>🏆 Top 3 Resultaten</span>
              <span className="text-xs text-yellow-400 font-normal">Zichtbaar op Display</span>
            </h4>
            <div className="space-y-1.5 flex-1 min-h-0 overflow-y-auto pr-1">
              {state.currentQuestion.results.map((result, i) => (
                <div key={result.playerName} className="flex items-center gap-2.5 bg-gray-800/70 rounded p-2 text-sm">
                  {result.playerName !== 'Overige spelers' ? (
                    <span className="text-xl font-black text-yellow-400 w-6 text-center">{i + 1}</span>
                  ) : (
                    <span className="w-6"></span>
                  )}
                  <span className="text-white font-medium flex-1 truncate">{formatName(result.playerName)}</span>
                  <span className="text-blue-300 font-bold">{result.percentage}%</span>
                  <span className="text-gray-400 text-xs">({result.votes})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: Controls and Votes */}
      <div className="w-7/12 flex flex-col gap-2.5 min-h-0 h-full overflow-hidden">
        {/* Top bar with status and buttons */}
        <div className="bg-[#0A1752] p-3 rounded-lg text-white shadow-lg border border-blue-800 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-bold tracking-tight">
              Top 3 · Vraag {(state?.currentQuestion?.questionIndex || 0) + 1}
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-0.5 rounded bg-blue-900 border border-blue-600 text-blue-200 uppercase font-semibold">
                Fase: {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
              </span>
              <span className="text-xs font-bold text-amber-300">
                Stemmen: {votedCount} / {totalPlayers || '–'}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStartVoting}
              disabled={phase === 'voting' || phase === 'results'}
              className={`px-4 py-2 rounded-lg font-bold text-base transition-all flex items-center gap-2 ${
                phase === 'voting' || phase === 'results'
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
          </div>
        </div>

        {/* Votes overview */}
        <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-3 flex-1 min-h-0 flex flex-col shadow-lg overflow-hidden">
          <div className="flex justify-between items-center mb-2 shrink-0">
            <h4 className="text-white font-bold text-base">
              Binnengekomen stemmen ({votedCount})
            </h4>
            <span className="text-xs text-gray-400">Live stemmen van telefoons</span>
          </div>
          {votes.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm italic">
              {phase === 'voting' ? 'Wachten op eerste stemmen...' : 'Nog geen stemmen ontvangen'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
              {votes.map((vote) => (
                <div key={vote.voterId} className="bg-gray-800/60 border border-gray-700/50 rounded p-2 text-xs">
                  <div className="text-white font-semibold truncate">{formatName(vote.voterName)}</div>
                  <div className="text-blue-400 truncate">&rarr; {formatName(vote.chosenPlayerName)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

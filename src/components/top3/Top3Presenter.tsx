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

  const handleNextQuestion = useCallback(async () => {
    const newState = await top3Logic.nextQuestion(sessionId, state);
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
      // Don't trigger if user is typing in an input field
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
    <div className="flex gap-6" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Left column: Image and Heading */}
      <div className="w-1/3 flex flex-col gap-4">
        {mediaUrl && (
          <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4 flex justify-center items-center shadow-lg">
            {/\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl) ? (
              <video src={mediaUrl} className="max-w-full max-h-[300px] rounded-lg" autoPlay muted loop playsInline />
            ) : (
              <img src={mediaUrl} alt="Top 3 Media" className="max-w-full max-h-[300px] rounded-lg object-contain" />
            )}
          </div>
        )}
        {heading && (
          <div className="bg-[#0A1752] border border-blue-800 rounded-lg p-4 shadow-lg text-center">
            <h2 className="text-2xl font-bold text-white whitespace-pre-line">{heading}</h2>
          </div>
        )}

        {/* Results preview */}
        {phase === 'results' && state?.currentQuestion?.results && state.currentQuestion.results.length > 0 && (
          <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
            <h4 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Top 3 Resultaten
            </h4>
            <div className="space-y-2">
              {state.currentQuestion.results.map((result, i) => (
                <div key={result.playerName} className="flex items-center gap-3 bg-gray-800/50 rounded p-3">
                  {result.playerName !== 'Overige spelers' ? (
                    <span className="text-2xl font-bold text-yellow-400 w-8 text-center">{i + 1}</span>
                  ) : (
                    <span className="w-8"></span>
                  )}
                  <span className="text-white font-medium flex-1">{formatName(result.playerName)}</span>
                  <span className="text-blue-300 font-bold">{result.percentage}%</span>
                  <span className="text-gray-400 text-sm">({result.votes} stemmen)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right column: Controls and Votes */}
      <div className="w-2/3 flex flex-col gap-4">
        {/* Top bar */}
        <div className="bg-[#0A1752] p-4 rounded-lg text-white shadow-lg border border-blue-800">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-2xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Top 3
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-blue-300">
                Vraag {(state?.currentQuestion?.questionIndex || 0) + 1} &bull; Fase: {PHASE_LABELS[phase as keyof typeof PHASE_LABELS]}
              </span>
              <span className="text-sm text-blue-300">
                Stemmen: {votedCount}/{totalPlayers}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* V button to start voting */}
            <button
              onClick={handleStartVoting}
              disabled={phase === 'voting' || phase === 'results'}
              className={`px-6 py-3 rounded font-bold text-lg transition-all flex items-center gap-2 ${phase === 'voting' || phase === 'results'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-white/20 text-sm font-mono">V</span>
              Start Stemmen
            </button>

            {/* Show results (R) */}
            <button
              onClick={handleShowResults}
              disabled={phase !== 'voting'}
              className={`px-6 py-3 rounded font-bold text-lg transition-all flex items-center gap-2 ${phase !== 'voting'
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-white/20 text-sm font-mono">R</span>
              Toon Resultaten
            </button>
          </div>
        </div>

        {/* Votes overview */}
        {phase === 'voting' && votes.length > 0 && (
          <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
            <h4 className="text-white font-bold text-lg mb-3" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
              Binnengekomen stemmen ({votedCount})
            </h4>
            <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto">
              {votes.map((vote) => (
                <div key={vote.voterId} className="bg-gray-800/50 rounded p-2 text-sm">
                  <div className="text-white font-medium">{formatName(vote.voterName)}</div>
                  <div className="text-blue-400 text-xs">&rarr; {formatName(vote.chosenPlayerName)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

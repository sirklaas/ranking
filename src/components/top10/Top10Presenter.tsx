'use client';

import React, { useEffect, useCallback } from 'react';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import { rankingService } from '@/lib/pocketbase';

interface Top10PresenterProps {
    sessionId: string;
    state: Top10State;
    onStateChange: (state: Top10State) => void;
}

export default function Top10Presenter({ sessionId, state, onStateChange }: Top10PresenterProps) {
    const phase = state.currentQuestion.phase;
    const votes = state.currentQuestion.votes;
    const totalPlayers = state.allPlayerNames.length;
    const votedCount = votes.length;

    const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

    const handleStartVoting = useCallback(async () => {
        const newState = await top10Logic.startVoting(sessionId, state);
        onStateChange(newState);

        // If we are on the trailer (17/01), jump to the first question (17/05)
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

    // Keyboard shortcuts: V = start voting
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

            if ((e.key === 'v' || e.key === 'V') && phase !== 'voting' && phase !== 'results') {
                e.preventDefault();
                handleStartVoting();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, handleStartVoting]);

    const PHASE_LABELS = {
        intro: 'Intro',
        voting: 'Stemmen',
        waiting: 'Wachten',
        results: 'Resultaten',
    };

    return (
        <div className="flex flex-col gap-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            {/* Top bar */}
            <div className="bg-[#0A1752] p-4 rounded-lg text-white shadow-lg border border-blue-800">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                        Top 10
                    </h3>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-blue-300">
                            Fase: {PHASE_LABELS[phase]}
                        </span>
                        <span className={`text-sm font-bold ${votedCount >= totalPlayers ? 'text-blue-400' : 'text-blue-300'}`}>
                            Stemmen: {votedCount}/{totalPlayers}
                        </span>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                    {/* V button to start voting */}
                    <button
                        onClick={handleStartVoting}
                        disabled={phase !== 'intro'}
                        className={`px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center gap-3 shadow-xl ${phase !== 'intro'
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:scale-105 text-white'
                            }`}
                    >
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-white/20 text-sm font-mono">V</span>
                        start stemmen
                    </button>

                    {phase === 'voting' && (
                        <div className="text-blue-200 animate-pulse text-sm font-medium">
                            Resultaten verschijnen automatisch zodra iedereen heeft gestemd...
                        </div>
                    )}
                </div>
            </div>

            {/* Results Preview (Keep for Presenter to see) */}
            {phase === 'results' && state.currentQuestion.results.length > 0 && (
                <div className="bg-[#0e1629] border border-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-bold text-lg mb-3 tracking-wider">
                        Resultaten ({state.currentQuestion.results.length})
                    </h4>
                    <div className="space-y-1">
                        {state.currentQuestion.results.map((result, i) => (
                            <div key={result.playerName} className="flex items-center justify-between bg-gray-800/50 rounded p-2 text-sm">
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

'use client';

import React, { useState, useMemo } from 'react';
import { Top10State } from '@/modules/top10/types';
import { hasPlayerVoted } from '@/modules/top10/logic';

interface Top10PlayerProps {
    state: Top10State;
    playerId: string;
    playerName: string;
    teamNumber: number;
    heading?: string;
    mediaUrl?: string;
    onVote: (chosenPlayerId: string, chosenPlayerName: string) => void;
}

export default function Top10Player({
    state,
    playerId,
    playerName,
    teamNumber,
    heading,
    mediaUrl,
    onVote,
}: Top10PlayerProps) {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);

    // Reset local submitted state if questionIndex changes (prevents "Je hebt gestemd" lingering on next slide)
    React.useEffect(() => {
        setSubmitted(false);
        setSelected(null);
        setQuery('');
    }, [state.currentQuestion.questionIndex]);
    const [showDropdown, setShowDropdown] = useState(false);
    const alreadyVoted = hasPlayerVoted(state, playerId);
    const isVoting = state.currentQuestion.phase === 'voting';
    const isResults = state.currentQuestion.phase === 'results';

    // Filter out the current player and match query
    const otherPlayers = useMemo(
        () => state.allPlayerNames.filter((name) => name !== playerName),
        [state.allPlayerNames, playerName]
    );

    const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

    const filteredPlayers = useMemo(() => {
        if (!query.trim()) return otherPlayers;
        const q = query.toLowerCase();
        return otherPlayers.filter((name) => name.toLowerCase().includes(q));
    }, [otherPlayers, query]);

    const handleSelect = (name: string) => {
        if (submitted || alreadyVoted) return;
        setSelected(name);
        setQuery(name);
        setShowDropdown(false);

        // Trigger vote immediately on selection
        onVote(name, name);
        setSubmitted(true);
    };

    const handleInputChange = (value: string) => {
        setQuery(value);
        setSelected(null);
        setShowDropdown(true);

        // Auto-select if exact match
        const exactMatch = otherPlayers.find(
            (n) => n.toLowerCase() === value.toLowerCase()
        );
        if (exactMatch) {
            setSelected(exactMatch);
        }
    };

    const isVideoMedia = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

    // Video phase (trailer) on phone - Never play videos or show voting lists here!
    if (isVideoMedia) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
                style={{
                    fontFamily: 'Barlow Semi Condensed, sans-serif',
                    background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
                }}
            >
                <div className="text-5xl mb-4 animate-pulse">🍿</div>
                <h2 className="text-white text-3xl font-bold mb-2">Kijk naar het grote scherm!</h2>
                <p className="text-white/70 text-lg">De trailer speelt daar af.</p>
            </div>
        );
    }

    // Already voted or just submitted
    if (alreadyVoted || submitted) {
        const chosenName =
            selected ||
            state.currentQuestion.votes.find((v) => v.voterId === playerId)
                ?.chosenPlayerName ||
            '';
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-6"
                style={{
                    fontFamily: 'Barlow Semi Condensed, sans-serif',
                    background:
                        'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
                }}
            >
                <div
                    className="text-center"
                    style={{
                        animation: 'top10PopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                >
                    <div className="text-6xl mb-4">✅</div>
                    <p className="text-white text-lg opacity-70 mb-2">
                        Je hebt gekozen voor:
                    </p>
                    <div className="rounded-2xl px-8 py-6 mx-auto inline-block shadow-2xl mb-4 bg-white/15 border border-white/20">
                        <span className="text-3xl font-bold text-white">{formatName(chosenName)}</span>
                    </div>
                    <p className="text-white/50 text-sm mt-4">
                        Wacht op de resultaten...
                    </p>
                </div>

                <style jsx>{`
          @keyframes top10PopIn {
            0% {
              transform: scale(0) rotate(-10deg);
              opacity: 0;
            }
            60% {
              transform: scale(1.1) rotate(2deg);
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
        `}</style>
            </div>
        );
    }

    // Results phase
    if (isResults) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-6"
                style={{
                    fontFamily: 'Barlow Semi Condensed, sans-serif',
                    background:
                        'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
                }}
            >
                <div className="text-white text-center">
                    <p className="text-lg opacity-70 mb-2">
                        De resultaten worden getoond
                    </p>
                    <h2 className="text-4xl font-bold">Kijk op het grote scherm!</h2>
                </div>
            </div>
        );
    }

    // Waiting for voting to start
    if (!isVoting) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center overflow-hidden"
                style={{
                    fontFamily: 'Barlow Semi Condensed, sans-serif',
                    background:
                        'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
                }}
            >
                {/* Media image */}
                {mediaUrl && (
                    <div className="absolute inset-0 z-0 h-full w-full pointer-events-none" style={{ animation: 'top10PopIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both', animationDelay: '0.2s' }}>
                        <div className="absolute inset-0 bg-black/20 z-10" />
                        <img src={mediaUrl} alt={heading || 'Top 10'} className="w-full h-full object-cover z-0" />
                    </div>
                )}

                {/* Logo band */}
                <div
                    className="relative z-20 w-full bg-cover bg-center bg-no-repeat shrink-0 top-0 left-0"
                    style={{ backgroundImage: 'url(/assets/band.webp)', height: '14vh' }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img src="/assets/ranking_logo.webp" alt="Ranking Logo" className="h-full max-h-28 w-auto object-contain p-2" />
                    </div>
                </div>

                {/* Heading */}
                {heading && (
                    <div className="relative z-20 text-center px-6 pt-6 pb-2 w-full">
                        <h1 className="text-white text-2xl leading-snug whitespace-pre-line" style={{ fontWeight: 300, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                            {heading}
                        </h1>
                    </div>
                )}

                {!mediaUrl && (
                    <div className="relative z-20 flex-1 flex items-center justify-center">
                        <p className="text-white/60 text-lg">Wacht tot het stemmen begint...</p>
                    </div>
                )}
            </div>
        );
    }

    // Voting view — player list only
    return (
        <div
            className="min-h-screen flex flex-col p-4 pb-12"
            style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                background:
                    'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
            }}
        >
            {/* Header - NOW AT THE TOP */}
            <div className="text-center mb-6 pt-4">
                <h2 className="text-white text-3xl font-bold uppercase tracking-tight">Kies iemand!</h2>
                <div className="w-16 h-1 bg-white/20 mx-auto mt-2 rounded-full" />
                <p className="text-white/60 text-sm mt-3">
                    {formatName(playerName)}, wie kies jij?
                </p>
            </div>

            {/* Quick-pick list (scrollable) - PRIMARY INTERACTION */}
            <div className="flex-1 overflow-y-auto space-y-2 max-w-sm mx-auto w-full px-4 pt-[140px]">
                {otherPlayers.map((name) => {
                    const isSelected = selected === name;
                    return (
                        <button
                            key={name}
                            onClick={() => handleSelect(name)}
                            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg"
                            style={{
                                backgroundColor: isSelected
                                    ? 'rgba(255,255,255,0.25)'
                                    : 'rgba(255,255,255,0.08)',
                                border: isSelected
                                    ? '2px solid rgba(255,255,255,0.6)'
                                    : '2px solid rgba(255,255,255,0.1)',
                            }}
                        >
                            <div
                                className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                    borderColor: isSelected
                                        ? '#4ECDC4'
                                        : 'rgba(255,255,255,0.4)',
                                    backgroundColor: isSelected ? '#4ECDC4' : 'transparent',
                                }}
                            >
                                {isSelected && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                                )}
                            </div>
                            <span
                                className="text-lg font-bold"
                                style={{
                                    color: isSelected ? 'white' : 'rgba(255,255,255,0.9)',
                                }}
                            >
                                {formatName(name)}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

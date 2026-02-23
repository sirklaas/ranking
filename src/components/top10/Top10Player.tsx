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
        setSelected(name);
        setQuery(name);
        setShowDropdown(false);
    };

    const handleConfirm = () => {
        if (!selected || submitted || alreadyVoted) return;
        // Validate selection is from the player list
        if (!otherPlayers.includes(selected)) return;
        onVote(selected, selected);
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

    // Voting view — text input with autocomplete
    return (
        <div
            className="min-h-screen flex flex-col p-4"
            style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                background:
                    'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
            }}
        >
            {/* Header */}
            <div className="text-center mb-6 pt-4">
                <h2 className="text-white text-2xl font-bold">Kies iemand!</h2>
                <p className="text-white/60 text-sm mt-1">
                    {formatName(playerName)}, typ een naam
                </p>
            </div>

            {/* Search input */}
            <div className="relative mx-auto w-full max-w-sm mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Typ een naam..."
                    className="w-full px-5 py-4 rounded-xl text-lg bg-white/10 text-white placeholder-white/40 border-2 border-white/20 focus:border-white/50 focus:outline-none transition-all"
                    style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                    autoComplete="off"
                />

                {/* Autocomplete dropdown */}
                {showDropdown && query.trim() !== '' && filteredPlayers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2a6c]/95 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto shadow-2xl">
                        {filteredPlayers.map((name) => (
                            <button
                                key={name}
                                onClick={() => handleSelect(name)}
                                className="w-full text-left px-5 py-3 text-white hover:bg-white/15 transition-colors text-lg border-b border-white/5 last:border-b-0"
                                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                            >
                                {/* Highlight matching part */}
                                {(() => {
                                    const formatted = formatName(name);
                                    const idx = formatted.toLowerCase().indexOf(query.toLowerCase());
                                    if (idx === -1) return formatted;
                                    return (
                                        <>
                                            {formatted.slice(0, idx)}
                                            <span className="text-yellow-300 font-bold">
                                                {formatted.slice(idx, idx + query.length)}
                                            </span>
                                            {formatted.slice(idx + query.length)}
                                        </>
                                    );
                                })()}
                            </button>
                        ))}
                    </div>
                )}

                {/* No results */}
                {showDropdown && query.trim() !== '' && filteredPlayers.length === 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a2a6c]/95 backdrop-blur-md border border-white/20 rounded-xl p-4 text-white/50 text-center">
                        Geen speler gevonden
                    </div>
                )}
            </div>

            {/* Selected indicator */}
            {selected && (
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm">
                        <span className="text-green-400">✓</span>
                        <span>{formatName(selected)}</span>
                    </div>
                </div>
            )}

            {/* Quick-pick list (scrollable) */}
            <div className="flex-1 overflow-y-auto pb-24 space-y-2 max-w-sm mx-auto w-full">
                {otherPlayers.map((name) => {
                    const isSelected = selected === name;
                    return (
                        <button
                            key={name}
                            onClick={() => handleSelect(name)}
                            className="w-full flex items-center gap-4 px-5 py-3 rounded-xl transition-all active:scale-[0.98]"
                            style={{
                                backgroundColor: isSelected
                                    ? 'rgba(255,255,255,0.2)'
                                    : 'rgba(255,255,255,0.07)',
                                border: isSelected
                                    ? '2px solid rgba(255,255,255,0.5)'
                                    : '2px solid transparent',
                            }}
                        >
                            <div
                                className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                    borderColor: isSelected
                                        ? '#4ECDC4'
                                        : 'rgba(255,255,255,0.3)',
                                    backgroundColor: isSelected ? '#4ECDC4' : 'transparent',
                                }}
                            >
                                {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                )}
                            </div>
                            <span
                                className="text-base font-medium"
                                style={{
                                    color: isSelected ? 'white' : 'rgba(255,255,255,0.8)',
                                }}
                            >
                                {formatName(name)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Confirm button — fixed at bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A1752] via-[#0A1752]/95 to-transparent">
                <button
                    onClick={handleConfirm}
                    disabled={!selected}
                    className="w-full py-4 rounded-xl text-xl font-bold transition-all active:scale-95"
                    style={{
                        backgroundColor: selected ? '#0A1752' : '#333',
                        color: 'white',
                        border: selected ? '2px solid white' : '2px solid #555',
                        opacity: selected ? 1 : 0.5,
                    }}
                >
                    {selected ? `Bevestig: ${formatName(selected)}` : 'Kies een persoon'}
                </button>
            </div>
        </div>
    );
}

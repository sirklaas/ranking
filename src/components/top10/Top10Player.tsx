'use client';

import React, { useState, useMemo } from 'react';
import { Top10State } from '@/modules/top10/types';
import { hasPlayerVoted } from '@/modules/top10/logic';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';

interface Top10PlayerProps {
    state: Top10State;
    playerId: string;
    playerName: string;
    teamNumber: number;
    heading?: string;
    mediaUrl?: string;
    allPlayerNames?: string[];
    onVote: (chosenPlayerId: string, chosenPlayerName: string) => void;
}

const TOP10_HEADINGS: Record<string, string> = {
    '17/05': 'Je hebt een pijnlijke pukkel op je bil waar je niet bij kan. \n Wie mag hem voor je uitknijpen?',
    '17/06': 'Wie denkt dat ie always gelijk heeft?',
    '17/07': 'Wie zou meedoen [tegen betaling uiteraard] \n aan de naakte fotoshoot van het Perfecte Plaatje?',
    '17/08': 'Wie is de grootste zuiplap van de familie?',
    '17/09': 'Wie kan absoluut niet tegen kritiek?',
    '17/10': 'Wie laat weleens een wind?',
    '17/11': 'Wie maakt de allerlelijkste Selfies ?',
    '17/12': 'Wie is het meest verslaafd aan Social Media?',
    '17/13': 'Wie krijgt de meeste bekeuringen?',
    '17/14': 'Jullie doen mee met Temptation Island. \n Wie heeft als eerste iemand tussen de lakens?',
};

export default function Top10Player({
    state,
    playerId,
    playerName,
    teamNumber,
    heading: propHeading,
    mediaUrl,
    allPlayerNames,
    onVote,
}: Top10PlayerProps) {
    // Determine the active heading from hardcoded list or prop
    const activeFase = state.currentFase || '';
    const hardcodedHeading = TOP10_HEADINGS[activeFase];
    const displayHeading = hardcodedHeading || propHeading;
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Reset local submitted state if questionIndex or faseKey changes (prevents "Je hebt gestemd" lingering on next slide)
    React.useEffect(() => {
        setSubmitted(false);
        setSelected(null);
        setQuery('');
    }, [state?.currentQuestion?.questionIndex, state?.currentFase, faseKey]);

    const isVoting = state?.currentQuestion?.phase === 'voting';
    const isResults = state?.currentQuestion?.phase === 'results';

    const isMatchingFase = !state?.currentFase || !faseKey || state.currentFase === faseKey;
    const alreadyVoted = isMatchingFase && hasPlayerVoted(state, playerId || '');

    const rawPool: string[] = Array.isArray(state?.allPlayerNames) && state.allPlayerNames.length > 0
        ? state.allPlayerNames
        : Array.isArray(allPlayerNames)
        ? allPlayerNames
        : [];

    const formatName = (name: unknown) => {
        if (typeof name !== 'string') return '';
        return name.replace(/^\s*\d+[\s_-]*/, '');
    };

    // Filter out the current player and show ONLY players from OTHER teams
    const otherPlayers = useMemo(
        () => rawPool
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
            .filter((name) => {
                const cleanName = formatName(name).toLowerCase();
                const myCleanName = formatName(playerName).toLowerCase();
                // 1. Exclude player's own name
                if (cleanName === myCleanName) return false;

                // 2. Exclude players from player's own team (only other teams)
                if (teamNumber) {
                    const match = name.match(/^\s*(\d+)[\s_-]/);
                    if (match && parseInt(match[1], 10) === Number(teamNumber)) {
                        return false;
                    }
                }
                return true;
            }),
        [rawPool, playerName, teamNumber]
    );

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
        return <TrailerTitleCard title="Top 10" fase="17/01" />;
    }

    // Already voted or just submitted
    if (alreadyVoted || submitted) {
        const chosenName =
            selected ||
            state?.currentQuestion?.votes?.find((v) => v.voterId === playerId)
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
                className="min-h-screen flex flex-col items-center justify-start pt-24 overflow-hidden"
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
                        <img src={mediaUrl} alt={displayHeading || 'Top 10'} className="w-full h-full object-cover z-0" />
                    </div>
                )}

                {/* Logo band */}
                <div
                    className="relative z-20 w-full bg-cover bg-center bg-no-repeat shrink-0 top-0 left-0"
                    style={{ backgroundImage: 'url(/assets/band.webp)', height: '14vh' }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <CreepyRankingLogo size="sm" />
                    </div>
                </div>

                {/* Heading */}
                {displayHeading && (
                    <div className="relative z-20 text-center px-6 pt-6 pb-2 w-full">
                        <h1 className="text-white text-2xl leading-snug whitespace-pre-line" style={{ fontWeight: 300, textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                            {displayHeading}
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
            {/* Header — compact, consistent with Top 3 */}
            <div className="text-center mb-4 pt-2">
                <h2
                    className="text-white text-3xl sm:text-4xl uppercase tracking-wider font-normal"
                    style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif', fontWeight: 400 }}
                >
                    Kies iemand!
                </h2>
                <div className="w-16 h-1 bg-white/30 mx-auto mt-2 rounded-full" />
                <p
                    className="text-white/70 text-base mt-2 font-normal"
                    style={{ fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif' }}
                >
                    {formatName(playerName)}, wie kies jij?
                </p>
            </div>

            {/* Player list in 2 columns with gradient name blocks (matching Top 3) */}
            <div className="flex-1 overflow-y-auto pb-24">
                <div className="grid grid-cols-2 gap-2.5 max-w-md mx-auto w-full">
                    {otherPlayers.map((name) => {
                        const isSelected = selected === name;
                        return (
                            <label
                                key={name}
                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all select-none cursor-pointer border border-white/80 shadow-md active:scale-95 ${
                                    isSelected
                                        ? 'bg-gradient-to-r from-pink-400 to-purple-500 shadow-white/40'
                                        : 'bg-gradient-to-r from-pink-300 to-purple-400 hover:from-pink-400 hover:to-purple-500'
                                }`}
                                style={{
                                    fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
                                    fontWeight: 400,
                                    boxShadow: isSelected ? '0 0 10px rgba(255, 255, 255, 0.6)' : undefined,
                                }}
                            >
                                <input
                                    type="radio"
                                    name="top10vote"
                                    value={name}
                                    checked={isSelected}
                                    onChange={() => handleSelect(name)}
                                    className="hidden"
                                />

                                {/* Custom radio circle */}
                                <div
                                    className="w-4 h-4 rounded-full border border-gray-700/60 flex items-center justify-center flex-shrink-0 transition-all bg-white/40"
                                    style={{
                                        borderColor: isSelected ? '#1f2937' : 'rgba(31, 41, 55, 0.5)',
                                    }}
                                >
                                    {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-gray-900" />
                                    )}
                                </div>

                                {/* Player name in Barlow 400 */}
                                <span
                                    className="text-base sm:text-lg truncate flex-1 uppercase tracking-wide leading-tight text-gray-800 font-normal"
                                    style={{
                                        fontFamily: '"Barlow Semi Condensed", "Barlow", sans-serif',
                                        fontWeight: 400,
                                    }}
                                >
                                    {formatName(name)}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

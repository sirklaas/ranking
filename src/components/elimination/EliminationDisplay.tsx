import React from 'react';
import { EliminationState } from '@/types';
import { motion } from 'framer-motion';
import { BlueNeonTimer } from './BlueNeonTimer';

interface EliminationDisplayProps {
    state: EliminationState;
}

export const EliminationDisplay: React.FC<EliminationDisplayProps> = ({ state }) => {
    const { options, status, totalVotes, timerStart, timerDuration } = state;

    // Calculate percentages
    const getPercentage = (votes: number) => {
        if (totalVotes === 0) return 0;
        return Math.round((votes / totalVotes) * 100);
    };

    const sortedOptions = [...options].sort((a, b) => b.votes - a.votes);
    const winner = sortedOptions[0];

    return (
        <div className="w-full h-full bg-black text-white relative overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-8 text-center z-10">
                <h1 className="text-5xl font-bold uppercase tracking-widest" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    Elimination Round {state.round}
                </h1>
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                {status === 'voting' && (
                    <div className="w-full max-w-4xl">
                        <div className="grid grid-cols-2 gap-8 mb-12">
                            {options.map((option) => (
                                <div key={option.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-8 text-center">
                                    <h2 className="text-4xl font-bold">{option.label}</h2>
                                </div>
                            ))}
                        </div>
                        <BlueNeonTimer
                            duration={timerDuration || 20}
                            startTime={timerStart}
                            totalVotes={totalVotes}
                        />
                    </div>
                )}

                {status === 'results' && (
                    <div className="w-full max-w-5xl grid grid-cols-4 gap-4 items-end h-96">
                        {options.map((option) => (
                            <div key={option.id} className="flex flex-col items-center justify-end h-full">
                                <div className="text-2xl font-bold mb-2">{getPercentage(option.votes)}%</div>
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${getPercentage(option.votes)}%` }}
                                    className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-lg relative"
                                >
                                    <div className="absolute bottom-4 w-full text-center font-bold text-xl drop-shadow-md">
                                        {option.label}
                                    </div>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                )}

                {status === 'reveal' && winner && (
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute inset-0 bg-gradient-to-br from-blue-900 to-purple-900 flex flex-col items-center justify-center z-50"
                    >
                        <h2 className="text-4xl mb-4 opacity-80">The Winner Is</h2>
                        <h1 className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
                            {winner.label}
                        </h1>
                        <div className="mt-8 text-2xl opacity-60">Moving to next round...</div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

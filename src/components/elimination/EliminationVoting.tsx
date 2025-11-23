import React from 'react';
import { EliminationOption } from '@/types';
import { motion } from 'framer-motion';

interface EliminationVotingProps {
    options: EliminationOption[];
    onVote: (optionId: string) => void;
    hasVoted: boolean;
    isVotingOpen: boolean;
}

export const EliminationVoting: React.FC<EliminationVotingProps> = ({
    options,
    onVote,
    hasVoted,
    isVotingOpen
}) => {
    if (!isVotingOpen) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>Eerste Ronde</h2>
                <p className="opacity-80">Je kan zo dadelijk gaan stemmen</p>
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold">Stem Ingediend!</h2>
                <p className="opacity-80">Succes!</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <h2 className="text-3xl font-bold text-center mb-6 text-white" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                Eerste Ronde
            </h2>
            <div className="grid grid-cols-1 gap-4 p-4 flex-1 overflow-y-auto">
                {options.map((option) => (
                    <motion.button
                        key={option.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onVote(option.id)}
                        className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 flex flex-col items-center justify-center text-white shadow-lg hover:bg-white/20 transition-colors"
                    >
                        <span className="text-2xl font-bold tracking-wide">{option.label}</span>
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

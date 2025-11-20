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
                <h2 className="text-2xl font-bold mb-4">Voting Closed</h2>
                <p className="opacity-80">Wait for the results...</p>
            </div>
        );
    }

    if (hasVoted) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white p-6 text-center">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-2xl font-bold">Vote Submitted!</h2>
                <p className="opacity-80">Good luck!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-4 p-4 h-full overflow-y-auto">
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
    );
};

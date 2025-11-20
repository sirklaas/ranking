import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface BlueNeonTimerProps {
    duration: number; // seconds
    startTime?: number; // timestamp
    totalVotes: number;
    maxVotes?: number; // Optional, for progress bar scaling if needed
    onComplete?: () => void;
}

export const BlueNeonTimer: React.FC<BlueNeonTimerProps> = ({
    duration,
    startTime,
    totalVotes,
    onComplete
}) => {
    const [progress, setProgress] = useState(100);
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (!startTime) {
            setProgress(100);
            setTimeLeft(duration);
            return;
        }

        const interval = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const remaining = Math.max(0, duration - elapsed);

            setTimeLeft(remaining);
            setProgress((remaining / duration) * 100);

            if (remaining <= 0) {
                clearInterval(interval);
                if (onComplete) onComplete();
            }
        }, 100);

        return () => clearInterval(interval);
    }, [startTime, duration, onComplete]);

    return (
        <div className="w-full flex flex-col items-center justify-center p-4">
            {/* Vote Counter */}
            <div className="text-6xl font-bold text-white mb-4 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                {totalVotes} <span className="text-2xl opacity-70">votes</span>
            </div>

            {/* Neon Progress Bar */}
            <div className="relative w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-blue-900">
                <motion.div
                    className="absolute top-0 left-0 h-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)]"
                    initial={{ width: '100%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.1 }}
                />
            </div>

            {/* Time Text */}
            <div className="mt-2 text-cyan-300 font-mono text-xl">
                {Math.ceil(timeLeft)}s
            </div>
        </div>
    );
};

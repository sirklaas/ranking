import React, { useEffect, useState } from 'react';

interface DotsTimerProps {
    duration: number; // Total duration in seconds (e.g., 20)
    startTime?: number; // Timestamp when the timer started
    className?: string;
}

export const DotsTimer: React.FC<DotsTimerProps> = ({ duration, startTime, className = '' }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (!startTime) {
            setTimeLeft(duration);
            return;
        }

        const updateTimer = () => {
            const now = Date.now();
            const elapsed = (now - startTime) / 1000;
            const remaining = Math.max(0, duration - elapsed);
            setTimeLeft(remaining);
        };

        // Update immediately
        updateTimer();

        // Update every frame for smooth disappearance if we wanted to animate opacity, 
        // but for "disappearing dots" integer steps are fine. 
        // However, to be precise with the "second" boundaries, a frequent interval is better.
        const interval = setInterval(updateTimer, 100);

        return () => clearInterval(interval);
    }, [startTime, duration]);

    // Calculate how many dots should be visible
    // If 20 seconds total, and 19.5s left, we show 20 dots.
    // If 19.0s left, we show 19 dots? Or 20 until 19.0?
    // Usually "20 dots for 20 seconds" means at T=0 (start), 20 dots.
    // At T=1s, 19 dots.
    // So ceil(timeLeft) is appropriate.
    const activeDots = Math.ceil(timeLeft);

    return (
        <div className={`flex items-center justify-between w-full gap-1 ${className}`}>
            {Array.from({ length: duration }).map((_, index) => {
                // Dots are ordered from left to right? Or right to left?
                // Usually timers count down. If we have a row: [1][2]...[20]
                // Should they disappear from the right? [1]...[19] [ ]
                // Yes, usually progress bars deplete from right to left (or fill left to right).
                // So we show dots if index < activeDots.
                const isActive = index < activeDots;

                return (
                    <div
                        key={index}
                        className={`
              rounded-full transition-all duration-300
              ${isActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] scale-100 opacity-100' : 'bg-cyan-900/20 scale-50 opacity-0'}
            `}
                        style={{
                            width: '100%', // Responsive width based on container and gap
                            paddingBottom: 'min(2%, 20px)', // Aspect ratio trick or just fixed height?
                            // Let's try a fixed height but responsive width
                            flex: 1,
                            height: 'auto',
                            aspectRatio: '1/1',
                            maxWidth: '24px'
                        }}
                    />
                );
            })}
        </div>
    );
};

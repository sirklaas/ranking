"use client";
import React, { useRef, useEffect } from 'react';
import type { FaseCommonProps } from '@/types/fases';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, mediaUrl }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Auto-play the video when loaded
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const tryPlay = () => {
            v.muted = false;
            v.volume = 1;
            v.play().catch(() => {
                // Fallback to muted if autoplay is restricted
                v.muted = true;
                v.play().catch(e => console.log('[DisplayView] autoplay blocked', e));
            });
        };

        if (v.readyState >= 3) {
            tryPlay();
        } else {
            v.addEventListener('canplay', tryPlay, { once: true });
        }

        return () => v.removeEventListener('canplay', tryPlay);
    }, [mediaUrl]);

    const handleVideoEnded = () => {
        // When the end trailer finishes playing, redirect the display
        console.log('[Finale] Video ended, redirecting...');
        window.location.href = 'https://www.end.pinkmilk.eu/display.html';
    };

    const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden">
            {mediaUrl && isVideo ? (
                <video
                    key={`${faseKey}-${mediaUrl}`}
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full h-full object-contain"
                    playsInline
                    autoPlay
                    onEnded={handleVideoEnded}
                    onTimeUpdate={(e) => {
                        const vid = e.currentTarget;
                        // Jump slightly early to prevent black frames
                        if (vid.duration > 0 && vid.duration - vid.currentTime < 0.4 && !vid.paused) {
                            handleVideoEnded();
                        }
                    }}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-purple-900 to-black">
                    <p className="text-2xl mb-4 font-light opacity-80">bezig met laden van de finale...</p>
                    <div className="flex gap-4">
                        <button
                            onClick={handleVideoEnded}
                            className="px-6 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/50 rounded-lg text-sm"
                        >
                            overslaan en naar eindscherm
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DisplayView;

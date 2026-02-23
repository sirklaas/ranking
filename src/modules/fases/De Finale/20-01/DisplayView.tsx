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
        window.location.href = 'https://www.end.pinkmilk.eu/display.html';
    };

    const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

    return (
        <div className="fixed inset-0 w-full h-full bg-black z-50">
            {mediaUrl && isVideo ? (
                <video
                    key={`${faseKey}-${mediaUrl}`}
                    ref={videoRef}
                    src={mediaUrl}
                    className="w-full h-full object-contain"
                    playsInline
                    onEnded={handleVideoEnded}
                />
            ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white">
                    <p className="text-2xl mb-4">Please assign "end.m4v" as the media for this phase in the Presenter setup.</p>
                    <button
                        onClick={handleVideoEnded}
                        className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-lg"
                    >
                        Force Redirect to End Display
                    </button>
                </div>
            )}
        </div>
    );
};

export default DisplayView;

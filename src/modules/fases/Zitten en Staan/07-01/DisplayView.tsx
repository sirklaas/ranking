"use client";
import React, { useRef, useEffect, useState } from 'react';
import type { FaseCommonProps } from '@/types/fases';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, heading, mediaUrl }) => {
  const headingText = heading || 'Zitten en Staan';
  const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [tallies, setTallies] = useState<{ red: number; blue: number }>({ red: 0, blue: 0 });

  // Fetch real-time vote tallies for this question
  useEffect(() => {
    if (!sessionId || !faseKey) return;
    let active = true;

    const fetchTallies = async () => {
      try {
        const res = await fetch(`/api/zitten-vote?sessionId=${sessionId}&fase=${faseKey}`);
        if (res.ok && active) {
          const data = await res.json();
          if (data.success) {
            setTallies({ red: data.red || 0, blue: data.blue || 0 });
          }
        }
      } catch {}
    };

    fetchTallies();
    const timer = setInterval(fetchTallies, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sessionId, faseKey]);

  // Play video with sound once loaded
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const tryPlay = () => {
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => console.log('[DisplayView] autoplay blocked'));
      });
    };

    if (v.readyState >= 3) {
      tryPlay();
    } else {
      v.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => v.removeEventListener('canplay', tryPlay);
  }, [mediaUrl, faseKey]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black select-none" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Full-screen media */}
      {mediaUrl && isVideo ? (
        <video
          key={`${faseKey}-${mediaUrl}`}
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          preload="auto"
          onTimeUpdate={(e) => {
            const vid = e.currentTarget;
            if (vid.duration > 0 && vid.duration - vid.currentTime < 0.2 && !vid.paused) {
              vid.pause();
            }
          }}
          onEnded={(e) => {
            e.currentTarget.pause();
          }}
        />
      ) : mediaUrl ? (
        <img src={mediaUrl} alt={headingText} className="absolute inset-0 w-full h-full object-contain" />
      ) : null}

      {/* Two rounded squares on the display: Red bottom-left, Blue bottom-right */}
      {faseKey !== '07/01' && (
        <>
          {/* Bottom Left: Red Rounded Square */}
          <div
            className="fixed bottom-8 left-8 z-40 flex flex-col items-center justify-center w-36 h-36 md:w-44 md:h-44 rounded-3xl text-white select-none shadow-[0_0_40px_rgba(220,38,38,0.7)] border-4 border-red-400/80 transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 50%, #742a2a 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-5xl md:text-7xl font-black font-mono leading-none tracking-tight drop-shadow-md">
              {tallies.red}
            </span>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-red-200 mt-2 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
              Rood
            </span>
          </div>

          {/* Bottom Right: Blue Rounded Square */}
          <div
            className="fixed bottom-8 right-8 z-40 flex flex-col items-center justify-center w-36 h-36 md:w-44 md:h-44 rounded-3xl text-white select-none shadow-[0_0_40px_rgba(37,99,235,0.7)] border-4 border-blue-400/80 transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, #3182ce 0%, #2b6cb0 50%, #1a365d 100%)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="text-5xl md:text-7xl font-black font-mono leading-none tracking-tight drop-shadow-md">
              {tallies.blue}
            </span>
            <span className="text-xs md:text-sm font-bold tracking-widest uppercase text-blue-200 mt-2 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
              Blauw
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default DisplayView;

"use client";
import React, { useRef, useEffect, useState } from 'react';
import type { FaseCommonProps } from '@/types/fases';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, heading, mediaUrl }) => {
  const headingText = heading || 'Zitten en Staan';
  const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [tallies, setTallies] = useState<{ red: number; blue: number }>({ red: 0, blue: 0 });

  // Fetch real-time vote tallies for this question - resets to zero immediately on new slide
  useEffect(() => {
    // Instantly reset tallies to zero on each new slide
    setTallies({ red: 0, blue: 0 });

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

  // Ensure video on Display is 100% permanently MUTED (Presenter MacBook plays audio to speakers)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    v.muted = true;
    v.volume = 0;
    v.play().catch(() => {});
  }, [mediaUrl, faseKey]);

  return (
    <div className="fixed inset-0 w-full h-full bg-black select-none" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Full-screen media - strictly muted on display */}
      {mediaUrl && isVideo ? (
        <video
          key={`${faseKey}-${mediaUrl}`}
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          autoPlay
          muted
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

      {/* Two rounded squares on the display: Red bottom-left, Blue bottom-right (doubled size, no text) */}
      {/* Bottom Left: Red Rounded Square */}
      <div
        className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl text-white select-none shadow-[0_0_25px_rgba(220,38,38,0.8)] border-2 border-red-400/80 transition-all duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #e53e3e 0%, #c53030 50%, #742a2a 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-2xl md:text-3xl font-black font-mono leading-none drop-shadow-md">
          {tallies.red}
        </span>
      </div>

      {/* Bottom Right: Blue Rounded Square */}
      <div
        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl text-white select-none shadow-[0_0_25px_rgba(37,99,235,0.8)] border-2 border-blue-400/80 transition-all duration-300 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #3182ce 0%, #2b6cb0 50%, #1a365d 100%)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span className="text-2xl md:text-3xl font-black font-mono leading-none drop-shadow-md">
          {tallies.blue}
        </span>
      </div>
    </div>
  );
};

export default DisplayView;

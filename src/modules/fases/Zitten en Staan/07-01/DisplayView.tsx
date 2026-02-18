"use client";
import React, { useRef, useEffect } from 'react';
import type { FaseCommonProps } from '@/types/fases';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, heading, mediaUrl }) => {
  const headingText = heading || 'Zitten en Staan';
  const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);

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
    <div className="fixed inset-0 w-full h-full bg-black" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
      {/* Full-screen media */}
      {mediaUrl && isVideo ? (
        <video
          key={`${faseKey}-${mediaUrl}`}
          ref={videoRef}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-contain"
          playsInline
          preload="auto"
        />
      ) : mediaUrl ? (
        <img src={mediaUrl} alt={headingText} className="absolute inset-0 w-full h-full object-contain" />
      ) : null}

      {/* Heading overlay in top 1/3 */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center px-8 text-center z-10"
        style={{ height: '33%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}
      >
        <h1
          className="text-white text-5xl font-light whitespace-pre-line"
          style={{ textShadow: '0 3px 16px rgba(0,0,0,0.8)', fontWeight: 300 }}
        >
          {headingText}
        </h1>
      </div>
    </div>
  );
};

export default DisplayView;

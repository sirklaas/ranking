"use client";
import React, { useRef, useEffect, useState } from 'react';
import type { FaseCommonProps } from '@/types/fases';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, heading, mediaUrl }) => {
  const headingText = heading || 'Zitten en Staan';
  const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  // Play video once it has loaded enough data
  useEffect(() => {
    setVideoReady(false);
    const v = videoRef.current;
    if (!v) return;

    const handleCanPlay = () => {
      setVideoReady(true);
      v.muted = false;
      v.volume = 1;
      v.play().catch(() => {
        // If unmuted play fails, retry muted
        v.muted = true;
        v.play().catch(() => console.log('[DisplayView] autoplay fully blocked'));
      });
    };

    v.addEventListener('canplay', handleCanPlay);
    // In case it's already ready
    if (v.readyState >= 3) handleCanPlay();

    return () => v.removeEventListener('canplay', handleCanPlay);
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
          style={{ opacity: videoReady ? 1 : 0, transition: 'opacity 0.3s' }}
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

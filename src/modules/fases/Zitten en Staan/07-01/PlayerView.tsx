"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { FaseCommonProps } from '@/types/fases';

const DELAY_MS = 3000; // wait for display video to finish

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, heading, mediaUrl }) => {
  const [choice, setChoice] = useState<'red' | 'blue' | null>(null);
  const [buttonsReady, setButtonsReady] = useState(false);
  const prevFaseRef = useRef(faseKey);
  const isVideo = mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);
  const headingText = heading || 'Zitten en Staan';

  // Reset choice + delay when faseKey changes (next question)
  useEffect(() => {
    if (faseKey !== prevFaseRef.current) {
      setChoice(null);
      setButtonsReady(false);
      prevFaseRef.current = faseKey;
    }
    const timer = setTimeout(() => setButtonsReady(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [faseKey]);

  // Inject keyframe animations once
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'zs-keyframes';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes zsPopIn {
        0%   { transform: scale(0); opacity: 0; }
        60%  { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes zsFadeUp {
        0%   { opacity: 0; transform: translateY(30px); }
        100% { opacity: 1; transform: translateY(0); }
      }
      @keyframes zsPulse {
        0%, 100% { opacity: 0.4; }
        50%      { opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // ── Full-screen colour after pressing ──
  if (choice) {
    const bg = choice === 'red'
      ? 'linear-gradient(135deg, #e53e3e 0%, #c53030 50%, #9b2c2c 100%)'
      : 'linear-gradient(135deg, #3182ce 0%, #2b6cb0 50%, #2c5282 100%)';

    return (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: bg, fontFamily: 'Barlow Semi Condensed, sans-serif' }}
      >
        <div className="text-center" style={{ animation: 'zsPopIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <div className="text-white text-6xl font-bold mb-2" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            {choice === 'red' ? '🔴' : '🔵'}
          </div>
          <div className="text-white/60 text-lg mt-4">Wacht op de volgende vraag…</div>
        </div>
      </div>
    );
  }

  // ── Normal view: video background + heading + red/blue buttons ──
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
    >
      {/* Full-screen media background */}
      {mediaUrl && isVideo ? (
        <video
          key={mediaUrl}
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          loop
        />
      ) : mediaUrl ? (
        <img src={mediaUrl} alt={headingText} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)' }}
        />
      )}

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content on top of media */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Logo band */}
        <div
          className="relative bg-cover bg-center bg-no-repeat shrink-0"
          style={{
            backgroundImage: 'url(/assets/band.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '14vh',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/assets/ranking_logo.webp"
              alt="Ranking Logo"
              width={256}
              height={128}
              className="h-full max-h-28 w-auto object-contain p-2"
              priority
            />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center px-6 pt-6 pb-2">
          <h1
            className="text-white text-2xl font-bold leading-snug"
            style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          >
            {headingText}
          </h1>
        </div>

        {/* Red / Blue buttons */}
        <div className="flex-1 flex items-center justify-center px-6">
          {buttonsReady ? (
            <div
              className="flex gap-6 w-full max-w-md"
              style={{ animation: 'zsFadeUp 0.5s ease-out both' }}
            >
              <button
                onClick={() => setChoice('red')}
                className="flex-1 aspect-square rounded-3xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(145deg, #e53e3e, #c53030)',
                  border: '4px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white text-5xl font-extrabold" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.4)' }}>
                  🔴
                </span>
              </button>

              <button
                onClick={() => setChoice('blue')}
                className="flex-1 aspect-square rounded-3xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(145deg, #3182ce, #2b6cb0)',
                  border: '4px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white text-5xl font-extrabold" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.4)' }}>
                  🔵
                </span>
              </button>
            </div>
          ) : (
            <div className="text-white/60 text-lg text-center" style={{ animation: 'zsPulse 1.5s ease-in-out infinite' }}>
              Kijk naar het scherm…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerView;

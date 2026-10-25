'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface TrailerTitleCardProps {
  title: string;
  subtitle?: string;
  fase?: string;
}

export default function TrailerTitleCard({
  title,
  subtitle = 'Kijk naar het grote scherm',
  fase,
}: TrailerTitleCardProps) {
  const [photoUrl, setPhotoUrl] = useState<string>('https://www.pinkmilk.eu/phone/media.html');
  const [teamNum, setTeamNum] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedData = JSON.parse(localStorage.getItem('rankingPlayerData') || '{}');
      const team = savedData.teamNumber || '';
      const name = savedData.playerName || '';
      const sessionId = localStorage.getItem('rankingSessionId') || '';

      if (team) setTeamNum(team);

      const buildUrl = (sId: string) =>
        `https://www.pinkmilk.eu/phone/media.html?showId=${encodeURIComponent(sId)}&playerName=${encodeURIComponent(name)}&team=${encodeURIComponent(team || '1')}`;

      if (sessionId) {
        setPhotoUrl(buildUrl(sessionId));
      }

      fetch('/api/session-state?id=latest')
        .then(res => res.json())
        .then(data => {
          if (data?.session) {
            let sId = data.session.id;
            if (data.session.photocircle) {
              const m = data.session.photocircle.match(/showId=([a-zA-Z0-9]+)/);
              if (m) sId = m[1];
              else if (!data.session.photocircle.includes('http') && data.session.photocircle.trim().length > 5) {
                sId = data.session.photocircle.trim();
              }
            }
            if (sId) setPhotoUrl(buildUrl(sId));
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  return (
    <div
      className="min-h-screen w-full relative overflow-hidden flex flex-col justify-between select-none"
      style={{
        fontFamily: '"Barlow Semi Condensed", sans-serif',
        background: 'radial-gradient(circle at 50% 40%, #1e2875 0%, #0A1752 50%, #050b29 100%)',
      }}
    >
      {/* Top Ranking Logo Band */}
      <div
        className="relative bg-cover bg-center bg-no-repeat shrink-0 w-full overflow-hidden shadow-lg border-b border-white/10"
        style={{
          backgroundImage: 'url(/assets/band.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: '13vh',
        }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <Image
            src="/assets/ranking_logo.webp"
            alt="Ranking the Starzzz Logo"
            width={256}
            height={128}
            className="h-full max-h-24 w-auto object-contain p-2"
            priority
          />
        </div>
      </div>

      {/* Ambient background glowing circles */}
      <div className="absolute w-96 h-96 rounded-full bg-blue-500/20 blur-3xl -top-10 -left-20 pointer-events-none animate-pulse" />
      <div className="absolute w-96 h-96 rounded-full bg-pink-500/15 blur-3xl -bottom-20 -right-20 pointer-events-none animate-pulse" style={{ animationDelay: '1.5s' }} />

      {/* Main card content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div
          className="flex flex-col items-center max-w-sm w-full"
          style={{
            animation: 'trailerPopIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both',
          }}
        >
          {/* Animated Badge Icon */}
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#0A1752] via-[#24358a] to-[#3b82f6] border-2 border-white/40 shadow-2xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent" />
              <svg
                className="w-10 h-10 text-yellow-300 drop-shadow-md animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            {/* Subtle pulse ring around badge */}
            <div className="absolute inset-0 rounded-3xl border-2 border-yellow-400/50 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          </div>

          {/* Title */}
          <h1
            className="text-white uppercase font-black tracking-wider leading-none drop-shadow-2xl mb-4"
            style={{
              fontSize: 'clamp(2.6rem, 10vw, 4.8rem)',
              textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2)',
            }}
          >
            {title}
          </h1>

          {/* Divider pill */}
          <div className="h-1.5 w-24 rounded-full bg-gradient-to-r from-yellow-400 via-pink-400 to-blue-400 mb-6 shadow-md" />

          {/* Subtitle with pulsing indicator */}
          <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            <span className="text-white/90 text-lg font-medium tracking-wide">
              {subtitle}
            </span>
          </div>

          {fase && (
            <div className="text-white/40 text-xs font-mono mt-4 tracking-widest uppercase">
              Fase {fase}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Photo App section */}
      <div className="w-full max-w-sm px-4 pb-6 mx-auto flex flex-col items-center text-center z-20 shrink-0">
        <a
          href={photoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3.5 px-6 rounded-full bg-[#0A1752] text-white font-bold border-2 border-white shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:bg-[#08134A] transition-all text-xl"
          style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
        >
          <span>Photo App {teamNum ? `[ Team ${teamNum} ]` : ''}</span>
          <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <div className="mt-3 text-white/95 text-base font-bold leading-snug drop-shadow" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
          Vergeet niet om filmpjes en foto&apos;s te delen.
        </div>
        <div className="text-yellow-300 text-sm font-bold drop-shadow tracking-wide mt-0.5" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
          [ vooral van de quizmaster want die tellen dubbel ]
        </div>
      </div>

      <style jsx>{`
        @keyframes trailerPopIn {
          0% {
            opacity: 0;
            transform: scale(0.7) translateY(30px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { FaseCommonProps } from '@/types/fases';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';

// Exact video durations on Display (in ms) so phone does not reveal stelling until video completes
const ZITTEN_DURATIONS: Record<string, number> = {
  '07/01': 22000, // TrailerZitten.mp4 (21.6s)
  '07/05': 16000, // RankingSuperfoods.m4v (15.8s)
  '07/06': 14500, // RankingFlirt.m4v (14.3s)
  '07/07': 14500, // RankingHouseparty.m4v (14.3s)
  '07/08': 15500, // RankingSocials.m4v (15.3s)
  '07/09': 15500, // RankingKleding.m4v (15.3s)
  '07/10': 17000, // All-In.m4v (16.8s)
  '07/11': 15500, // RankingSauna.m4v (15.3s)
  '07/12': 15500, // RankingCollega.m4v (15.3s)
  '07/13': 15500, // RankingBillen.m4v (15.3s)
  '07/14': 15500, // RankingGat.m4v (15.3s)
  '07/15': 15500, // RankingDrink.m4v (15.3s)
};

// All stellingen strictly split into two lines using /n
const ZITTEN_STELLINGEN: Record<string, string> = {
  '07/01': 'Blijf staan als je het eens /n bent met de volgende stelling:',
  '07/05': 'Superfoods /n Ik zweer erbij',
  '07/06': 'Ik flirt soms /n om iets te krijgen',
  '07/07': 'Houseparty /n Niks leukers dan',
  '07/08': 'Socials checken /n Het eerste wat ik doe',
  '07/09': 'Kleding /n Mijn hele salaris gaat op aan',
  '07/10': "In een 'all-in' /n Ik zweer bij een vakantie",
  '07/11': 'Sauna /n Ik vind dat zo vies',
  '07/12': 'Met een collega /n Heb ik weleens wat gehad',
  '07/13': 'Billen /n Ik val echt op',
  '07/14': 'Gat in mijn hand /n Ik heb een enorm',
  '07/15': 'Teveel /n Ik drink nooit',
};

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, playerInfo, heading }) => {
  const [choice, setChoice] = useState<'red' | 'blue' | null>(null);
  const [isReady, setIsReady] = useState(false);
  const prevFaseRef = useRef(faseKey);

  const handleVote = async (selected: 'red' | 'blue') => {
    setChoice(selected);
    if (!sessionId || !faseKey) return;
    try {
      const pid = playerInfo?.playerId || (typeof window !== 'undefined' ? localStorage.getItem('rankingPlayerData_slot1') || 'anon' : 'anon');
      await fetch('/api/zitten-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          fase: faseKey,
          playerId: playerInfo?.playerId || pid,
          playerName: playerInfo?.playerName || 'Speler',
          teamNumber: playerInfo?.teamNumber || 0,
          choice: selected,
        }),
      });
    } catch (e) {
      console.warn('[Zitten PlayerView] Vote failed:', e);
    }
  };

  // Determine two-line stelling text
  const rawText = (faseKey && ZITTEN_STELLINGEN[faseKey]) || heading || 'Zitten en Staan';
  const lines = rawText.split(/\/[nN]/);

  // Reset choice + wait until the display video finishes before revealing stelling and buttons
  useEffect(() => {
    if (faseKey !== prevFaseRef.current) {
      setChoice(null);
      setIsReady(false);
      prevFaseRef.current = faseKey;
    }

    const duration = (faseKey && ZITTEN_DURATIONS[faseKey]) || 15500;
    const timer = setTimeout(() => {
      setIsReady(true);
    }, duration);

    return () => {
      clearTimeout(timer);
    };
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

  // Trailer phase: show trailer title card on phone
  if (faseKey === '07/01') {
    return <TrailerTitleCard title="Zitten & Staan" fase="07/01" />;
  }

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

  // ── Normal view: gradient background + heading + red/blue buttons (no video) ──
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #e66f55 0%, #e4a86f 25%, #6d8fd0 50%, #6f6fbe 75%, #7fd2cc 100%)',
      }}
    >
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
          <CreepyRankingLogo size="sm" />
        </div>
      </div>

      {/* Heading - strictly two lines, revealed only after display video is finished */}
      <div
        className="text-center px-6 pt-6 pb-2 transition-opacity duration-700 min-h-[90px] flex items-center justify-center"
        style={{ opacity: isReady ? 1 : 0 }}
      >
        <h1
          className="text-white text-2xl min-[380px]:text-3xl font-light leading-snug"
          style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
        >
          {lines.map((line, idx) => (
            <span key={idx} className="block w-full">
              {line.trim()}
            </span>
          ))}
        </h1>
      </div>

      {/* Red / Blue buttons - revealed only after display video is finished */}
      <div className="flex-1 flex items-center justify-center px-6">
        {isReady ? (
          <div
            className="flex gap-6 w-full max-w-md"
            style={{ animation: 'zsFadeUp 0.5s ease-out both' }}
          >
            <div className="flex-1 flex flex-col items-center gap-3">
              <button
                onClick={() => handleVote('red')}
                className="w-full aspect-square rounded-3xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(145deg, #e53e3e, #c53030)',
                  border: '4px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white text-5xl font-extrabold" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.4)' }}>
                  🔴
                </span>
              </button>
              <div
                className="text-white font-bold text-2xl tracking-wide "
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Oneens
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center gap-3">
              <button
                onClick={() => handleVote('blue')}
                className="w-full aspect-square rounded-3xl flex items-center justify-center shadow-2xl active:scale-95 transition-transform"
                style={{
                  background: 'linear-gradient(145deg, #3182ce, #2b6cb0)',
                  border: '4px solid rgba(255,255,255,0.3)',
                }}
              >
                <span className="text-white text-5xl font-extrabold" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.4)' }}>
                  🔵
                </span>
              </button>
              <div
                className="text-white font-bold text-2xl tracking-wide "
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)', fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                Eens
              </div>
            </div>
          </div>
        ) : (
          <div className="text-white/60 text-xl text-center" style={{ animation: 'zsPulse 1.5s ease-in-out infinite' }}>
            Kijk naar het scherm…
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerView;

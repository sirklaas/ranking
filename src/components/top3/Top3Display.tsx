'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Top3State, Top3Result } from '@/modules/top3/types';
import { getVoterNames } from '@/modules/top3/logic';

interface Top3DisplayProps {
  state: Top3State;
  heading?: string;
  mediaUrl?: string;
}

// Donut chart colors for top 3
const DONUT_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
const DONUT_BG = 'rgba(255,255,255,0.08)';

interface DonutSegment {
  color: string;
  percentage: number;
  offset: number;
}

function AnimatedDonut({ results, animate }: { results: Top3Result[]; animate: boolean }) {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!animate || results.length === 0) {
      setProgress(1);
      return;
    }
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const duration = 1500; // 1.5s animation
      const p = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      }
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [animate, results]);

  // Build segments
  const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
  const segments: DonutSegment[] = [];
  let offset = 0;
  results.forEach((r, i) => {
    segments.push({
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      percentage: r.percentage,
      offset,
    });
    offset += r.percentage;
  });

  const radius = 140;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 50;

  return (
    <svg viewBox="0 0 400 400" className="w-full h-full max-w-[400px] max-h-[400px]">
      {/* Background circle */}
      <circle
        cx="200" cy="200" r={radius}
        fill="none"
        stroke={DONUT_BG}
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {segments.map((seg, i) => {
        const segLength = (seg.percentage / 100) * circumference * progress;
        const segOffset = (seg.offset / 100) * circumference * progress;
        return (
          <circle
            key={i}
            cx="200" cy="200" r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${segLength} ${circumference - segLength}`}
            strokeDashoffset={-segOffset}
            strokeLinecap="round"
            transform="rotate(-90 200 200)"
            style={{ transition: 'stroke-dasharray 0.1s ease' }}
          />
        );
      })}
      {/* Center text */}
      <text x="200" y="195" textAnchor="middle" fill="white" fontSize="18" fontWeight="600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        TOP 3
      </text>
      <text x="200" y="220" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="14" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        {totalPercentage > 0 ? `${results.reduce((s, r) => s + r.votes, 0)} votes` : ''}
      </text>
    </svg>
  );
}

// Name wall: shows all player names, voted ones fade out
function NameWall({ allNames, votedNames }: { allNames: string[]; votedNames: string[] }) {
  const votedSet = new Set(votedNames);

  return (
    <div className="flex flex-wrap gap-3 justify-center p-8">
      {allNames.map((name, i) => {
        const hasVoted = votedSet.has(name);
        return (
          <div
            key={name}
            className="px-5 py-3 rounded-xl text-lg font-bold transition-all duration-700 pointer-events-none"
            style={{
              fontFamily: 'Barlow Semi Condensed, sans-serif',
              backgroundColor: 'rgba(255,255,255,0.15)',
              color: 'white',
              opacity: hasVoted ? 0 : 1,
              transform: hasVoted ? 'scale(0)' : 'scale(1)',
              border: '2px solid rgba(255,255,255,0.2)',
              animation: hasVoted ? 'none' : `top3NameIn 0.4s ease-out ${i * 40}ms both`,
            }}
          >
            {name}
          </div>
        );
      })}
    </div>
  );
}

// Results view: donut + top 3 list
function ResultsView({ results, animate }: { results: Top3Result[]; animate: boolean }) {
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setShowLabels(true), 800);
      return () => clearTimeout(timer);
    }
    setShowLabels(true);
  }, [animate]);

  return (
    <div className="flex items-center justify-center gap-16 w-full max-w-5xl mx-auto">
      {/* Donut chart */}
      <div className="flex-shrink-0" style={{ width: '400px', height: '400px' }}>
        <AnimatedDonut results={results} animate={animate} />
      </div>

      {/* Results list */}
      <div className="flex flex-col gap-6">
        {results.map((result, i) => (
          <div
            key={result.playerName}
            className="flex items-center gap-5 transition-all duration-500"
            style={{
              opacity: showLabels ? 1 : 0,
              transform: showLabels ? 'translateX(0)' : 'translateX(30px)',
              transitionDelay: `${i * 200}ms`,
            }}
          >
            {/* Rank badge */}
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold text-gray-900 flex-shrink-0"
              style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
            >
              {i + 1}
            </div>
            {/* Name + percentage */}
            <div>
              <div className="text-white text-3xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                {result.playerName}
              </div>
              <div className="text-xl font-medium" style={{ color: DONUT_COLORS[i % DONUT_COLORS.length], fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                {result.percentage}% ({result.votes} {result.votes === 1 ? 'stem' : 'stemmen'})
              </div>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="text-white/40 text-xl" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
            Nog geen stemmen
          </div>
        )}
      </div>
    </div>
  );
}

export default function Top3Display({ state, heading, mediaUrl }: Top3DisplayProps) {
  const phase = state.currentQuestion.phase;
  const votedNames = getVoterNames(state);
  const [animateResults, setAnimateResults] = useState(false);

  // Inject keyframe animations once
  useEffect(() => {
    if (document.getElementById('top3-kf')) return;
    const s = document.createElement('style');
    s.id = 'top3-kf';
    s.textContent = `
      @keyframes top3HeadIn {
        0%   { opacity:0; transform: scale(0.6) translateY(20px); }
        100% { opacity:1; transform: scale(1) translateY(0); }
      }
      @keyframes top3NameIn {
        0%   { opacity:0; transform: translateY(16px) scale(0.9); }
        100% { opacity:1; transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(s);
  }, []);

  // Trigger animation when results phase starts
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase === 'results' && prevPhaseRef.current !== 'results') {
      setAnimateResults(true);
    }
    prevPhaseRef.current = phase;
  }, [phase]);

  return (
    <div
      className="min-h-screen flex flex-col relative items-center justify-center overflow-hidden"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
      }}
    >
      {/* Absolute full-frame media background for all phases */}
      {mediaUrl && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          {/\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl) ? (
            <video src={mediaUrl} className="w-full h-full object-contain" autoPlay muted loop playsInline />
          ) : (
            <img src={mediaUrl} alt="Media Background" className="w-full h-full object-contain" />
          )}
          {/* Subtle dark gradient up from bottom so names/votes stay readable */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        </div>
      )}

      {/* Relative content layer */}
      <div className="relative z-10 flex flex-col w-full h-full min-h-screen">
        {/* Heading — large, animated entrance */}
        {heading && (
          <div className="text-center pt-8 pb-4">
            <h1
              className="text-white text-7xl font-bold"
              style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                fontWeight: 300,
                textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            >
              {heading}
            </h1>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          {phase === 'intro' ? (
            // Since media is now full frame in the background, intro phase just shows the heading + background
            <div className="flex flex-col items-center justify-center w-full"></div>
          ) : phase === 'results' ? (
            <ResultsView results={state.currentQuestion.results} animate={animateResults} />
          ) : (
            <NameWall allNames={state.allPlayerNames} votedNames={votedNames} />
          )}
        </div>

        {/* Status bar */}
        <div className="text-center pb-6">
          {phase === 'voting' && (
            <div className="text-white/80 text-xl font-medium" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {votedNames.length} / {state.allPlayerNames.length} hebben gestemd
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

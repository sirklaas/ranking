'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Top3State, Top3Result } from '@/modules/top3/types';
import { getVoterNames } from '@/modules/top3/logic';

interface Top3DisplayProps {
  state: Top3State;
  heading?: string;
  mediaUrl?: string;
  faseKey?: string;
}

const barlowFont = '"Barlow Semi Condensed", sans-serif';

const TOP3_HEADINGS: Record<string, string> = {
  '10/01': 'Kies iemand uit een van de andere teams!',
  '10/05': 'Wie wordt er echt heel erg snel verliefd',
  '10/06': 'Wie is de ideale schoon- zoon of zus?',
  '10/07': 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?',
  '10/08': 'Wie zou je absoluut niet /n op je kinderen laten passen?',
  '10/09': 'Wie heeft de meeste crypto\'s',
  '10/10': 'Wie is de grootste aansteller op het werk?',
  '10/11': 'Wie zou er als eerste een account aanmaken /n op OnlyFans?',
  '10/12': 'Wie vertrouw je jouw allerdiepste geheimen toe?',
  '10/13': 'Wie zou je meenemen naar een parenclub?',
};

// Donut chart colors for top 3 + overigen
const DONUT_COLORS = ['#FF1E1E', '#F5B800', '#3182CE', '#718096'];
const DONUT_BG = 'rgba(255,255,255,0.08)';

const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

/* ──────── common heading renderer ──────── */
function RenderHeading({ text, font }: { text: string; font: string }) {
  if (!text) return null;
  const lines = text.split(/\/[nN]/);
  return (
    <>
      {lines.map((line, idx) => (
        <div key={idx} className="block w-full">
          {line.trim()}
        </div>
      ))}
    </>
  );
}

interface DonutSegment {
  color: string;
  percentage: number;
  offset: number;
  originalIndex: number;
}

function AnimatedDonut({ results, animate }: { results: Top3Result[]; animate: boolean }) {
  const [progress, setProgress] = useState(0);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const resultsJson = JSON.stringify(results);

  useEffect(() => {
    if (!animate) {
      setProgress(0); // Instantly reset progress when hidden to prevent glitch
      return;
    }
    if (results.length === 0) {
      setProgress(1);
      return;
    }
    setProgress(0);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const duration = 4000; // 4.0s animation (twice as slow)
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
  }, [animate, resultsJson]);

  // Build segments (reverse order so lowest is drawn first)
  const totalPercentage = results.reduce((sum, r) => sum + r.percentage, 0);
  const segments: DonutSegment[] = [];
  let offset = 0;

  const reversed = [...results].reverse();
  reversed.forEach((r) => {
    const originalIndex = results.indexOf(r);
    segments.push({
      color: DONUT_COLORS[originalIndex % DONUT_COLORS.length],
      percentage: r.percentage,
      offset,
      originalIndex,
    });
    offset += r.percentage;
  });

  const radius = 350;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 120;
  const center = 600; // viewBox 1200x1200

  return (
    <svg
      viewBox="0 0 1200 1200"
      className="w-full h-full max-w-[1100px] max-h-[1100px] overflow-visible transition-opacity duration-300"
      style={{ opacity: animate ? 1 : 0 }}
    >
      {/* Background circle */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={DONUT_BG}
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {segments.map((seg) => {
        const i = seg.originalIndex;
        // Draw sequentially based on total progress (0 to 100%)
        const currentFillPercent = Math.min(Math.max((progress * 100) - seg.offset, 0), seg.percentage);
        const segLength = (currentFillPercent / 100) * circumference;
        const segOffset = (seg.offset / 100) * circumference;

        // Calculate label position based on the middle of the slice
        // offset + (percentage/2). Scale to 2PI. Subtract PI/2 because SVG starts at 3 o'clock and we rotate -90.
        // Actually since the group is already rotated -90 via CSS/transform, 0 percent = 12 o'clock.
        // In the unrotated coordinate system (0 = 3 o'clock), we just compute the angle and then we can let it rotate, 
        // OR we don't rotate the circle and just start offset at -PI/2.
        // Let's use the transform approach: the circle is rotated -90. We will place labels OUTSIDE the rotated group,
        // so we manually calculate absolute positions. 
        // 0% = 12 o'clock = -PI/2.
        const midPercent = seg.offset + (seg.percentage / 2);
        const angle = (midPercent / 100) * Math.PI * 2 - (Math.PI / 2); // 12 o'clock start

        const labelRadius = radius + strokeWidth + 40; // distance from center
        const labelX = center + Math.cos(angle) * labelRadius;
        const labelY = center + Math.sin(angle) * labelRadius;

        // Only show label if the animation has reached the middle of this slice
        const showLabel = (progress * 100) > midPercent;
        const labelOpacity = showLabel ? 1 : 0;

        // Anchor text based on side
        const isRightSide = Math.cos(angle) > 0;

        return (
          <g key={i}>
            <circle
              cx={center} cy={center} r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${segLength} ${circumference - segLength}`}
              strokeDashoffset={-segOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
            />
            {/* Player Label */}
            <g
              style={{
                opacity: labelOpacity,
                transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: showLabel ? 'scale(1) translateX(0)' : `scale(0.9) translateX(${isRightSide ? -20 : 20}px)`,
                transformOrigin: `${labelX}px ${labelY}px`
              }}
            >
              {/* Technical background rectangle */}
              {results[i].playerName !== 'Overige spelers' && (
                <g>
                  {/* Backdrop */}
                  <rect
                    x={isRightSide ? labelX + 40 : labelX - 440}
                    y={labelY - 50}
                    width="400"
                    height="90"
                    rx="8"
                    fill="rgba(0,0,0,0.6)"
                    stroke={seg.color}
                    strokeWidth="2"
                    strokeOpacity={showLabel ? 0.6 : 0}
                    style={{
                      transition: 'stroke-opacity 1s ease-in-out 0.2s',
                    }}
                  />
                  {/* Scanning line effect */}
                  <rect
                    x={isRightSide ? labelX + 40 : labelX - 440}
                    y={labelY - 50}
                    width="400"
                    height="90"
                    rx="8"
                    fill={`url(#scanline-${i})`}
                    style={{ mixBlendMode: 'overlay', opacity: 0.5 }}
                  />
                </g>
              )}

              {/* Leaderboard Badge */}
              {results[i].playerName !== 'Overige spelers' ? (
                <>
                  <circle cx={isRightSide ? labelX + 20 : labelX - 20} cy={labelY - 4} r={32} fill={seg.color} stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <text x={isRightSide ? labelX + 20 : labelX - 20} y={labelY + 6} textAnchor="middle" fill="#000" fontSize="30" fontWeight="900" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    {i + 1}
                  </text>
                </>
              ) : (
                <circle cx={isRightSide ? labelX + 20 : labelX - 20} cy={labelY - 4} r={14} fill={seg.color} />
              )}

              <text
                x={isRightSide ? labelX + 70 : labelX - 70}
                y={labelY - 10}
                textAnchor={isRightSide ? "start" : "end"}
                fill="white"
                fontSize="42"
                fontWeight="bold"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
              >
                {formatName(results[i].playerName)}
              </text>
              <text
                x={isRightSide ? labelX + 70 : labelX - 70}
                y={labelY + 26}
                textAnchor={isRightSide ? "start" : "end"}
                fill={seg.color}
                fontSize="26"
                fontWeight="600"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', textShadow: '0 1px 5px rgba(0,0,0,0.8)', letterSpacing: '1px' }}
              >
                {results[i].percentage}% ({results[i].votes} {results[i].votes === 1 ? 'stem' : 'stemmen'})
              </text>
            </g>
          </g>
        );
      })}
      {/* Center text backdrop */}
      <circle cx={center} cy={center} r={radius - strokeWidth - 10} fill="rgba(0,0,0,0.3)" />

      {/* Center text */}
      <text x={center} y={center - 10} textAnchor="middle" fill="white" fontSize="48" fontWeight="800" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', letterSpacing: '4px' }}>
        TOP 3
      </text>
      <text x={center} y={center + 40} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="26" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif', letterSpacing: '2px' }}>
        {totalPercentage > 0 ? `${results.reduce((s, r) => s + r.votes, 0)} STEMMEN` : ''}
      </text>

      {/* Defs for animations */}
      <defs>
        {segments.map((_, i) => (
          <linearGradient key={`scanline-${i}`} id={`scanline-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.1)">
              <animate attributeName="offset" values="-1; 2" dur="2s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        ))}
      </defs>
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
            {formatName(name)}
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
    // Show labels immediately if animate is true, CSS transitionDelay will stagger them perfectly
    setShowLabels(true);
  }, [animate]);

  return (
    <div className="flex items-center justify-center w-full max-w-7xl mx-auto pb-10 mt-10">
      {/* Donut chart - Now full width with labels embedded inside */}
      <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '1000px' }}>
        <AnimatedDonut results={results} animate={animate} />
      </div>

      {results.length === 0 && (
        <div className="absolute text-white/40 text-3xl font-bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
          Nog geen stemmen
        </div>
      )}
    </div>
  );
}

export default function Top3Display({ state, heading, mediaUrl, faseKey }: Top3DisplayProps) {
  const phase = state.currentQuestion.phase;
  const votedNames = getVoterNames(state);
  const [animateResults, setAnimateResults] = useState(false);

  const displayHeading = (faseKey && TOP3_HEADINGS[faseKey]) || heading;

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
            <video
              src={mediaUrl}
              className="w-full h-full object-contain"
              autoPlay
              muted
              playsInline
              onTimeUpdate={(e) => {
                const vid = e.currentTarget;
                if (vid.duration - vid.currentTime < 0.2 && !vid.paused) {
                  vid.pause();
                }
              }}
            />
          ) : (
            <img src={mediaUrl} alt="Media Background" className="w-full h-full object-contain" />
          )}
          {/* Subtle dark gradient up from bottom so names/votes stay readable */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
        </div>
      )}

      {/* Relative content layer */}
      <div className="relative z-10 flex flex-col w-full h-full min-h-screen">
        {/* Heading — large, bottom-aligned 75px up */}
        {displayHeading && (
          <div className="absolute bottom-[75px] left-0 right-0 text-center z-30">
            <h1
              className="text-white font-bold px-12 leading-none"
              style={{
                fontFamily: barlowFont,
                fontWeight: 300,
                fontSize: '100px',
                textShadow: '0 4px 24px rgba(0,0,0,0.8)',
                animation: 'top3HeadIn 0.8s cubic-bezier(0.34,1.56,0.64,1) both',
              }}
            >
              <RenderHeading text={displayHeading} font={barlowFont} />
            </h1>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          {phase === 'intro' ? (
            // Since media is now full frame in the background, intro phase just shows the heading + background
            <div className="flex flex-col items-center justify-center w-full"></div>
          ) : phase === 'results' ? (
            <ResultsView results={state.currentQuestion.results || []} animate={animateResults} />
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

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
const DONUT_COLORS = ['#FF1E1E', '#F5B800', '#3182CE'];
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
      const duration = 2000; // 2.0s animation
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

  const radius = 250;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 80;
  const center = 500; // viewBox 1000x1000

  return (
    <svg viewBox="0 0 1000 1000" className="w-full h-full max-w-[900px] max-h-[900px] overflow-visible">
      {/* Background circle */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none"
        stroke={DONUT_BG}
        strokeWidth={strokeWidth}
      />
      {/* Segments */}
      {segments.map((seg, i) => {
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
                transition: 'opacity 0.4s ease-out',
                transform: showLabel ? 'scale(1)' : 'scale(0.8)',
                transformOrigin: `${labelX}px ${labelY}px`
              }}
            >
              {/* Leaderboard Badge */}
              <circle cx={isRightSide ? labelX + 20 : labelX - 20} cy={labelY - 14} r={28} fill={seg.color} />
              <text x={isRightSide ? labelX + 20 : labelX - 20} y={labelY - 4} textAnchor="middle" fill="#000" fontSize="28" fontWeight="bold" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                {i + 1}
              </text>

              <text
                x={isRightSide ? labelX + 60 : labelX - 60}
                y={labelY - 18}
                textAnchor={isRightSide ? "start" : "end"}
                fill="white"
                fontSize="42"
                fontWeight="bold"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                {results[i].playerName}
              </text>
              <text
                x={isRightSide ? labelX + 60 : labelX - 60}
                y={labelY + 22}
                textAnchor={isRightSide ? "start" : "end"}
                fill={seg.color}
                fontSize="28"
                fontWeight="600"
                style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
              >
                {results[i].percentage}% ({results[i].votes} {results[i].votes === 1 ? 'stem' : 'stemmen'})
              </text>
            </g>
          </g>
        );
      })}
      {/* Center text */}
      <text x={center} y={center - 10} textAnchor="middle" fill="white" fontSize="40" fontWeight="600" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
        TOP 3
      </text>
      <text x={center} y={center + 35} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="28" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
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
    // Show labels immediately if animate is true, CSS transitionDelay will stagger them perfectly
    setShowLabels(true);
  }, [animate]);

  return (
    <div className="flex items-center justify-center w-full max-w-7xl mx-auto pb-10">
      {/* Donut chart - Now full width with labels embedded inside */}
      <div className="w-full h-full flex items-center justify-center" style={{ minHeight: '800px' }}>
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

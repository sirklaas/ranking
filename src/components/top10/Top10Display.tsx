'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Top10State, Top10Result } from '@/modules/top10/types';
import { getVoterNames, getLiveTally } from '@/modules/top10/logic';

interface Top10DisplayProps {
    state: Top10State;
    heading?: string;
    mediaUrl?: string;
}

/* ──────── colour palette for word cloud names ──────── */
const CLOUD_COLORS = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE',
    '#F0B27A', '#85C1E9', '#82E0AA', '#F1948A', '#AED6F1',
];

/* ──────── deterministic pseudo-random from string ──────── */
function hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
}

/* ──────── string prefix stripper ──────── */
const formatName = (name: string) => name.replace(/^\s*\d+[\s_-]*/, '');

/* ──────── word-cloud item layout ──────── */
interface CloudItem {
    name: string;
    votes: number;
    percentage: number;
    fontSize: number;
    x: number;
    y: number;
    rotation: number;
    color: string;
    driftX: number;
    driftY: number;
    driftAngle: number;
    opacity: number;
}

function layoutCloud(results: Top10Result[], w: number, h: number): CloudItem[] {
    if (results.length === 0) return [];
    const maxVotes = results[0].votes;
    const minFontSize = 18;
    const maxFontSize = 72;

    return results.map((r, i) => {
        const hash = hashStr(r.playerName);
        const ratio = maxVotes > 0 ? r.votes / maxVotes : 0;
        const fontSize = minFontSize + ratio * (maxFontSize - minFontSize);

        // First item (winner) is always center + horizontal
        let x: number, y: number, rotation: number;
        if (i === 0) {
            x = w / 2;
            y = h / 2;
            rotation = 0;
        } else {
            // Spread others in a loose spiral
            const angle = (i / results.length) * Math.PI * 2 + (hash % 100) / 100;
            const radius = 120 + (i * 35) + (hash % 50);
            x = w / 2 + Math.cos(angle) * radius;
            y = h / 2 + Math.sin(angle) * radius;
            // Mix of horizontal (0°) and vertical (90° / -90°)
            const rotationOptions = [0, 0, 90, -90, 0];
            rotation = rotationOptions[hash % rotationOptions.length];
        }

        // Slow drift parameters
        const driftX = ((hash % 200) - 100) / 800;       // px per frame
        const driftY = (((hash >> 3) % 200) - 100) / 800;
        const driftAngle = ((hash % 60) - 30) / 6000;     // degrees per frame

        return {
            name: formatName(r.playerName),
            votes: r.votes,
            percentage: r.percentage,
            fontSize,
            x,
            y,
            rotation,
            color: CLOUD_COLORS[i % CLOUD_COLORS.length],
            driftX,
            driftY,
            driftAngle,
            opacity: 0.5 + ratio * 0.5,
        };
    });
}

/* ──────── animated word cloud ──────── */
function WordCloud({ results, animate }: { results: Top10Result[]; animate: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [items, setItems] = useState<CloudItem[]>([]);
    const frameRef = useRef(0);
    const tickRef = useRef(0);

    // Layout when results change
    useEffect(() => {
        const w = containerRef.current?.offsetWidth || 900;
        const h = containerRef.current?.offsetHeight || 600;
        setItems(layoutCloud(results, w, h));
        tickRef.current = 0;
    }, [results]);

    // Animation loop for gentle drift
    useEffect(() => {
        if (!animate || items.length === 0) return;

        const loop = () => {
            tickRef.current += 1;
            setItems(prev =>
                prev.map(item => ({
                    ...item,
                    x: item.x + item.driftX,
                    y: item.y + item.driftY,
                    rotation: item.rotation + item.driftAngle,
                }))
            );
            frameRef.current = requestAnimationFrame(loop);
        };
        frameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameRef.current);
    }, [animate, items.length]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden"
            style={{ minHeight: '500px' }}
        >
            {items.map((item, i) => (
                <div
                    key={item.name}
                    className="absolute transition-all duration-700 whitespace-nowrap select-none"
                    style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                        fontSize: `${item.fontSize}px`,
                        fontFamily: 'Barlow Semi Condensed, sans-serif',
                        fontWeight: i === 0 ? 800 : 600,
                        color: item.color,
                        opacity: item.opacity,
                        textShadow: i === 0
                            ? '0 0 30px rgba(255,255,255,0.3), 0 0 60px rgba(255,255,255,0.1)'
                            : '0 2px 8px rgba(0,0,0,0.3)',
                        letterSpacing: i === 0 ? '2px' : '0.5px',
                        animation: `cloudFadeIn 0.8s ease-out ${i * 0.1}s both`,
                    }}
                >
                    {item.name}
                    {item.votes > 1 && (
                        <span
                            className="ml-2 align-super"
                            style={{
                                fontSize: `${Math.max(12, item.fontSize * 0.35)}px`,
                                opacity: 0.6,
                            }}
                        >
                            {item.votes}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

/* ──────── dynamic results item ──────── */
function ResultItem({ result, index, show, total }: { result: Top10Result; index: number; show: boolean; total: number }) {
    return (
        <div
            className={`transition-all duration-1000 ease-out flex items-center gap-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-20 scale-50'}`}
            style={{
                transform: show ? `rotate(0deg)` : `rotate(90deg)`,
                width: '100%',
                maxWidth: '800px',
                transitionDelay: `${(total - index - 1) * 0.1}s` // Reveal from 10 to 1
            }}
        >
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-4xl font-extrabold text-[#0A1752] shrink-0 border-4 border-white/50">
                {index + 1}
            </div>
            <div className="flex-1">
                <div className="text-4xl font-black text-white uppercase tracking-tight" style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}>
                    {formatName(result.playerName)}
                </div>
                <div className="h-4 bg-white/20 rounded-full mt-3 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000 delay-500"
                        style={{ width: show ? `${result.percentage}%` : '0%' }}
                    />
                </div>
            </div>
            <div className="text-5xl font-black text-cyan-300">
                {result.percentage}%
            </div>
        </div>
    );
}

function SequentialResults({ results }: { results: Top10Result[] }) {
    const [revealCount, setRevealCount] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setRevealCount(prev => (prev < results.length ? prev + 1 : prev));
        }, 800); // Reveal every 0.8s
        return () => clearInterval(timer);
    }, [results.length]);

    return (
        <div className="flex flex-col items-center gap-4 w-full p-8 overflow-y-auto max-h-screen no-scrollbar">
            {/* Reveal from bottom (10) to top (1) */}
            {[...results].reverse().map((res, i) => {
                const originalIndex = results.length - 1 - i;
                const show = revealCount > i;
                return (
                    <ResultItem
                        key={res.playerName}
                        result={res}
                        index={originalIndex}
                        show={show}
                        total={results.length}
                    />
                );
            })}
        </div>
    );
}

/* ──────── main display component ──────── */
export default function Top10Display({ state, heading, mediaUrl }: Top10DisplayProps) {
    const phase = state.currentQuestion.phase;
    const votedNames = getVoterNames(state);
    const liveTally = useMemo(() => getLiveTally(state), [state]);
    const [animateCloud, setAnimateCloud] = useState(false);
    const prevPhaseRef = useRef(phase);

    // Trigger animation when results phase starts
    useEffect(() => {
        if (phase === 'results' && prevPhaseRef.current !== 'results') {
            setAnimateCloud(true);
        }
        // Also animate during voting for live updates
        if (phase === 'voting') {
            setAnimateCloud(true);
        }
        prevPhaseRef.current = phase;
    }, [phase]);

    return (
        <div
            className="min-h-screen flex flex-col relative overflow-hidden"
            style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
            }}
        >
            {/* Background Media */}
            {mediaUrl && (
                <div className="absolute inset-0 z-0 h-full w-full pointer-events-none">
                    <div className="absolute inset-0 bg-black/40 z-10" />
                    <img src={mediaUrl} alt={heading || 'Top 10'} className="w-full h-full object-cover z-0" />
                </div>
            )}

            {/* Content Container */}
            <div className="relative z-20 flex-1 flex flex-col">
                {/* Heading */}
                {heading && (
                    <div className="text-center pt-16 pb-8">
                        <h1
                            className="text-white text-7xl font-black uppercase tracking-widest px-8"
                            style={{
                                fontFamily: 'Barlow Semi Condensed, sans-serif',
                                textShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }}
                        >
                            {heading}
                        </h1>
                    </div>
                )}

                {/* Main content area */}
                <div className="flex-1 flex items-center justify-center p-8">
                    {/* HIDE NAMES until voting or results starts */}
                    {phase === 'intro' ? (
                        <div className="text-white/30 text-3xl font-light animate-pulse uppercase tracking-[1em]">
                            Wachten op stemmen...
                        </div>
                    ) : phase === 'results' ? (
                        <SequentialResults results={state.currentQuestion.results} />
                    ) : (
                        <WordCloud results={liveTally} animate={animateCloud} />
                    )}
                </div>

                {/* Status bar */}
                <div className="text-center pb-12">
                    {phase === 'voting' && (
                        <div className="text-white bg-white/10 backdrop-blur-md inline-block px-8 py-3 rounded-full text-2xl font-bold border border-white/20">
                            {votedNames.length} / {state.allPlayerNames.length} gestemd
                        </div>
                    )}
                </div>
            </div>

            {/* CSS animations */}
            <style jsx>{`
        @keyframes cloudFadeIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div>
    );
}

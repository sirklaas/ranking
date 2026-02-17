'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Top10State, Top10Result } from '@/modules/top10/types';
import { getVoterNames, getLiveTally } from '@/modules/top10/logic';

interface Top10DisplayProps {
    state: Top10State;
    heading?: string;
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
            name: r.playerName,
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

/* ──────── name wall during voting (before results) ──────── */
function NameWall({ allNames, votedNames }: { allNames: string[]; votedNames: string[] }) {
    const votedSet = new Set(votedNames);

    return (
        <div className="flex flex-wrap gap-3 justify-center p-8">
            {allNames.map((name) => {
                const hasVoted = votedSet.has(name);
                return (
                    <div
                        key={name}
                        className="px-5 py-3 rounded-xl text-lg font-bold transition-all duration-700"
                        style={{
                            fontFamily: 'Barlow Semi Condensed, sans-serif',
                            backgroundColor: hasVoted ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.15)',
                            color: hasVoted ? 'rgba(255,255,255,0.1)' : 'white',
                            transform: hasVoted ? 'scale(0.8)' : 'scale(1)',
                            border: hasVoted ? '2px solid transparent' : '2px solid rgba(255,255,255,0.2)',
                        }}
                    >
                        {name}
                    </div>
                );
            })}
        </div>
    );
}

/* ──────── main display component ──────── */
export default function Top10Display({ state, heading }: Top10DisplayProps) {
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

    // Determine which results to show:
    // During voting → live tally (real-time word cloud)
    // During results → final computed results
    const cloudResults = phase === 'results'
        ? state.currentQuestion.results
        : liveTally;

    return (
        <div
            className="min-h-screen flex flex-col"
            style={{
                fontFamily: 'Barlow Semi Condensed, sans-serif',
                background: 'linear-gradient(135deg, #0A1752 0%, #1a2a6c 50%, #2d3a8c 100%)',
            }}
        >
            {/* Heading */}
            {heading && (
                <div className="text-center pt-8 pb-4">
                    <h1
                        className="text-white text-5xl font-bold"
                        style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                    >
                        {heading}
                    </h1>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex items-center justify-center p-8">
                {(phase === 'results' || (phase === 'voting' && liveTally.length > 0)) ? (
                    <WordCloud results={cloudResults} animate={animateCloud} />
                ) : (
                    <NameWall allNames={state.allPlayerNames} votedNames={votedNames} />
                )}
            </div>

            {/* Status bar */}
            <div className="text-center pb-6">
                {phase === 'voting' && (
                    <div className="text-white/50 text-lg">
                        {votedNames.length} / {state.allPlayerNames.length} hebben gestemd
                    </div>
                )}
                {phase === 'results' && (
                    <div className="text-white/50 text-lg">
                        Top 10 — {state.currentQuestion.results.length} genomineerd
                    </div>
                )}
            </div>

            {/* CSS animations */}
            <style jsx>{`
        @keyframes cloudFadeIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(0deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
        </div>
    );
}

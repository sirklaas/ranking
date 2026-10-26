'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Top10State, Top10Result } from '@/modules/top10/types';
import { getVoterNames, getLiveTally } from '@/modules/top10/logic';
import * as top10Logic from '@/modules/top10/logic';
import { rankingService } from '@/lib/pocketbase';

interface Top10DisplayProps {
    state: Top10State;
    heading?: string;
    mediaUrl?: string;
    faseKey?: string;
    sessionId?: string;
}

const barlowFont = '"Barlow Semi Condensed", sans-serif';
const nameFont = '"Barlow Semi Condensed", sans-serif';

const TOP10_HEADINGS: Record<string, string> = {
    '17/05': 'Je hebt een pijnlijke pukkel op je bil. /n Wie mag hem voor je uitknijpen?',
    '17/06': 'Wie denkt dat ie always gelijk heeft?',
    '17/07': 'Wie doet tegen betaling de naakte fotoshoot /n van het Perfecte Plaatje?',
    '17/08': 'Wie kan 40 dagen zonder sex?',
    '17/09': 'Wie kan absoluut niet tegen kritiek?',
    '17/10': 'Wie laat weleens een wind?',
    '17/11': 'Wie maakt de allerlelijkste Selfies ?',
    '17/12': 'Wie is het meest verslaafd aan Social Media?',
    '17/13': 'Wie krijgt de meeste bekeuringen?',
    '17/14': 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tussen de lakens?',
};

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

/* ──────── AABB Collision Detection ──────── */
interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

function intersects(r1: Rect, r2: Rect): boolean {
    return !(r2.x > r1.x + r1.w ||
        r2.x + r2.w < r1.x ||
        r2.y > r1.y + r1.h ||
        r2.y + r2.h < r1.y);
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

// Bounding box logic for rotated text to ensure safe collision detection
function getRotatedBoundingBox(cx: number, cy: number, w: number, h: number, angleDeg: number): Rect {
    if (angleDeg === 0) {
        return { x: cx - w/2, y: cy - h/2, w, h };
    }
    const angleRad = angleDeg * (Math.PI / 180);
    const cosA = Math.abs(Math.cos(angleRad));
    const sinA = Math.abs(Math.sin(angleRad));
    
    // Calculate new width and height based on the rotation
    const newW = w * cosA + h * sinA;
    const newH = w * sinA + h * cosA;
    
    return {
        x: cx - newW / 2,
        y: cy - newH / 2,
        w: newW,
        h: newH
    };
}

/* ──────── common heading renderer ──────── */
function RenderHeading({ text, font }: { text: string; font: string }) {
    if (!text) return null;
    const lines = text.split(/\/[nN]/);
    return (
        <>
            {lines.map((line, idx) => (
                <div key={idx} className="block w-full whitespace-nowrap">
                    {line.trim()}
                </div>
            ))}
        </>
    );
}

function computeCloudSizes(results: Top10Result[]): CloudItem[] {
    if (results.length === 0) return [];
    
    // Instead of absolute positioning math, just calculate font sizes and colors.
    // The browser's flexbox will handle zero-overlap placement natively.
    const maxVotes = results[0].votes;
    const minFontSize = 40; 
    const maxFontSize = 180; 

    return results.map((r, i) => {
        const hash = hashStr(r.playerName);
        const nameText = formatName(r.playerName);
        const ratio = maxVotes > 0 ? r.votes / maxVotes : 0;
        const fontSize = minFontSize + ratio * (maxFontSize - minFontSize);

        return {
            name: nameText,
            votes: r.votes,
            percentage: r.percentage,
            fontSize,
            x: 0,
            y: 0,
            rotation: i === 1 ? -15 : (hash % 3 === 0 ? 10 : (hash % 2 === 0 ? -10 : 0)),
            color: CLOUD_COLORS[i % CLOUD_COLORS.length],
            driftX: 0,
            driftY: 0,
            driftAngle: 0,
            opacity: 0.6 + ratio * 0.4,
            isWinner: i === 0
        };
    });
}

/* ──────── Modern Fluid D3 Word Cloud ──────── */
function WordCloud({ results, animate }: { results: Top10Result[]; animate: boolean }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [d3Loaded, setD3Loaded] = useState(false);
    const simulationRef = useRef<any>(null);
    const nodesRef = useRef<any[]>([]);
    const frameRef = useRef<number>(0);

    // Load D3 from CDN
    useEffect(() => {
        if ((window as any).d3) {
            setD3Loaded(true);
            return;
        }
        const script = document.createElement('script');
        script.src = "https://d3js.org/d3.v7.min.js";
        script.async = true;
        script.onload = () => setD3Loaded(true);
        document.head.appendChild(script);
        return () => {
            if (document.head.contains(script)) document.head.removeChild(script);
        };
    }, []);

    // Simulation & Rendering Logic
    useEffect(() => {
        // If results are empty (new slide or no votes), clear canvas and stop simulation immediately
        if (!results || results.length === 0) {
            if (frameRef.current) {
                cancelAnimationFrame(frameRef.current);
                frameRef.current = 0;
            }
            if (simulationRef.current) {
                simulationRef.current.stop();
                simulationRef.current = null;
            }
            nodesRef.current = [];
            if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            return;
        }

        if (!d3Loaded || !animate || !containerRef.current || !canvasRef.current) return;

        const d3 = (window as any).d3;
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Map results to nodes
        const maxVotes = results[0]?.votes || 1;
        const prevNodes = new Map(nodesRef.current.map(n => [n.playerName, n]));

        const newNodes = results.map((r, i) => {
            const prev = prevNodes.get(r.playerName);
            const rank = i + 1;
            const ratio = r.votes / maxVotes;
            const name = formatName(r.playerName);

            // Responsive font size: rank 1 is prominent, 2-3 medium, others compact
            let targetSize = 32;
            if (rank === 1) targetSize = Math.round(52 + ratio * 24);
            else if (rank === 2) targetSize = 44;
            else if (rank === 3) targetSize = 38;
            else targetSize = Math.max(24, 34 - rank);

            // Accurately measure pill dimensions using Barlow 400 font
            ctx.font = `400 ${targetSize}px ${barlowFont}`;
            const textMetrics = ctx.measureText(name);
            const textWidth = textMetrics.width;
            const pillW = textWidth + (rank === 1 ? 52 : 36);
            const pillH = targetSize + (rank === 1 ? 24 : 16);
            // Invariant collision radius enclosing the pill at any rotation angle (0° to 90°)
            const collisionRadius = Math.hypot(pillW / 2, pillH / 2) + 14;

            // Rotation rule: Rank 1 is always horizontal (0°), Rank 2 is vertical (-90°), others 50/50 alternating
            const targetRotation = rank === 1 ? 0 : rank === 2 ? -90 : (hashStr(r.playerName) % 2 === 0 ? 0 : -90);

            return {
                ...prev,
                playerName: r.playerName,
                id: r.playerName,
                displayName: name,
                rank,
                votes: r.votes,
                targetSize,
                size: prev?.size || 10,
                pillW,
                pillH,
                targetRotation,
                rotation: prev?.rotation ?? targetRotation,
                collisionRadius,
                x: prev?.x ?? (width / 2 + (Math.random() - 0.5) * 120),
                y: prev?.y ?? (height / 2 + (Math.random() - 0.5) * 120),
                color: CLOUD_COLORS[i % CLOUD_COLORS.length],
                vx: prev?.vx ?? 0,
                vy: prev?.vy ?? 0,
                phase: prev?.phase ?? (Math.random() * Math.PI * 2)
            };
        });

        nodesRef.current = newNodes;

        // Force Simulation with strict collision radii preventing any overlapping
        if (simulationRef.current) simulationRef.current.stop();

        const simulation = d3.forceSimulation(newNodes)
            .force("charge", d3.forceManyBody().strength(-30))
            .force("collision", d3.forceCollide().radius((d: any) => d.collisionRadius || 50).iterations(8))
            .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
            .alphaDecay(0.015);

        // Rank 1 slight pull to center
        simulation.force("rank1", (alpha: number) => {
            const rank1 = newNodes[0];
            if (rank1) {
                rank1.vx += (width / 2 - rank1.x) * 0.04 * alpha;
                rank1.vy += (height / 2 - rank1.y) * 0.04 * alpha;
            }
        });

        // Boundary force to keep all pills strictly inside canvas, preserving bottom margin for vote counter
        simulation.force("boundary", () => {
            newNodes.forEach(node => {
                const pad = (node.collisionRadius || 40) + 10;
                const padBottom = (node.collisionRadius || 40) + 40;
                if (node.x < pad) node.vx += 1.8;
                if (node.x > width - pad) node.vx -= 1.8;
                if (node.y < pad) node.vy += 1.8;
                if (node.y > height - padBottom) node.vy -= 2.2;
            });
        });

        simulationRef.current = simulation;

        // Modern Fluid Render Loop with 90° rotation & Barlow 400
        const tick = () => {
            ctx.clearRect(0, 0, width, height);
            const time = performance.now() * 0.001;

            newNodes.forEach(node => {
                // Smooth interpolation for size
                node.size += (node.targetSize - node.size) * 0.12;

                // Smooth rotation interpolation (shortest path)
                let diff = node.targetRotation - node.rotation;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                node.rotation += diff * 0.12;

                // Fluid organic Lissajous harmonic floating
                const driftX = Math.sin(time * 0.8 + node.phase) * 1.5;
                const driftY = Math.cos(time * 0.6 + node.phase * 1.3) * 1.5;

                const drawX = node.x + driftX;
                const drawY = node.y + driftY;

                // Re-calculate pill size with interpolated font size using Barlow 400
                ctx.font = `400 ${node.size}px ${barlowFont}`;
                const curMetrics = ctx.measureText(node.displayName);
                const curTextW = curMetrics.width;
                const curPillW = curTextW + (node.rank === 1 ? 52 : 36);
                const curPillH = node.size + (node.rank === 1 ? 24 : 16);
                const cornerR = curPillH / 2;

                ctx.save();
                ctx.translate(drawX, drawY);
                ctx.rotate(node.rotation * (Math.PI / 180));

                // Modern Pill Glass Background
                ctx.beginPath();
                ctx.roundRect(-curPillW / 2, -curPillH / 2, curPillW, curPillH, cornerR);
                ctx.fillStyle = node.rank === 1
                    ? 'rgba(250, 204, 21, 0.22)'
                    : 'rgba(10, 23, 82, 0.72)';
                ctx.fill();

                // Glowing border
                ctx.strokeStyle = node.rank === 1 ? '#facc15' : node.color;
                ctx.lineWidth = node.rank === 1 ? 3 : 2;
                ctx.shadowColor = node.color;
                ctx.shadowBlur = node.rank === 1 ? 24 : 12;
                ctx.stroke();

                // Barlow 400 text inside the pill
                ctx.font = `400 ${node.size}px ${barlowFont}`;
                ctx.fillStyle = node.rank === 1 ? '#fef08a' : '#FFFFFF';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowBlur = 6;
                ctx.fillText(node.displayName, 0, 1);

                ctx.restore();
            });

            frameRef.current = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            cancelAnimationFrame(frameRef.current);
            simulation.stop();
        };
    }, [d3Loaded, animate, results]);

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center">
            <canvas 
                ref={canvasRef} 
                className="w-full h-full pointer-events-none"
            />
        </div>
    );
}

// Name wall: shows all player names, voted ones fade out
function NameWall({ allNames = [], votedNames = [] }: { allNames: string[]; votedNames: string[] }) {
    const votedSet = new Set(votedNames);

    return (
        <div className="flex flex-wrap gap-4 justify-center p-8">
            {(allNames || []).map((name, i) => {
                const formattedName = formatName(name);
                const hasVoted = votedSet.has(formattedName) || votedSet.has(name);
                return (
                    <div
                        key={name}
                        className="px-6 py-6 rounded-xl text-2xl bg-white/10 text-white transition-all duration-700 pointer-events-none"
                        style={{
                            fontFamily: 'Barlow Semi Condensed, sans-serif',
                            fontWeight: 300,
                            opacity: hasVoted ? 0 : 1,
                            transform: hasVoted ? 'scale(0)' : 'scale(1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            animation: hasVoted ? 'none' : `top10NameIn 0.4s ease-out ${i * 30}ms both`,
                        }}
                    >
                        {formatName(name)}
                    </div>
                );
            })}
        </div>
    );
}

/* ──────── dynamic results item ──────── */
function ResultItem({ result, index, show, total }: { result: Top10Result; index: number; show: boolean; total: number }) {
    const hash = hashStr(result.playerName);
    const randomRot = (hash % 60) - 30; // -30 to 30 deg

    return (
        <div
            className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center gap-4 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{
                width: '100%',
                transitionDelay: `${(total - index - 1) * 0.05}s`
            }}
        >
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black shrink-0 border-4 border-white/50 shadow-2xl ${index === 0 ? 'bg-yellow-400 text-black animate-bounce' : 'bg-white/20 text-white'}`} style={{ fontFamily: barlowFont }}>
                {index + 1}
            </div>
            <div className="flex-1 min-w-0 pr-4">
                <div className="text-white tracking-tight" style={{ fontFamily: barlowFont, fontWeight: 400, fontSize: '3rem', lineHeight: 1.1, overflow: 'visible' }}>
                    {formatName(result.playerName)}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-4 bg-white/10 rounded-full overflow-hidden" style={{ width: '40%' }}>
                        <div
                            className={`h-full rounded-full transition-all duration-1000 delay-500 ${index === 0 ? 'bg-gradient-to-r from-yellow-300 via-white to-yellow-300' : 'bg-gradient-to-r from-cyan-300 to-blue-600'}`}
                            style={{ width: show ? `${result.percentage}%` : '0%' }}
                        />
                    </div>
                    <span className={`shrink-0 ${index === 0 ? 'text-yellow-300' : 'text-cyan-300'}`} style={{ fontFamily: barlowFont, fontWeight: 400, fontSize: '3rem', whiteSpace: 'nowrap' }}>
                        {result.percentage}%
                    </span>
                </div>
            </div>
        </div>
    );
}

function SequentialResults({ results }: { results: Top10Result[] }) {
    const [revealCount, setRevealCount] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setRevealCount(prev => (prev < results.length ? prev + 1 : prev));
        }, 1200); // Reveal every 1.2s for drama
        return () => clearInterval(timer);
    }, [results.length]);

    // Limit to Top 5 and distribute evenly
    const top5 = results.slice(0, 5);

    return (
        <div className="flex flex-col h-full justify-between items-stretch py-8">
            {top5.map((res, i) => {
                // Reveal from bottom: last index revealed first
                const revealIndex = top5.length - 1 - i;
                const show = revealCount > revealIndex;
                return (
                    <ResultItem
                        key={res.playerName}
                        result={res}
                        index={i}
                        show={show}
                        total={top5.length}
                    />
                );
            })}
        </div>
    );
}

/* ──────── main display component ──────── */
export default function Top10Display({ state, heading, mediaUrl, faseKey, sessionId }: Top10DisplayProps) {
    const phase = state?.currentQuestion?.phase || 'intro';
    const isMatchingFase = !!faseKey && state?.currentFase === faseKey;
    const votedNames = state && isMatchingFase ? getVoterNames(state) : [];
    const liveTally = useMemo(() => {
        if (!isMatchingFase) return [];
        return getLiveTally(state);
    }, [state, isMatchingFase]);
    const [animateCloud, setAnimateCloud] = useState(false);
    const prevPhaseRef = useRef(phase);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Trigger animation when results/voting phase starts
    useEffect(() => {
        if (phase === 'results' || phase === 'voting') {
            setAnimateCloud(true);
        }
        prevPhaseRef.current = phase;
    }, [phase]);

    // Play video with sound and unmute on interaction
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;

        const unmuteAndPlay = () => {
            v.muted = false;
            v.volume = 1;
            if (v.paused) v.play().catch(() => {});
        };

        v.muted = false;
        v.volume = 1;
        v.loop = false;

        const playPromise = v.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("[Top10Display] Autoplay prevented, waiting for interaction", error);
                v.muted = true; // Fallback to muted if blocked
                v.play().catch(() => {});
            });
        }

        window.addEventListener('ranking-audio-unlocked', unmuteAndPlay);
        window.addEventListener('click', unmuteAndPlay);
        window.addEventListener('keydown', unmuteAndPlay);

        return () => {
            window.removeEventListener('ranking-audio-unlocked', unmuteAndPlay);
            window.removeEventListener('click', unmuteAndPlay);
            window.removeEventListener('keydown', unmuteAndPlay);
        };
    }, [mediaUrl]);


    const isVideo = !!mediaUrl && /\.(mp4|mov|avi|m4v|webm)$/i.test(mediaUrl);

    // Override heading with hardcoded map
    const displayHeading = (faseKey && TOP10_HEADINGS[faseKey]) || heading;

    return (
        <div
            className="min-h-screen flex flex-col relative overflow-hidden bg-black"
        >
            {/* Google Fonts Preload */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Barlow+Semi+Condensed:wght@300;400;700;900&display=swap');
            `}</style>

            {/* Background Media */}
            {mediaUrl && (
                <div className="absolute inset-0 z-0 h-full w-full">
                    {isVideo ? (
                        <video
                            ref={videoRef}
                            src={mediaUrl}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            onPlay={(e) => { e.currentTarget.muted = false; e.currentTarget.volume = 1; e.currentTarget.loop = false; }}
                            onTimeUpdate={(e) => {
                                const vid = e.currentTarget;
                                if (vid.duration - vid.currentTime < 0.5 && !vid.paused) {
                                    vid.pause(); // Freeze on last frame
                                    // Auto-advance to voting if this was the trailer
                                    if (faseKey === '17/01' && sessionId) {
                                        console.log("[Top10Display] Trailer ended, jumping to pukkel...");
                                        rankingService.updateSession(sessionId, { current_fase: '17/05' });
                                    }
                                }
                            }}
                        />
                    ) : (
                        <img src={mediaUrl} alt={heading || 'Top 10'} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/30 z-10" />
                </div>
            )}

            {!mediaUrl && (
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0A1752] via-[#1a2a6c] to-[#2d3a8c]" />
            )}

            {/* Content Container */}
            <div className="relative z-20 flex-1 flex flex-col min-h-screen w-full">
                {/* Heading - Allocated height, dynamic font clamp & wide width */}
                {displayHeading && !faseKey?.endsWith('/01') && (
                    <div
                        className="absolute left-0 right-0 text-center top-[clamp(16px,2.8vh,36px)] z-30 flex items-center justify-center"
                        style={{
                            height: 'clamp(110px, 17vh, 165px)',
                        }}
                    >
                        {(() => {
                            const longestLine = Math.max(...displayHeading.split(/\/[nN]/).map(l => l.trim().length), 1);
                            const dynamicFontSize = longestLine <= 24
                                ? 'clamp(62px, 6.8vw, 118px)'
                                : longestLine <= 38
                                ? 'clamp(48px, 5.2vw, 94px)'
                                : 'clamp(38px, 4.2vw, 76px)';

                            return (
                                <h1
                                    className="text-white font-bold px-4 max-w-[96vw] mx-auto"
                                    style={{
                                        fontFamily: barlowFont,
                                        fontWeight: 300,
                                        fontSize: dynamicFontSize,
                                        lineHeight: 1.08,
                                        textShadow: '0 8px 32px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    <RenderHeading text={displayHeading} font={barlowFont} />
                                </h1>
                            );
                        })()}
                    </div>
                )}

                {/* Main content area — strictly below heading and above x/20 gestemd status bar */}
                <div
                    className="absolute left-0 right-0 flex items-stretch px-8"
                    style={{
                        top: 'clamp(140px, 20vh, 185px)',
                        bottom: 'clamp(95px, 13vh, 125px)',
                    }}
                >
                    {phase === 'intro' ? (
                        <div className="flex-1 flex flex-wrap gap-4 items-start justify-center p-8">
                            <NameWall key={faseKey} allNames={state.allPlayerNames} votedNames={votedNames} />
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center relative">
                            {/* Left: SequentialResults if results phase */}
                            {phase === 'results' && (
                                <div className="w-[30%] h-full shrink-0 pr-6">
                                    <SequentialResults key={faseKey} results={state.currentQuestion.results?.length > 0 ? state.currentQuestion.results : liveTally} />
                                </div>
                            )}
                            {/* WordCloud: takes full width during voting (100% centered!), or 70% during results */}
                            <div className={`${phase === 'results' ? 'w-[70%]' : 'w-full'} h-full flex items-center justify-center relative transition-all duration-700`}>
                                <WordCloud key={faseKey} results={liveTally} animate={animateCloud} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Status bar */}
                <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                    {phase === 'voting' && (
                        <div
                            className="text-white bg-white/10 backdrop-blur-xl inline-block px-12 py-4 rounded-full text-3xl font-black border-2 border-white/20 shadow-2xl animate-bounce"
                            style={{ fontFamily: barlowFont }}
                        >
                            {votedNames.length} / {state.allPlayerNames.length} gestemd
                        </div>
                    )}
                </div>
            </div>

            {/* CSS animations */}
            <style jsx>{`
        @keyframes flexFadeIn {
          0% { opacity: 0; transform: scale(0); filter: blur(20px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </div >
    );
}

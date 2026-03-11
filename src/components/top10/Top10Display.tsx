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
const nameFont = 'Nunito, sans-serif';

const TOP10_HEADINGS: Record<string, string> = {
    '17/01': 'Kies iemand uit een ander team',
    '17/02': 'Kies iemand uit een ander team',
    '17/03': 'Kies iemand uit een ander team',
    '17/04': 'Kies iemand uit een ander team',
    '17/05': 'Je hebt een pijnlijke pukkel op je bil waar je niet bij kan. /n Wie mag hem voor je uitknijpen?',
    '17/06': 'Wie denkt dat ie always gelijk heeft?',
    '17/07': 'Wie zou meedoen [tegen betaling uiteraard] /n aan de naakte fotoshoot van het Perfecte Plaatje?',
    '17/08': 'Wie is de grootste zuiplap van de familie?',
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
                <div key={idx} className="block w-full">
                    {line.trim()}
                </div>
            ))}
        </>
    );
}

function layoutCloud(results: Top10Result[], w: number, h: number): CloudItem[] {
    if (results.length === 0) return [];
    const maxVotes = results[0].votes;
    const minFontSize = 80; // MASSIVE
    const maxFontSize = 240; // MASSIVE

    const placed: Rect[] = [];
    const cloudItems: CloudItem[] = [];

    // Add gutters to prevent clipping at edges
    const xGutter = 100;
    const yGutter = 100;
    const effectiveW = w - 2 * xGutter;
    const effectiveH = h - 2 * yGutter;

    results.forEach((r, i) => {
        const hash = hashStr(r.playerName);
        const nameText = formatName(r.playerName);
        const ratio = maxVotes > 0 ? r.votes / maxVotes : 0;
        const fontSize = minFontSize + ratio * (maxFontSize - minFontSize);

        // Generate initial approximate dimensions - MORE CONSERVATIVE
        // Nunito is roughly 0.65w per char. Adding extra vertical spacing for glow/shadows
        const approxW = nameText.length * fontSize * 0.65 + 100;
        const approxH = fontSize * 1.3 + 100;

        let x = w / 2;
        let y = h / 2;
        let rotation = 0;

        if (i === 0) {
            // #1 is strictly large, centered
            x = w / 2;
            y = h / 2;
            rotation = 0;
            const bbox = getRotatedBoundingBox(x, y, approxW, approxH, rotation);
            placed.push(bbox);
        } else if (i === 1) {
            // #2 is strictly -45 degrees
            rotation = -45;
            
            let angle = (hash % 360) * (Math.PI / 180);
            let radius = Math.max(approxW, approxH) / 2 + 50; // push outside center bounds
            let step = 0;

            while (step < 2000) {
                const testX = w / 2 + Math.cos(angle) * radius;
                const testY = h / 2 + Math.sin(angle) * radius;

                const testRect = getRotatedBoundingBox(testX, testY, approxW, approxH, rotation);

                const collision = placed.some(p => intersects(p, testRect)) ||
                    testX - testRect.w/2 < xGutter || testX + testRect.w/2 > w - xGutter ||
                    testY - testRect.h/2 < yGutter || testY + testRect.h/2 > h - yGutter;

                if (!collision) {
                    x = testX;
                    y = testY;
                    placed.push(testRect);
                    break;
                }

                angle += 0.20;
                radius += 6;
                step++;
            }
        } else {
            // Try to place around a spiral until it doesn't intersect
            let angle = (hash % 360) * (Math.PI / 180);
            let radius = Math.max(approxW, approxH) / 2 + 80;
            let step = 0;

            const rotationOptions = [0, 0, 90, -90, -45, 45, 0];
            rotation = rotationOptions[hash % rotationOptions.length];

            while (step < 2000) { // Many iterations for dense packing
                const testX = w / 2 + Math.cos(angle) * radius;
                const testY = h / 2 + Math.sin(angle) * radius;

                const testRect = getRotatedBoundingBox(testX, testY, approxW, approxH, rotation);

                const collision = placed.some(p => intersects(p, testRect)) ||
                    testX - testRect.w/2 < xGutter || testX + testRect.w/2 > w - xGutter ||
                    testY - testRect.h/2 < yGutter || testY + testRect.h/2 > h - yGutter;

                if (!collision) {
                    x = testX;
                    y = testY;
                    placed.push(testRect);
                    break;
                }

                angle += 0.15; // Tighter spiral increments
                radius += 4;  // slower radial expansion
                step++;
            }
        }

        // Slow drift parameters
        const driftX = ((hash % 200) - 100) / 1000;
        const driftY = (((hash >> 3) % 200) - 100) / 1000;
        const driftAngle = ((hash % 60) - 30) / 8000;

        cloudItems.push({
            name: nameText,
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
        });
    });

    return cloudItems;
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
                    // Disabled drift to completely avoid overlap
                }))
            );
            frameRef.current = requestAnimationFrame(loop);
        };
        // frameRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(frameRef.current);
    }, [animate, items.length]);

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-visible"
            style={{ minHeight: '500px' }}
        >
            {items.map((item, i) => (
                <span
                    key={item.name}
                    className="absolute whitespace-nowrap transition-all duration-1000 leading-normal p-8"
                    style={{
                        left: `${item.x}px`,
                        top: `${item.y}px`,
                        transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
                        fontSize: `${item.fontSize}px`,
                        fontFamily: nameFont,
                        fontWeight: i === 0 ? 900 : 700,
                        color: item.color,
                        opacity: item.opacity,
                        textShadow: i === 0
                            ? '0 0 50px rgba(255,255,255,0.5), 0 0 100px rgba(255,255,255,0.3)'
                            : '0 4px 20px rgba(0,0,0,0.6)',
                        letterSpacing: i === 0 ? '4px' : '1px',
                        animation: `cloudFadeIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.1}s both`,
                    }}
                >
                    {item.name}
                </span>
            ))}
        </div>
    );
}

// Name wall: shows all player names, voted ones fade out
function NameWall({ allNames = [], votedNames = [] }: { allNames: string[]; votedNames: string[] }) {
    const votedSet = new Set(votedNames);

    return (
        <div className="flex flex-wrap gap-4 justify-center p-8">
            {(allNames || []).map((name, i) => {
                const hasVoted = votedSet.has(name);
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
            className={`transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center gap-3 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{
                width: '100%',
                transitionDelay: `${(total - index - 1) * 0.05}s`
            }}
        >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black shrink-0 border-2 border-white/50 ${index === 0 ? 'bg-yellow-400 text-black animate-bounce' : 'bg-white/20 text-white'}`} style={{ fontFamily: barlowFont }}>
                {index + 1}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-white tracking-tight" style={{ fontFamily: barlowFont, fontWeight: 400, fontSize: '5.5rem', lineHeight: 1.2, overflow: 'visible' }}>
                    {formatName(result.playerName)}
                </div>
                <div className="flex items-center gap-3 mt-1">
                    <div className="h-6 bg-white/10 rounded-full overflow-hidden" style={{ width: '50%' }}>
                        <div
                            className={`h-full rounded-full transition-all duration-1000 delay-500 ${index === 0 ? 'bg-gradient-to-r from-yellow-300 via-white to-yellow-300' : 'bg-gradient-to-r from-cyan-300 to-blue-600'}`}
                            style={{ width: show ? `${result.percentage}%` : '0%' }}
                        />
                    </div>
                    <span className={`shrink-0 ${index === 0 ? 'text-yellow-300' : 'text-cyan-300'}`} style={{ fontFamily: barlowFont, fontWeight: 400, fontSize: '5.5rem', whiteSpace: 'nowrap' }}>
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

    // Reverse order: lowest rank at bottom, #1 at top. Reveal from bottom up.
    return (
        <div className="flex flex-col gap-4 w-full px-4 no-scrollbar">
            {results.map((res, i) => {
                // Reveal from bottom: last index revealed first
                const revealIndex = results.length - 1 - i;
                const show = revealCount > revealIndex;
                return (
                    <ResultItem
                        key={res.playerName}
                        result={res}
                        index={i}
                        show={show}
                        total={results.length}
                    />
                );
            })}
        </div>
    );
}

/* ──────── main display component ──────── */
export default function Top10Display({ state, heading, mediaUrl, faseKey, sessionId }: Top10DisplayProps) {
    const phase = state?.currentQuestion?.phase || 'intro';
    const votedNames = state ? getVoterNames(state) : [];
    const liveTally = useMemo(() => getLiveTally(state), [state]);
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

    // Play video only once and with sound
    useEffect(() => {
        if (videoRef.current) {
            const v = videoRef.current;
            v.muted = false;
            v.volume = 1;
            v.loop = false;

            const playPromise = v.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("[Top10Display] Autoplay prevented, waiting for interaction", error);
                    v.muted = true; // Fallback to muted if blocked
                    v.play();
                });
            }
        }
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
            <div className="relative z-20 flex-1 flex flex-col">
                {/* Heading - POSITION DEPENDENT */}
                {displayHeading && (
                    <div className={`absolute left-0 right-0 text-center ${faseKey?.endsWith('/01') ? 'bottom-[75px]' : 'top-[100px]'}`}>
                        <h1
                            className="text-white px-12 leading-none"
                            style={{
                                fontFamily: barlowFont,
                                fontWeight: 300,
                                fontSize: '10rem',
                                textShadow: '0 8px 32px rgba(0,0,0,0.8)'
                            }}
                        >
                            <RenderHeading text={displayHeading} font={barlowFont} />
                        </h1>
                    </div>
                )}

                {/* Main content area */}
                <div className="flex-1 flex items-stretch p-4">
                    {phase === 'intro' ? (
                        <div className="flex-1 flex flex-wrap gap-4 items-center justify-center p-8">
                            <NameWall allNames={state.allPlayerNames} votedNames={votedNames} />
                        </div>
                    ) : phase === 'results' ? (
                        <>
                            {/* Left: results list - anchored to bottom left 25% */}
                            <div className="absolute left-0 bottom-0 w-1/4" style={{ paddingBottom: '75px', paddingLeft: '32px' }}>
                                <SequentialResults results={state.currentQuestion.results} />
                            </div>
                            {/* Right: wordcloud — absolutely positioned 75% width, 75vh height, bottom-anchored */}
                            <div className="absolute right-0 bottom-[75px] w-3/4" style={{ height: '75vh' }}>
                                <WordCloud results={liveTally} animate={animateCloud} />
                            </div>
                        </>
                    ) : (
                        <div className="absolute right-0 bottom-[75px] w-3/4" style={{ height: '75vh' }}>
                            <WordCloud results={liveTally} animate={animateCloud} />
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
        @keyframes cloudFadeIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0) rotate(-180deg); filter: blur(20px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); filter: blur(0); }
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

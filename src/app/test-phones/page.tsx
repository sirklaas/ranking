'use client';

import React, { useState, useEffect, useRef } from 'react';
import { rankingService } from '@/lib/pocketbase';

const APP_VERSION = "v9.4.40";

function ScaledPhone({
    phoneNum,
    code,
    resetKey,
}: {
    phoneNum: number;
    code?: string | null;
    resetKey: number;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState<number>(0.75);

    useEffect(() => {
        if (!containerRef.current) return;
        const updateScale = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                if (w > 0) {
                    setScale(w / 375);
                }
            }
        };

        updateScale();
        const ro = new ResizeObserver(updateScale);
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    const phoneHeight = Math.round(812 * scale);

    // Exact copy of real phone: loads /player with isolated slot for localStorage.
    // resetKey triggers clean fresh state (showing '?') on initial load and reset.
    const iframeSrc = `/player?slot=${phoneNum}&reset=${resetKey}${code ? `&code=${code}` : ''}`;

    return (
        <div className="flex flex-col items-center w-full min-w-0">
            <div className="flex items-center justify-between w-full px-1 mb-2">
                <span className="text-orange-400 text-xs uppercase tracking-wider font-bold">
                    📱 Phone {phoneNum}
                </span>
                <span className="text-zinc-500 text-[10px] font-mono">
                    Slot {phoneNum}
                </span>
            </div>

            <div
                ref={containerRef}
                className="w-full relative overflow-hidden"
                style={{ height: `${phoneHeight}px` }}
            >
                <div
                    className="bg-black rounded-[3rem] p-2 shadow-[0_0_25px_rgba(255,117,24,0.18)] overflow-hidden border-4 border-orange-500/40 hover:border-orange-500/80 transition-all relative"
                    style={{
                        width: '375px',
                        height: '812px',
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    {/* Notch simulation */}
                    <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-b-xl w-40 mx-auto z-10 pointer-events-none"></div>

                    {/* Exact real phone */}
                    <iframe
                        key={`${phoneNum}-${resetKey}`}
                        src={iframeSrc}
                        className="w-full h-full rounded-[2.5rem] bg-[#0c0914]"
                        style={{ border: 'none' }}
                        title={`Phone ${phoneNum}`}
                    />
                </div>
            </div>
        </div>
    );
}

export default function TestPhonesPage() {
    const [code, setCode] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState<number>(1);
    const [sessionFase, setSessionFase] = useState<string>('01/01');
    const [nrTeams, setNrTeams] = useState<number>(4);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

    const handleResetAll = async () => {
        for (let i = 1; i <= 6; i++) {
            try {
                localStorage.removeItem(`rankingPlayerData_slot${i}`);
                localStorage.removeItem(`rankingTeam_slot${i}`);
                localStorage.removeItem(`voted_top3_slot${i}`);
                localStorage.removeItem(`voted_top10_slot${i}`);
            } catch {}
        }
        setResetKey((k) => k + 1);
        try {
            const sid = activeSessionId || code || 'latest';
            await fetch('/api/session-state', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: sid, action: 'reset_joined_players' })
            });
        } catch (err) {
            console.warn('Failed to reset server joined players', err);
        }
    };

    const handleAutoJoinAll = async () => {
        const testPlayers = [
            { team: 1, name: '001 Angela' },
            { team: 2, name: '002 Anita' },
            { team: 3, name: '003 Anouk' },
            { team: 4, name: '004 Chantal' },
            { team: 1, name: '001 Astrid' },
            { team: 2, name: '002 Beau' },
        ];
        const sid = activeSessionId || code || 'latest';

        for (let i = 0; i < testPlayers.length; i++) {
            const p = testPlayers[i];
            const slot = i + 1;
            const data = { teamNumber: p.team, playerName: p.name };
            try {
                localStorage.setItem(`rankingPlayerData_slot${slot}`, JSON.stringify(data));
                localStorage.setItem(`rankingTeam_slot${slot}`, p.team.toString());
            } catch {}

            try {
                await fetch('/api/session-state', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: sid,
                        action: 'join_player',
                        playerName: p.name
                    })
                });
            } catch (err) {
                console.warn('Auto-join player error:', err);
            }
        }
        setResetKey((k) => k + 1);
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const urlCode = params.get('code');
            setCode(urlCode);

            let active = true;
            const poll = async () => {
                if (!active) return;
                try {
                    const targetId = urlCode || 'latest';
                    const res = await fetch(`/api/session-state?id=${encodeURIComponent(targetId)}`);
                    if (!active || !res.ok) return;
                    const { session } = await res.json();
                    if (!active || !session) return;
                    if (session.id) setActiveSessionId(session.id);
                    if (session.current_fase) setSessionFase(session.current_fase);
                    if (session.nr_teams) setNrTeams(session.nr_teams);
                } catch { /* silent */ }
            };

            const timer = setInterval(poll, 1000);
            poll();

            return () => { active = false; clearInterval(timer); };
        }
    }, []);

    return (
        <div className="min-h-screen bg-[#08070b] p-4 sm:p-6 flex flex-col w-full text-white">
            {/* Version badge */}
            <div
                className="fixed z-[9999] text-orange-400/40 text-[11px]"
                style={{ fontFamily: 'monospace', bottom: '15px', left: '100px' }}
            >
                {APP_VERSION} · Halloween Edition · 6 phones · fase: {sessionFase} · {nrTeams} teams
            </div>

            {/* Creepy Header */}
            <header className="flex flex-wrap items-center justify-between w-full mb-6 pb-4 border-b border-orange-500/30 gap-3">
                <div className="flex items-center gap-4">
                    <span className="text-3xl animate-bounce">🎃</span>
                    <div>
                        <h1
                            className="text-orange-500 text-2xl md:text-3xl font-normal tracking-wide uppercase leading-none"
                            style={{
                                fontFamily: '"BrewHouse-Aged", "BrewHouse", sans-serif',
                                textShadow: '0 0 16px rgba(255,117,24,0.8), 0 0 30px rgba(255,69,0,0.6)'
                            }}
                        >
                            Creepy Ranking — 6 Test Phones
                        </h1>
                        <p className="text-[11px] text-zinc-400 font-mono tracking-wider uppercase mt-1">
                            Simulated Mobile Player Environment · Real-time Synced
                        </p>
                    </div>
                    <span className="text-orange-400 bg-orange-950/80 border border-orange-700/80 text-xs px-3 py-1 rounded-full font-mono font-bold shadow-[0_0_10px_rgba(255,117,24,0.3)]">
                        Fase: {sessionFase}
                    </span>
                    <span className="text-purple-400 bg-purple-950/80 border border-purple-700/80 text-xs px-3 py-1 rounded-full font-mono font-bold">
                        {nrTeams} Teams
                    </span>
                </div>

                <div className="flex items-center gap-2.5">
                    <a
                        href="/display"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-orange-300 text-xs font-bold rounded-lg border border-orange-500/40 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        🖥️ Display
                    </a>
                    <a
                        href="/presenter"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-orange-300 text-xs font-bold rounded-lg border border-orange-500/40 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        🎛️ Presenter
                    </a>
                    <a
                        href="/creepy-preview"
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-purple-300 text-xs font-bold rounded-lg border border-purple-500/40 transition-colors shadow-sm flex items-center gap-1.5"
                    >
                        🎬 Trailers & Traits
                    </a>
                    <button
                        onClick={handleAutoJoinAll}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-lg border border-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.5)] flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Meld direct 6 testspelers aan over alle 4 teams"
                    >
                        <span>⚡</span> Auto-Join 6 Spelers
                    </button>
                    <button
                        onClick={handleResetAll}
                        className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold rounded-lg border border-orange-400 transition-colors shadow-[0_0_15px_#ea580c] flex items-center gap-1.5 active:scale-95 cursor-pointer"
                        title="Reset all 6 phones back to initial '?' team selection"
                    >
                        <span>🔄</span> Reset All to &apos;?&apos;
                    </button>
                </div>
            </header>

            {/* 6 Phones Horizontal Row */}
            <main className="w-full">
                <div className="grid grid-cols-6 gap-3 lg:gap-4 w-full items-start">
                    {[1, 2, 3, 4, 5, 6].map((phoneNum) => (
                        <ScaledPhone
                            key={phoneNum}
                            phoneNum={phoneNum}
                            code={code}
                            resetKey={resetKey}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}

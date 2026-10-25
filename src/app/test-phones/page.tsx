'use client';

import React, { useState, useEffect, useRef } from 'react';
import { rankingService } from '@/lib/pocketbase';

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
                <span className="text-gray-200 text-xs uppercase tracking-wider font-bold">
                    Phone {phoneNum}
                </span>
                <span className="text-gray-400 text-[10px] font-mono">
                    Slot {phoneNum}
                </span>
            </div>

            <div
                ref={containerRef}
                className="w-full relative overflow-hidden"
                style={{ height: `${phoneHeight}px` }}
            >
                <div
                    className="bg-black rounded-[3rem] p-2 shadow-2xl overflow-hidden border-4 border-gray-700 relative"
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
                        className="w-full h-full rounded-[2.5rem] bg-white"
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
        <div className="min-h-screen bg-gray-950 p-4 sm:p-6 flex flex-col w-full">
            {/* Version badge moved to the right (left: 100px) so Next.js logo does not cover it */}
            <div
                className="fixed z-[9999] text-white/40 text-[11px]"
                style={{ fontFamily: 'monospace', bottom: '15px', left: '100px' }}
            >
                v9.4.20 | 6 phones | fase: {sessionFase} | {nrTeams} teams
            </div>

            {/* Header */}
            <header className="flex flex-wrap items-center justify-between w-full mb-4 pb-3 border-b border-gray-800 gap-2">
                <div className="flex items-center gap-3">
                    <h1
                        className="text-white text-2xl font-bold tracking-tight"
                        style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                    >
                        6 Test Phones
                    </h1>
                    <span className="text-blue-400 bg-blue-950/80 border border-blue-800 text-xs px-2.5 py-0.5 rounded-full font-mono">
                        Fase: {sessionFase}
                    </span>
                    <span className="text-emerald-400 bg-emerald-950/80 border border-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-mono">
                        {nrTeams} Teams
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleResetAll}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg border border-indigo-400 transition-colors shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
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

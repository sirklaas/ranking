'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { rankingService, teamService } from '@/lib/pocketbase';

const APP_VERSION = 'v8.9.1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SessionData {
    id: string;
    playernames: string;
    nr_teams: number;
    nr_players: number;
    teamleaders?: Record<string, Record<string, number>> | string | null;
    [key: string]: unknown;
}

interface PlayerInfo {
    name: string;
    teamNumber: number;
    teamMembers: string[]; // All team members (for name+teamleader selection)
}

type PhaseType = 'waiting' | 'team' | 'popup' | 'photocircle_ask' | 'name' | 'teamleader' | 'complete' | 'error';

interface PhoneState {
    id: number;        // Which slot (0-3)
    player: PlayerInfo | null;
    phase: PhaseType;
    photocircleChoice: boolean | null;
    teamleaderVote: string | null;
    log: string[];
    error: string | null;
}

interface PlayerResult {
    playerName: string;
    teamNumber: number;
    photocircleChoice: boolean | null;      // true = has account, false = no account
    teamleaderVote: string | null;
    completedAt: string;
    durationMs: number;
}

interface TieInfo {
    teamNumber: number;
    tiedPlayers: string[];
    votes: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const SLOT_COUNT = 4;
const STEP_MS_DEFAULT = 900; // ms between automatic steps

function rand(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number) {
    return new Promise<void>(r => setTimeout(r, ms));
}

function allLogs(phone: PhoneState, msg: string): PhoneState {
    return { ...phone, log: [...phone.log, `[${new Date().toLocaleTimeString()}] ${msg}`] };
}

// ---------------------------------------------------------------------------
// Phone Panel UI
// ---------------------------------------------------------------------------
function PhonePanel({ phone, playerIndex, totalPlayers }: {
    phone: PhoneState;
    playerIndex: number;
    totalPlayers: number;
}) {
    const phaseLabels: Record<PhaseType, string> = {
        waiting: '⏳ Waiting...',
        team: '🏷️ Team Selection',
        popup: '📱 PhotoCircle Popup',
        photocircle_ask: '❓ PhotoCircle?',
        name: '📝 Name Selection',
        teamleader: '👑 Vote Teamleader',
        complete: '✅ Complete',
        error: '❌ Error',
    };

    const phaseColors: Record<PhaseType, string> = {
        waiting: 'from-gray-600 to-gray-800',
        team: 'from-blue-600 to-indigo-700',
        popup: 'from-orange-500 to-red-600',
        photocircle_ask: 'from-purple-600 to-pink-600',
        name: 'from-teal-600 to-cyan-700',
        teamleader: 'from-yellow-500 to-orange-500',
        complete: 'from-green-600 to-emerald-700',
        error: 'from-red-700 to-red-900',
    };

    return (
        <div className="flex flex-col items-center gap-2 min-w-0" style={{ width: '23%' }}>
            {/* Player counter above phone */}
            <div className="text-white/60 text-xs text-center font-mono">
                {phone.player ? `Player ${playerIndex}/${totalPlayers}` : 'Idle'}
            </div>

            {/* Phone mockup */}
            <div
                className={`w-full rounded-[2rem] border-4 border-white/20 shadow-2xl overflow-hidden bg-gradient-to-b ${phaseColors[phone.phase]} transition-all duration-500`}
                style={{ aspectRatio: '9/16', position: 'relative', minHeight: 0 }}
            >
                {/* Status bar */}
                <div className="absolute top-0 left-0 right-0 h-8 bg-black/30 flex items-center justify-between px-4 z-20">
                    <span className="text-white/50 text-[8px] font-mono">SIM-{phone.id + 1}</span>
                    <span className="text-white/80 text-[8px] font-mono uppercase tracking-wider">
                        {phaseLabels[phone.phase]}
                    </span>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center px-3 pt-8 pb-3 gap-2">
                    {phone.phase === 'waiting' && (
                        <div className="text-white/40 text-sm text-center">—</div>
                    )}

                    {phone.phase === 'team' && phone.player && (
                        <div className="flex flex-col items-center gap-3">
                            <div className="text-white/60 text-xs uppercase tracking-widest">In welk team?</div>
                            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg border-4 border-white/30">
                                <span className="text-2xl font-bold text-pink-600">{phone.player.teamNumber}</span>
                            </div>
                            <div className="text-white/80 text-xs">(typing team #{phone.player.teamNumber})</div>
                        </div>
                    )}

                    {phone.phase === 'popup' && phone.player && (
                        <div className="w-full bg-white/10 border border-white/30 rounded-xl p-3 text-center text-white">
                            <div className="text-[10px] font-bold mb-1">📱 PhotoCircle</div>
                            <div className="text-[9px] opacity-70">Download nu deze App!</div>
                            <div className="mt-2 text-[8px] opacity-50 italic">Popup is open…</div>
                        </div>
                    )}

                    {phone.phase === 'photocircle_ask' && phone.player && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-white text-[10px] text-center">Heb je een PhotoCircle account?</div>
                            <div className="flex gap-2">
                                <div className={`px-2 py-1 rounded-full text-[9px] font-bold ${phone.photocircleChoice === true ? 'bg-white text-green-700' : 'bg-white/20 text-white'}`}>JA</div>
                                <div className={`px-2 py-1 rounded-full text-[9px] font-bold ${phone.photocircleChoice === false ? 'bg-white text-red-700' : 'bg-white/20 text-white'}`}>NEE</div>
                            </div>
                        </div>
                    )}

                    {phone.phase === 'name' && phone.player && (
                        <div className="flex flex-col items-center gap-1 w-full">
                            <div className="text-white text-[10px] text-center mb-1">Wat is jouw naam?</div>
                            <div className="grid grid-cols-2 gap-1 w-full">
                                {phone.player.teamMembers.slice(0, 8).map(m => (
                                    <div
                                        key={m}
                                        className={`text-[8px] py-0.5 px-1 rounded text-center truncate ${m === phone.player!.name ? 'bg-white text-purple-800 font-bold border border-yellow-300' : 'bg-white/20 text-white'}`}
                                    >
                                        {m === phone.player!.name ? '✓ ' : ''}{m}
                                    </div>
                                ))}
                                {phone.player.teamMembers.length > 8 && (
                                    <div className="col-span-2 text-center text-[7px] text-white/40">+{phone.player.teamMembers.length - 8} more…</div>
                                )}
                            </div>
                        </div>
                    )}

                    {phone.phase === 'teamleader' && phone.player && (
                        <div className="flex flex-col items-center gap-1 w-full">
                            <div className="text-white text-[10px] text-center mb-1">👑 Wie kies jij als Teamleider?</div>
                            <div className="w-full bg-yellow-400/30 border border-yellow-400/60 rounded px-2 py-1 text-center">
                                <div className="text-yellow-200 text-[9px] font-bold truncate">→ {phone.teamleaderVote || '?'}</div>
                            </div>
                            <div className="text-white/40 text-[7px] italic">
                                (voting for {phone.teamleaderVote || '...'})</div>
                        </div>
                    )}

                    {phone.phase === 'complete' && phone.player && (
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-4xl">✅</div>
                            <div className="text-white font-bold text-center text-[10px]">{phone.player.name}</div>
                            <div className="text-white/60 text-[8px] text-center">Team {phone.player.teamNumber}</div>
                            <div className="text-white/60 text-[8px] text-center">
                                📸 {phone.photocircleChoice ? 'Has account' : 'No account'}
                            </div>
                            <div className="text-white/60 text-[8px] text-center">
                                👑 Voted: {phone.teamleaderVote}
                            </div>
                        </div>
                    )}

                    {phone.phase === 'error' && (
                        <div className="text-red-300 text-[9px] text-center">{phone.error}</div>
                    )}
                </div>
            </div>

            {/* Live log (last 3 entries) */}
            <div className="w-full bg-black/40 rounded-lg p-1 font-mono text-[7px] text-green-300/70 min-h-8">
                {phone.log.slice(-3).map((l, i) => (
                    <div key={i} className="truncate">{l}</div>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main Test Page
// ---------------------------------------------------------------------------
export default function TestPage() {
    const [session, setSession] = useState<SessionData | null>(null);
    const [allPlayers, setAllPlayers] = useState<PlayerInfo[]>([]);
    const [phones, setPhones] = useState<PhoneState[]>(
        Array.from({ length: SLOT_COUNT }, (_, i) => ({
            id: i, player: null, phase: 'waiting', photocircleChoice: null, teamleaderVote: null, log: [], error: null
        }))
    );
    const [queue, setQueue] = useState<PlayerInfo[]>([]);
    const [completed, setCompleted] = useState<PlayerResult[]>([]);
    const [running, setRunning] = useState(false);
    const [speed, setSpeed] = useState(STEP_MS_DEFAULT);
    const [done, setDone] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [tieBreakRule, setTieBreakRule] = useState<'first' | 'retry' | 'random'>('first');

    // Track player start times per slot
    const startTimes = useRef<Record<number, number>>({});
    // Running ref to avoid stale closure
    const runningRef = useRef(false);
    const queueRef = useRef<PlayerInfo[]>([]);
    const completedRef = useRef<PlayerResult[]>([]);

    // Sync refs
    useEffect(() => { queueRef.current = queue; }, [queue]);
    useEffect(() => { completedRef.current = completed; }, [completed]);
    useEffect(() => { runningRef.current = running; }, [running]);

    // ---------------------------------------------------------------------------
    // Load session
    // ---------------------------------------------------------------------------
    useEffect(() => {
        async function load() {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const targetId = urlParams.get('session');

                let sess: SessionData;

                if (targetId) {
                    sess = await rankingService.getSessionById(targetId) as unknown as SessionData;
                } else {
                    const sessions = await rankingService.getAllSessions();
                    if (!sessions.length) { setSessionError('No sessions found in PocketBase'); return; }
                    sess = sessions[0] as unknown as SessionData;
                }

                setSession(sess);

                const parsed = teamService.parsePlayerNames(sess.playernames);
                const assignments = teamService.generateTeamAssignments(parsed, sess.nr_teams || 1);

                const players: PlayerInfo[] = [];
                Object.entries(assignments).forEach(([teamNumStr, members]) => {
                    const teamNum = parseInt(teamNumStr);
                    members.forEach(name => players.push({ name, teamNumber: teamNum, teamMembers: members }));
                });

                // Shuffle for randomness
                for (let i = players.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [players[i], players[j]] = [players[j], players[i]];
                }

                setAllPlayers(players);
                setQueue(players);
                queueRef.current = players;
            } catch (e) {
                setSessionError(`Failed to load session: ${e}`);
            }
        }
        load();
    }, []);

    // ---------------------------------------------------------------------------
    // Core: simulate one player through the phone flow in a given slot
    // ---------------------------------------------------------------------------
    const simulatePlayer = useCallback(async (slotId: number, player: PlayerInfo, sess: SessionData) => {
        const stepMs = speed;

        function upd(updater: (prev: PhoneState) => PhoneState) {
            setPhones(prev => prev.map(p => p.id === slotId ? updater(p) : p));
        }

        startTimes.current[slotId] = Date.now();

        // PHASE: team
        upd(p => allLogs({ ...p, player, phase: 'team', photocircleChoice: null, teamleaderVote: null, error: null }, `→ Team phase: selecting team #${player.teamNumber}`));
        await sleep(rand(stepMs * 0.5, stepMs * 1.5));

        if (!runningRef.current) return;

        // PHASE: popup (PhotoCircle popup appears after team is selected)
        upd(p => allLogs({ ...p, phase: 'popup' }, 'PhotoCircle popup appeared'));
        await sleep(rand(stepMs * 1, stepMs * 3)); // User reads popup

        if (!runningRef.current) return;

        // Close popup → photocircle_ask
        upd(p => allLogs({ ...p, phase: 'photocircle_ask' }, 'Closed popup → Has PhotoCircle?'));
        await sleep(rand(stepMs * 0.5, stepMs * 1.5));

        if (!runningRef.current) return;

        // Random choice for PhotoCircle
        const hasPhotocircle = Math.random() > 0.45; // 55% yes
        upd(p => allLogs({ ...p, photocircleChoice: hasPhotocircle, phase: 'name' }, `PhotoCircle: ${hasPhotocircle ? 'YES' : 'NO'} → Name selection`));
        await sleep(rand(stepMs * 0.5, stepMs * 1.5));

        if (!runningRef.current) return;

        // PHASE: name — pick own name
        upd(p => allLogs(p, `Selected own name: "${player.name}"`));
        await sleep(rand(stepMs * 0.3, stepMs));

        if (!runningRef.current) return;

        // PHASE: teamleader — pick random team member (not self)
        const others = player.teamMembers.filter(m => m !== player.name);
        const leaderVote = others.length > 0 ? others[rand(0, others.length - 1)] : player.name;
        upd(p => allLogs({ ...p, phase: 'teamleader', teamleaderVote: leaderVote }, `Voting for teamleader: "${leaderVote}"`));
        await sleep(rand(stepMs * 0.5, stepMs * 1.5));

        if (!runningRef.current) return;

        // Submit vote via authenticated server-side PATCH — fetch fresh state first to avoid race condition
        try {
            const freshRes = await fetch(`/api/session-state?id=${sess.id}`);
            const freshJson = await freshRes.json();
            // teamleaders is a JSON-type PB field — read as object directly (no JSON.parse)
            const currentVotes: Record<string, Record<string, number>> =
                (freshJson?.session?.teamleaders as Record<string, Record<string, number>>) || {};
            const teamKey = `team_${player.teamNumber}`;
            if (!currentVotes[teamKey]) currentVotes[teamKey] = {};
            if (!currentVotes[teamKey][leaderVote]) currentVotes[teamKey][leaderVote] = 0;
            currentVotes[teamKey][leaderVote] += 1;

            // Write back as actual object (not stringified!)
            await fetch('/api/session-state', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: sess.id, data: { teamleaders: currentVotes } }),
            });

            upd(p => allLogs(p, `✅ Vote saved (${leaderVote}: ${currentVotes[teamKey][leaderVote]} total)`));
        } catch (e) {
            upd(p => allLogs(p, `⚠️ Vote save failed: ${e}`));
        }


        if (!runningRef.current) return;

        // PHASE: complete
        upd(p => allLogs({ ...p, phase: 'complete' }, `✅ Player "${player.name}" completed!`));

        const duration = Date.now() - (startTimes.current[slotId] || Date.now());
        const result: PlayerResult = {
            playerName: player.name,
            teamNumber: player.teamNumber,
            photocircleChoice: hasPhotocircle,
            teamleaderVote: leaderVote,
            completedAt: new Date().toISOString(),
            durationMs: duration,
        };

        setCompleted(prev => [...prev, result]);
        completedRef.current = [...completedRef.current, result];

        await sleep(stepMs * 0.8); // Brief pause showing complete

        if (!runningRef.current) return;

        // Pick next player from queue
        setQueue(prev => {
            const next = [...prev];
            const nextPlayer = next.shift();
            queueRef.current = next;

            if (nextPlayer && sess) {
                // Kick off next player in this slot (async, don't await)
                setTimeout(() => {
                    if (runningRef.current) simulatePlayer(slotId, nextPlayer, sess);
                }, rand(100, 400));
            } else {
                // This slot is done — mark waiting
                setPhones(p => p.map(ph => ph.id === slotId ? { ...ph, phase: 'waiting', player: null } : ph));
                // Check if ALL queues done
                setTimeout(() => {
                    const queueEmpty = queueRef.current.length === 0;
                    const allWaiting = document.querySelectorAll('[data-sim-phase="waiting"]').length === SLOT_COUNT;
                    if (queueEmpty) {
                        setPhones(allP => {
                            const anyActive = allP.some(ph => ph.phase !== 'waiting' && ph.phase !== 'complete');
                            if (!anyActive) setDone(true);
                            return allP;
                        });
                    }
                }, 1500);
            }

            return next;
        });

    }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

    // Also check done state separately when running stops
    const checkDone = useCallback(() => {
        setPhones(phones => {
            const allIdle = phones.every(p => p.phase === 'waiting' || p.phase === 'complete');
            if (allIdle && queueRef.current.length === 0 && completedRef.current.length > 0) {
                setDone(true);
            }
            return phones;
        });
    }, []);

    // ---------------------------------------------------------------------------
    // Start / Stop
    // ---------------------------------------------------------------------------
    const startSimulation = useCallback(() => {
        if (!session || !allPlayers.length) return;
        setRunning(true);
        runningRef.current = true;
        setDone(false);

        // Reset completed and queue
        const shuffled = [...allPlayers];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setCompleted([]);
        completedRef.current = [];
        setQueue(shuffled.slice(SLOT_COUNT));
        queueRef.current = shuffled.slice(SLOT_COUNT);

        // Reset phones
        setPhones(Array.from({ length: SLOT_COUNT }, (_, i) => ({
            id: i, player: null, phase: 'waiting', photocircleChoice: null, teamleaderVote: null, log: [], error: null
        })));

        // Assign first 4 players
        const initSess = { ...session };
        // Reset votes via authenticated PATCH
        fetch('/api/session-state', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session.id, data: { teamleaders: {} } }) }).catch(() => { });
        initSess.teamleaders = {};

        shuffled.slice(0, SLOT_COUNT).forEach((player, slotId) => {
            setTimeout(() => {
                if (runningRef.current) simulatePlayer(slotId, player, initSess);
            }, slotId * rand(200, 600)); // Stagger start
        });
    }, [session, allPlayers, simulatePlayer]);

    const stopSimulation = useCallback(() => {
        setRunning(false);
        runningRef.current = false;
    }, []);

    // ---------------------------------------------------------------------------
    // Results analysis
    // ---------------------------------------------------------------------------
    const analyzeResults = useCallback(() => {
        if (!session) return null;
        const votesByTeam: Record<number, Record<string, number>> = {};

        completed.forEach(r => {
            if (!votesByTeam[r.teamNumber]) votesByTeam[r.teamNumber] = {};
            if (r.teamleaderVote) {
                votesByTeam[r.teamNumber][r.teamleaderVote] = (votesByTeam[r.teamNumber][r.teamleaderVote] || 0) + 1;
            }
        });

        const winners: Array<{ team: number; winner: string; votes: number; isTie: boolean; tiedWith: string[] }> = [];
        const ties: TieInfo[] = [];

        Object.entries(votesByTeam).forEach(([teamStr, votes]) => {
            const team = parseInt(teamStr);
            const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
            if (!sorted.length) return;
            const topVotes = sorted[0][1];
            const topPlayers = sorted.filter(([, v]) => v === topVotes).map(([n]) => n);

            if (topPlayers.length > 1) {
                ties.push({ teamNumber: team, tiedPlayers: topPlayers, votes: topVotes });
                winners.push({ team, winner: topPlayers.join(' / '), votes: topVotes, isTie: true, tiedWith: topPlayers });
            } else {
                winners.push({ team, winner: sorted[0][0], votes: topVotes, isTie: false, tiedWith: [] });
            }
        });

        return { winners, ties, votesByTeam };
    }, [completed, session]);

    // ---------------------------------------------------------------------------
    // Export
    // ---------------------------------------------------------------------------
    const exportResults = useCallback(() => {
        const analysis = analyzeResults();
        const data = {
            exportedAt: new Date().toISOString(),
            sessionId: session?.id,
            totalPlayers: completed.length,
            tieBreakRule,
            teamLeaders: analysis?.winners,
            ties: analysis?.ties,
            tieBreakAdvice: analysis?.ties?.length
                ? tieBreakRule === 'first'
                    ? 'First vote counts double — the player who received the first vote wins.'
                    : tieBreakRule === 'retry'
                        ? 'Retry round required — ask tied teams to vote again.'
                        : 'Random winner selected from tied players.'
                : 'No ties.',
            playerResults: completed,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ranking-test-results-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
    }, [analyzeResults, completed, session, tieBreakRule]);

    const analysis = done ? analyzeResults() : null;

    const completedCount = completed.length;
    const totalCount = allPlayers.length;

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    const simulateTopXVotes = useCallback(async (type: 'top3' | 'top10') => {
        if (!session || !allPlayers.length) return;

        let latestSession;
        try {
            latestSession = await rankingService.getSessionById(session.id) as unknown as SessionData;
        } catch (e) {
            alert("Failed to read latest session from database.");
            return;
        }

        // Check phase
        const stateStr = type === 'top3' ? latestSession.top3_state : latestSession.top10_state;
        if (!stateStr) {
            alert(`Start ${type} on the presenter screen first! (state missing)`);
            return;
        }
        try {
            const stateObj = typeof stateStr === 'string' ? JSON.parse(stateStr as string) : stateStr;
            if (stateObj?.currentQuestion?.phase === 'results') {
                alert(`You can only simulate votes BEFORE the ${type.toUpperCase()} 'results' phase! Current phase: ${stateObj?.currentQuestion?.phase}`);
                return;
            }
        } catch (e) {
            console.error("Failed to parse state", e);
        }

        setRunning(true);
        const endpoint = type === 'top3' ? '/api/top3-vote' : '/api/top10-vote';

        // Loop through every player and cast a random vote
        for (let i = 0; i < allPlayers.length; i++) {
            const voter = allPlayers[i];
            // Pick a random player that is NOT the voter
            const others = allPlayers.filter(p => p.name !== voter.name);
            const chosen = others[Math.floor(Math.random() * others.length)];

            try {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sessionId: session.id,
                        voterId: voter.name,
                        voterName: voter.name,
                        teamNumber: voter.teamNumber,
                        chosenPlayerId: chosen.name,
                        chosenPlayerName: chosen.name
                    })
                });
                console.log(`[Test] Simulated ${type} vote: ${voter.name} -> ${chosen.name}`);
            } catch (e) {
                console.error(`[Test] Failed to simulate vote for ${voter.name}:`, e);
            }

            // Random delay between votes so they stream in visually (0.5 to 1.5s)
            await sleep(rand(500, 1500));
        }
        setRunning(false);
        alert(`Finished simulating ${type.toUpperCase()} votes for all ${allPlayers.length} players!`);
    }, [session, allPlayers]);

    return (
        <div
            className="min-h-screen"
            style={{
                background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0a2e 50%, #0a1a2e 100%)',
                fontFamily: 'Barlow Semi Condensed, sans-serif'
            }}
        >
            {/* Google Fonts */}
            <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@300;400;600;700&display=swap');`}</style>

            <div className="max-w-6xl mx-auto px-4 py-6">

                {/* Header */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-widest uppercase">📱 Phone Simulator</h1>
                    <p className="text-white/50 text-sm mt-1">Simulates all players through the full on-boarding flow with real PocketBase calls</p>
                    <div className="mt-1 flex gap-4 justify-center text-white/40 text-xs font-mono">
                        <div>{APP_VERSION}-test</div>
                        {session && <div>fase: {String(session.current_fase) || 'none'}</div>}
                    </div>
                </div>

                {/* Session Info */}
                {sessionError && (
                    <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300 text-sm mb-4">{sessionError}</div>
                )}

                {session && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-wrap gap-6 justify-between items-center">
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-widest">Session</div>
                            <div className="text-white font-semibold">{session.id.slice(0, 8)}…</div>
                        </div>
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-widest">Players</div>
                            <div className="text-white font-semibold">{totalCount}</div>
                        </div>
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-widest">Teams</div>
                            <div className="text-white font-semibold">{session.nr_teams}</div>
                        </div>
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-widest">Completed</div>
                            <div className={`font-bold text-lg ${completedCount === totalCount && totalCount > 0 ? 'text-green-400' : 'text-yellow-300'}`}>
                                {completedCount} / {totalCount}
                            </div>
                        </div>
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-widest">Queue</div>
                            <div className="text-white font-semibold">{queue.length}</div>
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col gap-4 mb-6 bg-white/5 border border-white/10 rounded-xl p-4">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Speed:</span>
                            <select
                                value={speed}
                                onChange={e => setSpeed(Number(e.target.value))}
                                disabled={running}
                                className="bg-white/10 text-white rounded-lg px-3 py-1 text-sm border border-white/20 disabled:opacity-50"
                            >
                                <option value={300}>⚡ Very Fast (0.3s)</option>
                                <option value={600}>🚀 Fast (0.6s)</option>
                                <option value={900}>▶️ Normal (0.9s)</option>
                                <option value={1800}>🐢 Slow (1.8s)</option>
                                <option value={3000}>👁️ Watch (3s)</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Tie-break:</span>
                            <select
                                value={tieBreakRule}
                                onChange={e => setTieBreakRule(e.target.value as 'first' | 'retry' | 'random')}
                                className="bg-white/10 text-white rounded-lg px-3 py-1 text-sm border border-white/20"
                            >
                                <option value="random">🎲 Random winner</option>
                                <option value="first">1️⃣ First vote counts double</option>
                                <option value="retry">🔄 Retry round</option>
                            </select>
                        </div>

                        <div className="flex gap-3 ml-auto">
                            {!running ? (
                                <button
                                    onClick={startSimulation}
                                    disabled={!session || !allPlayers.length}
                                    className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-40 hover:scale-105 transition-transform active:scale-95"
                                >
                                    ▶ Start Config (Teamleaders)
                                </button>
                            ) : (
                                <button
                                    onClick={stopSimulation}
                                    className="px-6 py-2 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-colors"
                                >
                                    ⏹ Stop
                                </button>
                            )}

                            {done && (
                                <button
                                    onClick={exportResults}
                                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
                                >
                                    📥 Export Results
                                </button>
                            )}
                        </div>
                    </div>

                    {/* New Simulators for Top 3 and Top 10 */}
                    <div className="flex gap-4 pt-4 border-t border-white/10 mt-2">
                        <button
                            onClick={() => simulateTopXVotes('top3')}
                            disabled={running || !session || !allPlayers.length}
                            className="px-6 py-3 bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-40 hover:scale-105 transition-transform active:scale-95 flex-1"
                        >
                            🎲 Simulate Top 3 Votes
                        </button>
                        <button
                            onClick={() => simulateTopXVotes('top10')}
                            disabled={running || !session || !allPlayers.length}
                            className="px-6 py-3 bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold rounded-xl shadow-lg disabled:opacity-40 hover:scale-105 transition-transform active:scale-95 flex-1"
                        >
                            🎲 Simulate Top 10 Votes
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                {totalCount > 0 && (
                    <div className="w-full h-2 bg-white/10 rounded-full mb-6 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${(completedCount / totalCount) * 100}%` }}
                        />
                    </div>
                )}

                {/* 4 Phone panels */}
                <div className="flex gap-3 justify-between mb-8">
                    {phones.map((phone, i) => (
                        <PhonePanel
                            key={phone.id}
                            phone={phone}
                            playerIndex={completedCount - (phones.filter(p => p.phase !== 'waiting' && p.id < i).length) + i}
                            totalPlayers={totalCount}
                        />
                    ))}
                </div>

                {/* Results (shown when done) */}
                {done && analysis && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mt-4">
                        <h2 className="text-2xl font-bold text-white mb-4">🏆 Simulation Results</h2>

                        {/* Ties */}
                        {analysis.ties.length > 0 && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                                <div className="text-white font-bold mb-2">Ties resolved (first vote counts double):</div>
                                {analysis.ties.map(tie => (
                                    <div key={tie.teamNumber} className="text-white/70 text-sm mb-1">
                                        Team {tie.teamNumber}: {tie.tiedPlayers.join(' / ')} — all {tie.votes} vote{tie.votes !== 1 ? 's' : ''}.
                                        <span className="ml-2 text-yellow-400 italic">
                                            {tieBreakRule === 'first' ? '→ First vote wins' :
                                                tieBreakRule === 'retry' ? '→ Retry round required' :
                                                    `→ Random: ${tie.tiedPlayers[Math.floor(Math.random() * tie.tiedPlayers.length)]} wins`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Results grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {analysis.winners.sort((a, b) => a.team - b.team).map(w => (
                                <div
                                    key={w.team}
                                    className={`rounded-xl p-3 border ${w.isTie ? 'border-yellow-500/30 bg-white/5' : 'border-green-500/30 bg-green-900/20'}`}
                                >
                                    <div className="text-white/50 text-xs uppercase tracking-widest mb-1">Team {w.team}</div>
                                    <div className={`font-bold text-sm ${w.isTie ? 'text-yellow-300' : 'text-green-300'}`}>
                                        👑 {w.winner}
                                    </div>
                                    <div className="text-white/40 text-xs">{w.votes} vote{w.votes !== 1 ? 's' : ''}{w.isTie ? ' (tie)' : ''}</div>
                                </div>
                            ))}
                        </div>

                        {/* Vote breakdown table */}
                        <details className="mt-4">
                            <summary className="text-white/70 cursor-pointer text-sm mb-2">📊 Full vote breakdown per team</summary>
                            <div className="overflow-auto max-h-64 mt-2">
                                <table className="w-full text-sm text-white/70">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left pb-2 pr-4">Team</th>
                                            <th className="text-left pb-2 pr-4">Candidate</th>
                                            <th className="text-left pb-2">Votes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(analysis.votesByTeam).sort(([a], [b]) => parseInt(a) - parseInt(b)).flatMap(([team, votes]) =>
                                            Object.entries(votes).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                                                <tr key={`${team}-${name}`} className="border-b border-white/5">
                                                    <td className="py-1 pr-4">Team {team}</td>
                                                    <td className="py-1 pr-4">{name}</td>
                                                    <td className="py-1 font-bold">{count}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </details>

                        {/* PhotoCircle stats */}
                        <div className="mt-4 flex gap-4">
                            <div className="bg-white/5 rounded-xl p-3 flex-1">
                                <div className="text-white/40 text-xs">Has PhotoCircle account</div>
                                <div className="text-green-300 font-bold text-lg">{completed.filter(r => r.photocircleChoice).length}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 flex-1">
                                <div className="text-white/40 text-xs">No PhotoCircle account</div>
                                <div className="text-red-300 font-bold text-lg">{completed.filter(r => !r.photocircleChoice).length}</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 flex-1">
                                <div className="text-white/40 text-xs">Avg. time per player</div>
                                <div className="text-blue-300 font-bold text-lg">
                                    {completed.length ? Math.round(completed.reduce((s, r) => s + r.durationMs, 0) / completed.length / 1000) : 0}s
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

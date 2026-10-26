"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { ENDGAME_CARDS, EndgameState, DEFAULT_ENDGAME_STATE, EndgameCard } from './endgameData';
import CreepyRankingLogo from '@/components/common/CreepyRankingLogo';

const PlayerView: React.FC<FaseCommonProps> = ({
  sessionId,
  moduleStateJson,
  playerInfo,
  allPlayerNames = []
}) => {
  // Parse endgame state
  const state = useMemo<EndgameState>(() => {
    if (!moduleStateJson) return DEFAULT_ENDGAME_STATE;
    try {
      const parsed = typeof moduleStateJson === 'string' ? JSON.parse(moduleStateJson) : moduleStateJson;
      return {
        selectedCard: parsed?.selectedCard || null,
        playbackState: parsed?.playbackState || 'grid',
        usedCards: Array.isArray(parsed?.usedCards) ? parsed.usedCards : [],
        teamSelections: parsed?.teamSelections || {},
        revealedCards: Array.isArray(parsed?.revealedCards) ? parsed.revealedCards : []
      };
    } catch {
      return DEFAULT_ENDGAME_STATE;
    }
  }, [moduleStateJson]);

  const [leaderName, setLeaderName] = useState<string>('');
  const [isLeader, setIsLeader] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const teamNumber = playerInfo?.teamNumber || 1;
  const playerName = playerInfo?.playerName || '';

  // Determine teamleader from session teamleaders or fallback
  useEffect(() => {
    let active = true;

    const checkLeader = async () => {
      try {
        if (!sessionId) return;
        const res = await fetch(`/api/session-state?id=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();
        const session = data?.session;
        if (!active || !session) return;

        const teamleaders = session.teamleaders as Record<string, Record<string, number>> | undefined;
        const votes = teamleaders?.[`team_${teamNumber}`] || {};

        let topPlayer = '';
        let maxVotes = 0;
        Object.entries(votes).forEach(([name, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            topPlayer = name;
          } else if (count === maxVotes && maxVotes > 0) {
            if (name < topPlayer) topPlayer = name;
          }
        });

        // Fallback: If no votes were cast, pick first player of this team from allPlayerNames
        if (!topPlayer && allPlayerNames.length > 0) {
          const teamPrefix = teamNumber.toString().padStart(3, '0');
          const member = allPlayerNames.find(p => p.startsWith(teamPrefix));
          if (member) {
            topPlayer = member.replace(/^\d{3}\s+/, '').trim();
          }
        }

        if (active) {
          setLeaderName(topPlayer);
          if (playerName && topPlayer && playerName.toLowerCase() === topPlayer.toLowerCase()) {
            setIsLeader(true);
          } else {
            // Also if player explicitly has leader flag or no other players
            setIsLeader(false);
          }
        }
      } catch (err) {
        console.error('[Endgame Player] Error checking leader:', err);
      }
    };

    checkLeader();
    const interval = setInterval(checkLeader, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [sessionId, teamNumber, playerName, allPlayerNames]);

  // Which card did this team's leader choose?
  const myTeamChosenCardId = state.teamSelections[teamNumber.toString()] || null;
  const chosenCard = ENDGAME_CARDS.find(c => c.id === myTeamChosenCardId) || null;

  // Has this card's video finished on the display?
  const isRevealed = myTeamChosenCardId
    ? state.revealedCards.includes(myTeamChosenCardId) || state.usedCards.includes(myTeamChosenCardId)
    : false;

  // Handle Teamleader choosing a card
  const handleSelectCard = useCallback(async (card: EndgameCard) => {
    if (!isLeader || isSubmitting) return;
    if (state.usedCards.includes(card.id)) return;

    setIsSubmitting(true);
    const newTeamSelections = {
      ...state.teamSelections,
      [teamNumber.toString()]: card.id
    };

    const nextState: EndgameState = {
      ...state,
      teamSelections: newTeamSelections,
      // If presenter hasn't selected a card yet, select this card for the display
      selectedCard: state.selectedCard || card.id,
      playbackState: state.playbackState === 'grid' ? 'paused' : state.playbackState,
      timestamp: Date.now()
    };

    try {
      await fetch('/api/session-state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          data: { endgame_state: nextState }
        })
      });
    } catch (err) {
      console.error('[Endgame Player] Error choosing card:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [isLeader, isSubmitting, state, teamNumber, sessionId]);

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-between text-white select-none overflow-x-hidden"
      style={{
        fontFamily: 'Barlow Semi Condensed, sans-serif',
        background: 'linear-gradient(135deg, #0a0a0f 0%, #151528 50%, #1a1a36 100%)'
      }}
    >
      {/* Official Ranking Top Band */}
      <div className="relative w-full min-h-[85px] py-2.5 flex-shrink-0 overflow-hidden shadow-lg flex items-center justify-center">
        <img
          src="/assets/band.webp"
          alt="Ranking Header"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative z-10 w-full">
          <CreepyRankingLogo size="md" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col items-center justify-center">
        {/* CASE 1: Teamleader hasn't chosen yet -> Teamleader sees 8 cards */}
        {isLeader && !chosenCard && (
          <div className="w-full flex flex-col items-center animate-fadeIn">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/50 text-yellow-300 text-xs font-semibold mb-2 shadow-sm">
              👑 Teamleider Team {teamNumber}
            </div>
            <h2 className="text-2xl font-light text-center text-white mb-1">
              Kies een Kaart
            </h2>
            <p className="text-xs text-gray-400 text-center mb-4">
              Tik op één van de 8 kaarten voor jouw team:
            </p>

            {/* 8 Cards 2-column Grid */}
            <div className="w-full grid grid-cols-2 gap-3">
              {ENDGAME_CARDS.map(card => {
                const isTaken = state.usedCards.includes(card.id);
                // Is this card chosen by another team?
                const chosenByOther = Object.entries(state.teamSelections).some(
                  ([t, id]) => t !== teamNumber.toString() && id === card.id
                );
                const disabled = isTaken || chosenByOther || isSubmitting;

                return (
                  <button
                    key={card.id}
                    onClick={() => handleSelectCard(card)}
                    disabled={disabled}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 aspect-square flex flex-col text-left group ${
                      disabled
                        ? 'opacity-35 grayscale cursor-not-allowed border-gray-700 bg-black/40'
                        : 'border-white/20 active:scale-95 hover:border-indigo-400 shadow-lg bg-slate-900/60'
                    }`}
                  >
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 pt-6 pb-2 px-2 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col items-center">
                      <span className="text-white text-sm font-normal text-center drop-shadow-md">
                        {card.name}
                      </span>
                      {chosenByOther && (
                        <span className="text-[9px] text-yellow-400 font-bold uppercase mt-0.5">
                          Al gekozen
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CASE 2: Team member waiting for teamleader to choose */}
        {!isLeader && !chosenCard && (
          <div className="w-full flex flex-col items-center text-center py-8 animate-fadeIn">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500/20 to-amber-500/30 border border-yellow-400/40 flex items-center justify-center text-4xl mb-4 shadow-xl shadow-yellow-500/10 animate-pulse">
              👑
            </div>

            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-indigo-300 text-xs font-semibold mb-3">
              Team {teamNumber}
            </div>

            <h2 className="text-2xl font-light text-white mb-2">
              Wachten op Teamleider...
            </h2>

            <p className="text-sm text-gray-300 max-w-xs leading-relaxed">
              <span className="text-yellow-300 font-semibold">{leaderName || 'Jullie teamleider'}</span> kiest nu op zijn telefoon een kaart voor jullie team.
            </p>

            <div className="mt-8 flex items-center gap-2 text-xs text-indigo-400/80">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
              <span>Even geduld a.u.b.</span>
            </div>
          </div>
        )}

        {/* CASE 3: Card is chosen! Shown on both Leader & Team Member phone */}
        {chosenCard && (
          <div className="w-full flex flex-col items-center text-center animate-fadeIn">
            {/* Status Header */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-200 text-xs font-semibold mb-3 shadow-sm">
              👑 Team {teamNumber} · {isLeader ? 'Jouw Keuze' : `Gekozen door ${leaderName || 'Teamleider'}`}
            </div>

            {/* The Chosen Card */}
            <div
              className={`relative w-64 max-w-[75vw] aspect-square rounded-3xl overflow-hidden border-4 shadow-2xl transition-all duration-700 my-2 ${
                isRevealed
                  ? 'border-yellow-400 ring-8 ring-yellow-400/30 scale-105 shadow-yellow-500/40 animate-bounceOnce'
                  : 'border-indigo-400/80 ring-4 ring-indigo-500/20 shadow-indigo-900/50'
              }`}
            >
              <img
                src={chosenCard.image}
                alt={chosenCard.name}
                className="w-full h-full object-cover"
              />

              <div className="absolute inset-x-0 bottom-0 pt-8 pb-3 px-3 bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col items-center">
                <span
                  className="text-white text-2xl font-normal tracking-wide drop-shadow-lg uppercase"
                  style={{ fontFamily: 'Barlow Semi Condensed, sans-serif' }}
                >
                  {chosenCard.name}
                </span>
              </div>
            </div>

            {/* Status Banner */}
            {!isRevealed ? (
              <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/80 border border-indigo-500/30 w-full max-w-xs flex flex-col items-center gap-1 shadow-lg">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  🎬 Kijk naar het grote scherm!
                </div>
                <div className="text-xs text-gray-400">
                  De video wordt nu getoond op de beamer...
                </div>
              </div>
            ) : (
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-400/60 w-full max-w-xs flex flex-col items-center gap-1 shadow-xl animate-fadeIn">
                <div className="text-xl font-bold text-yellow-300 flex items-center gap-1.5">
                  ✨ ONTHULD!
                </div>
                <div className="text-sm text-white font-medium">
                  Team {teamNumber} speelt met <span className="text-yellow-200 font-bold">{chosenCard.name}</span>!
                </div>
              </div>
            )}
            {/* Photo App Button & Reminder */}
            <div className="mt-5 w-full max-w-xs flex flex-col items-center text-center">
              <a
                href={`https://www.pinkmilk.eu/phone/media.html?showId=${encodeURIComponent(sessionId || '')}&playerName=${encodeURIComponent(playerName || '')}&team=${encodeURIComponent(teamNumber || '1')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-5 rounded-full bg-[#0A1752] text-white font-bold border-2 border-white shadow-xl flex items-center justify-center gap-2 active:scale-95 hover:bg-[#08134A] transition-all text-lg"
                style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}
              >
                <span>Photo App {teamNumber ? `[ Team ${teamNumber} ]` : ''}</span>
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <div className="mt-2.5 text-white/90 text-sm font-semibold leading-snug drop-shadow" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
                Vergeet niet om filmpjes en foto&apos;s te delen.
              </div>
              <div className="text-yellow-300 text-xs font-bold drop-shadow tracking-wide mt-0.5" style={{ fontFamily: '"Barlow Semi Condensed", sans-serif' }}>
                [ vooral van de quizmaster want die tellen dubbel ]
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full py-3 px-4 text-center text-xs text-gray-500 border-t border-white/5 flex-shrink-0">
        Ranking De Finale · Team {teamNumber} ({playerName})
      </div>
    </div>
  );
};

export default PlayerView;

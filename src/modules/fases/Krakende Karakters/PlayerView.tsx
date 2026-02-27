"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import KrakendePlayer from '@/components/krakende-karakters/KrakendePlayer';
import { safeJsonParse } from '@/lib/jsonUtils';
import { krakendeVoteService } from '@/lib/pocketbase';

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, moduleStateJson, playerInfo }) => {
  if (!sessionId || !moduleStateJson || !playerInfo || faseKey === '13/01') return null;

  const state = safeJsonParse<KrakendeState>(moduleStateJson);
  if (!state) return null;

  return (
    <KrakendePlayer
      state={state}
      sessionId={sessionId}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      onSubmitChoice={async (traitId) => {
        // Simple INSERT into krakende_votes — no read-modify-write, no conflicts
        const isPositive = state.phase.includes('positive');
        await krakendeVoteService.submitVote({
          session_id: sessionId,
          player_id: playerInfo.playerId,
          player_name: playerInfo.playerName,
          team_number: playerInfo.teamNumber,
          trait_id: traitId,
          fase: isPositive ? 'positive' : 'negative',
        });
      }}
    />
  );
};

export default PlayerView;

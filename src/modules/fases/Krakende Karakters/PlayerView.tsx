"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import KrakendePlayer from '@/components/krakende-karakters/KrakendePlayer';
import { safeJsonParse } from '@/lib/jsonUtils';
import { krakendeVoteService } from '@/lib/pocketbase';
import TrailerTitleCard from '@/components/common/TrailerTitleCard';

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, moduleStateJson, playerInfo }) => {
  if (faseKey === '13/01') {
    return <TrailerTitleCard title="Krakende Karakters" fase="13/01" />;
  }

  if (!sessionId || !moduleStateJson || !playerInfo) return null;

  const parsed = safeJsonParse(moduleStateJson);
  const state = krakendeLogic.ensureKrakendeState(parsed);

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

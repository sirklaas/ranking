"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import Top10Player from '@/components/top10/Top10Player';

const PlayerView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, playerInfo, allPlayerNames, heading, mediaUrl }) => {
  if (!sessionId || !moduleStateJson || !playerInfo) return null;

  const state: Top10State = JSON.parse(moduleStateJson);

  return (
    <Top10Player
      state={state}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      heading={heading}
      mediaUrl={mediaUrl}
      onVote={async (chosenPlayerId, chosenPlayerName) => {
        const newState = await top10Logic.submitVote(
          sessionId,
          state,
          playerInfo.playerId,
          playerInfo.playerName,
          playerInfo.teamNumber,
          chosenPlayerId,
          chosenPlayerName
        );
        onModuleStateJson?.(JSON.stringify(newState));
      }}
    />
  );
};

export default PlayerView;

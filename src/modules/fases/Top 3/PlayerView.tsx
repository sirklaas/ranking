"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Player from '@/components/top3/Top3Player';

const PlayerView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, playerInfo, allPlayerNames, heading, mediaUrl }) => {
  if (!sessionId || !moduleStateJson || !playerInfo) return null;

  const state: Top3State = JSON.parse(moduleStateJson);

  return (
    <Top3Player
      state={state}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      heading={heading}
      mediaUrl={mediaUrl}
      onVote={async (chosenPlayerId, chosenPlayerName) => {
        const newState = await top3Logic.submitVote(
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

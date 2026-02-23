"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import KrakendePlayer from '@/components/krakende-karakters/KrakendePlayer';

const PlayerView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, moduleStateJson, onModuleStateJson, playerInfo }) => {
  if (!sessionId || !moduleStateJson || !playerInfo || faseKey === '13/01') return null;

  const state: KrakendeState = JSON.parse(moduleStateJson);

  return (
    <KrakendePlayer
      state={state}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      onSubmitChoice={async (traitId) => {
        const newState = await krakendeLogic.submitChoice(
          sessionId,
          state,
          playerInfo.playerId,
          playerInfo.playerName,
          playerInfo.teamNumber,
          traitId
        );
        onModuleStateJson?.(JSON.stringify(newState));
      }}
    />
  );
};

export default PlayerView;

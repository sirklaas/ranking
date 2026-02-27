"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Player from '@/components/top3/Top3Player';
import { safeJsonParse } from '@/lib/jsonUtils';

// Hardcoded headings — must match Top3Display / DisplayView
const TOP3_HEADINGS: Record<string, string> = {
  '10/05': 'Wie wordt er echt heel erg snel verliefd',
  '10/06': 'Wie is de ideale schoon- zoon of zus?',
  '10/07': 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?',
  '10/08': 'Wie zou je absoluut niet /n op je kinderen laten passen?',
  '10/09': 'Wie heeft de meeste crypto\'s',
  '10/10': 'Wie komt het vaakst te laat?',
  '10/11': 'Wie zou er als eerste een account aanmaken /n op OnlyFans?',
  '10/12': 'Wie moet je zeker geen geheim vertellen?',
  '10/13': 'Wie zou je meenemen naar een parenclub?',
};

const PlayerView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, playerInfo, allPlayerNames, heading, mediaUrl, faseKey }) => {
  if (!sessionId || !moduleStateJson || !playerInfo) return null;

  const state = safeJsonParse<Top3State>(moduleStateJson);
  if (!state) return null;

  const displayHeading = (faseKey && TOP3_HEADINGS[faseKey]) || heading;

  return (
    <Top3Player
      state={state}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      heading={displayHeading}
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

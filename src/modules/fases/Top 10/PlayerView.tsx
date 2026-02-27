"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import Top10Player from '@/components/top10/Top10Player';
import { safeJsonParse } from '@/lib/jsonUtils';

// Hardcoded headings — must match Top10Display / DisplayView
const TOP10_HEADINGS: Record<string, string> = {
  '17/05': 'Je hebt een pijnlijke pukkel op je bil waar je niet bij kan. /n Wie mag hem voor je uitknijpen?',
  '17/06': 'Wie denkt dat ie always gelijk heeft?',
  '17/07': 'Wie zou meedoen [tegen betaling uiteraard] /n aan de naakte fotoshoot van het Perfecte Plaatje?',
  '17/08': 'Wie is de grootste zuiplap van de familie?',
  '17/09': 'Wie kan absoluut niet tegen kritiek?',
  '17/10': 'Wie laat weleens een wind?',
  '17/11': 'Wie maakt de allerlelijkste Selfies ?',
  '17/12': 'Wie is het meest verslaafd aan Social Media?',
  '17/13': 'Wie krijgt de meeste bekeuringen?',
  '17/14': 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tussen de lakens?',
};

const PlayerView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, playerInfo, allPlayerNames, heading, mediaUrl, faseKey }) => {
  if (!sessionId || !moduleStateJson || !playerInfo) return null;

  const state = safeJsonParse<Top10State>(moduleStateJson);
  if (!state) return null;

  const displayHeading = (faseKey && TOP10_HEADINGS[faseKey]) || heading;

  return (
    <Top10Player
      state={state}
      playerId={playerInfo.playerId}
      playerName={playerInfo.playerName}
      teamNumber={playerInfo.teamNumber}
      heading={displayHeading}
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

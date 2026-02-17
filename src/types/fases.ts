import type { FC } from 'react';

export type FaseKey = string; // e.g. '01/01', '07/01'

export interface FaseCommonProps {
  faseKey: FaseKey;
  sessionId?: string;
  moduleStateJson?: string;           // raw JSON of the module's state from PocketBase
  onModuleStateJson?: (json: string) => void; // callback to update module state locally
  heading?: string;                   // current heading text for this fase
  allPlayerNames?: string[];          // all player names from session
  playerInfo?: {                      // current player info (for PlayerView)
    playerId: string;
    playerName: string;
    teamNumber: number;
  };
}

export interface FaseModule {
  key: FaseKey;
  group: string;           // e.g. '01', '07', '10', '13', '17'
  title: string;           // human-readable title, e.g. 'Zitten en Staan'
  needs?: { media?: boolean };
  stateField?: string;     // PocketBase session field, e.g. 'krakende_state'
  skipTrailer?: boolean;   // if true, fase XX/01 won't activate this module's views
  PresenterView: FC<FaseCommonProps>;
  DisplayView: FC<FaseCommonProps>;
  PlayerView?: FC<FaseCommonProps>;
}

export type FaseRegistry = Record<FaseKey, FaseModule>;

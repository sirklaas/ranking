import type { FC } from 'react';

export type FaseKey = string; // e.g. '01/01', '07/01'

export interface FaseCommonProps {
  faseKey: FaseKey;
}

export interface FaseModule {
  key: FaseKey;
  group: string; // e.g. '01', '07'
  title: string; // human-readable title, e.g. 'Zitten en Staan'
  needs?: { media?: boolean };
  PresenterView: FC<FaseCommonProps>;
  DisplayView: FC<FaseCommonProps>;
  PlayerView?: FC<FaseCommonProps>;
}

export type FaseRegistry = Record<FaseKey, FaseModule>;

"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import KrakendeDisplay from '@/components/krakende-karakters/KrakendeDisplay';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, moduleStateJson, allPlayerNames = [] }) => {
  if (!moduleStateJson || faseKey === '13/01') return null;

  const state: KrakendeState = JSON.parse(moduleStateJson);
  return <KrakendeDisplay state={state} totalPlayers={allPlayerNames.length} />;
};

export default DisplayView;

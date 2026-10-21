"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import KrakendeDisplay from '@/components/krakende-karakters/KrakendeDisplay';
import { safeJsonParse } from '@/lib/jsonUtils';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, sessionId, moduleStateJson, allPlayerNames = [] }) => {
  if (!moduleStateJson || faseKey === '13/01') return null;

  const parsed = safeJsonParse(moduleStateJson);
  const state = krakendeLogic.ensureKrakendeState(parsed);
  return <KrakendeDisplay state={state} allPlayerNames={allPlayerNames} sessionId={sessionId} />;
};

export default DisplayView;

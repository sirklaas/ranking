"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import KrakendeDisplay from '@/components/krakende-karakters/KrakendeDisplay';
import { safeJsonParse } from '@/lib/jsonUtils';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, moduleStateJson, allPlayerNames = [] }) => {
  if (!moduleStateJson || faseKey === '13/01') return null;

  const state = safeJsonParse<KrakendeState>(moduleStateJson);
  if (!state) return null;
  return <KrakendeDisplay state={state} allPlayerNames={allPlayerNames} />;
};

export default DisplayView;

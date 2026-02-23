"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import KrakendeDisplay from '@/components/krakende-karakters/KrakendeDisplay';

const DisplayView: React.FC<FaseCommonProps> = ({ faseKey, moduleStateJson }) => {
  if (!moduleStateJson || faseKey === '13/01') return null;

  const state: KrakendeState = JSON.parse(moduleStateJson);
  return <KrakendeDisplay state={state} />;
};

export default DisplayView;

"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import KrakendePresenter from '@/components/krakende-karakters/KrakendePresenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson }) => {
  if (!sessionId) return null;

  const state: KrakendeState = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : krakendeLogic.getInitialState();

  return (
    <KrakendePresenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import Top10Presenter from '@/components/top10/Top10Presenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames }) => {
  if (!sessionId) return null;

  const state: Top10State = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : top10Logic.getInitialState(allPlayerNames || []);

  return (
    <Top10Presenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Presenter from '@/components/top3/Top3Presenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames }) => {
  if (!sessionId) return null;

  const state: Top3State = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : top3Logic.getInitialState(allPlayerNames || []);

  return (
    <Top3Presenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

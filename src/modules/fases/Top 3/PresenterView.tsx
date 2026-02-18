"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Presenter from '@/components/top3/Top3Presenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames }) => {
  const state: Top3State = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : top3Logic.getInitialState(allPlayerNames || []);

  // Auto-persist initial state to PB so display + phone can pick it up immediately
  const didInit = useRef(false);
  useEffect(() => {
    if (!sessionId || moduleStateJson || didInit.current) return;
    didInit.current = true;
    const json = JSON.stringify(state);
    onModuleStateJson?.(json);
    top3Logic.persistState(sessionId, state).catch(() => {});
  }, [moduleStateJson, sessionId, state, onModuleStateJson]);

  if (!sessionId) return null;

  return (
    <Top3Presenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

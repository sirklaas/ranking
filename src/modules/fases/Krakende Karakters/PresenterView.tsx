"use client";
import React, { useEffect } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import KrakendePresenter from '@/components/krakende-karakters/KrakendePresenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, faseKey, moduleStateJson, onModuleStateJson }) => {
  if (!sessionId) return null;

  const state: KrakendeState = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : krakendeLogic.getInitialState();

  // Sync global faseKey to internal phase
  useEffect(() => {
    const impliedPhase = krakendeLogic.getPhaseFromFaseKey(faseKey);
    if (impliedPhase && impliedPhase !== state.phase) {
      krakendeLogic.setPhase(sessionId, state, impliedPhase).then(newState => {
        onModuleStateJson?.(JSON.stringify(newState));
      });
    }
  }, [faseKey, state.phase]);

  return (
    <KrakendePresenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import Top10Presenter from '@/components/top10/Top10Presenter';
import { safeJsonParse } from '@/lib/jsonUtils';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames, faseKey }) => {
  const state: Top10State = safeJsonParse<Top10State>(moduleStateJson) ?? top10Logic.getInitialState(allPlayerNames || []);

  const prevFaseRef = useRef(faseKey);
  const didInit = useRef(false);

  useEffect(() => {
    if (!sessionId || didInit.current || moduleStateJson) return;
    didInit.current = true;
    const json = JSON.stringify(state);
    onModuleStateJson?.(json);
    top10Logic.persistState(sessionId, state).catch(() => { });
  }, [moduleStateJson, sessionId, state, onModuleStateJson]);

  // Advance to next question when navigator moves to a NEW Top10 fase slot
  useEffect(() => {
    if (!faseKey || !sessionId) return;
    if (state.currentFase === faseKey) return; // already in sync

    const qIdx = parseInt(faseKey.split('/')[1] || '0', 10);
    const nextState: Top10State = {
      ...state,
      currentFase: faseKey,
      currentQuestion: {
        questionIndex: qIdx,
        phase: 'voting',
        votes: [],
        results: [],
      },
    };
    onModuleStateJson?.(JSON.stringify(nextState));
    top10Logic.persistState(sessionId, nextState).catch(() => { });
  }, [faseKey, sessionId, state.currentFase]);

  if (!sessionId) return null;

  return (
    <Top10Presenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

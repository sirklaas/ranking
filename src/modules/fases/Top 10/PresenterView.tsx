"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import * as top10Logic from '@/modules/top10/logic';
import Top10Presenter from '@/components/top10/Top10Presenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames, faseKey }) => {
  if (!sessionId) return null;

  const state: Top10State = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : top10Logic.getInitialState(allPlayerNames || []);

  const prevFaseRef = useRef(faseKey);
  const didInit = useRef(false);

  useEffect(() => {
    if (!moduleStateJson && !didInit.current) {
      didInit.current = true;
      const json = JSON.stringify(state);
      onModuleStateJson?.(json);
      top10Logic.persistState(sessionId, state).catch(() => { });
    }
  }, [moduleStateJson, sessionId, state, onModuleStateJson]);

  // Advance to next question automatically when faseKey changes (Next Slide navigated globally)
  useEffect(() => {
    if (faseKey && sessionId && state.currentFase !== faseKey) {
      // If there are existing votes or we were not in intro, WIPE IT entirely.
      if (state.currentQuestion.phase !== 'intro' || state.currentQuestion.votes.length > 0) {
        const nextState: Top10State = {
          ...state,
          currentFase: faseKey,
          currentQuestion: {
            questionIndex: state.currentQuestion.questionIndex + 1,
            phase: 'intro',
            votes: [],
            results: [],
          },
        };
        onModuleStateJson?.(JSON.stringify(nextState));
        top10Logic.persistState(sessionId, nextState).catch(() => { });
      } else {
        // Just sync the tracker marker so it doesn't wipe when not needed
        const syncState: Top10State = { ...state, currentFase: faseKey };
        onModuleStateJson?.(JSON.stringify(syncState));
        top10Logic.persistState(sessionId, syncState).catch(() => { });
      }
    }
  }, [faseKey, sessionId, state.currentFase, state, onModuleStateJson]);

  return (
    <Top10Presenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Presenter from '@/components/top3/Top3Presenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames, heading, mediaUrl, faseKey }) => {
  const state: Top3State = moduleStateJson
    ? JSON.parse(moduleStateJson)
    : top3Logic.getInitialState(allPlayerNames || []);

  const prevFaseRef = useRef(faseKey);
  const didInit = useRef(false);

  // Auto-persist initial state to PB so display + phone can pick it up immediately
  useEffect(() => {
    if (!sessionId || moduleStateJson || didInit.current) return;
    didInit.current = true;
    const json = JSON.stringify(state);
    onModuleStateJson?.(json);
    top3Logic.persistState(sessionId, state).catch(() => { });
  }, [moduleStateJson, sessionId, state, onModuleStateJson]);

  // Advance to next question automatically when faseKey changes (Next Slide navigated globally)
  useEffect(() => {
    if (faseKey && sessionId && state.currentFase !== faseKey) {
      // If there are existing votes or we were not in intro, WIPE IT entirely.
      if (state.currentQuestion.phase !== 'intro' || state.currentQuestion.votes.length > 0) {
        const nextState: Top3State = {
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
        top3Logic.persistState(sessionId, nextState).catch(() => { });
      } else {
        // Just sync the tracker marker so it doesn't wipe when not needed
        const syncState: Top3State = { ...state, currentFase: faseKey };
        onModuleStateJson?.(JSON.stringify(syncState));
        top3Logic.persistState(sessionId, syncState).catch(() => { });
      }
    }
  }, [faseKey, sessionId, state.currentFase, state, onModuleStateJson]);

  if (!sessionId) return null;

  return (
    <Top3Presenter
      sessionId={sessionId}
      state={state}
      heading={heading}
      mediaUrl={mediaUrl}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

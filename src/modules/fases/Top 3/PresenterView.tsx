"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Presenter from '@/components/top3/Top3Presenter';
import { safeJsonParse } from '@/lib/jsonUtils';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames, heading, mediaUrl, faseKey }) => {
  const state: Top3State = safeJsonParse<Top3State>(moduleStateJson) ?? top3Logic.getInitialState(allPlayerNames || []);

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

  // Advance to next question when navigator moves to a NEW Top3 fase slot
  useEffect(() => {
    if (!faseKey || !sessionId) return;
    if (state.currentFase === faseKey) return; // already in sync — do nothing

    // Only wipe votes/results when moving to a genuinely different question.
    // If current slot had real voting activity, clear it for the next round.
    if (state?.currentQuestion?.votes?.length > 0 || state?.currentQuestion?.phase === 'results') {
      const nextState: Top3State = {
        ...state,
        currentFase: faseKey,
        currentQuestion: {
          questionIndex: (state?.currentQuestion?.questionIndex || 0) + 1,
          phase: 'intro',
          votes: [],
          results: [],
        },
      };
      onModuleStateJson?.(JSON.stringify(nextState));
      top3Logic.persistState(sessionId, nextState).catch(() => { });
    } else {
      // No votes yet — just update the tracker, keep voting phase intact
      const syncState: Top3State = { ...state, currentFase: faseKey };
      onModuleStateJson?.(JSON.stringify(syncState));
      top3Logic.persistState(sessionId, syncState).catch(() => { });
    }
  }, [faseKey, sessionId, state.currentFase]);

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

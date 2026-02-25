"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import { safeJsonParse } from '@/lib/jsonUtils';
import KrakendePresenter from '@/components/krakende-karakters/KrakendePresenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, faseKey, moduleStateJson, onModuleStateJson, allPlayerNames = [] }) => {
  const state: KrakendeState = safeJsonParse<KrakendeState>(moduleStateJson) ?? krakendeLogic.getInitialState();

  // Auto-persist initial state to PB so display + phone can pick it up immediately.
  // Also reset if we're at the entry fase (13/02) but state is already in a results phase
  // (stale state from a previous game).
  const didInit = useRef(false);
  useEffect(() => {
    if (!sessionId || didInit.current) return;
    const isStale = faseKey === '13/02' && (
      state.phase === 'positive-results' || state.phase === 'negative-results'
    );
    if (!moduleStateJson || isStale) {
      didInit.current = true;
      const initial = krakendeLogic.getInitialState();
      onModuleStateJson?.(JSON.stringify(initial));
      krakendeLogic.updateState(sessionId, () => initial).catch(() => {});
    }
  }, [moduleStateJson, sessionId, faseKey, state.phase]);

  // Sync global faseKey to internal phase (hooks before any return)
  useEffect(() => {
    if (!sessionId) return;
    const impliedPhase = krakendeLogic.getPhaseFromFaseKey(faseKey);
    if (impliedPhase && impliedPhase !== state.phase) {
      krakendeLogic.setPhase(sessionId, state, impliedPhase).then(newState => {
        onModuleStateJson?.(JSON.stringify(newState));
      });
    }
  }, [faseKey, state.phase, sessionId]);

  if (!sessionId) return null;

  return (
    <KrakendePresenter
      sessionId={sessionId}
      state={state}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
      totalPlayers={allPlayerNames.length}
    />
  );
};

export default PresenterView;

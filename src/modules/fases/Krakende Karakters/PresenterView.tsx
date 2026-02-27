"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { KrakendeState } from '@/modules/krakende-karakters/types';
import * as krakendeLogic from '@/modules/krakende-karakters/logic';
import { safeJsonParse } from '@/lib/jsonUtils';
import { krakendeVoteService } from '@/lib/pocketbase';
import KrakendePresenter from '@/components/krakende-karakters/KrakendePresenter';

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, faseKey, moduleStateJson, onModuleStateJson, allPlayerNames = [] }) => {
  const state: KrakendeState = safeJsonParse<KrakendeState>(moduleStateJson) ?? krakendeLogic.getInitialState();

  // Auto-persist initial state to PB so display + phone can pick it up immediately.
  // Always reset when entering 13/02 (entry point) to clear stale state + votes.
  const didInitForFase = useRef<string | null>(null);
  useEffect(() => {
    if (!sessionId) return;
    // Only reset once per faseKey entry (re-entering 13/02 triggers again)
    if (didInitForFase.current === faseKey) return;
    const shouldReset = !moduleStateJson || faseKey === '13/02';
    if (shouldReset) {
      didInitForFase.current = faseKey;
      const initial = krakendeLogic.getInitialState();
      onModuleStateJson?.(JSON.stringify(initial));
      krakendeLogic.updateState(sessionId, () => initial)
        .then(() => console.log('[Krakende PresenterView] State reset to initial at', faseKey))
        .catch((e) => console.error('[Krakende PresenterView] Reset failed:', e));
      // Clear votes from separate collection
      krakendeVoteService.clearVotes(sessionId).catch(() => {});
    }
  }, [moduleStateJson, sessionId, faseKey, state.phase]);

  // Sync global faseKey to internal phase — ONLY when faseKey changes
  // (not when state.phase changes from internal button presses)
  const prevFaseKeyRef = useRef(faseKey);
  useEffect(() => {
    if (!sessionId) return;
    if (prevFaseKeyRef.current === faseKey) return; // faseKey didn't change, skip
    prevFaseKeyRef.current = faseKey;
    const impliedPhase = krakendeLogic.getPhaseFromFaseKey(faseKey);
    if (impliedPhase && impliedPhase !== state.phase) {
      krakendeLogic.setPhase(sessionId, state, impliedPhase).then(newState => {
        onModuleStateJson?.(JSON.stringify(newState));
      });
    }
  }, [faseKey, sessionId]);

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

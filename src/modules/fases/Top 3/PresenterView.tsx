"use client";
import React, { useEffect, useRef } from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import * as top3Logic from '@/modules/top3/logic';
import Top3Presenter from '@/components/top3/Top3Presenter';
import { safeJsonParse } from '@/lib/jsonUtils';
import { motherfileService } from '@/lib/pocketbase';

const TOP3_SLIDES: Record<string, { heading: string; image: string }> = {
  '10/05': { heading: 'Wie wordt er echt heel erg snel verliefd', image: 'dracula.webp' },
  '10/06': { heading: 'Wie is de ideale schoonzoon of -zus?', image: 'frankenstein.webp' },
  '10/07': { heading: 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?', image: 'zombie.webp' },
  '10/08': { heading: 'Wie zou je absoluut niet /n op je kinderen laten passen?', image: 'witch.webp' },
  '10/09': { heading: 'Wie heeft de meeste crypto\'s', image: 'mummy.webp' },
  '10/10': { heading: 'Wie is de grootste aansteller?', image: 'skeleton.webp' },
  '10/11': { heading: 'Wie maakt als eerste een /n OnlyFans account?', image: 'werewolf.webp' },
  '10/12': { heading: 'Wie moet je zeker geen geheim vertellen?', image: 'ghost.webp' },
  '10/13': { heading: 'Wie zou je meenemen naar een parenclub?', image: 'sinister-man.webp' },
};

const PresenterView: React.FC<FaseCommonProps> = ({ sessionId, moduleStateJson, onModuleStateJson, allPlayerNames, heading, mediaUrl, faseKey }) => {
  const parsed = safeJsonParse<Top3State>(moduleStateJson);
  const state: Top3State = {
    ...top3Logic.getInitialState(allPlayerNames || []),
    ...(parsed || {}),
  };
  if (!state.allPlayerNames || state.allPlayerNames.length === 0) {
    state.allPlayerNames = allPlayerNames || [];
  }

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
    const defaultPhase = faseKey === '10/01' ? 'intro' : 'voting';
    if (state?.currentQuestion?.votes?.length > 0 || state?.currentQuestion?.phase === 'results') {
      const nextState: Top3State = {
        ...state,
        currentFase: faseKey,
        currentQuestion: {
          questionIndex: (state?.currentQuestion?.questionIndex || 0) + 1,
          phase: defaultPhase,
          votes: [],
          results: [],
        },
      };
      onModuleStateJson?.(JSON.stringify(nextState));
      top3Logic.persistState(sessionId, nextState).catch(() => { });
    } else {
      // No votes yet — just update the tracker, keep voting phase intact
      const syncState: Top3State = {
        ...state,
        currentFase: faseKey,
        currentQuestion: {
          ...state.currentQuestion,
          phase: defaultPhase,
        },
      };
      onModuleStateJson?.(JSON.stringify(syncState));
      top3Logic.persistState(sessionId, syncState).catch(() => { });
    }
  }, [faseKey, sessionId, state.currentFase]);

  if (!sessionId) return null;

  const slide = faseKey ? TOP3_SLIDES[faseKey] : undefined;
  const resolvedHeading = heading || slide?.heading;
  const resolvedMediaUrl = mediaUrl || (slide?.image ? motherfileService.fileUrl(slide.image) : undefined);

  return (
    <Top3Presenter
      sessionId={sessionId}
      state={state}
      heading={resolvedHeading}
      mediaUrl={resolvedMediaUrl}
      onStateChange={(newState) => onModuleStateJson?.(JSON.stringify(newState))}
    />
  );
};

export default PresenterView;

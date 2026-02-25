"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import Top10Display from '@/components/top10/Top10Display';
import { safeJsonParse } from '@/lib/jsonUtils';

const EMPTY_TOP10_STATE: Top10State = {
  allPlayerNames: [],
  currentFase: '',
  currentQuestion: { questionIndex: 0, phase: 'intro', votes: [], results: [] },
};

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, heading, mediaUrl, faseKey, sessionId }) => {
  const state = safeJsonParse<Top10State>(moduleStateJson);
  // On the trailer slot (17/01), don't render without real state — let media overlay play
  if (!state && faseKey === '17/01') return null;
  const displayState: Top10State = state ?? { ...EMPTY_TOP10_STATE, currentFase: faseKey || '' };
  return <Top10Display
    state={displayState}
    heading={heading}
    mediaUrl={mediaUrl}
    faseKey={faseKey}
    sessionId={sessionId}
  />;
};

export default DisplayView;

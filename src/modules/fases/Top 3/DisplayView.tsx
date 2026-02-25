"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import Top3Display from '@/components/top3/Top3Display';
import { safeJsonParse } from '@/lib/jsonUtils';

const EMPTY_TOP3_STATE: Top3State = {
  allPlayerNames: [],
  currentFase: '',
  currentQuestion: { questionIndex: 0, phase: 'intro', votes: [], results: [] },
};

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, heading, mediaUrl, faseKey }) => {
  const state = safeJsonParse<Top3State>(moduleStateJson);
  // On the trailer slot (10/01), don't render without real state — let media overlay play
  if (!state && faseKey === '10/01') return null;
  const displayState: Top3State = state ?? { ...EMPTY_TOP3_STATE, currentFase: faseKey || '' };
  return <Top3Display state={displayState} heading={heading} mediaUrl={mediaUrl} faseKey={faseKey} />;
};

export default DisplayView;

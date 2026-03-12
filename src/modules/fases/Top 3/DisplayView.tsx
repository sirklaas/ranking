"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top3State } from '@/modules/top3/types';
import Top3Display from '@/components/top3/Top3Display';
import { safeJsonParse } from '@/lib/jsonUtils';

// Hardcoded slides — faseKey → heading + image filename
const TOP3_SLIDES: Record<string, { heading: string; image: string }> = {
  '10/05': { heading: 'Wie wordt er echt heel erg snel verliefd', image: 'verliefd.jpeg' },
  '10/06': { heading: 'Wie is de ideale schoonzoon of -zus?', image: 'schoonzoon.png' },
  '10/07': { heading: 'Je vliegtuig stort neer in de Andes. /n Wie eet je als eerste op ?', image: 'andes.jpeg' },
  '10/08': { heading: 'Wie zou je absoluut niet /n op je kinderen laten passen?', image: 'kinderen.png' },
  '10/09': { heading: 'Wie heeft de meeste crypto\'s', image: 'crypto.png' },
  '10/10': { heading: 'Wie is de grootste aansteller?', image: 'cry.png' },
  '10/11': { heading: 'Wie maakt als eerste een /n OnlyFans account?', image: 'only.png' },
  '10/12': { heading: 'Wie moet je zeker geen geheim vertellen?', image: 'geheim.png' },
  '10/13': { heading: 'Wie zou je meenemen naar een parenclub?', image: 'parenclub.png' },
};

const EMPTY_TOP3_STATE: Top3State = {
  allPlayerNames: [],
  currentFase: '',
  currentQuestion: { questionIndex: 0, phase: 'intro', votes: [], results: [] },
};

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, faseKey, allPlayerNames }) => {
  // Trailer slot → return null, let media overlay play the video
  if (!faseKey || faseKey === '10/01') return null;

  // Look up hardcoded slide data
  const slide = TOP3_SLIDES[faseKey];
  if (!slide) return null;

  const hardcodedMediaUrl = `/pics/${encodeURIComponent(slide.image)}`;
  const state = safeJsonParse<Top3State>(moduleStateJson) ?? { ...EMPTY_TOP3_STATE, currentFase: faseKey };
  if (allPlayerNames && allPlayerNames.length > 0) {
    state.allPlayerNames = allPlayerNames;
  }

  return <Top3Display state={state} heading={slide.heading} mediaUrl={hardcodedMediaUrl} faseKey={faseKey} />;
};

export default DisplayView;

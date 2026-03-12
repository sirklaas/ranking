"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import Top10Display from '@/components/top10/Top10Display';
import { safeJsonParse } from '@/lib/jsonUtils';

// Hardcoded slides — faseKey → heading + image filename
const TOP10_SLIDES: Record<string, { heading: string; image: string }> = {
  '17/01': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/02': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/03': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/04': { heading: 'Kies iemand uit een ander team!', image: '' },
  '17/05': { heading: 'Je hebt een pijnlijke pukkel op je bil. /n Wie mag hem voor je uitknijpen?', image: 'pukkel.png' },
  '17/06': { heading: 'Wie denkt dat ie always gelijk heeft?', image: 'right.png' },
  '17/07': { heading: 'Wie doet tegen betaling de naakte fotoshoot van het Perfecte Plaatje?', image: 'plaatje.jpeg' },
  '17/08': { heading: 'Wie kan 40 dagen zonder sex?', image: '40dagen.png' },
  '17/09': { heading: 'Wie kan absoluut niet tegen kritiek?', image: 'verlies.png' },
  '17/10': { heading: 'Wie laat weleens een wind?', image: 'echt.png' },
  '17/11': { heading: 'Wie maakt de allerlelijkste Selfies ?', image: 'selfie.png' },
  '17/12': { heading: 'Wie is het meest verslaafd aan Social Media?', image: 'socials.png' },
  '17/13': { heading: 'Wie krijgt de meeste bekeuringen?', image: '' },
  '17/14': { heading: 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tussen de lakens?', image: '' },
};

const EMPTY_TOP10_STATE: Top10State = {
  allPlayerNames: [],
  currentFase: '',
  currentQuestion: { questionIndex: 0, phase: 'intro', votes: [], results: [] },
};

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, faseKey, sessionId, mediaUrl: passedMediaUrl, allPlayerNames }) => {
  if (!faseKey) return null;

  // Look up hardcoded slide data
  const slide = TOP10_SLIDES[faseKey];
  if (!slide) return null;

  // Use hardcoded image, or fall back to media passed from display page (trailer video)
  const hardcodedMediaUrl = slide.image ? `/pics/${encodeURIComponent(slide.image)}` : (passedMediaUrl || '');
  const state = safeJsonParse<Top10State>(moduleStateJson) ?? { ...EMPTY_TOP10_STATE, currentFase: faseKey };
  if (allPlayerNames && allPlayerNames.length > 0) {
    state.allPlayerNames = allPlayerNames;
  }

  return <Top10Display
    state={state}
    heading={slide.heading}
    mediaUrl={hardcodedMediaUrl}
    faseKey={faseKey}
    sessionId={sessionId}
  />;
};

export default DisplayView;

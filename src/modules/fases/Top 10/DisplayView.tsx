"use client";
import React from 'react';
import type { FaseCommonProps } from '@/types/fases';
import { Top10State } from '@/modules/top10/types';
import Top10Display from '@/components/top10/Top10Display';
import { safeJsonParse } from '@/lib/jsonUtils';
import { motherfileService } from '@/lib/pocketbase';

// Hardcoded slides — faseKey → heading + Halloween image
const TOP10_SLIDES: Record<string, { heading: string; image: string }> = {
  '17/01': { heading: 'Top 10', image: 'trailercreepy.m4v' },
  '17/05': { heading: 'Je hebt een pijnlijke pukkel op je bil. /n Wie mag hem voor je uitknijpen?', image: 'hannibal.webp' },
  '17/06': { heading: 'Wie denkt dat ie always gelijk heeft?', image: 'always-right.webp' },
  '17/07': { heading: 'Wie doet tegen betaling de naakte fotoshoot /n van het Perfecte Plaatje?', image: 'photoshoot.webp' },
  '17/08': { heading: 'Wie kan 40 dagen zonder sex?', image: '40-days.webp' },
  '17/09': { heading: 'Wie kan absoluut niet tegen kritiek?', image: 'trump-pumpkin.webp' },
  '17/10': { heading: 'Wie is het monsterlijke schoon-kind?', image: 'inlaw.webp' },
  '17/11': { heading: 'Wie maakt de allerlelijkste Selfies ?', image: 'selfie-monster.webp' },
  '17/12': { heading: 'Wie is het meest verslaafd aan Social Media?', image: 'socials-zombie.webp' },
  '17/13': { heading: 'Wie krijgt de meeste bekeuringen?', image: 'speeding-ticket.webp' },
  '17/14': { heading: 'Jullie doen mee met Temptation Island. /n Wie heeft als eerste iemand tussen de lakens?', image: 'temptation.webp' },
};

const EMPTY_TOP10_STATE: Top10State = {
  allPlayerNames: [],
  currentFase: '',
  currentQuestion: { questionIndex: 0, phase: 'intro', votes: [], results: [] },
};

const DisplayView: React.FC<FaseCommonProps> = ({ moduleStateJson, faseKey, sessionId, mediaUrl: passedMediaUrl, allPlayerNames }) => {
  // Trailer slot → return null, let media overlay play the video
  if (!faseKey || faseKey === '17/01') return null;

  // Look up hardcoded slide data
  const slide = TOP10_SLIDES[faseKey];
  if (!slide) return null;

  // Use hardcoded image with theme resolver, or fall back to passed media
  const hardcodedMediaUrl = slide.image ? motherfileService.fileUrl(slide.image) : (passedMediaUrl || '');
  const parsed = safeJsonParse<Top10State>(moduleStateJson);
  // If state belongs to a different slide/faseKey, reset votes for this fresh slide
  const state: Top10State = (parsed && parsed.currentFase === faseKey)
    ? parsed
    : {
        ...EMPTY_TOP10_STATE,
        currentFase: faseKey,
        currentQuestion: {
          questionIndex: parseInt(faseKey.split('/')[1] || '0', 10),
          phase: 'voting',
          votes: [],
          results: [],
        },
        allPlayerNames: (allPlayerNames && allPlayerNames.length > 0) ? allPlayerNames : (parsed?.allPlayerNames || []),
      };

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

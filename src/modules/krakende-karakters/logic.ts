import { KrakendeState, KrakendePhase, KrakendeLanguage, KrakendeSubmission, KrakendeTrait } from './types';
import { DEFAULT_POSITIVE_TRAITS, DEFAULT_NEGATIVE_TRAITS } from './defaults';
import { rankingService } from '@/lib/pocketbase';

export const getInitialState = (): KrakendeState => ({
  phase: 'positive-voting',
  language: 'nl',
  positiveTraits: DEFAULT_POSITIVE_TRAITS,
  negativeTraits: DEFAULT_NEGATIVE_TRAITS,
  submissions: [],
  revealedIndex: 0,
  completedPhases: [],
});

// Map global fase key to internal Phase
export const getPhaseFromFaseKey = (faseKey: string): KrakendePhase | null => {
  switch (faseKey) {
    case '13/03': return 'positive-voting';
    case '13/05': return 'positive-results';
    case '13/06': return 'negative-voting';
    case '13/09': return 'negative-results';
    default: return null;
  }
};

// Get the display label for a trait based on current language
export const getTraitLabel = (trait: KrakendeTrait, lang: KrakendeLanguage): string => {
  return lang === 'nl' ? trait.nl : trait.en;
};

// Helper: split a label into roughly two halves to force two lines
export const splitLabelForTwoLines = (label: string): [string, string] => {
  const words = label.trim().split(' ');
  if (words.length <= 1) return [label, ''];
  const mid = Math.ceil(words.length / 2);
  const line1 = words.slice(0, mid).join(' ');
  const line2 = words.slice(mid).join(' ');
  return [line1, line2];
};

// Shuffle traits into random order (for display reveal)
export const shuffleTraits = (traits: KrakendeTrait[]): KrakendeTrait[] => {
  const shuffled = [...traits];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Toggle language
export const toggleLanguage = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  const newLang: KrakendeLanguage = currentState.language === 'nl' ? 'en' : 'nl';
  const newState: KrakendeState = { ...currentState, language: newLang };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Advance to the next phase (presenter arrow-right)
export const nextPhase = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  const order: KrakendePhase[] = [
    'positive-voting',
    'negative-voting',
    'positive-results',
    'negative-results',
  ];
  const idx = order.indexOf(currentState.phase);
  const nextIdx = Math.min(idx + 1, order.length - 1);

  const newState: KrakendeState = {
    ...currentState,
    phase: order[nextIdx],
    revealedIndex: 0, // reset reveal counter for new phase
    completedPhases: Array.from(new Set([...currentState.completedPhases, currentState.phase])),
  };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Go to previous phase (presenter arrow-left)
export const prevPhase = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  const order: KrakendePhase[] = [
    'positive-voting',
    'negative-voting',
    'positive-results',
    'negative-results',
  ];
  const idx = order.indexOf(currentState.phase);
  const prevIdx = Math.max(idx - 1, 0);

  const newState: KrakendeState = {
    ...currentState,
    phase: order[prevIdx],
    revealedIndex: 0,
    completedPhases: Array.from(new Set([...currentState.completedPhases, currentState.phase])),
  };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Reveal next trait on display (one by one)
export const revealNextTrait = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  const maxTraits =
    currentState.phase === 'positive-voting' || currentState.phase === 'positive-results'
      ? currentState.positiveTraits.length
      : currentState.negativeTraits.length;

  const newIndex = Math.min(currentState.revealedIndex + 1, maxTraits);
  const newState: KrakendeState = { ...currentState, revealedIndex: newIndex };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Player submits their choice
export const submitChoice = async (
  sessionId: string,
  currentState: KrakendeState,
  playerId: string,
  playerName: string,
  teamNumber: number,
  traitId: string
): Promise<KrakendeState> => {
  try {
    const res = await fetch('/api/krakende-choice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        playerId,
        playerName,
        teamNumber,
        traitId
      })
    });

    if (!res.ok) {
      console.warn('Failed to submit krakende choice via queue. Falling back to optimistic state.');
      return currentState;
    }

    const data = await res.json();
    return data.state;
  } catch (err) {
    console.error('Error submitting krakende choice:', err);
    return currentState;
  }
};

// Update traits from the dashboard
export const updateTraits = async (
  sessionId: string,
  currentState: KrakendeState,
  positiveTraits: KrakendeTrait[],
  negativeTraits: KrakendeTrait[]
): Promise<KrakendeState> => {
  const newState: KrakendeState = {
    ...currentState,
    positiveTraits,
    negativeTraits,
  };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Set phase explicitly
export const setPhase = async (
  sessionId: string,
  currentState: KrakendeState,
  phase: KrakendePhase
): Promise<KrakendeState> => {
  const newState: KrakendeState = {
    ...currentState,
    phase,
    revealedIndex: 0,
    completedPhases: Array.from(new Set([...currentState.completedPhases, currentState.phase])),
  };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Reset state
export const resetState = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  const newState: KrakendeState = {
    ...currentState,
    phase: 'positive-voting',
    submissions: [],
    revealedIndex: 0,
    completedPhases: [],
  };

  await rankingService.updateSession(sessionId, {
    krakende_state: JSON.stringify(newState),
  });

  return newState;
};

// Parse krakende state from session JSON string
export const parseState = (json: string | undefined): KrakendeState | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as KrakendeState;
  } catch {
    return null;
  }
};

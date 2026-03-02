import { KrakendeState, KrakendePhase, KrakendeLanguage, KrakendeTrait } from './types';
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
    case '13/04': return 'negative-voting';
    case '13/05': return 'positive-results';
    case '13/06': return 'negative-results';
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
  _currentState: KrakendeState // prefixed with underscore to skip ESLint unused
): Promise<KrakendeState> => {
  return await updateState(sessionId, (current) => ({
    ...current,
    language: current.language === 'nl' ? 'en' : 'nl'
  }));
};

// Advance to the next phase (presenter arrow-right)
export const nextPhase = async (
  sessionId: string,
  _currentState: KrakendeState
): Promise<KrakendeState> => {
  const order: KrakendePhase[] = [
    'positive-voting',
    'negative-voting',
    'positive-results',
    'negative-results',
  ];

  return await updateState(sessionId, (current) => {
    const idx = order.indexOf(current.phase);
    const nextIdx = Math.min(idx + 1, order.length - 1);
    const nextPhase = order[nextIdx];

    return {
      ...current,
      phase: nextPhase,
      revealedIndex: 0, // reset reveal counter for new phase
      completedPhases: Array.from(new Set([...current.completedPhases, current.phase])),
    };
  });
};

// Go to previous phase (presenter arrow-left)
export const prevPhase = async (
  sessionId: string,
  _currentState: KrakendeState
): Promise<KrakendeState> => {
  const order: KrakendePhase[] = [
    'positive-voting',
    'negative-voting',
    'positive-results',
    'negative-results',
  ];

  return await updateState(sessionId, (current) => {
    const idx = order.indexOf(current.phase);
    const prevIdx = Math.max(idx - 1, 0);
    const prevPhase = order[prevIdx];

    return {
      ...current,
      phase: prevPhase,
      revealedIndex: 0,
      completedPhases: Array.from(new Set([...current.completedPhases, current.phase])),
    };
  });
};

// Reveal next trait on display (one by one)
export const revealNextTrait = async (
  sessionId: string,
  _currentState: KrakendeState
): Promise<KrakendeState> => {
  return await updateState(sessionId, (current) => {
    const maxTraits =
      current.phase === 'positive-voting' || current.phase === 'positive-results'
        ? current.positiveTraits.length
        : current.negativeTraits.length;

    const newIndex = Math.min(current.revealedIndex + 1, maxTraits);
    return { ...current, revealedIndex: newIndex };
  });
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
  return await updateState(sessionId, (current) => ({
    ...current,
    positiveTraits,
    negativeTraits,
  }));
};

/**
 * Core update function for KrakendeState using Optimistic Concurrency Control (OCC).
 * Reads krakende_state from the top-level PB field (now a proper JSON column).
 */
export const updateState = async (sessionId: string, updater: (current: KrakendeState) => KrakendeState): Promise<KrakendeState> => {
  const maxRetries = 10;
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 1. Fetch latest session
      const session = await rankingService.getSessionById(sessionId) as unknown as { krakende_state?: string | KrakendeState };
      if (!session) throw new Error('Session not found');

      // 2. Extract current state from top-level krakende_state field
      let krakendeState: KrakendeState | null = null;
      if (session.krakende_state) {
        krakendeState = typeof session.krakende_state === 'string'
          ? JSON.parse(session.krakende_state) as KrakendeState
          : session.krakende_state;
      }

      const current = krakendeState || getInitialState();

      // 3. Apply changes via updater function
      const newState = updater(current);

      // 4. Save to top-level krakende_state field
      await rankingService.updateSession(sessionId, {
        krakende_state: JSON.stringify(newState),
      });

      return newState;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.warn(`Update attempt ${i + 1} failed, retrying...`, err.message);
        lastError = err;
      }
      await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    }
  }

  throw lastError || new Error('Failed to update Krakende state after max retries');
};

// Set phase explicitly
export const setPhase = async (
  sessionId: string,
  _currentState: KrakendeState,
  newPhase: KrakendePhase
): Promise<KrakendeState> => {
  return await updateState(sessionId, (current) => ({
    ...current,
    phase: newPhase,
    revealedIndex: 0, // reset reveal counter for new phase
    completedPhases: Array.from(new Set([...current.completedPhases, current.phase])),
  }));
};

// Reset state
export const resetState = async (
  sessionId: string,
  currentState: KrakendeState
): Promise<KrakendeState> => {
  return await updateState(sessionId, (current) => {
    const initial = getInitialState();
    return {
      ...initial,
      language: current.language,
    };
  });
};

// Set revealed index
export const setRevealed = async (
  sessionId: string,
  currentState: KrakendeState,
  index: number
): Promise<KrakendeState> => {
  return await updateState(sessionId, (current) => ({
    ...current,
    revealedIndex: index
  }));
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

import type { FaseRegistry, FaseModule } from '@/types/fases';

// Central registry for all fases
export const FASES: FaseRegistry = {};

export function registerFase(module: FaseModule) {
  FASES[module.key] = module;
}

// Look up the module that handles a given fase key.
// Checks exact match first, then group-prefix match.
export function findFaseModule(faseKey: string): FaseModule | undefined {
  // Exact key match
  if (FASES[faseKey]) return FASES[faseKey];
  // Group prefix match — match all phases in the same group so Player/Presenter get the UI
  const [group] = faseKey.split('/');
  const mod = Object.values(FASES).find((m) => m.group === group);
  return mod;
}

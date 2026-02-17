import type { FaseRegistry, FaseModule } from '@/types/fases';

// Central registry for all fases
export const FASES: FaseRegistry = {};

export function registerFase(module: FaseModule) {
  FASES[module.key] = module;
}

// Look up the module that handles a given fase key.
// Checks exact match first, then group-prefix match.
// Respects skipTrailer (XX/01 fases won't match group modules that set skipTrailer).
export function findFaseModule(faseKey: string): FaseModule | undefined {
  // Exact key match
  if (FASES[faseKey]) return FASES[faseKey];
  // Group prefix match
  const group = faseKey.split('/')[0];
  const mod = Object.values(FASES).find((m) => m.group === group);
  if (!mod) return undefined;
  if (mod.skipTrailer && faseKey === `${group}/01`) return undefined;
  return mod;
}

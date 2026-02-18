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
  // Group prefix match — only match fases at or after the module's registered key
  const [group, subStr] = faseKey.split('/');
  const subNum = parseInt(subStr, 10);
  const mod = Object.values(FASES).find((m) => m.group === group);
  if (!mod) return undefined;
  if (mod.skipTrailer && faseKey === `${group}/01`) return undefined;
  const modSub = parseInt(mod.key.split('/')[1], 10);
  if (subNum < modSub) return undefined; // earlier fases use normal media overlay
  return mod;
}

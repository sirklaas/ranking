import type { FaseRegistry, FaseModule } from '@/types/fases';

// Central registry for all fases
export const FASES: FaseRegistry = {};

export function registerFase(module: FaseModule) {
  FASES[module.key] = module;
}

// Example: future modules will import registerFase in their index.ts
// and call registerFase({ ...module });

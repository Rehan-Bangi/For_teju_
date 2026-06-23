/**
 * src/store/universeStore.ts
 * ----------------------------------------------------------------------------
 * Global Zustand store for the persistent universe/background mood state.
 *
 * This was referenced by core/config/eventBus.ts and core/config/scenes.config.ts
 * but did not exist yet. Minimal implementation only — exports exactly what
 * those two consumers need (UniverseState enum + QualityTier type) plus a
 * small store so the value can actually be read/written somewhere.
 *
 * QualityTier is re-exported from UniverseQualityManager.ts (single source of
 * truth) rather than redefined here, to avoid two competing definitions.
 */

import { create } from 'zustand';

export type { QualityTier } from '../../universe/UniverseQualityManager';

/** 5-value mood enum driving which background/canvas treatment is active. */
export enum UniverseState {
  Lonely = 'lonely',
  Beginning = 'beginning',
  Letter = 'letter',
  Love = 'love',
  Finale = 'finale',
}

interface UniverseStore {
  currentState: UniverseState;
  setCurrentState: (state: UniverseState) => void;
}

export const useUniverseStore = create<UniverseStore>((set) => ({
  currentState: UniverseState.Lonely,
  setCurrentState: (state) => set({ currentState: state }),
}));

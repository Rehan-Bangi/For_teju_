/**
 * useFinaleState.ts
 *
 * Zustand store powering the finale system's public API:
 * currentStage, progress, startFinale(), advanceStage(), completeFinale().
 *
 * All decision logic is delegated to FinaleEngine (pure functions);
 * this store is the stateful glue + auto-advance timers, mirroring the
 * pattern established by D1's useCharacterState.ts.
 */

import { create } from "zustand";
import {
  FinaleStage,
  FinaleState,
  FinaleUnlockRequirements,
} from "./finale.config";
import {
  advanceStage as engineAdvanceStage,
  completeFinale as engineCompleteFinale,
  createInitialFinaleEngineState,
  evaluateUnlock,
  FinaleEngineState,
  holdDurationForStage,
  isSequenceActive,
  resetFinale as engineResetFinale,
  startFinale as engineStartFinale,
} from "./FinaleEngine";

export interface FinaleStore {
  // ---- public state ---------------------------------------------------
  state: FinaleState;
  currentStage: FinaleStage;
  /** Unified 0–100 progress: unlock progress pre-start, sequence progress once running. */
  progress: number;

  // ---- internal ----------------------------------------------------
  _engine: FinaleEngineState;
  _autoAdvanceTimer: ReturnType<typeof setTimeout> | null;
  _autoAdvanceEnabled: boolean;

  // ---- public API ----------------------------------------------------
  /** Feed the latest unlock requirements; recomputes locked/available. */
  updateUnlockRequirements: (req: FinaleUnlockRequirements) => void;
  /** Begin the finale sequence (valid only from "available"). */
  startFinale: () => void;
  /** Advance to the next stage in the fixed 6-stage sequence. */
  advanceStage: () => void;
  /** Formally mark the finale as complete (valid once at "forever"). */
  completeFinale: () => void;
  /** Enable/disable automatic stage progression on a timer. */
  setAutoAdvance: (enabled: boolean) => void;
  /** Reset the entire finale system to its initial locked state. */
  reset: () => void;
}

const computeProgress = (engine: FinaleEngineState): number =>
  isSequenceActive(engine.state) || engine.state === "complete"
    ? engine.sequenceProgressPct
    : engine.unlockProgressPct;

const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
  if (timer) clearTimeout(timer);
};

export const useFinaleState = create<FinaleStore>((set, get) => ({
  state: "locked",
  currentStage: "idle",
  progress: 0,

  _engine: createInitialFinaleEngineState(),
  _autoAdvanceTimer: null,
  _autoAdvanceEnabled: true,

  updateUnlockRequirements: (req) => {
    const { _engine } = get();
    const next = evaluateUnlock(_engine, req);
    set({
      _engine: next,
      state: next.state,
      currentStage: next.currentStage,
      progress: computeProgress(next),
    });
  },

  startFinale: () => {
    const { _engine, _autoAdvanceTimer } = get();
    clearTimer(_autoAdvanceTimer);

    const next = engineStartFinale(_engine);
    set({
      _engine: next,
      state: next.state,
      currentStage: next.currentStage,
      progress: computeProgress(next),
      _autoAdvanceTimer: null,
    });

    if (get()._autoAdvanceEnabled && isSequenceActive(next.state)) {
      const timer = setTimeout(() => {
        get().advanceStage();
      }, holdDurationForStage(next.currentStage));
      set({ _autoAdvanceTimer: timer });
    }
  },

  advanceStage: () => {
    const { _engine, _autoAdvanceTimer } = get();
    clearTimer(_autoAdvanceTimer);

    const next = engineAdvanceStage(_engine);
    set({
      _engine: next,
      state: next.state,
      currentStage: next.currentStage,
      progress: computeProgress(next),
      _autoAdvanceTimer: null,
    });

    const stillActive = isSequenceActive(next.state) && next.currentStage !== "forever";
    if (get()._autoAdvanceEnabled && stillActive) {
      const timer = setTimeout(() => {
        get().advanceStage();
      }, holdDurationForStage(next.currentStage));
      set({ _autoAdvanceTimer: timer });
    }
  },

  completeFinale: () => {
    const { _engine, _autoAdvanceTimer } = get();
    clearTimer(_autoAdvanceTimer);

    const next = engineCompleteFinale(_engine);
    set({
      _engine: next,
      state: next.state,
      currentStage: next.currentStage,
      progress: computeProgress(next),
      _autoAdvanceTimer: null,
    });
  },

  setAutoAdvance: (enabled) => {
    set({ _autoAdvanceEnabled: enabled });
    if (!enabled) {
      clearTimer(get()._autoAdvanceTimer);
      set({ _autoAdvanceTimer: null });
    }
  },

  reset: () => {
    clearTimer(get()._autoAdvanceTimer);
    const fresh = engineResetFinale();
    set({
      state: fresh.state,
      currentStage: fresh.currentStage,
      progress: computeProgress(fresh),
      _engine: fresh,
      _autoAdvanceTimer: null,
    });
  },
}));

// Convenience selectors
export const selectFinaleState = (s: FinaleStore) => s.state;
export const selectFinaleStage = (s: FinaleStore) => s.currentStage;
export const selectFinaleProgress = (s: FinaleStore) => s.progress;

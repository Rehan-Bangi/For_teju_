/**
 * FinaleEngine.ts
 *
 * Pure, framework-agnostic logic for the finale system. No React, no
 * Zustand, no side effects — deterministic functions that turn
 * (current engine state + action) into (next engine state).
 *
 * Mirrors the separation established by D1's CharacterEngine.ts.
 */

import {
  FINALE_STAGE_ORDER,
  FINALE_TIMING,
  FinaleStage,
  FinaleState,
  FinaleUnlockRequirements,
  isFinaleUnlocked,
  unlockProgress,
} from "./finale.config";

export interface FinaleEngineState {
  state: FinaleState;
  currentStage: FinaleStage;
  /** 0–100 unlock progress, independent of in-sequence stage progress. */
  unlockProgressPct: number;
  /** 0–100 progress through the finale sequence itself, once started. */
  sequenceProgressPct: number;
}

export const createInitialFinaleEngineState = (): FinaleEngineState => ({
  state: "locked",
  currentStage: "idle",
  unlockProgressPct: 0,
  sequenceProgressPct: 0,
});

const stageIndex = (stage: FinaleStage): number =>
  FINALE_STAGE_ORDER.indexOf(stage);

const lastStage: FinaleStage = FINALE_STAGE_ORDER[FINALE_STAGE_ORDER.length - 1]!;

export const sequenceProgressForStage = (stage: FinaleStage): number => {
  const idx = stageIndex(stage);
  if (idx <= 0) return 0;
  const total = FINALE_STAGE_ORDER.length - 1; // exclude "idle"
  return Math.round((idx / total) * 100);
};

/**
 * Recompute unlock state from the latest progression requirements.
 * Never downgrades out of "starting" / "revealing" / "complete" — once
 * the finale sequence has begun, requirement changes don't interrupt it.
 */
export const evaluateUnlock = (
  current: FinaleEngineState,
  req: FinaleUnlockRequirements
): FinaleEngineState => {
  if (
    current.state === "starting" ||
    current.state === "revealing" ||
    current.state === "complete"
  ) {
    return { ...current, unlockProgressPct: 100 };
  }

  const pct = unlockProgress(req);
  const unlocked = isFinaleUnlocked(req);

  return {
    ...current,
    state: unlocked ? "available" : "locked",
    unlockProgressPct: pct,
  };
};

/**
 * Begin the finale sequence. Only valid from "available". Returns the
 * unchanged state if called while locked, already running, or complete.
 */
export const startFinale = (current: FinaleEngineState): FinaleEngineState => {
  if (current.state !== "available") return current;

  return {
    ...current,
    state: "starting",
    currentStage: "slowdown",
    sequenceProgressPct: sequenceProgressForStage("slowdown"),
  };
};

/**
 * Advance to the next stage in the fixed sequence. No-ops once at the
 * final stage (use completeFinale to formally close it out).
 */
export const advanceStage = (
  current: FinaleEngineState
): FinaleEngineState => {
  if (current.state !== "starting" && current.state !== "revealing") {
    return current;
  }

  const idx = stageIndex(current.currentStage);
  const isLast = current.currentStage === lastStage;

  if (isLast) {
    return current;
  }

  const nextStage = FINALE_STAGE_ORDER[idx + 1]!;
  const nextState: FinaleState =
    nextStage === "forever" ? "revealing" : "revealing";

  return {
    ...current,
    state: nextState,
    currentStage: nextStage,
    sequenceProgressPct: sequenceProgressForStage(nextStage),
  };
};

/**
 * Formally complete the finale. Valid once the sequence has reached the
 * final stage ("forever"); marks the experience as fully finished.
 */
export const completeFinale = (
  current: FinaleEngineState
): FinaleEngineState => {
  if (current.currentStage !== "forever") return current;

  return {
    ...current,
    state: "complete",
    sequenceProgressPct: 100,
  };
};

export const holdDurationForStage = (stage: FinaleStage): number => {
  if (stage === "idle") return 0;
  return FINALE_TIMING[stage].minHoldMs;
};

export const transitionDurationForStage = (stage: FinaleStage): number => {
  if (stage === "idle") return 0;
  return FINALE_TIMING[stage].transitionMs;
};

export const isSequenceActive = (state: FinaleState): boolean =>
  state === "starting" || state === "revealing";

export const resetFinale = (): FinaleEngineState =>
  createInitialFinaleEngineState();

/**
 * CharacterEngine.ts
 *
 * Pure, framework-agnostic logic for the character system.
 * No React, no Zustand, no side effects — just deterministic functions
 * that turn (current state + story event) into (next state + dialogue).
 *
 * This isolation makes the engine trivially testable and keeps all
 * "what should happen" decisions out of the store/components.
 */

import {
  CharacterState,
  DialogueLine,
  DIALOGUE_POOLS,
  EMOTION_THRESHOLDS,
  EVENT_TO_EMOTION_DELTA,
  EVENT_TO_POOL,
  StoryEvent,
  TIMING,
} from "./character.config";

export interface EngineState {
  state: CharacterState;
  emotionLevel: number; // 0–100
  lastDialogueId: string | null;
  /** Explicit scripted state lock, e.g. for an authored cinematic beat. */
  scriptedLock: CharacterState | null;
}

export const createInitialEngineState = (): EngineState => ({
  state: "hidden",
  emotionLevel: 0,
  lastDialogueId: null,
  scriptedLock: null,
});

/**
 * Derive a CharacterState purely from an emotion level, ignoring any
 * transient/celebratory states. Used as the "resting" state to settle
 * back into once a temporary state (celebrating/emotional) holds.
 */
export const restingStateForEmotion = (emotionLevel: number): CharacterState => {
  if (emotionLevel >= EMOTION_THRESHOLDS.finale) return "finale";
  if (emotionLevel >= EMOTION_THRESHOLDS.emotional) return "emotional";
  if (emotionLevel >= EMOTION_THRESHOLDS.guiding) return "guiding";
  return "observing";
};

export const clampEmotion = (value: number): number =>
  Math.max(0, Math.min(100, value));

/**
 * Pick the next dialogue line for a given event, avoiding an immediate
 * repeat of the last line shown (when an alternative exists).
 */
export const selectDialogueForEvent = (
  event: StoryEvent,
  lastDialogueId: string | null
): DialogueLine | null => {
  const poolKey = EVENT_TO_POOL[event.type];
  const pool = DIALOGUE_POOLS[poolKey];
  if (!pool || pool.length === 0) return null;

  const candidates =
    pool.length > 1 ? pool.filter((line) => line.id !== lastDialogueId) : pool;

  const pool_ = candidates.length > 0 ? candidates : pool;
  const index = Math.floor(Math.random() * pool_.length);
  return pool_[index];
};

/**
 * Determine the transient (non-resting) state a given event should force,
 * if any. Returns null when the event doesn't force a special state and
 * the resting state (derived from emotion) should apply instead.
 */
const transientStateForEvent = (event: StoryEvent): CharacterState | null => {
  switch (event.type) {
    case "MILESTONE_COMPLETE":
      return "celebrating";
    case "EMOTIONAL_PEAK":
      return "emotional";
    case "FINALE_ARRIVAL":
      return "finale";
    case "MEMORY_UNLOCK":
      return "emotional";
    default:
      return null;
  }
};

/**
 * Does this transient state auto-settle back to the resting state after
 * a hold duration? (celebrating/emotional do; finale does not.)
 */
export const isTransientState = (state: CharacterState): boolean =>
  state === "celebrating" || state === "emotional";

export const holdDurationForState = (state: CharacterState): number => {
  if (state === "celebrating") return TIMING.celebrationHoldMs;
  if (state === "emotional") return TIMING.emotionalHoldMs;
  return 0;
};

export interface ReduceResult {
  next: EngineState;
  dialogue: DialogueLine | null;
}

/**
 * The core reducer: given the current engine state and an incoming story
 * event, compute the next engine state and the dialogue line (if any)
 * that should be spoken.
 */
export const reduceStoryEvent = (
  current: EngineState,
  event: StoryEvent
): ReduceResult => {
  // A scripted lock (authored cinematic beat) takes precedence over
  // all automatic state derivation until explicitly released.
  if (current.scriptedLock) {
    return { next: current, dialogue: null };
  }

  const delta = event.emotionDeltaOverride ?? EVENT_TO_EMOTION_DELTA[event.type];
  const nextEmotion = clampEmotion(current.emotionLevel + delta);

  const forced = transientStateForEvent(event);
  const resting = restingStateForEmotion(nextEmotion);
  const nextStateValue: CharacterState = forced ?? resting;

  const dialogue = selectDialogueForEvent(event, current.lastDialogueId);

  return {
    next: {
      ...current,
      state: nextStateValue,
      emotionLevel: nextEmotion,
      lastDialogueId: dialogue ? dialogue.id : current.lastDialogueId,
    },
    dialogue,
  };
};

/**
 * Compute the settled state to fall back to after a transient state's
 * hold duration elapses.
 */
export const settleAfterTransient = (current: EngineState): EngineState => {
  if (current.scriptedLock) return current;
  return {
    ...current,
    state: restingStateForEmotion(current.emotionLevel),
  };
};

/**
 * Apply an explicit scripted state change (used for authored, one-off
 * narrative beats that bypass the emotion-driven derivation entirely).
 */
export const applyScriptedState = (
  current: EngineState,
  state: CharacterState,
  lock: boolean
): EngineState => ({
  ...current,
  state,
  scriptedLock: lock ? state : null,
});

export const releaseScriptedLock = (current: EngineState): EngineState => ({
  ...current,
  scriptedLock: null,
  state: restingStateForEmotion(current.emotionLevel),
});

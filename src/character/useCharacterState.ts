/**
 * useCharacterState.ts
 *
 * Zustand store powering the character system's public API:
 * current state, current dialogue, dialogue queue, emotion level,
 * triggerDialogue(), changeState(), clearQueue().
 *
 * All decision logic is delegated to CharacterEngine (pure functions);
 * this store is just the stateful glue + queue management.
 */

import { create } from "zustand";
import {
  CharacterState,
  DialogueLine,
  StoryEvent,
  TIMING,
} from "../character.config";
import {
  applyScriptedState,
  createInitialEngineState,
  EngineState,
  holdDurationForState,
  isTransientState,
  reduceStoryEvent,
  releaseScriptedLock,
  settleAfterTransient,
} from "../engine/CharacterEngine";

export interface CharacterStore {
  // ---- derived/public state ---------------------------------------
  state: CharacterState;
  emotionLevel: number;
  currentDialogue: DialogueLine | null;
  dialogueQueue: DialogueLine[];

  // ---- internal engine state ---------------------------------------
  _engine: EngineState;
  _settleTimer: ReturnType<typeof setTimeout> | null;
  _dialogueTimer: ReturnType<typeof setTimeout> | null;

  // ---- public API ----------------------------------------------------
  /** Feed a fixed, scripted progression event into the character system. */
  dispatchStoryEvent: (event: StoryEvent) => void;
  /** Directly enqueue a specific pre-written dialogue line. */
  triggerDialogue: (line: DialogueLine) => void;
  /** Force a specific state, optionally locking it (for scripted beats). */
  changeState: (state: CharacterState, lock?: boolean) => void;
  /** Release a previously applied scripted lock. */
  releaseLock: () => void;
  /** Empty the pending dialogue queue without affecting current dialogue. */
  clearQueue: () => void;
  /** Advance to the next queued line, if any. */
  advanceQueue: () => void;
  /** Reset the entire character system to its initial idle state. */
  reset: () => void;
}

const MAX_QUEUE_LENGTH = 5;

export const useCharacterState = create<CharacterStore>((set, get) => ({
  state: "hidden",
  emotionLevel: 0,
  currentDialogue: null,
  dialogueQueue: [],

  _engine: createInitialEngineState(),
  _settleTimer: null,
  _dialogueTimer: null,

  dispatchStoryEvent: (event) => {
    const { _engine } = get();
    const { next, dialogue } = reduceStoryEvent(_engine, event);

    set({
      _engine: next,
      state: next.state,
      emotionLevel: next.emotionLevel,
    });

    if (dialogue) {
      get().triggerDialogue(dialogue);
    }

    if (isTransientState(next.state)) {
      const existingTimer = get()._settleTimer;
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        const engineNow = get()._engine;
        const settled = settleAfterTransient(engineNow);
        set({ _engine: settled, state: settled.state, _settleTimer: null });
      }, holdDurationForState(next.state));

      set({ _settleTimer: timer });
    }
  },

  triggerDialogue: (line) => {
    const { currentDialogue, dialogueQueue } = get();

    if (!currentDialogue) {
      set({ currentDialogue: line });
      const timer = setTimeout(() => {
        get().advanceQueue();
      }, line.durationMs ?? TIMING.defaultDialogueDurationMs);
      set({ _dialogueTimer: timer });
      return;
    }

    const nextQueue = [...dialogueQueue, line].slice(-MAX_QUEUE_LENGTH);
    set({ dialogueQueue: nextQueue });
  },

  changeState: (state, lock = false) => {
    const { _engine } = get();
    const next = applyScriptedState(_engine, state, lock);
    set({ _engine: next, state: next.state });
  },

  releaseLock: () => {
    const { _engine } = get();
    const next = releaseScriptedLock(_engine);
    set({ _engine: next, state: next.state });
  },

  clearQueue: () => {
    set({ dialogueQueue: [] });
  },

  advanceQueue: () => {
    const { dialogueQueue, _dialogueTimer } = get();
    if (_dialogueTimer) clearTimeout(_dialogueTimer);

    if (dialogueQueue.length === 0) {
      set({ currentDialogue: null, _dialogueTimer: null });
      return;
    }

    const [nextLine, ...rest] = dialogueQueue;
    set({ currentDialogue: nextLine, dialogueQueue: rest });

    const timer = setTimeout(() => {
      get().advanceQueue();
    }, nextLine.durationMs ?? TIMING.defaultDialogueDurationMs);
    set({ _dialogueTimer: timer });
  },

  reset: () => {
    const { _settleTimer, _dialogueTimer } = get();
    if (_settleTimer) clearTimeout(_settleTimer);
    if (_dialogueTimer) clearTimeout(_dialogueTimer);

    set({
      state: "hidden",
      emotionLevel: 0,
      currentDialogue: null,
      dialogueQueue: [],
      _engine: createInitialEngineState(),
      _settleTimer: null,
      _dialogueTimer: null,
    });
  },
}));

// Convenience selectors for components that only need a slice of state.
export const selectCharacterState = (s: CharacterStore) => s.state;
export const selectCurrentDialogue = (s: CharacterStore) => s.currentDialogue;
export const selectEmotionLevel = (s: CharacterStore) => s.emotionLevel;
export const selectDialogueQueue = (s: CharacterStore) => s.dialogueQueue;

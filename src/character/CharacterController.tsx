/**
 * CharacterController.tsx
 *
 * Top-level orchestrator for the character system. Mounted once near
 * the root of the experience. Connects the Zustand store to the
 * presentational Avatar + Dialogue components, and exposes a small
 * imperative API (via the exported hook) for the rest of the app
 * (story engine, memory unlocks, milestone tracker, finale sequence)
 * to dispatch fixed progression events.
 *
 * This component contains NO free-text input, NO AI calls, and NO
 * logic that reacts to anything other than the StoryEvent contract
 * defined in character.config.ts.
 */

import { useEffect, useRef } from "react";
import { CharacterAvatar } from "./CharacterAvatar";
import { CharacterDialogue } from "./CharacterDialogue";
import { useCharacterState } from "../hooks/useCharacterState";
import { StoryEvent } from "../character.config";

export interface CharacterControllerProps {
  /**
   * Stream of story events to react to. Pass the latest event object;
   * the controller dispatches it whenever it changes (compared by
   * reference/identity via an internal ref guard).
   */
  event?: StoryEvent | null;
  /** Visual placement; defaults to bottom-right companion position. */
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  avatarSize?: number;
  className?: string;
}

const POSITION_CLASSES: Record<
  NonNullable<CharacterControllerProps["position"]>,
  string
> = {
  "bottom-right": "fixed bottom-6 right-6 items-end",
  "bottom-left": "fixed bottom-6 left-6 items-start",
  "bottom-center": "fixed bottom-6 left-1/2 -translate-x-1/2 items-center",
};

export const CharacterController = ({
  event,
  position = "bottom-right",
  avatarSize = 96,
  className = "",
}: CharacterControllerProps) => {
  const dispatchStoryEvent = useCharacterState((s) => s.dispatchStoryEvent);
  const state = useCharacterState((s) => s.state);
  const currentDialogue = useCharacterState((s) => s.currentDialogue);

  const lastHandledEvent = useRef<StoryEvent | null>(null);

  useEffect(() => {
    if (!event) return;
    if (lastHandledEvent.current === event) return;
    lastHandledEvent.current = event;
    dispatchStoryEvent(event);
  }, [event, dispatchStoryEvent]);

  return (
    <div
      className={`flex flex-col gap-3 z-50 ${POSITION_CLASSES[position]} ${className}`}
      aria-live="polite"
    >
      <CharacterDialogue dialogue={currentDialogue} />
      <CharacterAvatar state={state} size={avatarSize} />
    </div>
  );
};

/**
 * Convenience hook for other parts of the app to dispatch progression
 * events without needing to render or know about the controller's
 * internal wiring. Use this from the story engine, memory-unlock
 * handlers, milestone tracker, and finale sequencer.
 *
 * Example:
 *   const notifyCharacter = useCharacterEvents();
 *   notifyCharacter({ type: "MEMORY_UNLOCK", refId: "first-date" });
 */
export const useCharacterEvents = () => {
  const dispatchStoryEvent = useCharacterState((s) => s.dispatchStoryEvent);
  return dispatchStoryEvent;
};

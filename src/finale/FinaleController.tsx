/**
 * FinaleController.tsx
 *
 * Top-level orchestrator for the finale system. Mounted once near the
 * root of the experience (alongside D1's CharacterController). Connects
 * useFinaleState to the presentational FinaleSequence, notifies the D1
 * character system of finale progression via its existing public API
 * (useCharacterEvents), and exposes startFinale/advanceStage/
 * completeFinale to the rest of the app.
 *
 * Does not modify, redefine, or duplicate any D1 file — it only calls
 * the public surface D1 already exports.
 */

import { useEffect, useRef } from "react";
import { useFinaleState } from "./useFinaleState";
import { FinaleSequence } from "./FinaleSequence";
import { FinaleUnlockRequirements, MemoryFragment } from "./finale.config";

// D1's public character-system surface. Path assumed per locked
// architecture: sibling `character` module exporting useCharacterEvents.
import { useCharacterEvents } from "../character";

export interface FinaleControllerProps {
  unlockRequirements: FinaleUnlockRequirements;
  memoryFragments?: MemoryFragment[];
  onForeverPrimaryAction?: () => void;
  onForeverSecondaryAction?: () => void;
}

export const FinaleController = ({
  unlockRequirements,
  memoryFragments = [],
  onForeverPrimaryAction,
  onForeverSecondaryAction,
}: FinaleControllerProps) => {
  const currentStage = useFinaleState((s) => s.currentStage);
  const finaleState = useFinaleState((s) => s.state);
  const updateUnlockRequirements = useFinaleState(
    (s) => s.updateUnlockRequirements
  );
  const completeFinale = useFinaleState((s) => s.completeFinale);

  const notifyCharacter = useCharacterEvents();

  const lastNotifiedStage = useRef<string | null>(null);

  useEffect(() => {
    updateUnlockRequirements(unlockRequirements);
  }, [unlockRequirements, updateUnlockRequirements]);

  useEffect(() => {
    if (lastNotifiedStage.current === currentStage) return;
    lastNotifiedStage.current = currentStage;

    if (currentStage === "slowdown") {
      notifyCharacter({ type: "FINALE_APPROACH" });
    }
    if (currentStage === "characterEnter" || currentStage === "loveReveal") {
      notifyCharacter({ type: "FINALE_ARRIVAL" });
    }
  }, [currentStage, notifyCharacter]);

  useEffect(() => {
    if (currentStage === "forever" && finaleState === "revealing") {
      completeFinale();
    }
  }, [currentStage, finaleState, completeFinale]);

  if (finaleState === "locked" || finaleState === "available") {
    return null;
  }

  return (
    <FinaleSequence
      stage={currentStage}
      memoryFragments={memoryFragments}
      onPrimaryAction={onForeverPrimaryAction}
      onSecondaryAction={onForeverSecondaryAction}
    />
  );
};

/**
 * Convenience hook for the rest of the app (e.g. a "Begin Finale"
 * button shown once unlocked) to control the finale sequence without
 * needing to know about internal store wiring.
 */
export const useFinaleControls = () => {
  const state = useFinaleState((s) => s.state);
  const currentStage = useFinaleState((s) => s.currentStage);
  const progress = useFinaleState((s) => s.progress);
  const startFinale = useFinaleState((s) => s.startFinale);
  const advanceStage = useFinaleState((s) => s.advanceStage);
  const completeFinale = useFinaleState((s) => s.completeFinale);

  return {
    state,
    currentStage,
    progress,
    startFinale,
    advanceStage,
    completeFinale,
  };
};

/**
 * useStoryTriggers.ts
 *
 * Single integration point the rest of the app uses to report story
 * progression. Wraps D1's dispatchStoryEvent and D2's finale unlock
 * update behind four explicit trigger functions:
 *
 *   triggerSection(id)
 *   triggerMemoryUnlock(id)
 *   triggerMilestone(id)
 *   triggerFinale(requirements)
 *
 * Responsibilities:
 *  - Deduplicate repeat firings of the same trigger id (e.g. a section
 *    re-entering the viewport on scroll-back should not re-fire).
 *  - Pause trigger dispatch while the tab/app is not visible
 *    (document.visibilitychange), queueing at most the latest pending
 *    trigger and flushing on resume, so backgrounded tabs don't pile up
 *    animations that then all fire at once.
 *  - Clean up all listeners/timers on unmount.
 *  - Stay safe across route transitions: triggers fired after unmount
 *    are dropped rather than throwing or updating stale state.
 */

import { useCallback, useEffect, useRef } from "react";
import { useCharacterState, StoryEvent } from "../character";
import { useFinaleState, FinaleUnlockRequirements } from "../finale";

interface PendingTrigger {
  run: () => void;
}

interface UseStoryTriggersOptions {
  /** Maximum number of distinct ids remembered for dedupe, per trigger kind. */
  dedupeCacheSize?: number;
}

const DEFAULT_DEDUPE_CACHE_SIZE = 500;

const createDedupeSet = (maxSize: number) => {
  const seen = new Set<string>();
  return {
    has: (id: string) => seen.has(id),
    add: (id: string) => {
      if (seen.size >= maxSize) {
        const oldest = seen.values().next().value;
        if (oldest !== undefined) seen.delete(oldest);
      }
      seen.add(id);
    },
  };
};

export const useStoryTriggers = (options: UseStoryTriggersOptions = {}) => {
  const dedupeCacheSize = options.dedupeCacheSize ?? DEFAULT_DEDUPE_CACHE_SIZE;

  const dispatchStoryEvent = useCharacterState((s) => s.dispatchStoryEvent);
  const updateUnlockRequirements = useFinaleState(
    (s) => s.updateUnlockRequirements
  );

  const isMountedRef = useRef(true);
  const isVisibleRef = useRef(
    typeof document === "undefined" ? true : document.visibilityState === "visible"
  );
  const pendingRef = useRef<PendingTrigger | null>(null);

  const sectionSeen = useRef(createDedupeSet(dedupeCacheSize));
  const memorySeen = useRef(createDedupeSet(dedupeCacheSize));
  const milestoneSeen = useRef(createDedupeSet(dedupeCacheSize));

  useEffect(() => {
    isMountedRef.current = true;

    const handleVisibilityChange = () => {
      const visible = document.visibilityState === "visible";
      isVisibleRef.current = visible;

      if (visible && pendingRef.current && isMountedRef.current) {
        const pending = pendingRef.current;
        pendingRef.current = null;
        pending.run();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      isMountedRef.current = false;
      pendingRef.current = null;
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, []);

  /**
   * Runs `run` now if mounted+visible, otherwise stores it as the single
   * latest pending action to flush on next visibility resume. Guards
   * every execution path against post-unmount/route-transition calls.
   */
  const runSafely = useCallback((run: () => void) => {
    if (!isMountedRef.current) return;

    if (!isVisibleRef.current) {
      pendingRef.current = { run };
      return;
    }

    run();
  }, []);

  const dispatchEvent = useCallback(
    (event: StoryEvent) => {
      runSafely(() => {
        if (!isMountedRef.current) return;
        dispatchStoryEvent(event);
      });
    },
    [dispatchStoryEvent, runSafely]
  );

  const triggerSection = useCallback(
    (sectionId: string, opts?: { exit?: boolean }) => {
      const key = `${opts?.exit ? "exit" : "enter"}:${sectionId}`;
      if (sectionSeen.current.has(key)) return;
      sectionSeen.current.add(key);

      dispatchEvent({
        type: opts?.exit ? "SECTION_EXIT" : "SECTION_ENTER",
        refId: sectionId,
      });
    },
    [dispatchEvent]
  );

  const triggerMemoryUnlock = useCallback(
    (memoryId: string) => {
      if (memorySeen.current.has(memoryId)) return;
      memorySeen.current.add(memoryId);

      dispatchEvent({ type: "MEMORY_UNLOCK", refId: memoryId });
    },
    [dispatchEvent]
  );

  const triggerMilestone = useCallback(
    (milestoneId: string) => {
      if (milestoneSeen.current.has(milestoneId)) return;
      milestoneSeen.current.add(milestoneId);

      dispatchEvent({ type: "MILESTONE_COMPLETE", refId: milestoneId });
    },
    [dispatchEvent]
  );

  const triggerEmotionalPeak = useCallback(
    (refId?: string) => {
      dispatchEvent({ type: "EMOTIONAL_PEAK", refId });
    },
    [dispatchEvent]
  );

  const triggerFinale = useCallback(
    (requirements: FinaleUnlockRequirements) => {
      runSafely(() => {
        if (!isMountedRef.current) return;
        updateUnlockRequirements(requirements);
      });
    },
    [updateUnlockRequirements, runSafely]
  );

  const resetDedupe = useCallback(() => {
    sectionSeen.current = createDedupeSet(dedupeCacheSize);
    memorySeen.current = createDedupeSet(dedupeCacheSize);
    milestoneSeen.current = createDedupeSet(dedupeCacheSize);
  }, [dedupeCacheSize]);

  return {
    triggerSection,
    triggerMemoryUnlock,
    triggerMilestone,
    triggerEmotionalPeak,
    triggerFinale,
    resetDedupe,
  };
};

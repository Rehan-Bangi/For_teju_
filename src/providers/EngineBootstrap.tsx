/**
 * src/app/providers/EngineBootstrap.tsx
 *
 * COMPATIBILITY AUDIT CORRECTIONS APPLIED (see chat for full audit):
 *
 * storyEngine.ts and anniversaryUnlockEngine.ts are plain classes
 * (`StoryEngine`, `AnniversaryUnlockEngine`) — there's no exported
 * singleton instance, no `.init()` / `.check()` method, and no eventBus
 * integration of any kind. Both are synchronous evaluators: you call a
 * method with data and get a result back, nothing self-registers or
 * emits events on its own. This file now instantiates them directly
 * (once, via useMemo) and shares them down through context instead of
 * calling methods that never existed.
 *
 * Both still need real input data that isn't part of the audited file
 * set:
 *   - StoryEngine.buildStory(memories, options) needs a `Memory[]` array
 *     — presumably from a content file like data/memories.ts.
 *   - AnniversaryUnlockEngine.evaluateAnniversaryUnlock(config, now) needs
 *     a list of `AnniversaryUnlockConfig` entries — presumably from
 *     anniversaryContent.ts.
 * Neither file was provided, so the TODOs below mark exactly where that
 * data plugs in rather than inventing it.
 *
 * Neither engine emits eventBus events, so this is also the one place
 * that bridges anniversary unlocks onto the bus — using the real
 * `ANNIVERSARY_REACHED` event (no payload), not the invented
 * `ANNIVERSARY_UNLOCKED` name used previously.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { eventBus } from '@/core/config/eventBus';
import { StoryEngine } from '@/story/storyEngine';
import {
  AnniversaryUnlockEngine,
  type AnniversaryUnlockConfig,
} from '@/story/anniversaryUnlockEngine';

const ANNIVERSARY_CHECK_INTERVAL_MS = 1000 * 60 * 60; // hourly is enough for a date check

// TODO: source from anniversaryContent.ts once that file is wired in —
// left empty so the poll loop has nothing to fabricate in the meantime.
const ANNIVERSARY_CONFIGS: AnniversaryUnlockConfig[] = [];

interface EngineContextValue {
  storyEngine: StoryEngine;
  anniversaryEngine: AnniversaryUnlockEngine;
}

const EngineContext = createContext<EngineContextValue | null>(null);

/** Access the shared engine instances anywhere below <EngineBootstrap>. */
export function useEngines(): EngineContextValue {
  const ctx = useContext(EngineContext);
  if (!ctx) {
    throw new Error('useEngines must be used within <EngineBootstrap>');
  }
  return ctx;
}

interface EngineBootstrapProps {
  children: ReactNode;
}

export function EngineBootstrap({ children }: EngineBootstrapProps) {
  const storyEngine = useMemo(() => new StoryEngine(), []);
  const anniversaryEngine = useMemo(() => new AnniversaryUnlockEngine(), []);
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    const revealedIds = new Set<string>();

    function pollAnniversaries() {
      const now = new Date();
      ANNIVERSARY_CONFIGS.forEach((config) => {
        const result = anniversaryEngine.evaluateAnniversaryUnlock(config, now);
        if (result.revealed && !revealedIds.has(result.memoryId)) {
          revealedIds.add(result.memoryId);
          eventBus.emit('ANNIVERSARY_REACHED');
        }
      });
    }

    pollAnniversaries();
    const intervalId = window.setInterval(pollAnniversaries, ANNIVERSARY_CHECK_INTERVAL_MS);

    setIsBootstrapped(true);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [anniversaryEngine]);

  if (!isBootstrapped) return null;

  return (
    <EngineContext.Provider value={{ storyEngine, anniversaryEngine }}>
      {children}
    </EngineContext.Provider>
  );
}

/**
 * CharacterFinaleBridge.ts
 *
 * Integration utility connecting D1 (character system) and D2 (finale
 * system) without modifying either. Subscribes to both Zustand stores
 * directly and keeps them synchronized:
 *
 *  - When the finale sequence reaches "characterEnter" / "loveReveal" /
 *    "forever", the character system is notified via its existing
 *    public dispatch API (dispatchStoryEvent), exactly as a normal
 *    consumer would.
 *  - When the finale becomes unlocked, the character is nudged toward
 *    "FINALE_APPROACH" exactly once.
 *  - All dispatches are deduplicated per finale stage so re-renders,
 *    StrictMode double-invocation, or rapid store updates cannot fire
 *    the same event twice.
 *
 * This file owns no React lifecycle; it is a plain singleton subscriber
 * that components can start/stop explicitly (see initCharacterFinaleBridge
 * / teardownCharacterFinaleBridge), which keeps it safe to wire up once
 * at app root and safe to tear down on route/unmount.
 */

import {
  useCharacterState,
  StoryEvent as CharacterStoryEvent,
} from "../character";
import { useFinaleState, FinaleStage, FinaleState } from "../finale";

type Unsubscribe = () => void;

interface BridgeInternalState {
  lastDispatchedStage: FinaleStage | null;
  lastFinaleState: FinaleState | null;
  approachFired: boolean;
  started: boolean;
  unsubscribers: Unsubscribe[];
}

const internal: BridgeInternalState = {
  lastDispatchedStage: null,
  lastFinaleState: null,
  approachFired: false,
  started: false,
  unsubscribers: [],
};

const STAGE_TO_CHARACTER_EVENT: Partial<
  Record<FinaleStage, CharacterStoryEvent["type"]>
> = {
  characterEnter: "FINALE_ARRIVAL",
  loveReveal: "FINALE_ARRIVAL",
  forever: "FINALE_ARRIVAL",
};

const dispatchToCharacter = (event: CharacterStoryEvent) => {
  useCharacterState.getState().dispatchStoryEvent(event);
};

/**
 * Idempotent: dispatches a character event for a finale stage at most
 * once per distinct stage value, even under repeated/duplicate calls.
 */
const handleFinaleStageChange = (stage: FinaleStage) => {
  if (internal.lastDispatchedStage === stage) return;
  internal.lastDispatchedStage = stage;

  const eventType = STAGE_TO_CHARACTER_EVENT[stage];
  if (eventType) {
    dispatchToCharacter({ type: eventType });
  }
};

/**
 * Idempotent: fires FINALE_APPROACH exactly once, the first time the
 * finale store transitions into "available".
 */
const handleFinaleStateChange = (state: FinaleState) => {
  if (internal.lastFinaleState === state) return;
  internal.lastFinaleState = state;

  if (state === "available" && !internal.approachFired) {
    internal.approachFired = true;
    dispatchToCharacter({ type: "FINALE_APPROACH" });
  }

  if (state === "locked") {
    // Allow re-approach if the app explicitly resets the finale.
    internal.approachFired = false;
  }
};

/**
 * Start the bridge's subscriptions. Safe to call multiple times — only
 * the first call actually subscribes; subsequent calls are no-ops until
 * teardownCharacterFinaleBridge() is called.
 */
export const initCharacterFinaleBridge = (): void => {
  if (internal.started) return;
  internal.started = true;

  const unsubStage = useFinaleState.subscribe((state) => {
    handleFinaleStageChange(state.currentStage);
  });

  const unsubState = useFinaleState.subscribe((state) => {
    handleFinaleStateChange(state.state);
  });

  internal.unsubscribers.push(unsubStage, unsubState);

  // Reconcile immediately with current state in case stores were
  // already populated before the bridge was initialized.
  const snapshot = useFinaleState.getState();
  handleFinaleStateChange(snapshot.state);
  handleFinaleStageChange(snapshot.currentStage);
};

/**
 * Stop all subscriptions and reset internal dedupe tracking. Call this
 * on route transitions away from the experience, or on full app
 * teardown, to avoid leaking subscriptions or carrying stale dedupe
 * state into a fresh mount.
 */
export const teardownCharacterFinaleBridge = (): void => {
  internal.unsubscribers.forEach((unsub) => unsub());
  internal.unsubscribers = [];
  internal.started = false;
  internal.lastDispatchedStage = null;
  internal.lastFinaleState = null;
  internal.approachFired = false;
};

/**
 * Explicit reset of dedupe tracking without tearing down subscriptions.
 * Useful if the host app resets finale/character progress (e.g. a
 * "replay" action) and wants the bridge to be eligible to re-fire.
 */
export const resetCharacterFinaleBridgeTracking = (): void => {
  internal.lastDispatchedStage = null;
  internal.lastFinaleState = null;
  internal.approachFired = false;
};

export const isCharacterFinaleBridgeActive = (): boolean => internal.started;

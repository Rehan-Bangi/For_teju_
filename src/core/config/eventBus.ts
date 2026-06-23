/**
 * eventBus.ts
 * ----------------------------------------------------------------------------
 * Global typed pub/sub event bus.
 *
 * This is NOT a replacement for the Zustand store. The store holds persistent
 * state that systems need to read at any time. This bus carries fire-and-forget
 * notifications between systems that should not import each other directly.
 *
 * Rules (see Master Architecture Doc §3):
 * - Events carry IDs / small payloads only — never large objects or content blobs.
 * - Scene components emit. Controller-level systems (AudioController, UIOverlay,
 *   SceneManager) subscribe. Scenes do not subscribe to each other's events,
 *   except the documented CharacterScene -> DanceFinaleScene handoff.
 * - Subscribe in useEffect on mount, always return the unsubscribe in cleanup.
 */

import type { QualityTier } from '@/core/store/universeStore';

// ----------------------------------------------------------------------------
// Shared ID / literal types
// ----------------------------------------------------------------------------

export type SceneId =
  | 'hero'
  | 'beginning'
  | 'memory'
  | 'letter'
  | 'neversay'
  | 'character'
  | 'dance'
  | 'anniversary';

export type MemoryId = string;

export type InteractionPhase = 'idle' | 'wave' | 'approach' | 'hug' | 'dance';

export type TrackId =
  | 'hero-ambient'
  | 'beginning-theme'
  | 'memory-ambient'
  | 'letter-theme'
  | 'character-theme'
  | 'finale-theme';

export type SfxId =
  | 'transition-whoosh'
  | 'orb-click'
  | 'page-turn'
  | 'whisper-tone'
  | 'dialogue-chime';

export type AudioAction = 'play' | 'crossfade' | 'fadeDown' | 'stop';

// ----------------------------------------------------------------------------
// Event payload map — the single source of truth for every event in the system
// ----------------------------------------------------------------------------

export interface EventPayloadMap {
  SCENE_ENTERED: { sceneId: SceneId };
  SCENE_EXITED: { sceneId: SceneId; direction: 'forward' | 'backward' };

  MEMORY_UNLOCKED: { memoryId: MemoryId };

  LETTER_OPENED: undefined;

  CHARACTER_INTERACTION: { phase: InteractionPhase; dialogueIndex: number };
  DANCE_STARTED: undefined;

  ANNIVERSARY_REACHED: undefined;
  REPLAY_REQUESTED: undefined;

  AUDIO_CUE: {
    track?: TrackId;
    sfx?: SfxId;
    action: AudioAction;
    duration?: number;
    targetVolume?: number;
  };

  QUALITY_DETECTED: { tier: QualityTier };

  SCROLL_PROGRESS_UPDATED: {
    scroll: number;
    limit: number;
    velocity: number;
    direction: number;
    progress: number;
  };
}

export type EventName = keyof EventPayloadMap;

type Listener<T extends EventName> = (payload: EventPayloadMap[T]) => void;

// ----------------------------------------------------------------------------
// EventBus implementation
// ----------------------------------------------------------------------------

class EventBus {
  private listeners: {
    [K in EventName]?: Set<Listener<K>>;
  } = {};

  /**
   * Subscribe to an event. Returns an unsubscribe function — always call this
   * in your useEffect cleanup.
   */
  on<T extends EventName>(event: T, listener: Listener<T>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set() as unknown as typeof this.listeners[T];
    }
    (this.listeners[event] as Set<Listener<T>>).add(listener);

    return () => {
      this.off(event, listener);
    };
  }

  /**
   * Subscribe to an event for exactly one emission, then auto-unsubscribe.
   */
  once<T extends EventName>(event: T, listener: Listener<T>): () => void {
    const wrapped: Listener<T> = (payload) => {
      this.off(event, wrapped);
      listener(payload);
    };
    return this.on(event, wrapped);
  }

  off<T extends EventName>(event: T, listener: Listener<T>): void {
    this.listeners[event]?.delete(listener as never);
  }

  /**
   * Emit an event to all subscribers. Payload type is enforced per event name.
   */
  emit<T extends EventName>(
    event: T,
    ...args: EventPayloadMap[T] extends undefined ? [] : [EventPayloadMap[T]]
  ): void {
    const payload = args[0] as EventPayloadMap[T];
    this.listeners[event]?.forEach((listener) => {
      (listener as Listener<T>)(payload);
    });
  }

  /** Removes every listener for every event. Intended for hot-reload / test teardown only. */
  clearAll(): void {
    this.listeners = {};
  }
}

/** Singleton instance — import this everywhere, never instantiate EventBus directly. */
export const eventBus = new EventBus();

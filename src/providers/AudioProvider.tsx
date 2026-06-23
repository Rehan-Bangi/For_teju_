/**
 * src/app/providers/AudioProvider.tsx
 *
 * COMPATIBILITY AUDIT CORRECTIONS APPLIED (see chat for full audit):
 *
 * eventBus.ts's real `EventPayloadMap` only defines SCENE_ENTERED,
 * SCENE_EXITED, MEMORY_UNLOCKED, LETTER_OPENED, CHARACTER_INTERACTION,
 * DANCE_STARTED, ANNIVERSARY_REACHED, REPLAY_REQUESTED, AUDIO_CUE, and
 * QUALITY_DETECTED — emit/on are generic-typed against that map, so the
 * invented `AUDIO_CUE_REQUESTED` / `FINALE_REVEAL_COMPLETED` names used
 * previously don't type-check and have no real emitter anywhere.
 *
 * - Audio is requested via the real `AUDIO_CUE` event instead, whose
 *   payload references a `TrackId`/`SfxId` (from assetManifest.ts) plus an
 *   `action` of 'play' | 'crossfade' | 'fadeDown' | 'stop' — not a raw
 *   `{cueId, url}` pair. The URL is resolved via assetManifest.ts's own
 *   `assetPath(id)` helper.
 * - There's no eventBus event for finale completion — FinaleController
 *   calls `completeFinale()` directly on the `useFinaleState` Zustand
 *   store, it doesn't emit anything on the bus. This file now subscribes
 *   to that store directly (vanilla `.subscribe`, no extra re-renders) and
 *   watches for the transition into `'complete'` instead of listening for
 *   a bus event that doesn't exist.
 * - 'crossfade' and 'fadeDown' are handled as a best-effort approximation
 *   (stop-then-play / volume ramp) rather than a full mixer — building a
 *   true crossfade engine is out of scope for this integration pass.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { eventBus, type EventPayloadMap, type TrackId, type SfxId } from '@/core/config/eventBus';
import { assetPath } from '@/core/config/assetManifest';
import { useFinaleState } from '@/finale/useFinaleState';

type AudioCuePayload = EventPayloadMap['AUDIO_CUE'];
type CueId = TrackId | SfxId;

interface AudioProviderContextValue {
  isUnlocked: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  masterVolume: number;
  setMasterVolume: (volume: number) => void;
}

const AudioProviderContext = createContext<AudioProviderContextValue | null>(null);

export function useAudio(): AudioProviderContextValue {
  const ctx = useContext(AudioProviderContext);
  if (!ctx) {
    throw new Error('useAudio must be used within <AudioProvider>');
  }
  return ctx;
}

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeCuesRef = useRef<Map<CueId, HTMLAudioElement>>(new Map());
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [masterVolume, setMasterVolumeState] = useState(0.8);

  // --- Autoplay-policy gesture unlock (critical on iOS Safari) ---
  useEffect(() => {
    function unlock() {
      if (!audioCtxRef.current) {
        const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new Ctor();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {});
      }
      setIsUnlocked(true);
    }

    const events: Array<keyof DocumentEventMap> = ['pointerdown', 'touchend', 'keydown'];
    events.forEach((evt) => document.addEventListener(evt, unlock, { once: true, passive: true }));

    return () => {
      events.forEach((evt) => document.removeEventListener(evt, unlock));
    };
  }, []);

  const playCue = useCallback(
    (id: CueId, { loop = false, volume = 1 }: { loop?: boolean; volume?: number } = {}) => {
      if (isMuted) return;
      if (activeCuesRef.current.has(id)) return; // already playing — don't stack

      const url = assetPath(id);
      if (!url) {
        console.warn(`[AudioProvider] No asset registered for id "${id}" in assetManifest.ts`);
        return;
      }

      const audioEl = new Audio(url);
      audioEl.loop = loop;
      audioEl.volume = Math.min(1, Math.max(0, volume * masterVolume));
      activeCuesRef.current.set(id, audioEl);

      const cleanup = () => activeCuesRef.current.delete(id);
      audioEl.addEventListener('ended', cleanup, { once: true });
      audioEl.addEventListener('error', cleanup, { once: true });

      audioEl.play().catch(cleanup);
    },
    [isMuted, masterVolume]
  );

  const stopCue = useCallback((id: CueId) => {
    const audioEl = activeCuesRef.current.get(id);
    if (!audioEl) return;
    audioEl.pause();
    activeCuesRef.current.delete(id);
  }, []);

  const fadeCue = useCallback((id: CueId, targetVolume: number, durationMs: number) => {
    const audioEl = activeCuesRef.current.get(id);
    if (!audioEl) return;
    const startVolume = audioEl.volume;
    const startTime = performance.now();

    function step(now: number) {
      const t = Math.min(1, (now - startTime) / durationMs);
      audioEl!.volume = startVolume + (targetVolume - startVolume) * t;
      if (t < 1) requestAnimationFrame(step);
      else if (targetVolume === 0) stopCue(id);
    }
    requestAnimationFrame(step);
  }, [stopCue]);

  useEffect(() => {
    function handleAudioCue(payload: AudioCuePayload) {
      const id = payload.track ?? payload.sfx;
      if (!id) return;

      switch (payload.action) {
        case 'play':
          // tracks loop as ambient beds, sfx play once — a reasonable
          // default given the event doesn't carry an explicit loop flag
          playCue(id, { loop: Boolean(payload.track), volume: payload.targetVolume ?? 1 });
          break;
        case 'stop':
          stopCue(id);
          break;
        case 'fadeDown':
          fadeCue(id, payload.targetVolume ?? 0, payload.duration ?? 600);
          break;
        case 'crossfade':
          // best-effort: stop whatever's playing, start the new cue
          activeCuesRef.current.forEach((_audioEl, activeId) => stopCue(activeId));
          playCue(id, { loop: Boolean(payload.track), volume: payload.targetVolume ?? 1 });
          break;
      }
    }

    eventBus.on('AUDIO_CUE', handleAudioCue);

    // Finale completion is store-driven, not bus-driven — subscribe
    // directly and watch for the transition into 'complete'.
    let prevFinaleState = useFinaleState.getState().state;
    const unsubFinale = useFinaleState.subscribe((s) => {
      if (s.state === 'complete' && prevFinaleState !== 'complete') {
        playCue('finale-theme' as TrackId, { loop: false });
      }
      prevFinaleState = s.state;
    });

    return () => {
      eventBus.off('AUDIO_CUE', handleAudioCue);
      unsubFinale();
      activeCuesRef.current.forEach((audioEl) => audioEl.pause());
      activeCuesRef.current.clear();
      audioCtxRef.current?.close().catch(() => {});
    };
  }, [playCue, stopCue, fadeCue]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      activeCuesRef.current.forEach((audioEl) => {
        audioEl.volume = next ? 0 : masterVolume;
      });
      return next;
    });
  }, [masterVolume]);

  const setMasterVolume = useCallback(
    (volume: number) => {
      const clamped = Math.min(1, Math.max(0, volume));
      setMasterVolumeState(clamped);
      if (!isMuted) {
        activeCuesRef.current.forEach((audioEl) => {
          audioEl.volume = clamped;
        });
      }
    },
    [isMuted]
  );

  return (
    <AudioProviderContext.Provider
      value={{ isUnlocked, isMuted, toggleMute, masterVolume, setMasterVolume }}
    >
      {children}
    </AudioProviderContext.Provider>
  );
}

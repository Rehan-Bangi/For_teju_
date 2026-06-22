/**
 * scenes.config.ts
 * ----------------------------------------------------------------------------
 * Central registry of all 8 scenes' scroll trigger ranges and ownership flags.
 *
 * SceneManager is the only consumer that reads this file to derive
 * `activeScene` and `chapterProgress` from `scrollProgress`. No scene
 * component should hardcode its own trigger range — it always receives
 * `chapterProgress` as a prop/store value computed against this config.
 *
 * Ranges are expressed as [start, end] in normalized scrollProgress (0-1)
 * and must be contiguous and non-overlapping, covering the full 0-1 range.
 */

import { UniverseState } from '../store/universeStore';
import type { SceneId } from './eventBus';

export interface SceneRange {
  start: number;
  end: number;
}

export interface SceneConfig {
  id: SceneId;
  /** human-readable label, used only in dev tooling / nav indicator */
  label: string;
  range: SceneRange;
  /** which UniverseState the background canvas should reflect while this scene is active */
  universeState: UniverseState;
  /** 'scene' = this scene fully owns the camera while active. 'shared' = base position fixed, parallax only. */
  cameraOwner: 'scene' | 'shared';
  /** true = this scene dispatches its own AUDIO_CUE on mount (see eventBus AUDIO_CUE event) */
  audioOwner: boolean;
  /** scenes that persist as a background layer even when not the activeScene (currently only hero) */
  persistent: boolean;
}

export const SCENES_CONFIG: SceneConfig[] = [
  {
    id: 'hero',
    label: 'Hero Universe',
    range: { start: 0.0, end: 0.12 },
    universeState: UniverseState.Lonely,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: true,
  },
  {
    id: 'beginning',
    label: 'The Beginning',
    range: { start: 0.12, end: 0.28 },
    universeState: UniverseState.Beginning,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: false,
  },
  {
    id: 'memory',
    label: 'Memory Sky',
    range: { start: 0.28, end: 0.44 },
    universeState: UniverseState.Beginning,
    cameraOwner: 'shared',
    audioOwner: true,
    persistent: false,
  },
  {
    id: 'letter',
    label: 'Love Letter',
    range: { start: 0.44, end: 0.57 },
    universeState: UniverseState.Letter,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: false,
  },
  {
    id: 'neversay',
    label: 'Things I Never Say',
    range: { start: 0.57, end: 0.67 },
    universeState: UniverseState.Letter,
    cameraOwner: 'scene',
    audioOwner: false,
    persistent: false,
  },
  {
    id: 'character',
    label: 'Interactive Characters',
    range: { start: 0.67, end: 0.78 },
    universeState: UniverseState.Love,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: false,
  },
  {
    id: 'dance',
    label: 'Dance Together Finale',
    range: { start: 0.78, end: 0.9 },
    universeState: UniverseState.Finale,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: false,
  },
  {
    id: 'anniversary',
    label: 'Anniversary Ending',
    range: { start: 0.9, end: 1.0 },
    universeState: UniverseState.Finale,
    cameraOwner: 'scene',
    audioOwner: true,
    persistent: false,
  },
];

// ----------------------------------------------------------------------------
// Lookup helpers — consumed by SceneManager every scroll tick
// ----------------------------------------------------------------------------

/** Returns the SceneConfig whose range contains the given global scrollProgress. */
export function getSceneAtProgress(scrollProgress: number): SceneConfig {
  const clamped = Math.min(1, Math.max(0, scrollProgress));
  const found = SCENES_CONFIG.find((s) => clamped >= s.range.start && clamped < s.range.end);
  // scrollProgress === 1 falls through the < end check on the last scene; fallback to last.
  return found ?? SCENES_CONFIG[SCENES_CONFIG.length - 1];
}

/** Normalizes global scrollProgress into a 0-1 chapterProgress local to the given scene. */
export function getChapterProgress(scrollProgress: number, scene: SceneConfig): number {
  const { start, end } = scene.range;
  const width = end - start;
  if (width <= 0) return 0;
  const raw = (scrollProgress - start) / width;
  return Math.min(1, Math.max(0, raw));
}

/** Convenience: scene config by id, for direct lookups outside the scroll loop. */
export function getSceneConfig(id: SceneId): SceneConfig | undefined {
  return SCENES_CONFIG.find((s) => s.id === id);
}

/** All scenes flagged as persistent — currently only the hero universe background. */
export const PERSISTENT_SCENES: SceneConfig[] = SCENES_CONFIG.filter((s) => s.persistent);

// ----------------------------------------------------------------------------
// Integrity check (dev-time only) — ranges must be contiguous and cover 0-1
// ----------------------------------------------------------------------------

if (import.meta.env?.DEV) {
  const sorted = [...SCENES_CONFIG].sort((a, b) => a.range.start - b.range.start);
  sorted.forEach((scene, i) => {
    if (i === 0 && scene.range.start !== 0) {
      // eslint-disable-next-line no-console
      console.warn(`[scenes.config] First scene "${scene.id}" does not start at 0.`);
    }
    if (i === sorted.length - 1 && scene.range.end !== 1) {
      // eslint-disable-next-line no-console
      console.warn(`[scenes.config] Last scene "${scene.id}" does not end at 1.`);
    }
    const next = sorted[i + 1];
    if (next && scene.range.end !== next.range.start) {
      // eslint-disable-next-line no-console
      console.warn(
        `[scenes.config] Gap or overlap between "${scene.id}" and "${next.id}" (${scene.range.end} != ${next.range.start}).`
      );
    }
  });
}

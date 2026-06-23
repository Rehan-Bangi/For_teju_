/**
 * src/universe/useStoryProgress.ts
 * ----------------------------------------------------------------------------
 * Was missing entirely (see SceneManager.tsx audit note #3). Self-contained
 * per-instance hook: owns its own smoothing loop and an optional scroll
 * listener. Returns the blended MoodConfig + chapter info that
 * HeroUniverseScene.tsx renders from.
 *
 * Not an eventBus bridge into storyEngine — deliberately standalone, per the
 * existing audit note explaining why SceneManager only reads its progress
 * via the onChapterChange/onProgressChange callback instead of calling this
 * hook a second time itself.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MoodConfig } from '../core/config/universe.config';
import { CHAPTERS, chapterFromProgress, type ChapterConfig } from './UniverseTimelineController';

export interface StoryProgressState {
  rawProgress: number;
  smoothProgress: number;
  chapter: ChapterConfig;
  config: MoodConfig;
  finaleIntensity: number;
}

export interface UseStoryProgressOptions {
  /** 0-1 lerp factor applied per frame toward rawProgress. */
  smoothing?: number;
  onChapterChange?: (chapter: ChapterConfig) => void;
}

export interface UseStoryProgressResult {
  state: StoryProgressState;
  setProgress: (p: number) => void;
  connectScroll: (target: HTMLElement | Window) => () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Numeric fields lerp; colour arrays/strings snap at the chapter midpoint. */
function blendMoodConfig(a: MoodConfig, b: MoodConfig, t: number): MoodConfig {
  const useEnd = t >= 0.5;
  return {
    nebula: {
      colors: useEnd ? b.nebula.colors : a.nebula.colors,
      opacity: lerp(a.nebula.opacity, b.nebula.opacity, t),
      speed: lerp(a.nebula.speed, b.nebula.speed, t),
    },
    stars: {
      count: Math.round(lerp(a.stars.count, b.stars.count, t)),
      twinkleSpeed: lerp(a.stars.twinkleSpeed, b.stars.twinkleSpeed, t),
      brightness: lerp(a.stars.brightness, b.stars.brightness, t),
    },
    particles: {
      count: Math.round(lerp(a.particles.count, b.particles.count, t)),
      speed: lerp(a.particles.speed, b.particles.speed, t),
      size: lerp(a.particles.size, b.particles.size, t),
      colors: useEnd ? b.particles.colors : a.particles.colors,
    },
    fog: {
      color: useEnd ? b.fog.color : a.fog.color,
      near: lerp(a.fog.near, b.fog.near, t),
      far: lerp(a.fog.far, b.fog.far, t),
    },
    ambient: {
      color: useEnd ? b.ambient.color : a.ambient.color,
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, t),
    },
  };
}

function buildState(rawProgress: number, smoothProgress: number): StoryProgressState {
  const { chapter, localProgress } = chapterFromProgress(smoothProgress);
  const config = blendMoodConfig(chapter.configStart, chapter.configEnd, localProgress);
  const finaleIntensity = chapter.id === 'finale' ? localProgress : 0;

  return { rawProgress, smoothProgress, chapter, config, finaleIntensity };
}

export function useStoryProgress(options: UseStoryProgressOptions = {}): UseStoryProgressResult {
  const { smoothing = 0.08, onChapterChange } = options;

  const rawRef = useRef(0);
  const smoothRef = useRef(0);
  const lastChapterIdRef = useRef(CHAPTERS[0]!.id);
  const rafRef = useRef<number>();

  const [state, setState] = useState<StoryProgressState>(() => buildState(0, 0));

  useEffect(() => {
    const tick = () => {
      smoothRef.current = lerp(smoothRef.current, rawRef.current, smoothing);
      const next = buildState(rawRef.current, smoothRef.current);

      if (next.chapter.id !== lastChapterIdRef.current) {
        lastChapterIdRef.current = next.chapter.id;
        onChapterChange?.(next.chapter);
      }

      setState(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [smoothing, onChapterChange]);

  const setProgress = useCallback((p: number) => {
    rawRef.current = Math.min(1, Math.max(0, p));
  }, []);

  const connectScroll = useCallback((target: HTMLElement | Window) => {
    const computeFromWindowScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };

    const computeFromElementScroll = (el: HTMLElement) => {
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
    };

    const handler =
      target === window
        ? computeFromWindowScroll
        : () => computeFromElementScroll(target as HTMLElement);

    target.addEventListener('scroll', handler, { passive: true });
    handler();

    return () => target.removeEventListener('scroll', handler);
  }, [setProgress]);

  return { state, setProgress, connectScroll };
}

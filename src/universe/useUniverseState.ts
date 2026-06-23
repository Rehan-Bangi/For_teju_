import { useState, useEffect, useRef, useCallback } from 'react';
import { UniverseMood, MOOD_CONFIGS, MoodConfig, TRANSITION_DURATION } from '../core/config/universe.config';

interface UniverseState {
  mood: UniverseMood;
  config: MoodConfig;
  transitioning: boolean;
  progress: number;
  previousConfig: MoodConfig | null;
  elapsed: number;
}

interface UseUniverseStateReturn {
  state: UniverseState;
  setMood: (mood: UniverseMood) => void;
  lerpedConfig: MoodConfig;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(colorA: string, colorB: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = parse(colorA);
  const b = parse(colorB);
  const r = Math.round(lerp(a[0], b[0], t));
  const g = Math.round(lerp(a[1], b[1], t));
  const bl = Math.round(lerp(a[2], b[2], t));
  return `#${((r << 16) | (g << 8) | bl).toString(16).padStart(6, '0')}`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpConfig(a: MoodConfig, b: MoodConfig, t: number): MoodConfig {
  const et = easeInOutCubic(t);
  const maxNebulaColors = Math.max(a.nebula.colors.length, b.nebula.colors.length);
  const nebulaColors = Array.from({ length: maxNebulaColors }, (_, i) => {
    const ca = a.nebula.colors[i % a.nebula.colors.length]!;
    const cb = b.nebula.colors[i % b.nebula.colors.length]!;
    return lerpColor(ca, cb, et);
  });
  const maxParticleColors = Math.max(a.particles.colors.length, b.particles.colors.length);
  const particleColors = Array.from({ length: maxParticleColors }, (_, i) => {
    const ca = a.particles.colors[i % a.particles.colors.length]!;
    const cb = b.particles.colors[i % b.particles.colors.length]!;
    return lerpColor(ca, cb, et);
  });

  return {
    nebula: {
      colors: nebulaColors,
      opacity: lerp(a.nebula.opacity, b.nebula.opacity, et),
      speed: lerp(a.nebula.speed, b.nebula.speed, et),
    },
    stars: {
      count: Math.round(lerp(a.stars.count, b.stars.count, et)),
      twinkleSpeed: lerp(a.stars.twinkleSpeed, b.stars.twinkleSpeed, et),
      brightness: lerp(a.stars.brightness, b.stars.brightness, et),
    },
    particles: {
      count: Math.round(lerp(a.particles.count, b.particles.count, et)),
      speed: lerp(a.particles.speed, b.particles.speed, et),
      size: lerp(a.particles.size, b.particles.size, et),
      colors: particleColors,
    },
    fog: {
      color: lerpColor(a.fog.color, b.fog.color, et),
      near: lerp(a.fog.near, b.fog.near, et),
      far: lerp(a.fog.far, b.fog.far, et),
    },
    ambient: {
      color: lerpColor(a.ambient.color, b.ambient.color, et),
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, et),
    },
  };
}

export function useUniverseState(initialMood: UniverseMood = 'romantic'): UseUniverseStateReturn {
  const [state, setState] = useState<UniverseState>({
    mood: initialMood,
    config: MOOD_CONFIGS[initialMood],
    transitioning: false,
    progress: 1,
    previousConfig: null,
    elapsed: 0,
  });

  const transitionRef = useRef<{
    startTime: number;
    from: MoodConfig;
    to: MoodConfig;
    active: boolean;
  } | null>(null);

  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (!transitionRef.current?.active) return;

    const now = performance.now();
    const elapsed = (now - transitionRef.current.startTime) / 1000;
    const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

    setState(prev => ({
      ...prev,
      progress,
      transitioning: progress < 1,
      elapsed: now,
    }));

    if (progress < 1) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      if (transitionRef.current) {
        transitionRef.current.active = false;
      }
    }
  }, []);

  const setMood = useCallback((mood: UniverseMood) => {
    setState(prev => {
      if (prev.mood === mood) return prev;

      const currentConfig = prev.transitioning && transitionRef.current
        ? lerpConfig(transitionRef.current.from, transitionRef.current.to, easeInOutCubic(prev.progress))
        : prev.config;

      transitionRef.current = {
        startTime: performance.now(),
        from: currentConfig,
        to: MOOD_CONFIGS[mood],
        active: true,
      };

      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);

      return {
        mood,
        config: MOOD_CONFIGS[mood],
        transitioning: true,
        progress: 0,
        previousConfig: currentConfig,
        elapsed: performance.now(),
      };
    });
  }, [tick]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const lerpedConfig: MoodConfig = (() => {
    if (!state.transitioning || !state.previousConfig || !transitionRef.current?.active) {
      return state.config;
    }
    return lerpConfig(state.previousConfig, state.config, state.progress);
  })();

  return { state, setMood, lerpedConfig };
}

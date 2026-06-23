import { useRef, useState, useCallback, useEffect } from 'react';
import { MoodConfig, MOOD_CONFIGS } from '../core/config/universe.config';

// ─── Progress keyframes ───────────────────────────────────────────────────────

export interface ProgressKeyframe {
  progress: number;   // 0.0 – 1.0
  config: MoodConfig;
  label: string;
}

export const STORY_KEYFRAMES: ProgressKeyframe[] = [
  { progress: 0.00, config: MOOD_CONFIGS.calm,      label: 'Calm Beginning'     },
  { progress: 0.25, config: MOOD_CONFIGS.nostalgic,  label: 'Nostalgic Discovery' },
  { progress: 0.50, config: MOOD_CONFIGS.romantic,   label: 'Romantic Connection' },
  { progress: 0.75, config: MOOD_CONFIGS.magical,    label: 'Magical Destiny'    },
  {
    progress: 1.00,
    label: 'Finale',
    config: {
      nebula:    { colors: ['#0a0520', '#1a0845', '#2d0f6e', '#4a1a9b', '#6b2fd4'], opacity: 1.0, speed: 0.001 },
      stars:     { count: 5000, twinkleSpeed: 1.8, brightness: 1.0 },
      particles: { count: 200, speed: 0.35, size: 0.07, colors: ['#e0c5ff', '#ffd4f7', '#c5f0ff', '#ffe8b0', '#b0ffdf'] },
      fog:       { color: '#020008', near: 4, far: 28 },
      ambient:   { color: '#4a1a9b', intensity: 0.8 },
    },
  },
];

// ─── Math helpers ─────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpHex(hexA: string, hexB: string, t: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  };
  const [ar, ag, ab] = parse(hexA);
  const [br, bg, bb] = parse(hexB);
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const b = Math.round(lerp(ab, bb, t));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function interpolateConfigs(a: MoodConfig, b: MoodConfig, rawT: number): MoodConfig {
  const t = easeInOutQuart(Math.max(0, Math.min(1, rawT)));

  const maxNC = Math.max(a.nebula.colors.length, b.nebula.colors.length);
  const nebulaColors = Array.from({ length: maxNC }, (_, i) =>
    lerpHex(
      a.nebula.colors[i % a.nebula.colors.length]!,
      b.nebula.colors[i % b.nebula.colors.length]!,
      t,
    ),
  );

  const maxPC = Math.max(a.particles.colors.length, b.particles.colors.length);
  const particleColors = Array.from({ length: maxPC }, (_, i) =>
    lerpHex(
      a.particles.colors[i % a.particles.colors.length]!,
      b.particles.colors[i % b.particles.colors.length]!,
      t,
    ),
  );

  return {
    nebula: {
      colors:  nebulaColors,
      opacity: lerp(a.nebula.opacity, b.nebula.opacity, t),
      speed:   lerp(a.nebula.speed,   b.nebula.speed,   t),
    },
    stars: {
      count:        Math.round(lerp(a.stars.count,        b.stars.count,        t)),
      twinkleSpeed: lerp(a.stars.twinkleSpeed, b.stars.twinkleSpeed, t),
      brightness:   lerp(a.stars.brightness,   b.stars.brightness,   t),
    },
    particles: {
      count:  Math.round(lerp(a.particles.count, b.particles.count, t)),
      speed:  lerp(a.particles.speed, b.particles.speed, t),
      size:   lerp(a.particles.size,  b.particles.size,  t),
      colors: particleColors,
    },
    fog: {
      color: lerpHex(a.fog.color, b.fog.color, t),
      near:  lerp(a.fog.near,  b.fog.near,  t),
      far:   lerp(a.fog.far,   b.fog.far,   t),
    },
    ambient: {
      color:     lerpHex(a.ambient.color, b.ambient.color, t),
      intensity: lerp(a.ambient.intensity, b.ambient.intensity, t),
    },
  };
}

// ─── Config from raw progress ─────────────────────────────────────────────────

export function configFromProgress(progress: number): MoodConfig {
  const p = Math.max(0, Math.min(1, progress));
  const frames = STORY_KEYFRAMES;

  if (p <= frames[0]!.progress) return frames[0]!.config;
  if (p >= frames[frames.length - 1]!.progress) return frames[frames.length - 1]!.config;

  for (let i = 0; i < frames.length - 1; i++) {
    const lo = frames[i]!;
    const hi = frames[i + 1]!;
    if (p >= lo.progress && p <= hi.progress) {
      const span = hi.progress - lo.progress;
      const local = span === 0 ? 0 : (p - lo.progress) / span;
      return interpolateConfigs(lo.config, hi.config, local);
    }
  }

  return frames[frames.length - 1]!.config;
}

export function labelFromProgress(progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  const frames = STORY_KEYFRAMES;
  let closest = frames[0]!;
  let minDist = Math.abs(p - frames[0]!.progress);
  for (const f of frames) {
    const d = Math.abs(p - f.progress);
    if (d < minDist) { minDist = d; closest = f; }
  }
  return closest.label;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UniverseProgressState {
  rawProgress: number;        // 0.0 – 1.0 as set externally
  smoothProgress: number;     // smoothed value used for rendering
  config: MoodConfig;         // fully interpolated config
  label: string;
}

interface UseUniverseProgressOptions {
  /** Smoothing factor: 0 = instant, 1 = never arrives. Default 0.04 */
  smoothing?: number;
  /** Driven externally via setProgress(); set false to use scroll auto-driver */
  manual?: boolean;
}

interface UseUniverseProgressReturn {
  state: UniverseProgressState;
  /** Set progress (0.0 – 1.0) from scroll or story controller */
  setProgress: (p: number) => void;
  /** Connect to a scroll container — returns cleanup fn */
  connectScroll: (el: HTMLElement | Window) => () => void;
}

export function useUniverseProgress(
  options: UseUniverseProgressOptions = {},
): UseUniverseProgressReturn {
  const { smoothing = 0.04 } = options;

  const targetRef     = useRef(0);
  const smoothRef     = useRef(0);
  const rafRef        = useRef<number>(0);
  const smoothingRef  = useRef(smoothing);
  smoothingRef.current = smoothing;

  const [state, setState] = useState<UniverseProgressState>(() => ({
    rawProgress:    0,
    smoothProgress: 0,
    config:         configFromProgress(0),
    label:          labelFromProgress(0),
  }));

  const tick = useCallback(() => {
    const target  = targetRef.current;
    const current = smoothRef.current;
    const diff    = target - current;

    if (Math.abs(diff) < 0.0001) {
      smoothRef.current = target;
      setState(prev =>
        prev.smoothProgress === target ? prev : {
          rawProgress:    targetRef.current,
          smoothProgress: target,
          config:         configFromProgress(target),
          label:          labelFromProgress(target),
        },
      );
      return;
    }

    const next = current + diff * smoothingRef.current;
    smoothRef.current = next;

    setState({
      rawProgress:    targetRef.current,
      smoothProgress: next,
      config:         configFromProgress(next),
      label:          labelFromProgress(next),
    });

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const setProgress = useCallback((p: number) => {
    targetRef.current = Math.max(0, Math.min(1, p));
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const connectScroll = useCallback((el: HTMLElement | Window): (() => void) => {
    const getProgress = () => {
      if (el instanceof Window) {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        return docHeight > 0 ? scrollTop / docHeight : 0;
      }
      const { scrollTop, scrollHeight, clientHeight } = el as HTMLElement;
      const scrollable = scrollHeight - clientHeight;
      return scrollable > 0 ? scrollTop / scrollable : 0;
    };

    const onScroll = () => setProgress(getProgress());
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [setProgress]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  return { state, setProgress, connectScroll };
}

// ─── Camera intensity derived from progress ───────────────────────────────────

export function cameraIntensityFromProgress(progress: number): {
  parallaxStrength: number;
  driftSpeed: number;
  fovOffset: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  return {
    parallaxStrength: lerp(0.3, 0.7, p),
    driftSpeed:       lerp(0.002, 0.006, p),
    fovOffset:        lerp(0, -4, p),        // FOV tightens slightly as story climaxes
  };
}

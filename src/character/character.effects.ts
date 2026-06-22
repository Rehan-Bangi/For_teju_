/**
 * character.effects.ts
 *
 * Optional, reusable visual effect primitives for the character system.
 * These are plain functions/configs returning Framer-Motion-compatible
 * animation props — no JSX here, so any character component can opt in
 * without coupling to a specific render tree.
 *
 * All effects:
 *  - are opt-in (caller decides whether to apply them)
 *  - degrade gracefully under prefers-reduced-motion
 *  - are tuned for mobile (small particle counts, transform/opacity only,
 *    no layout-affecting properties, capped durations)
 */

import { CharacterState } from "../character";

export interface EffectRuntimeContext {
  /** Pass the result of useReducedMotion() / matchMedia check. */
  reducedMotion: boolean;
  /** Pass true on small/low-power viewports to further cap particle count. */
  isMobile?: boolean;
}

// ---------------------------------------------------------------------------
// Particle effect
// ---------------------------------------------------------------------------

export interface ParticleSpec {
  id: number;
  angle: number;
  delaySec: number;
  distance: number;
}

export interface ParticleEffectOptions {
  /** Desired particle count on a full-power desktop context. */
  baseCount?: number;
  distance?: number;
  durationSec?: number;
}

const DEFAULT_PARTICLE_OPTIONS: Required<ParticleEffectOptions> = {
  baseCount: 6,
  distance: 40,
  durationSec: 2.4,
};

/**
 * Returns the particle layout to render, already adjusted for
 * reduced-motion (returns an empty array) and mobile (halved count,
 * capped at 4) constraints. Caller is responsible for rendering each
 * spec as a small SVG/DOM node.
 */
export const getParticleEffect = (
  ctx: EffectRuntimeContext,
  options: ParticleEffectOptions = {}
): { specs: ParticleSpec[]; durationSec: number } => {
  const opts = { ...DEFAULT_PARTICLE_OPTIONS, ...options };

  if (ctx.reducedMotion) {
    return { specs: [], durationSec: 0 };
  }

  const count = ctx.isMobile
    ? Math.min(4, Math.round(opts.baseCount / 2))
    : opts.baseCount;

  const specs: ParticleSpec[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i,
    delaySec: i * 0.18,
    distance: opts.distance,
  }));

  return { specs, durationSec: opts.durationSec };
};

export const shouldShowParticlesForState = (state: CharacterState): boolean =>
  state === "emotional" || state === "celebrating" || state === "finale";

// ---------------------------------------------------------------------------
// Glow effect
// ---------------------------------------------------------------------------

export interface GlowEffectSpec {
  color: string;
  minOpacity: number;
  maxOpacity: number;
  durationSec: number;
  scale: number;
}

const STATE_GLOW_COLOR: Record<CharacterState, string> = {
  hidden: "transparent",
  observing: "#F6C9D9",
  guiding: "#F2A6C0",
  emotional: "#E98AAE",
  celebrating: "#FFC75F",
  finale: "#FFD9E8",
};

const STATE_GLOW_SCALE: Record<CharacterState, number> = {
  hidden: 1,
  observing: 1,
  guiding: 1.05,
  emotional: 1.1,
  celebrating: 1.2,
  finale: 1.3,
};

export const getGlowEffect = (
  state: CharacterState,
  ctx: EffectRuntimeContext
): GlowEffectSpec => {
  if (ctx.reducedMotion) {
    return {
      color: STATE_GLOW_COLOR[state],
      minOpacity: 0.5,
      maxOpacity: 0.5,
      durationSec: 0,
      scale: 1,
    };
  }

  return {
    color: STATE_GLOW_COLOR[state],
    minOpacity: 0.35,
    maxOpacity: 0.75,
    durationSec: ctx.isMobile ? 3.2 : 2.6,
    scale: STATE_GLOW_SCALE[state],
  };
};

// ---------------------------------------------------------------------------
// Celebration effect (milestone completion burst)
// ---------------------------------------------------------------------------

export interface CelebrationEffectSpec {
  enabled: boolean;
  burstCount: number;
  durationSec: number;
  spreadPx: number;
}

export const getCelebrationEffect = (
  ctx: EffectRuntimeContext
): CelebrationEffectSpec => {
  if (ctx.reducedMotion) {
    return { enabled: false, burstCount: 0, durationSec: 0, spreadPx: 0 };
  }

  return {
    enabled: true,
    burstCount: ctx.isMobile ? 5 : 10,
    durationSec: 1.4,
    spreadPx: ctx.isMobile ? 60 : 100,
  };
};

// ---------------------------------------------------------------------------
// Float / breathe (idle ambient motion) — exposed here for reuse by any
// new character-adjacent component without duplicating tuning values.
// ---------------------------------------------------------------------------

export interface AmbientMotionSpec {
  floatDistance: number;
  floatDurationSec: number;
  breatheScaleMin: number;
  breatheScaleMax: number;
  breatheDurationSec: number;
}

export const getAmbientMotion = (ctx: EffectRuntimeContext): AmbientMotionSpec => {
  if (ctx.reducedMotion) {
    return {
      floatDistance: 0,
      floatDurationSec: 0,
      breatheScaleMin: 1,
      breatheScaleMax: 1,
      breatheDurationSec: 0,
    };
  }

  return {
    floatDistance: ctx.isMobile ? 6 : 10,
    floatDurationSec: 4.5,
    breatheScaleMin: 0.97,
    breatheScaleMax: 1.03,
    breatheDurationSec: 3.2,
  };
};

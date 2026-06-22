/**
 * finale.effects.ts
 *
 * Optional, reusable visual effect primitives for the finale system.
 * Plain functions/configs only — no JSX — so FinaleSequence (or any
 * future finale-adjacent component) can opt into these without
 * duplicating tuning logic.
 *
 * All effects:
 *  - are opt-in
 *  - degrade gracefully under prefers-reduced-motion
 *  - are mobile-optimized (capped particle/fragment counts, transform +
 *    opacity only, single blur layer max)
 */

import { FinaleStage, MemoryFragment } from "../finale";

export interface FinaleEffectRuntimeContext {
  reducedMotion: boolean;
  isMobile?: boolean;
}

// ---------------------------------------------------------------------------
// World slowdown effect
// ---------------------------------------------------------------------------

export interface SlowdownEffectSpec {
  vignetteOpacity: number;
  rampMs: number;
  pulseDurationSec: number;
}

export const getSlowdownEffect = (
  ctx: FinaleEffectRuntimeContext
): SlowdownEffectSpec => {
  if (ctx.reducedMotion) {
    return { vignetteOpacity: 0.55, rampMs: 250, pulseDurationSec: 0 };
  }

  return {
    vignetteOpacity: 0.55,
    rampMs: ctx.isMobile ? 1400 : 1800,
    pulseDurationSec: 2.4,
  };
};

// ---------------------------------------------------------------------------
// Memory convergence effect
// ---------------------------------------------------------------------------

export interface ConvergenceFragmentSpec extends MemoryFragment {
  startX: number;
  startY: number;
  delaySec: number;
}

export interface ConvergenceEffectOptions {
  travelDistance?: number;
  staggerMs?: number;
}

const DEFAULT_CONVERGENCE_OPTIONS: Required<ConvergenceEffectOptions> = {
  travelDistance: 220,
  staggerMs: 220,
};

/**
 * Lays out memory fragments radially around a center point so they can
 * animate inward ("converge"). Caps fragment count on mobile to keep
 * the scene at 60fps, and removes stagger/travel entirely under
 * reduced motion (fragments simply fade in place).
 */
export const getConvergenceEffect = (
  fragments: MemoryFragment[],
  ctx: FinaleEffectRuntimeContext,
  options: ConvergenceEffectOptions = {}
): { specs: ConvergenceFragmentSpec[]; durationSec: number } => {
  const opts = { ...DEFAULT_CONVERGENCE_OPTIONS, ...options };

  const cappedFragments = ctx.isMobile
    ? fragments.slice(0, Math.min(fragments.length, 8))
    : fragments;

  if (ctx.reducedMotion) {
    const specs = cappedFragments.map((f) => ({
      ...f,
      startX: 0,
      startY: 0,
      delaySec: 0,
    }));
    return { specs, durationSec: 0.3 };
  }

  const count = Math.max(cappedFragments.length, 1);
  const specs = cappedFragments.map((f, i) => {
    const angle = (360 / count) * i;
    return {
      ...f,
      startX: Math.cos((angle * Math.PI) / 180) * opts.travelDistance,
      startY: Math.sin((angle * Math.PI) / 180) * opts.travelDistance,
      delaySec: (i * opts.staggerMs) / 1000,
    };
  });

  return { specs, durationSec: ctx.isMobile ? 1.1 : 1.4 };
};

// ---------------------------------------------------------------------------
// Character-enter spotlight effect
// ---------------------------------------------------------------------------

export interface SpotlightEffectSpec {
  scaleFrom: number;
  scaleTo: number;
  durationSec: number;
  radiusPx: number;
}

export const getCharacterEnterEffect = (
  ctx: FinaleEffectRuntimeContext
): SpotlightEffectSpec => {
  if (ctx.reducedMotion) {
    return { scaleFrom: 1, scaleTo: 1, durationSec: 0.2, radiusPx: 160 };
  }

  return {
    scaleFrom: 0.6,
    scaleTo: 1,
    durationSec: ctx.isMobile ? 0.8 : 1.1,
    radiusPx: ctx.isMobile ? 120 : 160,
  };
};

// ---------------------------------------------------------------------------
// Forever screen ambient effect (starfield-style glow pulse)
// ---------------------------------------------------------------------------

export interface ForeverAmbientSpec {
  starCount: number;
  pulseDurationSec: number;
}

export const getForeverAmbientEffect = (
  ctx: FinaleEffectRuntimeContext
): ForeverAmbientSpec => {
  if (ctx.reducedMotion) {
    return { starCount: 0, pulseDurationSec: 0 };
  }

  return {
    starCount: ctx.isMobile ? 16 : 36,
    pulseDurationSec: 3.4,
  };
};

// ---------------------------------------------------------------------------
// Stage -> effect dispatch helper
// ---------------------------------------------------------------------------

export const isCinematicStage = (stage: FinaleStage): boolean =>
  stage !== "idle";

export const stageUsesBlurLayer = (stage: FinaleStage): boolean =>
  stage === "slowdown" || stage === "characterEnter";

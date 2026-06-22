/**
 * finale.config.ts
 *
 * Central configuration for the FOR TEJU ❤️ finale system.
 * Mirrors the conventions established in D1's character.config.ts.
 *
 * EDITING THIS FILE:
 * FINALE_CONTENT.loveMessage is where Rehan's real, personal closing
 * message to Teju goes (Stage 4: Love message reveal). The placeholder
 * below follows the correct structure (title + paragraphs + signature)
 * but should be replaced with the real words before launch.
 */

// ---------------------------------------------------------------------------
// Finale states
// ---------------------------------------------------------------------------

export type FinaleState =
  | "locked"
  | "available"
  | "starting"
  | "revealing"
  | "complete";

export const FINALE_STATES: readonly FinaleState[] = [
  "locked",
  "available",
  "starting",
  "revealing",
  "complete",
];

// ---------------------------------------------------------------------------
// Finale stages (the 6-beat sequence within "revealing")
// ---------------------------------------------------------------------------

export type FinaleStage =
  | "idle" // before startFinale() is called
  | "slowdown" // Stage 1
  | "characterEnter" // Stage 2
  | "memoriesConverge" // Stage 3
  | "loveReveal" // Stage 4
  | "emotionalMoment" // Stage 5
  | "forever"; // Stage 6

export const FINALE_STAGE_ORDER: readonly FinaleStage[] = [
  "idle",
  "slowdown",
  "characterEnter",
  "memoriesConverge",
  "loveReveal",
  "emotionalMoment",
  "forever",
];

export const STAGE_LABELS: Record<FinaleStage, string> = {
  idle: "Idle",
  slowdown: "The universe slows down",
  characterEnter: "Your companion arrives",
  memoriesConverge: "Memories converge",
  loveReveal: "The message",
  emotionalMoment: "The moment",
  forever: "Forever",
};

// ---------------------------------------------------------------------------
// Unlock requirements
// ---------------------------------------------------------------------------

export interface FinaleUnlockRequirements {
  storyComplete: boolean;
  memoriesUnlocked: number;
  totalMemories: number;
  milestonesCompleted: number;
  totalMilestones: number;
}

export const isFinaleUnlocked = (req: FinaleUnlockRequirements): boolean =>
  req.storyComplete &&
  req.memoriesUnlocked >= req.totalMemories &&
  req.milestonesCompleted >= req.totalMilestones;

export const unlockProgress = (req: FinaleUnlockRequirements): number => {
  const storyWeight = req.storyComplete ? 1 : 0;
  const memoryRatio =
    req.totalMemories > 0 ? req.memoriesUnlocked / req.totalMemories : 1;
  const milestoneRatio =
    req.totalMilestones > 0
      ? req.milestonesCompleted / req.totalMilestones
      : 1;

  const weighted = (storyWeight + memoryRatio + milestoneRatio) / 3;
  return Math.round(Math.max(0, Math.min(1, weighted)) * 100);
};

// ---------------------------------------------------------------------------
// Timings (ms) — cinematic, deliberate pacing
// ---------------------------------------------------------------------------

export const FINALE_TIMING: Record<
  Exclude<FinaleStage, "idle">,
  { minHoldMs: number; transitionMs: number }
> = {
  slowdown: { minHoldMs: 2600, transitionMs: 1200 },
  characterEnter: { minHoldMs: 2800, transitionMs: 900 },
  memoriesConverge: { minHoldMs: 4200, transitionMs: 1100 },
  loveReveal: { minHoldMs: 7000, transitionMs: 1000 },
  emotionalMoment: { minHoldMs: 5200, transitionMs: 1000 },
  forever: { minHoldMs: 0, transitionMs: 1400 },
};

export const FINALE_GLOBAL_TIMING = {
  /** Time the ambient world-slow effect takes to reach full effect. */
  worldSlowRampMs: 1800,
  /** Stagger between each converging memory fragment. */
  memoryConvergeStaggerMs: 220,
  /** How long the final "Forever" screen waits before showing actions. */
  foreverActionsDelayMs: 1600,
} as const;

// ---------------------------------------------------------------------------
// Memory convergence content contract
// ---------------------------------------------------------------------------

export interface MemoryFragment {
  id: string;
  /** Short caption shown briefly as the fragment converges. */
  caption: string;
  /** Optional image/photo URL; renders as a soft glowing fragment if present. */
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Finale content
// ---------------------------------------------------------------------------
//
// Replace the placeholder copy below with Rehan's real, final words to
// Teju. Structure (title / paragraphs / signature) should stay intact
// so FinaleReveal renders correctly; only the text needs to change.

export const FINALE_CONTENT = {
  loveMessage: {
    title: "To Teju",
    paragraphs: [
      "Every memory you just walked through was real, and every one of them led here.",
      "This is the part where I stop showing you the past, and just tell you the truth: I love you, today, more than the day this all began.",
    ],
    signature: "— Rehan",
  },
  emotionalMomentLine: "Thank you for every year. Here's to all the ones still coming.",
  foreverScreen: {
    heading: "Forever, Teju.",
    subheading: "This story never really ends. It just keeps going — with you.",
    primaryActionLabel: "Relive the journey",
    secondaryActionLabel: "Close",
  },
} as const;

// ---------------------------------------------------------------------------
// Animation tuning
// ---------------------------------------------------------------------------

export const FINALE_ANIMATION = {
  slowdown: {
    /** Global playback-rate-style scalar applied to ambient motion, 0–1. */
    targetTimeScale: 0.25,
    vignetteOpacity: 0.55,
  },
  memoryConverge: {
    fragmentTravelDistance: 220, // px, mobile-safe
    fragmentScaleFrom: 0.6,
    fragmentScaleTo: 1,
  },
  loveReveal: {
    letterRiseDistance: 24,
    blurFrom: 8,
  },
  forever: {
    starFieldDensity: 36,
    glowPulseDurationSec: 3.4,
  },
} as const;

// ---------------------------------------------------------------------------
// Reduced-motion safe durations (used when prefers-reduced-motion is set)
// ---------------------------------------------------------------------------

export const REDUCED_MOTION_TIMING = {
  transitionMs: 250,
  staggerMs: 0,
} as const;

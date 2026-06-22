/**
 * character.config.ts
 *
 * Central configuration for the FOR TEJU ❤️ character system.
 *
 * This character is a scripted narrative companion (in the spirit of a
 * game "spirit guide" or story narrator). It does NOT generate dialogue,
 * does NOT adapt to user input, and does NOT simulate a relationship.
 * Every line below is pre-written and simply selected/displayed in
 * response to fixed progression events dispatched by the story engine.
 *
 * EDITING THIS FILE:
 * The DIALOGUE_POOLS section is where Rehan should write the real,
 * personal lines for Teju. The strings below are intentionally simple
 * placeholders that follow the correct tone/length/structure for each
 * trigger type — replace their `text` values with the real copy.
 * Nothing else in this file needs to change for that.
 */

// ---------------------------------------------------------------------------
// Character states
// ---------------------------------------------------------------------------

export type CharacterState =
  | "hidden"
  | "observing"
  | "guiding"
  | "emotional"
  | "celebrating"
  | "finale";

export const CHARACTER_STATES: readonly CharacterState[] = [
  "hidden",
  "observing",
  "guiding",
  "emotional",
  "celebrating",
  "finale",
];

// ---------------------------------------------------------------------------
// Dialogue model
// ---------------------------------------------------------------------------

export type DialogueCategory =
  | "contextual"
  | "progression"
  | "milestone"
  | "memory"
  | "finale";

export interface DialogueLine {
  /** Stable unique id, used to avoid immediate repetition. */
  id: string;
  /** The pre-written line of dialogue. */
  text: string;
  /** Which character state this line should be shown under. */
  state: CharacterState;
  /** How long the line stays on screen, in ms, before auto-dismissing. */
  durationMs?: number;
}

export type DialoguePoolKey =
  | "sectionEnter"
  | "sectionExit"
  | "memoryUnlock"
  | "milestoneComplete"
  | "emotionalPeak"
  | "finaleApproach"
  | "finaleArrival";

// ---------------------------------------------------------------------------
// Timings
// ---------------------------------------------------------------------------

export const TIMING = {
  /** Default time a dialogue bubble remains visible. */
  defaultDialogueDurationMs: 4200,
  /** Minimum time the character must wait between two spoken lines. */
  minGapBetweenLinesMs: 900,
  /** How long the avatar takes to transition between states. */
  stateTransitionMs: 600,
  /** Delay before the character reacts to a freshly dispatched event. */
  reactionDelayMs: 250,
  /** How long "celebrating" state holds before settling back to "guiding". */
  celebrationHoldMs: 3200,
  /** How long "emotional" state holds before settling back to "guiding". */
  emotionalHoldMs: 5200,
} as const;

// ---------------------------------------------------------------------------
// Emotional intensity thresholds
// ---------------------------------------------------------------------------

/**
 * Emotion level is a simple 0–100 scalar maintained by the store.
 * It only moves in response to fixed, scripted events (never free text
 * input), and is used purely to pick which state/avatar treatment to show.
 */
export const EMOTION_THRESHOLDS = {
  observing: 0,
  guiding: 15,
  emotional: 55,
  celebrating: 70,
  finale: 95,
} as const;

export const EMOTION_DELTA = {
  sectionChange: 4,
  memoryUnlock: 10,
  milestoneComplete: 14,
  finaleProgression: 20,
} as const;

// ---------------------------------------------------------------------------
// Avatar / animation tuning
// ---------------------------------------------------------------------------

export const AVATAR_ANIMATION = {
  float: {
    distance: 10, // px
    durationSec: 4.5,
  },
  breathe: {
    scaleMin: 0.97,
    scaleMax: 1.03,
    durationSec: 3.2,
  },
  glow: {
    minOpacity: 0.35,
    maxOpacity: 0.75,
    durationSec: 2.6,
  },
} as const;

export const STATE_VISUALS: Record<
  CharacterState,
  { glowColor: string; haloScale: number; particles: boolean }
> = {
  hidden: { glowColor: "transparent", haloScale: 1, particles: false },
  observing: { glowColor: "#F6C9D9", haloScale: 1, particles: false },
  guiding: { glowColor: "#F2A6C0", haloScale: 1.05, particles: false },
  emotional: { glowColor: "#E98AAE", haloScale: 1.1, particles: true },
  celebrating: { glowColor: "#FFC75F", haloScale: 1.2, particles: true },
  finale: { glowColor: "#FFD9E8", haloScale: 1.3, particles: true },
};

// ---------------------------------------------------------------------------
// Dialogue pools
// ---------------------------------------------------------------------------
//
// Replace `text` values with Rehan's real, personal lines for Teju.
// Keep lines short (one breath, roughly 4–14 words) and avoid reusing the
// same line back-to-back — the engine already guards against immediate
// repeats, but a varied pool reads better regardless.

export const DIALOGUE_POOLS: Record<DialoguePoolKey, DialogueLine[]> = {
  sectionEnter: [
    { id: "sec-enter-1", text: "Come this way. There's more to see.", state: "guiding" },
    { id: "sec-enter-2", text: "I remember this part.", state: "guiding" },
    { id: "sec-enter-3", text: "Stay a moment here with me.", state: "observing" },
  ],
  sectionExit: [
    { id: "sec-exit-1", text: "Onward, when you're ready.", state: "guiding" },
    { id: "sec-exit-2", text: "Hold that feeling. We'll need it later.", state: "guiding" },
  ],
  memoryUnlock: [
    { id: "mem-1", text: "Oh — I love this one.", state: "emotional" },
    { id: "mem-2", text: "That's a good memory to carry.", state: "emotional" },
    { id: "mem-3", text: "He kept this just for you to find.", state: "emotional" },
  ],
  milestoneComplete: [
    { id: "mile-1", text: "Look how far you've come.", state: "celebrating" },
    { id: "mile-2", text: "That's one more piece in place.", state: "celebrating" },
  ],
  emotionalPeak: [
    { id: "peak-1", text: "It's okay to feel this fully.", state: "emotional" },
    { id: "peak-2", text: "Some moments deserve to be felt slowly.", state: "emotional" },
  ],
  finaleApproach: [
    { id: "fin-app-1", text: "We're almost there now.", state: "guiding" },
    { id: "fin-app-2", text: "This is the part he's been waiting for.", state: "guiding" },
  ],
  finaleArrival: [
    { id: "fin-arr-1", text: "This is for you, Teju.", state: "finale" },
    { id: "fin-arr-2", text: "Everything led here.", state: "finale" },
  ],
};

// ---------------------------------------------------------------------------
// Story / progression event contract
// ---------------------------------------------------------------------------

export type StoryEventType =
  | "SECTION_ENTER"
  | "SECTION_EXIT"
  | "MEMORY_UNLOCK"
  | "MILESTONE_COMPLETE"
  | "EMOTIONAL_PEAK"
  | "FINALE_APPROACH"
  | "FINALE_ARRIVAL";

export interface StoryEvent {
  type: StoryEventType;
  /** Optional id of the section/memory/milestone that triggered this event. */
  refId?: string;
  /** Optional explicit emotion delta override for this specific event. */
  emotionDeltaOverride?: number;
}

export const EVENT_TO_POOL: Record<StoryEventType, DialoguePoolKey> = {
  SECTION_ENTER: "sectionEnter",
  SECTION_EXIT: "sectionExit",
  MEMORY_UNLOCK: "memoryUnlock",
  MILESTONE_COMPLETE: "milestoneComplete",
  EMOTIONAL_PEAK: "emotionalPeak",
  FINALE_APPROACH: "finaleApproach",
  FINALE_ARRIVAL: "finaleArrival",
};

export const EVENT_TO_EMOTION_DELTA: Record<StoryEventType, number> = {
  SECTION_ENTER: EMOTION_DELTA.sectionChange,
  SECTION_EXIT: 0,
  MEMORY_UNLOCK: EMOTION_DELTA.memoryUnlock,
  MILESTONE_COMPLETE: EMOTION_DELTA.milestoneComplete,
  EMOTIONAL_PEAK: EMOTION_DELTA.memoryUnlock,
  FINALE_APPROACH: EMOTION_DELTA.finaleProgression,
  FINALE_ARRIVAL: EMOTION_DELTA.finaleProgression,
};

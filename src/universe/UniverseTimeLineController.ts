import { MoodConfig, MOOD_CONFIGS } from '../core/config/universe.config';

// ─── Chapter definitions ──────────────────────────────────────────────────────

export type ChapterId =
  | 'meeting'
  | 'friendship'
  | 'falling_in_love'
  | 'distance'
  | 'destiny'
  | 'finale';

export interface ChapterConfig {
  id: ChapterId;
  index: number;
  label: string;
  subtitle: string;
  /** Normalised progress range [0,1] this chapter occupies */
  progressStart: number;
  progressEnd: number;
  /** Visual config at the start of this chapter */
  configStart: MoodConfig;
  /** Visual config at the end of this chapter (blends into next) */
  configEnd: MoodConfig;
  /** Accent colour for any UI that surfaces this chapter */
  accent: string;
}

export interface ChapterEvent {
  type: 'enter' | 'exit' | 'midpoint' | 'progress';
  chapterId: ChapterId;
  chapterIndex: number;
  localProgress: number;   // 0→1 within the chapter
  globalProgress: number;  // 0→1 across all chapters
}

export type ChapterEventCallback = (event: ChapterEvent) => void;

// ─── Finale config (beyond magical) ──────────────────────────────────────────

const FINALE_CONFIG: MoodConfig = {
  nebula: {
    colors: ['#0a0520', '#1a0845', '#2d0f6e', '#4a1a9b', '#6b2fd4'],
    opacity: 1.0,
    speed: 0.001,
  },
  stars: { count: 5000, twinkleSpeed: 1.8, brightness: 1.0 },
  particles: {
    count: 200,
    speed: 0.35,
    size: 0.07,
    colors: ['#e0c5ff', '#ffd4f7', '#c5f0ff', '#ffe8b0', '#b0ffdf'],
  },
  fog:     { color: '#020008', near: 4, far: 28 },
  ambient: { color: '#4a1a9b', intensity: 0.8 },
};

// Distance chapter — more subdued, separation feel
const DISTANCE_CONFIG: MoodConfig = {
  nebula: {
    colors: ['#08101e', '#0a1830', '#0c2040', '#0f2850'],
    opacity: 0.55,
    speed: 0.00025,
  },
  stars: { count: 2000, twinkleSpeed: 0.5, brightness: 0.55 },
  particles: {
    count: 60,
    speed: 0.08,
    size: 0.035,
    colors: ['#4a7faa', '#6096bb', '#80b0cc'],
  },
  fog:     { color: '#030810', near: 9, far: 45 },
  ambient: { color: '#0f2850', intensity: 0.3 },
};

// ─── Chapter table ────────────────────────────────────────────────────────────

export const CHAPTERS: ChapterConfig[] = [
  {
    id: 'meeting',
    index: 0,
    label: 'Meeting',
    subtitle: 'The first hello',
    progressStart: 0.000,
    progressEnd:   0.167,
    configStart:   MOOD_CONFIGS.calm,
    configEnd:     MOOD_CONFIGS.calm,
    accent: '#7eb8f7',
  },
  {
    id: 'friendship',
    index: 1,
    label: 'Friendship',
    subtitle: 'Growing together',
    progressStart: 0.167,
    progressEnd:   0.333,
    configStart:   MOOD_CONFIGS.calm,
    configEnd:     MOOD_CONFIGS.nostalgic,
    accent: '#f7d97e',
  },
  {
    id: 'falling_in_love',
    index: 2,
    label: 'Falling in Love',
    subtitle: 'The heart knows',
    progressStart: 0.333,
    progressEnd:   0.500,
    configStart:   MOOD_CONFIGS.nostalgic,
    configEnd:     MOOD_CONFIGS.romantic,
    accent: '#f77eb8',
  },
  {
    id: 'distance',
    index: 3,
    label: 'Distance',
    subtitle: 'Miles apart, hearts together',
    progressStart: 0.500,
    progressEnd:   0.667,
    configStart:   DISTANCE_CONFIG,
    configEnd:     MOOD_CONFIGS.romantic,
    accent: '#7eb8f7',
  },
  {
    id: 'destiny',
    index: 4,
    label: 'Destiny',
    subtitle: 'Written in the stars',
    progressStart: 0.667,
    progressEnd:   0.833,
    configStart:   MOOD_CONFIGS.romantic,
    configEnd:     MOOD_CONFIGS.magical,
    accent: '#b87ef7',
  },
  {
    id: 'finale',
    index: 5,
    label: 'Finale',
    subtitle: 'Forever',
    progressStart: 0.833,
    progressEnd:   1.000,
    configStart:   MOOD_CONFIGS.magical,
    configEnd:     FINALE_CONFIG,
    accent: '#e0c5ff',
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function chapterFromProgress(progress: number): {
  chapter: ChapterConfig;
  localProgress: number;
} {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i]!;
    if (p >= ch.progressStart && (p < ch.progressEnd || i === CHAPTERS.length - 1)) {
      const span = ch.progressEnd - ch.progressStart;
      const local = span > 0 ? (p - ch.progressStart) / span : 0;
      return { chapter: ch, localProgress: Math.min(1, local) };
    }
  }
  const last = CHAPTERS[CHAPTERS.length - 1]!;
  return { chapter: last, localProgress: 1 };
}

export function chapterById(id: ChapterId): ChapterConfig {
  return CHAPTERS.find(c => c.id === id) ?? CHAPTERS[0]!;
}

export function progressForChapter(id: ChapterId, localT = 0): number {
  const ch = chapterById(id);
  const span = ch.progressEnd - ch.progressStart;
  return ch.progressStart + span * Math.max(0, Math.min(1, localT));
}

// ─── Timeline controller class ────────────────────────────────────────────────

export class UniverseTimelineController {
  private listeners = new Set<ChapterEventCallback>();
  private lastChapterIndex = -1;
  private lastMidpointFired = new Set<number>();

  /** Process a new raw progress value. Fires events on chapter boundaries. */
  update(globalProgress: number): void {
    const p = Math.max(0, Math.min(1, globalProgress));
    const { chapter, localProgress } = chapterFromProgress(p);

    // Chapter enter
    if (chapter.index !== this.lastChapterIndex) {
      if (this.lastChapterIndex >= 0) {
        this.emit({
          type: 'exit',
          chapterId: CHAPTERS[this.lastChapterIndex]!.id,
          chapterIndex: this.lastChapterIndex,
          localProgress: 1,
          globalProgress: p,
        });
      }
      this.emit({
        type: 'enter',
        chapterId: chapter.id,
        chapterIndex: chapter.index,
        localProgress: 0,
        globalProgress: p,
      });
      this.lastChapterIndex = chapter.index;
    }

    // Midpoint (once per chapter)
    if (localProgress >= 0.5 && !this.lastMidpointFired.has(chapter.index)) {
      this.lastMidpointFired.add(chapter.index);
      this.emit({
        type: 'midpoint',
        chapterId: chapter.id,
        chapterIndex: chapter.index,
        localProgress,
        globalProgress: p,
      });
    } else if (localProgress < 0.5 && this.lastMidpointFired.has(chapter.index)) {
      // Scrolling back — allow re-fire
      this.lastMidpointFired.delete(chapter.index);
    }

    // Continuous progress event
    this.emit({
      type: 'progress',
      chapterId: chapter.id,
      chapterIndex: chapter.index,
      localProgress,
      globalProgress: p,
    });
  }

  on(callback: ChapterEventCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: ChapterEvent): void {
    this.listeners.forEach(l => l(event));
  }

  /** Reset state (e.g. when user navigates back to top) */
  reset(): void {
    this.lastChapterIndex = -1;
    this.lastMidpointFired.clear();
  }

  /** Singleton */
  static instance: UniverseTimelineController | null = null;
  static getInstance(): UniverseTimelineController {
    if (!UniverseTimelineController.instance) {
      UniverseTimelineController.instance = new UniverseTimelineController();
    }
    return UniverseTimelineController.instance;
  }
}

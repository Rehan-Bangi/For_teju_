import { EmotionTag, EmotionalStageId } from './memory.types';

export interface EmotionalArcPoint {
  memoryId: string;
  date: string;
  intensity: number; // 0-1
  emotion: EmotionTag;
}

export interface EmotionalArc {
  points: EmotionalArcPoint[];
  averageIntensity: number;
  dominantEmotion: EmotionTag;
  trend: 'rising' | 'falling' | 'steady' | 'volatile';
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  subtitle?: string;
  stage: EmotionalStageId;
  memoryIds: string[];
  dateRange: { start: string; end: string };
  emotionalArc: EmotionalArc;
  summary: string;
  isUnlocked: boolean;
}

export interface NarrativeConnection {
  fromMemoryId: string;
  toMemoryId: string;
  relationship: 'continues' | 'echoes' | 'contrasts' | 'fulfills' | 'foreshadows';
  strength: number; // 0-1
}

export interface StoryArcSummary {
  totalChapters: number;
  currentStage: EmotionalStageId;
  overallTrend: EmotionalArc['trend'];
  highestIntensityMemoryId?: string;
}

export interface Story {
  chapters: Chapter[];
  connections: NarrativeConnection[];
  arcSummary: StoryArcSummary;
  generatedAt: string;
}

export interface StoryBuildOptions {
  minMemoriesPerChapter?: number;
  maxMemoriesPerChapter?: number;
  chapterTitles?: Partial<Record<EmotionalStageId, string>>;
}

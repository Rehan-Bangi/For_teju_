export type MemoryType =
  | 'photo'
  | 'message'
  | 'milestone'
  | 'location'
  | 'gift'
  | 'voice'
  | 'custom';

export type EmotionTag =
  | 'joy'
  | 'longing'
  | 'comfort'
  | 'excitement'
  | 'nostalgia'
  | 'tenderness'
  | 'gratitude'
  | 'passion'
  | 'peace'
  | 'bittersweet';

export type ImportanceLevel = 1 | 2 | 3 | 4 | 5;

export type EmotionalStageId =
  | 'first_meeting'
  | 'friendship'
  | 'falling_in_love'
  | 'commitment'
  | 'anniversary';

export interface StoryContribution {
  chapterHint?: string;
  arcWeight: number; // 0-1, influence on emotional arc
  narrativeRole:
    | 'opening'
    | 'rising'
    | 'turning-point'
    | 'climax'
    | 'resolution'
    | 'connective';
  connectsTo?: string[]; // memory ids this memory narratively links to
}

export interface MemoryMedia {
  type: 'image' | 'audio' | 'video' | 'text';
  url?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  transcript?: string;
}

export interface MemoryUnlockRule {
  mode: 'always' | 'sequential' | 'date' | 'milestone' | 'emotionalProgression';
  unlockDate?: string; // ISO date, for 'date'
  requiresMemoryId?: string; // for 'sequential'
  requiredMilestoneId?: string; // for 'milestone'
  requiredStage?: EmotionalStageId; // for 'emotionalProgression'
}

export interface BaseMemory {
  id: string;
  type: MemoryType;
  title: string;
  description: string;
  date: string; // ISO 8601
  emotion: EmotionTag;
  importance: ImportanceLevel;
  tags: string[];
  storyContribution: StoryContribution;
  media?: MemoryMedia[];
  location?: { name: string; lat?: number; lng?: number };
  unlock?: MemoryUnlockRule;
  createdAt: string;
  updatedAt: string;
}

export interface PhotoMemory extends BaseMemory {
  type: 'photo';
  media: MemoryMedia[];
}

export interface MessageMemory extends BaseMemory {
  type: 'message';
  messageText: string;
  sender?: string;
}

export interface MilestoneMemory extends BaseMemory {
  type: 'milestone';
  milestoneId: string;
}

export interface LocationMemory extends BaseMemory {
  type: 'location';
  location: { name: string; lat?: number; lng?: number };
}

export interface GiftMemory extends BaseMemory {
  type: 'gift';
  giftName: string;
  occasion?: string;
}

export interface VoiceMemory extends BaseMemory {
  type: 'voice';
  media: MemoryMedia[];
}

export interface CustomMemory extends BaseMemory {
  type: 'custom';
  customFields?: Record<string, unknown>;
}

export type Memory =
  | PhotoMemory
  | MessageMemory
  | MilestoneMemory
  | LocationMemory
  | GiftMemory
  | VoiceMemory
  | CustomMemory;

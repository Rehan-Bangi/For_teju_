import { Memory, EmotionTag, EmotionalStageId } from './memory.types';
import { Chapter, Story } from './story.types';
import { EmotionalState } from './emotionalProgression';
import { RelationshipStats } from './relationshipStatsEngine';
import { LetterSection, PersonalizationContext } from './loveLetterEngine';

export interface PersonProfile {
  fullName: string;
  preferredName: string;
  nicknames: string[];
  birthday?: string; // ISO date
}

export interface ImportantDate {
  id: string;
  label: string;
  date: string; // ISO date
  recurring: boolean;
  category: 'birthday' | 'anniversary' | 'milestone' | 'custom';
  notes?: string;
}

export interface RelationshipSymbol {
  id: string;
  label: string;
  meaning: string;
  iconHint?: string; // e.g. 'flower', 'song', 'place', 'color'
}

export interface EmotionalMotif {
  id: string;
  label: string;
  description: string;
  associatedEmotions: EmotionTag[];
  recurrenceTags: string[]; // memory tags that signal this motif
}

export interface FutureDream {
  id: string;
  label: string;
  description: string;
  targetDate?: string;
  category: 'travel' | 'milestone' | 'shared-goal' | 'custom';
}

export interface StorySettings {
  toneDefault: 'warm' | 'playful' | 'reflective' | 'romantic';
  allowSurpriseReveals: boolean;
  defaultDateFormat: string; // e.g. 'long', 'short'
  timezone?: string;
}

export interface CoupleMetadata {
  partnerA: PersonProfile;
  partnerB: PersonProfile;
  relationshipStartDate: string;
  coupleNickname?: string;
  importantDates: ImportantDate[];
  relationshipSymbols: RelationshipSymbol[];
  emotionalMotifs: EmotionalMotif[];
  futureDreams: FutureDream[];
  settings: StorySettings;
}

export type VisualMood =
  | 'soft-pastel'
  | 'warm-golden'
  | 'cool-twilight'
  | 'vibrant-bloom'
  | 'deep-romantic'
  | 'celebratory';

export type NarrativeStyle =
  | 'gentle-recollection'
  | 'playful-banter'
  | 'slow-burn-reflection'
  | 'tender-confession'
  | 'steady-devotion'
  | 'joyful-celebration';

export type MemorySelectionStrategy =
  | 'chronological-all'
  | 'high-importance-only'
  | 'emotion-matched'
  | 'tag-matched'
  | 'cluster-representative';

// Content-layer chapter identifiers. Distinct from EmotionalStageId (engine-level)
// because the narrative layer supports more chapters than emotional stages.
export type ContentChapterId =
  | 'first_meeting'
  | 'friendship'
  | 'getting_closer'
  | 'falling_in_love'
  | 'choosing_each_other'
  | 'anniversary'
  | 'forever';

export interface ChapterContentDefinition {
  id: ContentChapterId;
  mappedStage: EmotionalStageId; // links this content chapter to an engine emotional stage
  order: number;
  title: string;
  subtitle: string;
  intro: string;
  outro: string;
  emotionalPurpose: string;
  visualMood: VisualMood;
  narrativeStyle: NarrativeStyle;
  memorySelectionStrategy: MemorySelectionStrategy;
  selectionTags?: string[];
  minImportanceThreshold?: number;
}

export type LetterTemplateId =
  | 'anniversary'
  | 'thank-you'
  | 'memory-reflection'
  | 'future-letter'
  | 'forever-letter';

export interface LetterTemplateContext {
  personalization: PersonalizationContext;
  memories: Memory[];
  emotionalState?: EmotionalState;
  stats?: RelationshipStats;
  chapterSummaries?: Chapter[];
  story?: Story;
}

export type LetterTemplateFn = (context: LetterTemplateContext) => LetterSection[];

export interface LetterTemplateDefinition {
  id: LetterTemplateId;
  label: string;
  description: string;
  generate: LetterTemplateFn;
}

export type AnniversaryFrequency = 'monthly' | 'yearly' | 'milestone';

export type MemoryHighlightStrategy =
  | 'most-important'
  | 'random-from-period'
  | 'first-of-period'
  | 'chapter-highlight'
  | 'emotion-matched';

export interface SpecialRevealHook {
  id: string;
  description: string;
  triggerType: 'hidden-memory' | 'secret-memory' | 'chain' | 'surprise-pool';
  referenceId?: string; // links to a config id in the anniversary unlock engine
}

export interface AnniversaryContentDefinition {
  id: string;
  frequency: AnniversaryFrequency;
  label: string;
  emotionalTheme: EmotionTag;
  unlockMessage: (context: LetterTemplateContext) => string;
  celebrationMessage: (context: LetterTemplateContext) => string;
  memoryHighlightStrategy: MemoryHighlightStrategy;
  specialRevealHooks: SpecialRevealHook[];
}

export interface StoryContentConfig {
  couple: CoupleMetadata;
  chapters: ChapterContentDefinition[];
  letterTemplates: LetterTemplateDefinition[];
  anniversaries: AnniversaryContentDefinition[];
}

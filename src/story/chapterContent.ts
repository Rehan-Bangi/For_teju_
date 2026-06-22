import { ChapterContentDefinition } from './contentTypes';

// Structural chapter definitions only. Intro/outro copy is intentionally
// generic and frame-level — it describes the *role* each chapter plays,
// not specific events. Real memories are plugged in later via the
// memory selection strategy and feed the actual narrative content.
export const CHAPTER_CONTENT: ChapterContentDefinition[] = [
  {
    id: 'first_meeting',
    mappedStage: 'first_meeting',
    order: 0,
    title: 'First Meeting',
    subtitle: 'Where two paths crossed',
    intro:
      'Every story has a beginning — a moment before either of you knew what was coming. This chapter holds that moment, and the small, ordinary details that quietly became the start of something else.',
    outro:
      'Neither of you could have known yet what this would grow into. But it had already begun.',
    emotionalPurpose: 'Establish the spark of first contact and the curiosity that followed it.',
    visualMood: 'soft-pastel',
    narrativeStyle: 'gentle-recollection',
    memorySelectionStrategy: 'chronological-all',
    minImportanceThreshold: 1,
  },
  {
    id: 'friendship',
    mappedStage: 'friendship',
    order: 1,
    title: 'Friendship',
    subtitle: 'Learning each other',
    intro:
      'Before love had a name, there was ease — conversations that lasted longer than planned, inside jokes that needed no explanation, and the quiet comfort of being known.',
    outro:
      'Somewhere in all those ordinary days, the foundation was being built without either of you noticing.',
    emotionalPurpose: 'Show the trust and familiarity that formed the base of everything after.',
    visualMood: 'warm-golden',
    narrativeStyle: 'playful-banter',
    memorySelectionStrategy: 'chronological-all',
    minImportanceThreshold: 1,
  },
  {
    id: 'getting_closer',
    mappedStage: 'friendship',
    order: 2,
    title: 'Getting Closer',
    subtitle: 'When the distance started closing',
    intro:
      'Something shifted. The conversations grew longer, the silences grew softer, and small moments started to mean a little more than they used to.',
    outro:
      'It was becoming harder to call it just friendship — and easier to admit it was turning into something more.',
    emotionalPurpose: 'Capture the in-between stage where feelings deepen before being named.',
    visualMood: 'cool-twilight',
    narrativeStyle: 'slow-burn-reflection',
    memorySelectionStrategy: 'emotion-matched',
    selectionTags: ['closeness', 'turning-point'],
    minImportanceThreshold: 3,
  },
  {
    id: 'falling_in_love',
    mappedStage: 'falling_in_love',
    order: 3,
    title: 'Falling In Love',
    subtitle: 'When it became undeniable',
    intro:
      'There comes a point where pretending stops working — where what you feel is too big to keep calling something smaller. This is that chapter.',
    outro: 'From here, there was no version of the story that did not include each other.',
    emotionalPurpose: 'Mark the emotional turning point where love is acknowledged.',
    visualMood: 'deep-romantic',
    narrativeStyle: 'tender-confession',
    memorySelectionStrategy: 'high-importance-only',
    minImportanceThreshold: 4,
  },
  {
    id: 'choosing_each_other',
    mappedStage: 'commitment',
    order: 4,
    title: 'Choosing Each Other',
    subtitle: 'A decision made on purpose',
    intro:
      'Falling in love is something that happens to you. Choosing each other is something you do, again and again, on purpose.',
    outro: 'This was no longer a feeling you were swept into — it was a choice you both kept making.',
    emotionalPurpose: 'Highlight commitment as an active, ongoing decision rather than a passive feeling.',
    visualMood: 'warm-golden',
    narrativeStyle: 'steady-devotion',
    memorySelectionStrategy: 'high-importance-only',
    minImportanceThreshold: 4,
  },
  {
    id: 'anniversary',
    mappedStage: 'anniversary',
    order: 5,
    title: 'Anniversary',
    subtitle: 'Marking the time you have built together',
    intro:
      'Every year adds another layer — proof that what started small has lasted, grown, and kept showing up.',
    outro: 'Another year held safely in the story, with more still being written.',
    emotionalPurpose: 'Celebrate continuity and growth over time.',
    visualMood: 'celebratory',
    narrativeStyle: 'joyful-celebration',
    memorySelectionStrategy: 'cluster-representative',
    minImportanceThreshold: 3,
  },
  {
    id: 'forever',
    mappedStage: 'anniversary',
    order: 6,
    title: 'Forever',
    subtitle: 'Where the story keeps going',
    intro:
      'This is not an ending — it is the part of the story that is still being lived, day by day, choice by choice.',
    outro: 'And so the story continues, one memory at a time.',
    emotionalPurpose: 'Open the story toward the future rather than closing it.',
    visualMood: 'deep-romantic',
    narrativeStyle: 'steady-devotion',
    memorySelectionStrategy: 'tag-matched',
    selectionTags: ['future', 'dream'],
    minImportanceThreshold: 1,
  },
];

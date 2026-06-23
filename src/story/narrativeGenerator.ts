import { Memory } from './memory.types';
import { Chapter, Story } from './story.types';
import { EmotionalState } from './emotionalProgression';
import { RelationshipStats } from './relationshipStatsEngine';

interface PhraseBank {
  [emotion: string]: string[];
}

const EMOTION_CONNECTORS: PhraseBank = {
  joy: ['filled with laughter', 'bright with happiness', 'lit up by joy'],
  longing: [
    'quietly aching with distance',
    'carrying a soft longing',
    'marked by missing each other',
  ],
  comfort: ['settled and at ease', 'wrapped in comfort', 'steady and safe'],
  excitement: [
    'buzzing with anticipation',
    'electric with excitement',
    'full of nervous energy',
  ],
  nostalgia: [
    'tinged with nostalgia',
    'looking fondly backward',
    'soft around the edges with memory',
  ],
  tenderness: [
    'gentle and tender',
    'soft-spoken and close',
    'careful and warm',
  ],
  gratitude: [
    'quietly grateful',
    'thankful in small ways',
    'full of appreciation',
  ],
  passion: ['charged with intensity', 'burning bright', 'unmistakably passionate'],
  peace: ['calm and unhurried', 'simply peaceful', 'still and content'],
  bittersweet: [
    'bittersweet at its core',
    'happy and heavy at once',
    'tinged with both joy and ache',
  ],
};

function pick<T>(arr: T[], seed: string): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return arr[hash % arr.length]!;
}

export class NarrativeGenerator {
  generateMemoryNarrative(memory: Memory): string {
    const bank = EMOTION_CONNECTORS[memory.emotion] ?? ['memorable'];
    const connector = pick(bank, memory.id);
    const dateLabel = new Date(memory.date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return `On ${dateLabel}, "${memory.title}" happened — a moment ${connector}. ${memory.description}`;
  }

  generateChapterNarrative(chapter: Chapter, memories: Memory[]): string {
    const chapterMemories = memories.filter((m) =>
      chapter.memoryIds.includes(m.id)
    );
    const sorted = [...chapterMemories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const sentences = sorted.map((m) => this.generateMemoryNarrative(m));
    const intro = `${chapter.title}: ${chapter.summary}`;
    return [intro, ...sentences].join(' ');
  }

  generateEmotionalSummary(state: EmotionalState): string {
    const bank = EMOTION_CONNECTORS[state.dominantEmotion] ?? ['meaningful'];
    const connector = pick(bank, state.currentStage);
    const progressPct = Math.round(state.overallProgress * 100);
    return `Right now, the story sits in "${state.stageLabel}" — ${connector}, ${progressPct}% through the journey so far.`;
  }

  generateRelationshipSummary(stats: RelationshipStats, story: Story): string {
    const years = Math.floor(stats.relationshipDurationDays / 365.25);
    const months = Math.floor((stats.relationshipDurationDays % 365.25) / 30.44);
    const durationLabel =
      years > 0
        ? `${years} year${years === 1 ? '' : 's'} and ${months} month${
            months === 1 ? '' : 's'
          }`
        : `${months} month${months === 1 ? '' : 's'}`;

    const topMemory = stats.mostImportantMemories[0];
    const topMemoryLine = topMemory
      ? ` One memory stands above the rest: "${topMemory.title}."`
      : '';

    const chapterLine = stats.strongestEmotionalChapter
      ? ` The most intense chapter so far has been "${stats.strongestEmotionalChapter.stage.replace(
          /_/g,
          ' '
        )}."`
      : '';

    return `${durationLabel} together, told through ${stats.totalMemories} memories across ${story.chapters.length} chapters.${topMemoryLine}${chapterLine}`;
  }

  generateFullNarrative(story: Story, memories: Memory[]): string {
    return [...story.chapters]
      .sort((a, b) => a.index - b.index)
      .map((chapter) => this.generateChapterNarrative(chapter, memories))
      .join('\n\n');
  }
}

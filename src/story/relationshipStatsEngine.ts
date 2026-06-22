import { Memory, MemoryType } from './memory.types';
import { EmotionalProgressionEngine, EMOTIONAL_STAGES } from './emotionalProgression';

export interface MemoryGap {
  fromMemoryId: string;
  toMemoryId: string;
  fromDate: string;
  toDate: string;
  gapDays: number;
}

export interface RelationshipStats {
  totalMemories: number;
  memoriesByType: Record<MemoryType, number>;
  memoriesByEmotion: Record<string, number>;
  strongestEmotionalChapter: { stage: string; averageIntensity: number } | null;
  relationshipDurationDays: number;
  memoryDensityPerMonth: number;
  longestMemoryGap: MemoryGap | null;
  mostImportantMemories: Memory[];
}

const ALL_TYPES: MemoryType[] = [
  'photo',
  'message',
  'milestone',
  'location',
  'gift',
  'voice',
  'custom',
];

export class RelationshipStatsEngine {
  private emotionalEngine = new EmotionalProgressionEngine();

  constructor(private relationshipStartDate: string) {}

  countByType(memories: Memory[]): Record<MemoryType, number> {
    const counts = ALL_TYPES.reduce(
      (acc, t) => ({ ...acc, [t]: 0 }),
      {} as Record<MemoryType, number>
    );
    memories.forEach((m) => {
      counts[m.type] += 1;
    });
    return counts;
  }

  countByEmotion(memories: Memory[]): Record<string, number> {
    const counts: Record<string, number> = {};
    memories.forEach((m) => {
      counts[m.emotion] = (counts[m.emotion] ?? 0) + 1;
    });
    return counts;
  }

  strongestEmotionalChapter(
    memories: Memory[]
  ): { stage: string; averageIntensity: number } | null {
    const classified = this.emotionalEngine.classifyMemories(memories);
    let best: { stage: string; averageIntensity: number } | null = null;

    EMOTIONAL_STAGES.forEach((stage) => {
      const stageMemories = classified.get(stage.id) ?? [];
      if (stageMemories.length === 0) return;
      const avg =
        stageMemories.reduce((sum, m) => sum + m.importance / 5, 0) /
        stageMemories.length;
      if (!best || avg > best.averageIntensity) {
        best = { stage: stage.id, averageIntensity: avg };
      }
    });

    return best;
  }

  relationshipDurationDays(): number {
    const start = new Date(this.relationshipStartDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
  }

  memoryDensityPerMonth(memories: Memory[]): number {
    const days = this.relationshipDurationDays();
    const months = Math.max(1, days / 30.44);
    return memories.length / months;
  }

  longestMemoryGap(memories: Memory[]): MemoryGap | null {
    if (memories.length < 2) return null;
    const sorted = [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    let longest: MemoryGap | null = null;

    for (let i = 0; i < sorted.length - 1; i++) {
      const from = sorted[i];
      const to = sorted[i + 1];
      const gapDays = Math.floor(
        (new Date(to.date).getTime() - new Date(from.date).getTime()) / 86400000
      );
      if (!longest || gapDays > longest.gapDays) {
        longest = {
          fromMemoryId: from.id,
          toMemoryId: to.id,
          fromDate: from.date,
          toDate: to.date,
          gapDays,
        };
      }
    }

    return longest;
  }

  mostImportantMemories(memories: Memory[], limit = 10): Memory[] {
    return [...memories]
      .sort(
        (a, b) =>
          b.importance - a.importance ||
          new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, limit);
  }

  computeAll(memories: Memory[]): RelationshipStats {
    return {
      totalMemories: memories.length,
      memoriesByType: this.countByType(memories),
      memoriesByEmotion: this.countByEmotion(memories),
      strongestEmotionalChapter: this.strongestEmotionalChapter(memories),
      relationshipDurationDays: this.relationshipDurationDays(),
      memoryDensityPerMonth: this.memoryDensityPerMonth(memories),
      longestMemoryGap: this.longestMemoryGap(memories),
      mostImportantMemories: this.mostImportantMemories(memories),
    };
  }
}

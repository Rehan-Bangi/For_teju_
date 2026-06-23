import { Memory, EmotionTag } from './memory.types';
import {
  Chapter,
  EmotionalArc,
  EmotionalArcPoint,
  NarrativeConnection,
  Story,
  StoryArcSummary,
  StoryBuildOptions,
} from './story.types';
import { EmotionalProgressionEngine, EMOTIONAL_STAGES } from './emotionalProgression';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_CHAPTER_TITLES: Record<string, string> = {
  first_meeting: 'Where It All Began',
  friendship: 'Becoming Friends',
  falling_in_love: 'Falling',
  commitment: 'Choosing Each Other',
  anniversary: 'Every Year With You',
};

export class StoryEngine {
  private emotionalEngine = new EmotionalProgressionEngine();

  private buildArc(memories: Memory[]): EmotionalArc {
    const sorted = [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const points: EmotionalArcPoint[] = sorted.map((m) => ({
      memoryId: m.id,
      date: m.date,
      intensity: m.importance / 5,
      emotion: m.emotion,
    }));

    const averageIntensity = points.length
      ? points.reduce((sum, p) => sum + p.intensity, 0) / points.length
      : 0;

    const emotionCounts: Record<string, number> = {};
    points.forEach((p) => {
      emotionCounts[p.emotion] = (emotionCounts[p.emotion] ?? 0) + 1;
    });
    const dominantEmotion = (Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? 'joy') as EmotionTag;

    let trend: EmotionalArc['trend'] = 'steady';
    if (points.length >= 2) {
      const first = points[0]!.intensity;
      const last = points[points.length - 1]!.intensity;
      const variance =
        points.reduce((sum, p) => sum + Math.abs(p.intensity - averageIntensity), 0) /
        points.length;
      if (variance > 0.3) trend = 'volatile';
      else if (last - first > 0.15) trend = 'rising';
      else if (first - last > 0.15) trend = 'falling';
    }

    return { points, averageIntensity, dominantEmotion, trend };
  }

  private buildConnections(memories: Memory[]): NarrativeConnection[] {
    const connections: NarrativeConnection[] = [];
    const byId = new Map(memories.map((m) => [m.id, m]));

    memories.forEach((m) => {
      (m.storyContribution.connectsTo ?? []).forEach((targetId) => {
        if (!byId.has(targetId)) return;
        connections.push({
          fromMemoryId: m.id,
          toMemoryId: targetId,
          relationship: 'continues',
          strength: m.storyContribution.arcWeight,
        });
      });
    });

    const sorted = [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      const alreadyLinked = connections.some(
        (c) => c.fromMemoryId === a.id && c.toMemoryId === b.id
      );
      if (!alreadyLinked && a.emotion === b.emotion) {
        connections.push({
          fromMemoryId: a.id,
          toMemoryId: b.id,
          relationship: 'echoes',
          strength: 0.4,
        });
      }
    }

    return connections;
  }

  buildChapters(memories: Memory[], options: StoryBuildOptions = {}): Chapter[] {
    const classified = this.emotionalEngine.classifyMemories(memories);
    const titles = { ...DEFAULT_CHAPTER_TITLES, ...options.chapterTitles };
    const chapters: Chapter[] = [];

    EMOTIONAL_STAGES.forEach((stage, index) => {
      const stageMemories = classified.get(stage.id) ?? [];
      if (stageMemories.length === 0) return;

      const sorted = [...stageMemories].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const arc = this.buildArc(sorted);

      chapters.push({
        id: generateId('chapter'),
        index,
        title: titles[stage.id] ?? stage.label,
        subtitle: `${sorted.length} memories of ${stage.label.toLowerCase()}`,
        stage: stage.id,
        memoryIds: sorted.map((m) => m.id),
        dateRange: { start: sorted[0]!.date, end: sorted[sorted.length - 1]!.date },
        emotionalArc: arc,
        summary: this.generateChapterSummary(sorted, stage.label),
        isUnlocked: sorted.every((m) => (m.unlock?.mode ?? 'always') === 'always'),
      });
    });

    return chapters;
  }

  private generateChapterSummary(memories: Memory[], stageLabel: string): string {
    const highlights = memories
      .filter((m) => m.importance >= 4)
      .slice(0, 3)
      .map((m) => m.title);

    if (highlights.length === 0) {
      return `A quiet chapter of ${stageLabel.toLowerCase()}, told through ${memories.length} small moments.`;
    }
    return `${stageLabel} unfolded through moments like ${highlights.join(', ')}.`;
  }

  buildStory(memories: Memory[], options: StoryBuildOptions = {}): Story {
    const chapters = this.buildChapters(memories, options);
    const connections = this.buildConnections(memories);

    const allPoints = chapters.flatMap((c) => c.emotionalArc.points);
    const highest = [...allPoints].sort((a, b) => b.intensity - a.intensity)[0];

    const arcSummary: StoryArcSummary = {
      totalChapters: chapters.length,
      currentStage: chapters[chapters.length - 1]?.stage ?? 'first_meeting',
      overallTrend: chapters[chapters.length - 1]?.emotionalArc.trend ?? 'steady',
      highestIntensityMemoryId: highest?.memoryId,
    };

    return {
      chapters,
      connections,
      arcSummary,
      generatedAt: new Date().toISOString(),
    };
  }

  addMemoryAndRebuild(
    existingMemories: Memory[],
    newMemory: Memory,
    options?: StoryBuildOptions
  ): Story {
    return this.buildStory([...existingMemories, newMemory], options);
  }
}

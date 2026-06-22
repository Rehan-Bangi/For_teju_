import { Memory, EmotionalStageId, EmotionTag } from './memory.types';

export interface StageDefinition {
  id: EmotionalStageId;
  label: string;
  order: number;
  color: string;
  dominantEmotions: EmotionTag[];
}

export const EMOTIONAL_STAGES: StageDefinition[] = [
  {
    id: 'first_meeting',
    label: 'First Meeting',
    order: 0,
    color: '#FFD8A8',
    dominantEmotions: ['excitement', 'joy'],
  },
  {
    id: 'friendship',
    label: 'Friendship',
    order: 1,
    color: '#A8E6CF',
    dominantEmotions: ['comfort', 'joy', 'peace'],
  },
  {
    id: 'falling_in_love',
    label: 'Falling in Love',
    order: 2,
    color: '#FFAFCC',
    dominantEmotions: ['passion', 'longing', 'tenderness'],
  },
  {
    id: 'commitment',
    label: 'Commitment',
    order: 3,
    color: '#BDE0FE',
    dominantEmotions: ['gratitude', 'peace', 'tenderness'],
  },
  {
    id: 'anniversary',
    label: 'Anniversary',
    order: 4,
    color: '#CDB4DB',
    dominantEmotions: ['nostalgia', 'gratitude', 'joy'],
  },
];

export interface EmotionalState {
  currentStage: EmotionalStageId;
  stageLabel: string;
  stageColor: string;
  progressWithinStage: number; // 0-1
  overallProgress: number; // 0-1 across all stages
  intensity: number; // 0-1, based on recent memory importance
  dominantEmotion: EmotionTag;
  nextStage?: EmotionalStageId;
}

function inferStageFromMemory(memory: Memory): EmotionalStageId | undefined {
  if (memory.unlock?.requiredStage) return memory.unlock.requiredStage;
  if (memory.tags.includes('first_meeting')) return 'first_meeting';
  if (memory.tags.includes('friendship')) return 'friendship';
  if (memory.tags.includes('falling_in_love')) return 'falling_in_love';
  if (memory.tags.includes('commitment')) return 'commitment';
  if (memory.tags.includes('anniversary')) return 'anniversary';
  return undefined;
}

export class EmotionalProgressionEngine {
  private stages = EMOTIONAL_STAGES;

  classifyMemories(memories: Memory[]): Map<EmotionalStageId, Memory[]> {
    const map = new Map<EmotionalStageId, Memory[]>(
      this.stages.map((s) => [s.id, [] as Memory[]])
    );
    const sorted = [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningStageIndex = 0;
    sorted.forEach((memory) => {
      const inferred = inferStageFromMemory(memory);
      if (inferred) {
        runningStageIndex = Math.max(
          runningStageIndex,
          this.stages.findIndex((s) => s.id === inferred)
        );
      }
      const stage = this.stages[runningStageIndex];
      map.get(stage.id)!.push(memory);
    });

    return map;
  }

  getCurrentState(memories: Memory[]): EmotionalState {
    const classified = this.classifyMemories(memories);
    let currentStageIndex = 0;

    this.stages.forEach((stage, i) => {
      if ((classified.get(stage.id)?.length ?? 0) > 0) {
        currentStageIndex = i;
      }
    });

    const currentStage = this.stages[currentStageIndex];
    const stageMemories = classified.get(currentStage.id) ?? [];
    const recent = stageMemories.slice(-5);
    const avgImportance = recent.length
      ? recent.reduce((sum, m) => sum + m.importance, 0) / recent.length / 5
      : 0;

    const emotionCounts: Record<string, number> = {};
    stageMemories.forEach((m) => {
      emotionCounts[m.emotion] = (emotionCounts[m.emotion] ?? 0) + 1;
    });
    const dominantEmotion = (Object.entries(emotionCounts).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] ?? currentStage.dominantEmotions[0]) as EmotionTag;

    const totalMemoriesAcrossStages = memories.length || 1;
    const memoriesUpToStage = this.stages
      .slice(0, currentStageIndex + 1)
      .reduce((sum, s) => sum + (classified.get(s.id)?.length ?? 0), 0);

    return {
      currentStage: currentStage.id,
      stageLabel: currentStage.label,
      stageColor: currentStage.color,
      progressWithinStage: Math.min(1, stageMemories.length / 8),
      overallProgress: Math.min(1, memoriesUpToStage / totalMemoriesAcrossStages),
      intensity: avgImportance,
      dominantEmotion,
      nextStage: this.stages[currentStageIndex + 1]?.id,
    };
  }

  getStageDefinition(stage: EmotionalStageId): StageDefinition | undefined {
    return this.stages.find((s) => s.id === stage);
  }

  getAllStages(): StageDefinition[] {
    return this.stages;
  }
}

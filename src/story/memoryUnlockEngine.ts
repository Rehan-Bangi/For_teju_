import { Memory, MemoryUnlockRule, EmotionalStageId } from './memory.types';
import { EmotionalProgressionEngine } from './emotionalProgression';

export interface UnlockContext {
  currentDate?: Date;
  unlockedMemoryIds: Set<string>;
  milestonesReached: Set<string>;
  currentStage: EmotionalStageId;
  allMemories: Memory[];
}

export interface UnlockResult {
  memoryId: string;
  unlocked: boolean;
  reason: string;
}

const STAGE_ORDER: EmotionalStageId[] = [
  'first_meeting',
  'friendship',
  'falling_in_love',
  'commitment',
  'anniversary',
];

function stageIndex(stage: EmotionalStageId): number {
  return STAGE_ORDER.indexOf(stage);
}

export class MemoryUnlockEngine {
  private emotionalEngine = new EmotionalProgressionEngine();

  evaluate(memory: Memory, context: UnlockContext): UnlockResult {
    const rule: MemoryUnlockRule = memory.unlock ?? { mode: 'always' };
    const now = context.currentDate ?? new Date();

    switch (rule.mode) {
      case 'always':
        return { memoryId: memory.id, unlocked: true, reason: 'Always available' };

      case 'sequential': {
        const required = rule.requiresMemoryId;
        const unlocked = !required || context.unlockedMemoryIds.has(required);
        return {
          memoryId: memory.id,
          unlocked,
          reason: unlocked
            ? 'Previous memory unlocked'
            : `Waiting on memory ${required}`,
        };
      }

      case 'date': {
        const unlockDate = rule.unlockDate ? new Date(rule.unlockDate) : new Date(memory.date);
        const unlocked = now >= unlockDate;
        return {
          memoryId: memory.id,
          unlocked,
          reason: unlocked
            ? 'Unlock date reached'
            : `Unlocks on ${unlockDate.toISOString()}`,
        };
      }

      case 'milestone': {
        const required = rule.requiredMilestoneId;
        const unlocked = !required || context.milestonesReached.has(required);
        return {
          memoryId: memory.id,
          unlocked,
          reason: unlocked
            ? 'Milestone reached'
            : `Waiting on milestone ${required}`,
        };
      }

      case 'emotionalProgression': {
        const required = rule.requiredStage;
        const unlocked =
          !required || stageIndex(context.currentStage) >= stageIndex(required);
        return {
          memoryId: memory.id,
          unlocked,
          reason: unlocked
            ? 'Emotional stage reached'
            : `Waiting on stage ${required}`,
        };
      }

      default:
        return { memoryId: memory.id, unlocked: true, reason: 'No rule defined' };
    }
  }

  buildContext(
    memories: Memory[],
    unlockedMemoryIds: Set<string>,
    currentDate?: Date
  ): UnlockContext {
    const milestonesReached = new Set(
      memories
        .filter(
          (m) => m.type === 'milestone' && new Date(m.date) <= (currentDate ?? new Date())
        )
        .map((m) => (m.type === 'milestone' ? m.milestoneId : m.id))
    );

    const state = this.emotionalEngine.getCurrentState(memories);

    return {
      currentDate,
      unlockedMemoryIds,
      milestonesReached,
      currentStage: state.currentStage,
      allMemories: memories,
    };
  }

  evaluateAll(memories: Memory[], context: UnlockContext): UnlockResult[] {
    const results: UnlockResult[] = [];
    const sorted = [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    const localUnlocked = new Set(context.unlockedMemoryIds);

    sorted.forEach((memory) => {
      const result = this.evaluate(memory, {
        ...context,
        unlockedMemoryIds: localUnlocked,
      });
      if (result.unlocked) localUnlocked.add(memory.id);
      results.push(result);
    });

    return results;
  }

  getUnlockedMemories(memories: Memory[], context: UnlockContext): Memory[] {
    const results = this.evaluateAll(memories, context);
    const unlockedIds = new Set(
      results.filter((r) => r.unlocked).map((r) => r.memoryId)
    );
    return memories.filter((m) => unlockedIds.has(m.id));
  }
}

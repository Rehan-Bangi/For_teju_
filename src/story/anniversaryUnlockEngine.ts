import { Memory, EmotionalStageId } from './memory.types';
import { EmotionalProgressionEngine } from './emotionalProgression';

export interface AnniversaryUnlockConfig {
  memoryId: string;
  anniversaryOf: string; // ISO date the anniversary is counted from
  yearOffset: number; // unlocks on the Nth anniversary
}

export interface HiddenMemoryConfig {
  memoryId: string;
  revealCondition: 'date' | 'stage' | 'manual';
  revealDate?: string;
  revealStage?: EmotionalStageId;
}

export interface SecretMemoryConfig {
  memoryId: string;
  unlockCode: string;
  hint?: string;
}

export interface UnlockChainStep {
  memoryId: string;
  requiresPreviousViewed: boolean;
}

export interface UnlockChainConfig {
  id: string;
  label: string;
  steps: UnlockChainStep[];
}

export interface SurpriseRevealPool {
  id: string;
  memoryIds: string[];
  revealFrequencyDays: number;
}

export interface RevealResult {
  memoryId: string;
  revealed: boolean;
  reason: string;
}

const STAGE_ORDER: EmotionalStageId[] = [
  'first_meeting',
  'friendship',
  'falling_in_love',
  'commitment',
  'anniversary',
];

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function daySeed(date: Date, salt: string): number {
  const dayStr = startOfDay(date).toISOString().slice(0, 10) + salt;
  let hash = 0;
  for (let i = 0; i < dayStr.length; i++) {
    hash = (hash * 31 + dayStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export class AnniversaryUnlockEngine {
  private emotionalEngine = new EmotionalProgressionEngine();

  evaluateAnniversaryUnlock(
    config: AnniversaryUnlockConfig,
    now: Date = new Date()
  ): RevealResult {
    const anniversaryDate = new Date(config.anniversaryOf);
    const targetDate = new Date(anniversaryDate);
    targetDate.setFullYear(anniversaryDate.getFullYear() + config.yearOffset);

    const unlocked = now >= targetDate;
    return {
      memoryId: config.memoryId,
      revealed: unlocked,
      reason: unlocked
        ? `Anniversary ${config.yearOffset} reached`
        : `Unlocks on ${targetDate.toISOString().slice(0, 10)}`,
    };
  }

  evaluateHiddenMemory(
    config: HiddenMemoryConfig,
    context: {
      now?: Date;
      currentStage?: EmotionalStageId;
      manuallyRevealedIds?: Set<string>;
    }
  ): RevealResult {
    const now = context.now ?? new Date();

    if (config.revealCondition === 'date') {
      const revealDate = config.revealDate ? new Date(config.revealDate) : now;
      const revealed = now >= revealDate;
      return {
        memoryId: config.memoryId,
        revealed,
        reason: revealed
          ? 'Reveal date reached'
          : `Reveals on ${revealDate.toISOString().slice(0, 10)}`,
      };
    }

    if (config.revealCondition === 'stage') {
      const currentIndex = STAGE_ORDER.indexOf(context.currentStage ?? 'first_meeting');
      const requiredIndex = STAGE_ORDER.indexOf(config.revealStage ?? 'first_meeting');
      const revealed = currentIndex >= requiredIndex;
      return {
        memoryId: config.memoryId,
        revealed,
        reason: revealed
          ? 'Emotional stage reached'
          : `Reveals at stage ${config.revealStage}`,
      };
    }

    const revealed = context.manuallyRevealedIds?.has(config.memoryId) ?? false;
    return {
      memoryId: config.memoryId,
      revealed,
      reason: revealed ? 'Manually revealed' : 'Awaiting manual reveal',
    };
  }

  attemptSecretUnlock(
    config: SecretMemoryConfig,
    attemptedCode: string
  ): RevealResult {
    const revealed =
      attemptedCode.trim().toLowerCase() === config.unlockCode.trim().toLowerCase();
    return {
      memoryId: config.memoryId,
      revealed,
      reason: revealed ? 'Correct code entered' : 'Incorrect code',
    };
  }

  evaluateChain(
    config: UnlockChainConfig,
    viewedMemoryIds: Set<string>
  ): RevealResult[] {
    const results: RevealResult[] = [];
    let previousViewed = true;

    config.steps.forEach((step) => {
      const revealed = !step.requiresPreviousViewed || previousViewed;
      results.push({
        memoryId: step.memoryId,
        revealed,
        reason: revealed ? 'Chain step unlocked' : 'Waiting on previous step',
      });
      previousViewed = viewedMemoryIds.has(step.memoryId);
    });

    return results;
  }

  getSurpriseReveal(
    pool: SurpriseRevealPool,
    now: Date = new Date()
  ): RevealResult[] {
    if (pool.memoryIds.length === 0) return [];

    const daysSinceEpoch = Math.floor(now.getTime() / 86400000);
    const isRevealDay = daysSinceEpoch % pool.revealFrequencyDays === 0;

    if (!isRevealDay) {
      return pool.memoryIds.map((id) => ({
        memoryId: id,
        revealed: false,
        reason: 'Not a surprise reveal day',
      }));
    }

    const seed = daySeed(now, pool.id);
    const chosenIndex = seed % pool.memoryIds.length;
    const chosenId = pool.memoryIds[chosenIndex];

    return pool.memoryIds.map((id) => ({
      memoryId: id,
      revealed: id === chosenId,
      reason: id === chosenId ? "Selected as today's surprise" : 'Not selected today',
    }));
  }

  getCurrentStageForMemories(memories: Memory[]): EmotionalStageId {
    return this.emotionalEngine.getCurrentState(memories).currentStage;
  }
}

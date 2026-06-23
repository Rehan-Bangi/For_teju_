import {
  Memory,
  MemoryType,
  EmotionTag,
  ImportanceLevel,
  StoryContribution,
  MemoryUnlockRule,
} from './memory.types';

export interface CreateMemoryInput {
  type: MemoryType;
  title: string;
  description: string;
  date: string;
  emotion: EmotionTag;
  importance?: ImportanceLevel;
  tags?: string[];
  storyContribution?: Partial<StoryContribution>;
  unlock?: MemoryUnlockRule;
  [key: string]: unknown;
}

function generateId(prefix = 'mem'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function defaultStoryContribution(
  importance: ImportanceLevel
): StoryContribution {
  const arcWeight = Math.min(1, importance / 5);
  const narrativeRole: StoryContribution['narrativeRole'] =
    importance >= 5
      ? 'turning-point'
      : importance === 4
      ? 'rising'
      : importance <= 2
      ? 'connective'
      : 'rising';
  return { arcWeight, narrativeRole, connectsTo: [] };
}

export class MemoryEngine {
  private memories: Map<string, Memory> = new Map();

  add(input: CreateMemoryInput): Memory {
    const now = new Date().toISOString();
    const importance = input.importance ?? 3;
    const storyContribution: StoryContribution = {
      ...defaultStoryContribution(importance),
      ...input.storyContribution,
    };

    const memory = {
      ...input,
      id: generateId(input.type),
      type: input.type,
      title: input.title,
      description: input.description,
      date: input.date,
      emotion: input.emotion,
      importance,
      tags: input.tags ?? [],
      storyContribution,
      unlock: input.unlock ?? { mode: 'always' },
      createdAt: now,
      updatedAt: now,
    } as Memory;

    this.memories.set(memory.id, memory);
    return memory;
  }

  update(id: string, patch: Partial<Memory>): Memory | undefined {
    const existing = this.memories.get(id);
    if (!existing) return undefined;
    const updated = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    } as Memory;
    this.memories.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    return this.memories.delete(id);
  }

  get(id: string): Memory | undefined {
    return this.memories.get(id);
  }

  getAll(): Memory[] {
    return Array.from(this.memories.values());
  }

  findByType(type: MemoryType): Memory[] {
    return this.getAll().filter((m) => m.type === type);
  }

  findByEmotion(emotion: EmotionTag): Memory[] {
    return this.getAll().filter((m) => m.emotion === emotion);
  }

  findByTag(tag: string): Memory[] {
    return this.getAll().filter((m) => m.tags.includes(tag));
  }

  findByDateRange(start: string, end: string): Memory[] {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return this.getAll().filter((m) => {
      const d = new Date(m.date).getTime();
      return d >= s && d <= e;
    });
  }

  highImportance(threshold: ImportanceLevel = 4): Memory[] {
    return this.getAll().filter((m) => m.importance >= threshold);
  }

  linkMemories(fromId: string, toId: string): void {
    const from = this.memories.get(fromId);
    if (!from) return;
    const connectsTo = from.storyContribution.connectsTo ?? [];
    if (!connectsTo.includes(toId)) {
      this.update(fromId, {
        storyContribution: {
          ...from.storyContribution,
          connectsTo: [...connectsTo, toId],
        },
      } as Partial<Memory>);
    }
  }

  bulkImport(inputs: CreateMemoryInput[]): Memory[] {
    return inputs.map((input) => this.add(input));
  }

  serialize(): string {
    return JSON.stringify(this.getAll());
  }

  static deserialize(json: string): MemoryEngine {
    const engine = new MemoryEngine();
    const memories: Memory[] = JSON.parse(json);
    memories.forEach((m) => engine.memories.set(m.id, m));
    return engine;
  }
}

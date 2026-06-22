import { Memory, EmotionTag, MemoryType } from './memory.types';

export interface SearchCriteria {
  text?: string;
  tags?: string[];
  emotions?: EmotionTag[];
  types?: MemoryType[];
  dateRange?: { start: string; end: string };
  minImportance?: number;
}

export interface SearchResult {
  memory: Memory;
  score: number;
  matchedOn: string[];
}

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export class MemorySearchEngine {
  constructor(private memories: Memory[]) {}

  setMemories(memories: Memory[]): void {
    this.memories = memories;
  }

  searchByText(query: string): Memory[] {
    const q = normalize(query);
    if (!q) return [];
    return this.memories.filter(
      (m) =>
        normalize(m.title).includes(q) ||
        normalize(m.description).includes(q) ||
        m.tags.some((t) => normalize(t).includes(q))
    );
  }

  searchByTags(tags: string[]): Memory[] {
    const normTags = tags.map(normalize);
    return this.memories.filter((m) =>
      m.tags.some((t) => normTags.includes(normalize(t)))
    );
  }

  searchByEmotion(emotions: EmotionTag[]): Memory[] {
    return this.memories.filter((m) => emotions.includes(m.emotion));
  }

  searchByDateRange(start: string, end: string): Memory[] {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return this.memories.filter((m) => {
      const d = new Date(m.date).getTime();
      return d >= s && d <= e;
    });
  }

  searchByType(types: MemoryType[]): Memory[] {
    return this.memories.filter((m) => types.includes(m.type));
  }

  search(criteria: SearchCriteria): SearchResult[] {
    const results: SearchResult[] = [];
    const hasAnyCriteria = Object.keys(criteria).length > 0;
    if (!hasAnyCriteria) return results;

    this.memories.forEach((memory) => {
      const matchedOn: string[] = [];
      let score = 0;
      let disqualified = false;

      if (criteria.text) {
        const q = normalize(criteria.text);
        const titleMatch = normalize(memory.title).includes(q);
        const descMatch = normalize(memory.description).includes(q);
        const tagMatch = memory.tags.some((t) => normalize(t).includes(q));
        if (titleMatch || descMatch || tagMatch) {
          if (titleMatch) {
            score += 3;
            matchedOn.push('title');
          }
          if (descMatch) {
            score += 2;
            matchedOn.push('description');
          }
          if (tagMatch) {
            score += 1;
            matchedOn.push('tags');
          }
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && criteria.tags?.length) {
        const normTags = criteria.tags.map(normalize);
        const matches = memory.tags.filter((t) => normTags.includes(normalize(t)));
        if (matches.length > 0) {
          score += matches.length;
          matchedOn.push('tags');
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && criteria.emotions?.length) {
        if (criteria.emotions.includes(memory.emotion)) {
          score += 2;
          matchedOn.push('emotion');
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && criteria.types?.length) {
        if (criteria.types.includes(memory.type)) {
          score += 1;
          matchedOn.push('type');
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && criteria.dateRange) {
        const d = new Date(memory.date).getTime();
        const s = new Date(criteria.dateRange.start).getTime();
        const e = new Date(criteria.dateRange.end).getTime();
        if (d >= s && d <= e) {
          score += 1;
          matchedOn.push('date');
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && criteria.minImportance !== undefined) {
        if (memory.importance >= criteria.minImportance) {
          score += 1;
          matchedOn.push('importance');
        } else {
          disqualified = true;
        }
      }

      if (!disqualified && matchedOn.length > 0) {
        results.push({ memory, score, matchedOn });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }
}

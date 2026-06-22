// TODO(Rehan): Use this file to define topics, phrases, tags, or specific
// memories that should NEVER be referenced, surfaced, or generated anywhere
// in the experience (e.g. sensitive topics, past relationships, arguments,
// anything private you don't want auto-generated narratives or letters to
// touch). This list is empty by default — nothing is assumed or invented here.

export interface NeverSayRule {
  id: string;
  type: 'phrase' | 'topic' | 'tag' | 'memoryId';
  value: string; // the phrase, topic keyword, tag, or specific memory id to exclude
  reason?: string; // optional private note for why this is excluded
}

export const NEVER_SAY_RULES: NeverSayRule[] = [
  // TODO(Rehan): e.g. { id: 'ex_topic', type: 'topic', value: 'ex-relationship', reason: 'private' }
  // TODO(Rehan): e.g. { id: 'fight_1', type: 'memoryId', value: 'mem_xxxxxxx', reason: 'do not surface' }
];

export function isPhraseBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return NEVER_SAY_RULES.filter((r) => r.type === 'phrase').some((r) =>
    lower.includes(r.value.toLowerCase())
  );
}

export function isTagBlocked(tag: string): boolean {
  return NEVER_SAY_RULES.filter((r) => r.type === 'tag').some(
    (r) => r.value.toLowerCase() === tag.toLowerCase()
  );
}

export function isMemoryBlocked(memoryId: string): boolean {
  return NEVER_SAY_RULES.filter((r) => r.type === 'memoryId').some(
    (r) => r.value === memoryId
  );
}

export function filterBlockedMemories<T extends { id: string; tags: string[] }>(
  memories: T[]
): T[] {
  return memories.filter(
    (m) => !isMemoryBlocked(m.id) && !m.tags.some((t) => isTagBlocked(t))
  );
}

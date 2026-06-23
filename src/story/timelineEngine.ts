import { Memory } from './memory.types';

export interface TimelineGroup {
  label: string;
  start: string;
  end: string;
  memoryIds: string[];
}

export interface RelationshipProgression {
  startDate: string;
  daysTogether: number;
  monthsTogether: number;
  yearsTogether: number;
  nextAnniversary: string;
  daysUntilNextAnniversary: number;
  milestonesPassed: number;
}

export interface TimelineNavNode {
  memoryId: string;
  index: number;
  prevId?: string;
  nextId?: string;
  date: string;
}

export interface TimelineData {
  sortedMemoryIds: string[];
  groups: TimelineGroup[];
  navigation: TimelineNavNode[];
  progression: RelationshipProgression;
}

function diffInDays(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

export class TimelineEngine {
  constructor(private relationshipStartDate: string) {}

  sortChronologically(memories: Memory[]): Memory[] {
    return [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  groupByMonth(memories: Memory[]): TimelineGroup[] {
    const sorted = this.sortChronologically(memories);
    const groups = new Map<string, Memory[]>();

    sorted.forEach((m) => {
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        '0'
      )}`;
      const bucket = groups.get(key) ?? [];
      bucket.push(m);
      groups.set(key, bucket);
    });

    return Array.from(groups.entries()).map(([key, mems]) => {
      const dates = mems.map((m) => new Date(m.date).getTime());
      return {
        label: key,
        start: new Date(Math.min(...dates)).toISOString(),
        end: new Date(Math.max(...dates)).toISOString(),
        memoryIds: mems.map((m) => m.id),
      };
    });
  }

  groupByMilestone(memories: Memory[]): TimelineGroup[] {
    const milestones = memories.filter((m) => m.type === 'milestone');
    const sorted = this.sortChronologically(milestones);
    const groups: TimelineGroup[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const start = sorted[i]!.date;
      const end = sorted[i + 1]?.date ?? new Date().toISOString();
      const memoryIds = memories
        .filter(
          (m) =>
            new Date(m.date) >= new Date(start) &&
            new Date(m.date) < new Date(end)
        )
        .map((m) => m.id);
      groups.push({ label: sorted[i]!.title, start, end, memoryIds });
    }
    return groups;
  }

  buildNavigation(memories: Memory[]): TimelineNavNode[] {
    const sorted = this.sortChronologically(memories);
    return sorted.map((m, i) => ({
      memoryId: m.id,
      index: i,
      prevId: sorted[i - 1]?.id,
      nextId: sorted[i + 1]?.id,
      date: m.date,
    }));
  }

  calculateProgression(memories: Memory[]): RelationshipProgression {
    const now = new Date();
    const start = new Date(this.relationshipStartDate);
    const daysTogether = diffInDays(start, now);
    const monthsTogether = Math.floor(daysTogether / 30.44);
    const yearsTogether = Math.floor(daysTogether / 365.25);

    const nextAnniversary = new Date(start);
    nextAnniversary.setFullYear(now.getFullYear());
    while (nextAnniversary < now) {
      nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
    }

    const milestonesPassed = memories.filter(
      (m) => m.type === 'milestone' && new Date(m.date) <= now
    ).length;

    return {
      startDate: this.relationshipStartDate,
      daysTogether,
      monthsTogether,
      yearsTogether,
      nextAnniversary: nextAnniversary.toISOString(),
      daysUntilNextAnniversary: diffInDays(now, nextAnniversary),
      milestonesPassed,
    };
  }

  build(memories: Memory[]): TimelineData {
    const sorted = this.sortChronologically(memories);
    return {
      sortedMemoryIds: sorted.map((m) => m.id),
      groups: this.groupByMonth(memories),
      navigation: this.buildNavigation(memories),
      progression: this.calculateProgression(memories),
    };
  }
}

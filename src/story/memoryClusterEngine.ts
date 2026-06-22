import { Memory } from './memory.types';

export type ClusterCategory = 'moment' | 'event' | 'trip' | 'milestone';

export interface MemoryCluster {
  id: string;
  category: ClusterCategory;
  label: string;
  memoryIds: string[];
  dateRange: { start: string; end: string };
  centroidTags: string[];
}

export interface ClusterOptions {
  tripGapThresholdDays?: number;
  momentGapThresholdHours?: number;
  eventGapThresholdDays?: number;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86400000;
}

export class MemoryClusterEngine {
  private options: Required<ClusterOptions>;

  constructor(options: ClusterOptions = {}) {
    this.options = {
      tripGapThresholdDays: options.tripGapThresholdDays ?? 3,
      momentGapThresholdHours: options.momentGapThresholdHours ?? 6,
      eventGapThresholdDays: options.eventGapThresholdDays ?? 1,
    };
  }

  private sortByDate(memories: Memory[]): Memory[] {
    return [...memories].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private commonTags(memories: Memory[]): string[] {
    const counts: Record<string, number> = {};
    memories.forEach((m) =>
      m.tags.forEach((t) => {
        counts[t] = (counts[t] ?? 0) + 1;
      })
    );
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }

  private buildCluster(
    category: ClusterCategory,
    memories: Memory[],
    labelHint?: string
  ): MemoryCluster {
    const sorted = this.sortByDate(memories);
    return {
      id: generateId('cluster'),
      category,
      label: labelHint ?? sorted[0].title,
      memoryIds: sorted.map((m) => m.id),
      dateRange: { start: sorted[0].date, end: sorted[sorted.length - 1].date },
      centroidTags: this.commonTags(sorted),
    };
  }

  clusterMilestones(memories: Memory[]): MemoryCluster[] {
    return memories
      .filter((m) => m.type === 'milestone')
      .map((m) => this.buildCluster('milestone', [m], m.title));
  }

  clusterTrips(memories: Memory[]): MemoryCluster[] {
    const locationMemories = this.sortByDate(
      memories.filter((m) => m.type === 'location' || m.tags.includes('trip'))
    );
    const clusters: MemoryCluster[] = [];
    let current: Memory[] = [];

    locationMemories.forEach((m) => {
      if (current.length === 0) {
        current = [m];
        return;
      }
      const last = current[current.length - 1];
      if (daysBetween(last.date, m.date) <= this.options.tripGapThresholdDays) {
        current.push(m);
      } else {
        clusters.push(this.buildCluster('trip', current, this.tripLabel(current)));
        current = [m];
      }
    });
    if (current.length) {
      clusters.push(this.buildCluster('trip', current, this.tripLabel(current)));
    }

    return clusters;
  }

  private tripLabel(memories: Memory[]): string {
    const named = memories.find((m) => m.type === 'location');
    if (named && named.type === 'location') return named.location.name;
    return memories[0]?.title ?? 'Trip';
  }

  clusterEvents(memories: Memory[]): MemoryCluster[] {
    const eventMemories = this.sortByDate(
      memories.filter(
        (m) =>
          m.type !== 'milestone' &&
          m.type !== 'location' &&
          (m.tags.includes('event') || m.importance >= 4)
      )
    );
    const clusters: MemoryCluster[] = [];
    let current: Memory[] = [];

    eventMemories.forEach((m) => {
      if (current.length === 0) {
        current = [m];
        return;
      }
      const last = current[current.length - 1];
      if (daysBetween(last.date, m.date) <= this.options.eventGapThresholdDays) {
        current.push(m);
      } else {
        clusters.push(this.buildCluster('event', current));
        current = [m];
      }
    });
    if (current.length) clusters.push(this.buildCluster('event', current));

    return clusters;
  }

  clusterMoments(memories: Memory[]): MemoryCluster[] {
    const clusteredIds = new Set([
      ...this.clusterMilestones(memories).flatMap((c) => c.memoryIds),
      ...this.clusterTrips(memories).flatMap((c) => c.memoryIds),
      ...this.clusterEvents(memories).flatMap((c) => c.memoryIds),
    ]);

    const remaining = this.sortByDate(
      memories.filter((m) => !clusteredIds.has(m.id))
    );
    const clusters: MemoryCluster[] = [];
    let current: Memory[] = [];
    const thresholdMs = this.options.momentGapThresholdHours * 3600000;

    remaining.forEach((m) => {
      if (current.length === 0) {
        current = [m];
        return;
      }
      const last = current[current.length - 1];
      const gapMs = new Date(m.date).getTime() - new Date(last.date).getTime();
      if (gapMs <= thresholdMs) {
        current.push(m);
      } else {
        clusters.push(this.buildCluster('moment', current));
        current = [m];
      }
    });
    if (current.length) clusters.push(this.buildCluster('moment', current));

    return clusters;
  }

  clusterAll(memories: Memory[]): MemoryCluster[] {
    return [
      ...this.clusterMilestones(memories),
      ...this.clusterTrips(memories),
      ...this.clusterEvents(memories),
      ...this.clusterMoments(memories),
    ];
  }
}

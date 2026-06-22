import { TimelineEngine } from '../timelineEngine';

// TODO(Rehan): Replace with the real relationship start date (ISO format, e.g. '2022-03-14').
export const RELATIONSHIP_START_DATE = ''; // TODO: real date required

// TODO(Rehan): Add real important/key dates here (first meeting, anniversaries,
// proposal, etc). These are high-level reference dates, separate from individual
// memories in memories.ts.
export interface KeyDate {
  id: string;
  label: string;
  date: string; // ISO date — TODO: fill in real date
}

export const KEY_DATES: KeyDate[] = [
  // TODO(Rehan): e.g. { id: 'first_meeting', label: 'First Meeting', date: '2022-03-14' }
  // TODO(Rehan): e.g. { id: 'anniversary_1', label: 'First Anniversary', date: '2023-03-14' }
];

export function createTimelineEngine(): TimelineEngine {
  if (!RELATIONSHIP_START_DATE) {
    // eslint-disable-next-line no-console
    console.warn(
      'RELATIONSHIP_START_DATE is not set yet — TODO: add the real date in src/data/timeline.ts'
    );
  }
  return new TimelineEngine(RELATIONSHIP_START_DATE || new Date().toISOString());
}

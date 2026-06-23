import { LetterSection } from './loveLetterEngine';
import { LetterTemplateContext, LetterTemplateDefinition } from './contentTypes';
import { Memory } from './memory.types';

function pick<T>(arr: T[], seed: string): T {
  if (arr.length === 0) throw new Error('Cannot pick from empty array');
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return arr[hash % arr.length]!;
}

function topMemories(memories: Memory[], limit: number): Memory[] {
  return [...memories]
    .sort(
      (a, b) =>
        b.importance - a.importance ||
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, limit);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const OPENING_PHRASES = [
  'Looking back over everything we have shared,',
  'Sitting with all the moments we have collected,',
  'When I think about us,',
];

const REFLECTION_CONNECTORS = [
  'I keep coming back to',
  'I still think about',
  'one moment that stays with me is',
];

function buildAnniversaryTemplate(context: LetterTemplateContext): LetterSection[] {
  const { memories, stats, personalization } = context;
  const yearMemories = topMemories(memories, 5);

  const opening: LetterSection = {
    id: 'anniversary_opening',
    heading: 'Opening',
    body: `${pick(OPENING_PHRASES, personalization.recipientName)} another year with you, ${personalization.recipientName}, has passed — and somehow it still feels like there is more to discover.`,
    order: 0,
  };

  const highlightSections: LetterSection[] = yearMemories.map((m, i) => ({
    id: `anniversary_highlight_${m.id}`,
    heading: m.title,
    body: `${pick(REFLECTION_CONNECTORS, m.id)} ${formatDate(m.date)}, when ${m.description}`,
    order: i + 1,
  }));

  const statsLine: LetterSection | null = stats
    ? {
        id: 'anniversary_stats',
        heading: 'In Numbers',
        body: `${stats.totalMemories} memories and counting, gathered over ${Math.floor(
          stats.relationshipDurationDays / 365.25
        )} year(s) — and the story is still being written.`,
        order: highlightSections.length + 1,
      }
    : null;

  const closing: LetterSection = {
    id: 'anniversary_closing',
    heading: 'Closing',
    body: `Here is to this year, and to whatever the next one holds, ${personalization.recipientName}.`,
    order: (statsLine?.order ?? highlightSections.length) + 1,
  };

  return [opening, ...highlightSections, ...(statsLine ? [statsLine] : []), closing];
}

function buildThankYouTemplate(context: LetterTemplateContext): LetterSection[] {
  const { memories, personalization } = context;
  const meaningfulMemories = topMemories(memories, 4);

  const opening: LetterSection = {
    id: 'thankyou_opening',
    heading: 'Opening',
    body: `Thank you, ${personalization.recipientName} — not for one thing, but for so many small ones that added up.`,
    order: 0,
  };

  const gratitudeSections: LetterSection[] = meaningfulMemories.map((m, i) => ({
    id: `thankyou_${m.id}`,
    heading: m.title,
    body: `Thank you for ${m.description.toLowerCase()} — it mattered more than I probably said at the time.`,
    order: i + 1,
  }));

  const closing: LetterSection = {
    id: 'thankyou_closing',
    heading: 'Closing',
    body: `Thank you for all of it, ${personalization.recipientName}. I do not take it for granted.`,
    order: gratitudeSections.length + 1,
  };

  return [opening, ...gratitudeSections, closing];
}

function buildMemoryReflectionTemplate(context: LetterTemplateContext): LetterSection[] {
  const { memories, personalization, chapterSummaries } = context;
  const sorted = [...memories].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const opening: LetterSection = {
    id: 'reflection_opening',
    heading: 'Opening',
    body: `Some memories settle quietly and never really leave. Here are a few of mine with you, ${personalization.recipientName}.`,
    order: 0,
  };

  const reflectionSections: LetterSection[] = sorted.slice(-6).map((m, i) => ({
    id: `reflection_${m.id}`,
    heading: m.title,
    body: `${formatDate(m.date)} — ${m.description}`,
    order: i + 1,
  }));

  const chapterLine: LetterSection | null = chapterSummaries?.length
    ? {
        id: 'reflection_chapters',
        heading: 'Chapters So Far',
        body: `Across it all, the story has moved through ${chapterSummaries.length} chapter(s) — each one adding something the last one did not have.`,
        order: reflectionSections.length + 1,
      }
    : null;

  return [opening, ...reflectionSections, ...(chapterLine ? [chapterLine] : [])];
}

function buildFutureLetterTemplate(context: LetterTemplateContext): LetterSection[] {
  const { personalization, emotionalState } = context;

  const opening: LetterSection = {
    id: 'future_opening',
    heading: 'Opening',
    body: `${personalization.recipientName}, this letter is not about what has already happened — it is about what I hope is still ahead.`,
    order: 0,
  };

  const stageLine: LetterSection | null = emotionalState
    ? {
        id: 'future_stage',
        heading: 'Where We Are',
        body: `Right now, we are somewhere in "${emotionalState.stageLabel}" — and I am curious what the next chapter will look like.`,
        order: 1,
      }
    : null;

  const closing: LetterSection = {
    id: 'future_closing',
    heading: 'Closing',
    body: `Whatever comes next, I want to keep finding it out with you, ${personalization.recipientName}.`,
    order: (stageLine?.order ?? 1) + 1,
  };

  return [opening, ...(stageLine ? [stageLine] : []), closing];
}

function buildForeverLetterTemplate(context: LetterTemplateContext): LetterSection[] {
  const { memories, personalization, stats } = context;
  const earliest = [...memories].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )[0];
  const latest = [...memories].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];

  const opening: LetterSection = {
    id: 'forever_opening',
    heading: 'Opening',
    body: `${personalization.recipientName}, forever is a big word, but everything in this story keeps pointing toward it.`,
    order: 0,
  };

  const arcSection: LetterSection | null =
    earliest && latest
      ? {
          id: 'forever_arc',
          heading: 'From There to Here',
          body: `It started with ${earliest.title.toLowerCase()} on ${formatDate(
            earliest.date
          )}, and it is still going, most recently with ${latest.title.toLowerCase()} on ${formatDate(
            latest.date
          )}.`,
          order: 1,
        }
      : null;

  const statsLine: LetterSection | null = stats
    ? {
        id: 'forever_stats',
        heading: 'So Far',
        body: `${stats.totalMemories} memories in, and none of them feel like enough yet.`,
        order: (arcSection?.order ?? 1) + 1,
      }
    : null;

  const closing: LetterSection = {
    id: 'forever_closing',
    heading: 'Closing',
    body: `Here is to forever, ${personalization.recipientName} — one more memory at a time.`,
    order: (statsLine?.order ?? arcSection?.order ?? 1) + 1,
  };

  return [
    opening,
    ...(arcSection ? [arcSection] : []),
    ...(statsLine ? [statsLine] : []),
    closing,
  ];
}

export const LETTER_TEMPLATES: LetterTemplateDefinition[] = [
  {
    id: 'anniversary',
    label: 'Anniversary Letter',
    description: 'Generated from the most significant memories of the past year.',
    generate: buildAnniversaryTemplate,
  },
  {
    id: 'thank-you',
    label: 'Thank You Letter',
    description: 'Generated from meaningful memories framed as gratitude.',
    generate: buildThankYouTemplate,
  },
  {
    id: 'memory-reflection',
    label: 'Memory Reflection Letter',
    description: 'A reflective walk through recent memories.',
    generate: buildMemoryReflectionTemplate,
  },
  {
    id: 'future-letter',
    label: 'Future Letter',
    description: 'Forward-looking letter based on the current emotional stage.',
    generate: buildFutureLetterTemplate,
  },
  {
    id: 'forever-letter',
    label: 'Forever Letter',
    description: 'Spans the full arc from the earliest to most recent memory.',
    generate: buildForeverLetterTemplate,
  },
];

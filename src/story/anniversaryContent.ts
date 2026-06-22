import { AnniversaryContentDefinition, LetterTemplateContext } from './contentTypes';

function monthsTogether(context: LetterTemplateContext): number {
  if (!context.stats) return 0;
  return Math.floor(context.stats.relationshipDurationDays / 30.44);
}

function yearsTogether(context: LetterTemplateContext): number {
  if (!context.stats) return 0;
  return Math.floor(context.stats.relationshipDurationDays / 365.25);
}

export const ANNIVERSARY_CONTENT: AnniversaryContentDefinition[] = [
  {
    id: 'monthly',
    frequency: 'monthly',
    label: 'Monthly Mark',
    emotionalTheme: 'tenderness',
    unlockMessage: (context) =>
      `Another month together — ${monthsTogether(context)} so far. A new memory just unlocked.`,
    celebrationMessage: (context) =>
      `${monthsTogether(context)} months in, and there is still more story being written, ${context.personalization.recipientName}.`,
    memoryHighlightStrategy: 'most-important',
    specialRevealHooks: [
      {
        id: 'monthly-surprise-pool',
        description: 'Occasional surprise memory tied to the surprise reveal pool.',
        triggerType: 'surprise-pool',
        referenceId: 'monthly-surprise-pool',
      },
    ],
  },
  {
    id: 'yearly',
    frequency: 'yearly',
    label: 'Yearly Anniversary',
    emotionalTheme: 'gratitude',
    unlockMessage: (context) =>
      `Happy anniversary — year ${yearsTogether(context)}. A new chapter of memories has unlocked.`,
    celebrationMessage: (context) =>
      `${yearsTogether(context)} year(s) with you, ${context.personalization.recipientName}, and the story keeps getting better.`,
    memoryHighlightStrategy: 'chapter-highlight',
    specialRevealHooks: [
      {
        id: 'yearly-hidden-memory',
        description: 'A hidden memory tied to this anniversary date becomes visible.',
        triggerType: 'hidden-memory',
        referenceId: 'yearly-hidden-memory',
      },
      {
        id: 'yearly-chain',
        description: 'Triggers the next step in a chained unlock sequence, if one exists.',
        triggerType: 'chain',
        referenceId: 'yearly-unlock-chain',
      },
    ],
  },
  {
    id: 'milestone',
    frequency: 'milestone',
    label: 'Special Milestone',
    emotionalTheme: 'joy',
    unlockMessage: () => `A milestone has been reached. Something new has unlocked.`,
    celebrationMessage: (context) =>
      `This one mattered enough to mark on its own, ${context.personalization.recipientName}.`,
    memoryHighlightStrategy: 'emotion-matched',
    specialRevealHooks: [
      {
        id: 'milestone-secret',
        description: 'A secret memory becomes unlockable once a code is entered for this milestone.',
        triggerType: 'secret-memory',
        referenceId: 'milestone-secret-memory',
      },
    ],
  },
];

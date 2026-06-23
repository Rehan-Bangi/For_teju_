import { MemoryEngine, CreateMemoryInput } from './memoryEngine';

// TODO(Rehan): This file is a PLACEHOLDER structure only. No real memories exist yet.
// Replace each placeholder entry below with real memories, or remove the placeholders
// entirely and add your own using the same CreateMemoryInput shape.
//
// Required per memory:
//   - type: 'photo' | 'message' | 'milestone' | 'location' | 'gift' | 'voice' | 'custom'
//   - title: string
//   - description: string
//   - date: ISO date string — TODO: real date required
//   - emotion: one of the EmotionTag values (e.g. 'joy', 'comfort', 'tenderness', ...)
//   - importance?: 1-5
//   - tags?: string[] — use stage tags like 'first_meeting', 'friendship',
//       'falling_in_love', 'commitment', 'anniversary' so storyEngine/emotionalProgression
//       can classify it correctly
//
// For photo/voice memories, attach `media` with real URLs once available:
//   media: [{ type: 'image', url: 'TODO: real photo URL' }]
//
// For location memories, add `location: { name: 'TODO: real place name' }`

export const MEMORY_PLACEHOLDERS: CreateMemoryInput[] = [
  {
    type: 'milestone',
    title: 'TODO: Real milestone title (e.g. "Met in coaching class")',
    description: 'TODO: Replace with the real description of this milestone.',
    date: '', // TODO: real ISO date required, e.g. '2022-03-14'
    emotion: 'joy', // TODO: confirm or change the real emotion
    importance: 5,
    tags: ['first_meeting'], // TODO: adjust stage tag if needed
    storyContribution: {
      arcWeight: 1,
      narrativeRole: 'opening',
    },
  },
  {
    type: 'message',
    title: 'TODO: Real moment title',
    description: 'TODO: Replace with the real memory description.',
    date: '', // TODO: real ISO date required
    emotion: 'comfort', // TODO: confirm or change the real emotion
    importance: 3,
    tags: ['friendship'], // TODO: adjust stage tag if needed
  },
  {
    type: 'photo',
    title: 'TODO: Real photo memory title',
    description: 'TODO: Replace with the real memory description.',
    date: '', // TODO: real ISO date required
    emotion: 'nostalgia', // TODO: confirm or change the real emotion
    importance: 4,
    tags: ['getting_closer'], // TODO: adjust stage tag if needed
    media: [
      {
        type: 'image',
        url: '', // TODO: real photo URL required
      },
    ],
  },
  {
    type: 'milestone',
    title: 'TODO: Real "choosing each other" milestone',
    description: 'TODO: Replace with the real description (e.g. a commitment moment).',
    date: '', // TODO: real ISO date required
    emotion: 'gratitude', // TODO: confirm or change the real emotion
    importance: 5,
    tags: ['commitment'], // TODO: adjust stage tag if needed
  },
  {
    type: 'milestone',
    title: 'TODO: Real anniversary milestone',
    description: 'TODO: Replace with the real anniversary description.',
    date: '', // TODO: real ISO date required
    emotion: 'gratitude', // TODO: confirm or change the real emotion
    importance: 4,
    tags: ['anniversary'], // TODO: adjust stage tag if needed
  },
  // TODO(Rehan): Add more memories below using the same shape.
  // Add as many milestone / message / photo / location / gift / voice / custom
  // memories as you have. The story, timeline, and emotional progression engines
  // will automatically classify and build chapters once real dates are present.
];

export function loadPlaceholderMemories(): MemoryEngine {
  const engine = new MemoryEngine();
  engine.bulkImport(MEMORY_PLACEHOLDERS);
  return engine;
}

import { PersonalizationContext } from './loveLetterEngine';

// TODO(Rehan): Fill in the real personalization details once ready.
export const LETTER_PERSONALIZATION: PersonalizationContext = {
  recipientName: 'Teju', // TODO: confirm the preferred name/nickname to use
  senderName: 'Rehan', // TODO: confirm the preferred name/nickname to use
  petNames: [], // TODO: add real pet names/nicknames if any
  sharedJoke: '', // TODO: add a real inside joke if you want it referenced
  anniversaryYears: undefined, // TODO: set the real anniversary year count when used
};

// TODO(Rehan): This is a placeholder for the FINAL, hand-written love letter —
// separate from the dynamically generated letters (anniversary, thank-you,
// memory-reflection, future, forever) produced by loveLetterEngine and
// letterTemplates.ts. Leave this empty/placeholder until you are ready to
// write the real one.
export const FINAL_LOVE_LETTER_DRAFT = {
  title: 'TODO: Final love letter title',
  body: '', // TODO: write the real, final love letter here when ready
  isFinal: false, // TODO: set to true once this is the real, finished letter
};

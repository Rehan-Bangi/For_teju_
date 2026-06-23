/**
 * src/character/index.ts
 * Barrel export for the character module. Was missing — several files
 * elsewhere import from '@/character' / '../character' expecting this.
 */

export * from './character.config';
export * from './character.effects';
export * from './characterEngine';
export * from './useCharacterState';
export * from './CharacterAvatar';
export * from './CharacterController';
export * from './CharacterDialogue';

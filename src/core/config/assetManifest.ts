/**
 * assetManifest.ts
 * ----------------------------------------------------------------------------
 * Single source of truth for every asset the experience needs before
 * `loadingState.phase` can move from 'loading' to 'ready'.
 *
 * The Loader component sums `ASSET_TOTAL_COUNT` from this file BEFORE loading
 * begins, so the progress bar denominator is correct from the very first
 * frame (no "jumping" progress bar as new assets get discovered mid-load).
 *
 * Ownership: Account A. Other accounts only ADD entries for assets they
 * introduce (e.g. Account D adds character models here) — they must not
 * change the shape of this file.
 */

import type { TrackId, SfxId } from './eventBus';

// ----------------------------------------------------------------------------
// Models
// ----------------------------------------------------------------------------

export interface ModelAsset {
  id: string;
  path: string;
  /** rough triangle budget, used by useResponsiveQuality to decide LOD swaps */
  complexity: 'low' | 'medium' | 'high';
}

export const MODEL_ASSETS: ModelAsset[] = [
  { id: 'him', path: '/assets/characters/models/him.glb', complexity: 'medium' },
  { id: 'her', path: '/assets/characters/models/her.glb', complexity: 'medium' },
  { id: 'anim-idle', path: '/assets/characters/animations/idle.glb', complexity: 'low' },
  { id: 'anim-wave', path: '/assets/characters/animations/wave.glb', complexity: 'low' },
  { id: 'anim-hug', path: '/assets/characters/animations/hug.glb', complexity: 'low' },
  { id: 'anim-dance', path: '/assets/characters/animations/dance.glb', complexity: 'low' },
];

// ----------------------------------------------------------------------------
// Textures
// ----------------------------------------------------------------------------

export interface TextureAsset {
  id: string;
  path: string;
  /** if true, only load on 'high' qualityTier — skipped on low/medium devices */
  highTierOnly?: boolean;
}

export const TEXTURE_ASSETS: TextureAsset[] = [
  { id: 'nebula-noise', path: '/assets/images/textures/nebula-noise.webp' },
  { id: 'star-sprite', path: '/assets/images/textures/star-sprite.webp' },
  { id: 'particle-glow', path: '/assets/images/textures/particle-glow.webp' },
  { id: 'bloom-overlay', path: '/assets/images/textures/bloom-overlay.webp', highTierOnly: true },
];

// ----------------------------------------------------------------------------
// Memory photos — populated to match data/memories.ts as content is finalized.
// Kept as a separate flat list here (rather than importing memories.ts) so
// Account A's manifest has zero dependency on Account C's content files.
// ----------------------------------------------------------------------------

export interface ImageAsset {
  id: string;
  path: string;
}

export const MEMORY_IMAGE_ASSETS: ImageAsset[] = [
  // Account C appends one entry per memory orb here as content is finalised.
  // Empty for now so Loader math stays accurate during early development —
  // do not pad with placeholders.
];

// ----------------------------------------------------------------------------
// Audio — tracks and sfx
// ----------------------------------------------------------------------------

export interface AudioAsset {
  id: TrackId | SfxId;
  path: string;
  type: 'track' | 'sfx';
}

export const AUDIO_ASSETS: AudioAsset[] = [
  { id: 'hero-ambient', path: '/audio/score/hero-ambient.mp3', type: 'track' },
  { id: 'beginning-theme', path: '/audio/score/beginning-theme.mp3', type: 'track' },
  { id: 'letter-theme', path: '/audio/score/letter-theme.mp3', type: 'track' },
  { id: 'finale-theme', path: '/audio/score/finale-theme.mp3', type: 'track' },

  { id: 'transition-whoosh', path: '/audio/sfx/transition-whoosh.mp3', type: 'sfx' },
  { id: 'orb-click', path: '/audio/sfx/orb-click.mp3', type: 'sfx' },
  { id: 'page-turn', path: '/audio/sfx/page-turn.mp3', type: 'sfx' },
];

// ----------------------------------------------------------------------------
// Fonts
// ----------------------------------------------------------------------------

export interface FontAsset {
  id: string;
  path: string;
}

export const FONT_ASSETS: FontAsset[] = [
  // { id: 'display', path: '/assets/fonts/display.woff2' },
  // { id: 'body', path: '/assets/fonts/body.woff2' },
];

// ----------------------------------------------------------------------------
// Aggregate manifest — what the Loader actually consumes
// ----------------------------------------------------------------------------

export type AssetCategory = 'model' | 'texture' | 'image' | 'audio' | 'font';

export interface ManifestEntry {
  id: string;
  path: string;
  category: AssetCategory;
}

function buildManifest(): ManifestEntry[] {
  return [
    ...MODEL_ASSETS.map((a) => ({ id: a.id, path: a.path, category: 'model' as const })),
    ...TEXTURE_ASSETS.map((a) => ({ id: a.id, path: a.path, category: 'texture' as const })),
    ...MEMORY_IMAGE_ASSETS.map((a) => ({ id: a.id, path: a.path, category: 'image' as const })),
    ...AUDIO_ASSETS.map((a) => ({ id: a.id, path: a.path, category: 'audio' as const })),
    ...FONT_ASSETS.map((a) => ({ id: a.id, path: a.path, category: 'font' as const })),
  ];
}

/** Flat list of every asset the Loader must resolve before `phase: 'ready'`. */
export const ASSET_MANIFEST: ManifestEntry[] = buildManifest();

/** Denominator for the loading progress bar — computed once, on import. */
export const ASSET_TOTAL_COUNT: number = ASSET_MANIFEST.length;

/** Convenience lookup, e.g. assetPath('him') -> '/assets/characters/models/him.glb' */
export function assetPath(id: string): string | undefined {
  return ASSET_MANIFEST.find((entry) => entry.id === id)?.path;
}

/**
 * src/app/SceneManager.tsx
 *
 * COMPATIBILITY AUDIT CORRECTIONS APPLIED (see chat for full audit):
 *
 * 1. universeStore.ts has no `currentSceneId` field — it tracks a 5-value
 *    `currentState: UniverseState` mood enum (lonely/beginning/love/
 *    letter/finale), not the 8-value SceneId scenes.config.ts uses. Active
 *    scene is now derived from scroll progress via scenes.config's own
 *    `getSceneAtProgress()` instead of reading a field that doesn't exist.
 *
 * 2. HeroUniverseScene.tsx is fully self-contained — it renders its OWN
 *    internal <Canvas>, FogController, CameraRig, Starfield, NebulaLayer,
 *    ParticleSystem, vignette, and chapter-label overlay. It is not a bare
 *    R3F scene-graph component meant to be nested inside an externally
 *    owned <Canvas> (R3F doesn't support nested <Canvas> elements at all —
 *    the previous version of this file would not have rendered). It's
 *    rendered directly here, full-bleed; progress is lifted out via its
 *    own `onProgressChange` callback prop instead.
 *
 * 3. useStoryProgress.ts is a self-contained per-instance hook (own RAF
 *    loop + scroll listener), not an eventBus bridge into storyEngine
 *    output, and its chapter table (meeting/friendship/falling_in_love/
 *    distance/destiny/finale — 6 values) is unrelated to scenes.config's
 *    8 SceneIds. Calling it a second time here would spin up a second,
 *    unsynchronized scroll tracker, so this file no longer calls it
 *    directly — it only consumes the progress value HeroUniverseScene
 *    already tracks via the callback above.
 *
 * 4. FinaleController.tsx requires `unlockRequirements` (no default), and
 *    useFinaleState has no `isArmed` field. Worse, the unlock check itself
 *    only ever runs once FinaleController is mounted (its own effect is
 *    what calls updateUnlockRequirements), so gating its mount behind an
 *    "armed" flag would mean that flag could never become true. It's
 *    mounted unconditionally here — it already self-gates its own render
 *    output for 'locked'/'available' states internally.
 *
 * CharacterController.tsx needed no changes here — every prop is optional.
 */

import { useCallback, useState } from 'react';
import { HeroUniverseScene } from '@/universe/HeroUniverseScene';
import type { ChapterId } from '@/universe/UniverseTimelineController';
import { SCENES_CONFIG, getSceneAtProgress } from '@/core/config/scenes.config';
import { CharacterController } from '@/character/components/CharacterController';
import { FinaleController } from '@/finale/components/FinaleController';
import type { FinaleUnlockRequirements } from '@/finale/finale.config';

// TODO: source real thresholds from finale.config.ts (not available in the
// audited file set) — placeholder so FinaleController has a type-correct
// value to mount with. Replace before shipping.
const FINALE_UNLOCK_REQUIREMENTS = {} as FinaleUnlockRequirements;

export function SceneManager() {
  const [progress, setProgress] = useState(0);

  const handleProgressChange = useCallback((p: number, _chapterId: ChapterId) => {
    setProgress(p);
  }, []);

  const activeScene = getSceneAtProgress(progress);

  return (
    <>
      {/* HeroUniverseScene owns its own Canvas — rendered directly,
          full-bleed, rather than wrapped in one of our own. */}
      <div className="scene-canvas-layer" aria-hidden="true">
        <HeroUniverseScene onProgressChange={handleProgressChange} />
      </div>

      {/* DOM overlay — 8 narrative sections per scenes.config.ts, scroll-
          pinned by ScrollProvider via GSAP ScrollTrigger. Highlighted
          section is derived from the same progress value HeroUniverseScene
          already tracks internally, via getSceneAtProgress. */}
      <div className="scene-overlay-layer">
        {SCENES_CONFIG.map((scene) => (
          <section
            key={scene.id}
            id={scene.id}
            className="narrative-section"
            aria-current={scene.id === activeScene.id ? 'true' : undefined}
          />
        ))}
      </div>

      <CharacterController />

      <FinaleController unlockRequirements={FINALE_UNLOCK_REQUIREMENTS} />

      {/* TODO: mount src/ui/MemorySearchPanel.tsx and
          src/ui/RelationshipStatsDisplay.tsx here once built. */}
    </>
  );
}

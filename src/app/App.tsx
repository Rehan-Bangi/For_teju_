/**
 * src/app/App.tsx
 *
 * Assembles the provider hierarchy exactly as specified in §4/§5:
 *
 *   ErrorBoundary
 *     └── ScrollProvider     (Lenis + ScrollTrigger context)
 *         └── AudioProvider
 *             └── EngineBootstrap   (instantiates Account C engines)
 *                 └── LoadingScreen (gates on assetManifest preload)
 *                     └── SceneManager
 *
 * Not delivered by any account (§3) — this is purely wiring, no new
 * systems or visual logic of its own.
 */

import { ErrorBoundary } from './ErrorBoundary';
import { ScrollProvider } from './providers/ScrollProvider';
import { AudioProvider } from './providers/AudioProvider';
import { EngineBootstrap } from './providers/EngineBootstrap';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SceneManager } from './SceneManager';

export default function App() {
  return (
    <ErrorBoundary>
      <ScrollProvider>
        <AudioProvider>
          <EngineBootstrap>
            <LoadingScreen>
              <SceneManager />
            </LoadingScreen>
          </EngineBootstrap>
        </AudioProvider>
      </ScrollProvider>
    </ErrorBoundary>
  );
}

/**
 * src/ui/LoadingScreen.tsx
 *
 * COMPATIBILITY FIX: assetManifest.ts exports `ASSET_MANIFEST` — an array
 * of `ManifestEntry { id, path, category }` where category is one of
 * 'model' | 'texture' | 'image' | 'audio' | 'font' — plus `ASSET_TOTAL_COUNT`
 * and `assetPath(id)`. There is no `assetManifest` export and no
 * `{ id, type, url }` shape.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ASSET_MANIFEST, type ManifestEntry } from '@/core/config/assetManifest';

function preloadAsset(asset: ManifestEntry): Promise<void> {
  return new Promise((resolve) => {
    // Every path resolves, never rejects — one bad asset can't hang the
    // whole gate, it's just skipped.
    const done = () => resolve();

    switch (asset.category) {
      case 'image':
      case 'texture': {
        const img = new Image();
        img.onload = done;
        img.onerror = done;
        img.src = asset.path;
        break;
      }
      case 'audio': {
        const audio = new Audio();
        audio.oncanplaythrough = done;
        audio.onerror = done;
        audio.src = asset.path;
        audio.load();
        break;
      }
      case 'font': {
        if ('fonts' in document) {
          const face = new FontFace(asset.id, `url(${asset.path})`);
          face
            .load()
            .then((loaded) => {
              document.fonts.add(loaded);
              done();
            })
            .catch(done);
        } else {
          done();
        }
        break;
      }
      case 'model':
      default:
        // .glb models need R3F's own GLTFLoader to parse — that loading
        // happens where they're actually used. Here we just warm the HTTP
        // cache so that later load is instant.
        fetch(asset.path).then(done).catch(done);
        break;
    }
  });
}

interface LoadingScreenProps {
  children: ReactNode;
}

export function LoadingScreen({ children }: LoadingScreenProps) {
  const [loadedCount, setLoadedCount] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const total = ASSET_MANIFEST.length;

  useEffect(() => {
    let cancelled = false;

    if (total === 0) {
      setIsReady(true);
      return;
    }

    Promise.all(
      ASSET_MANIFEST.map((asset) =>
        preloadAsset(asset).then(() => {
          if (!cancelled) setLoadedCount((prev) => prev + 1);
        })
      )
    ).then(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [total]);

  const percent = useMemo(
    () => (total === 0 ? 100 : Math.round((loadedCount / total) * 100)),
    [loadedCount, total]
  );

  if (!isReady) {
    return (
      <div className="loading-screen" role="status" aria-live="polite">
        <div className="loading-screen__mark">FOR TEJU</div>
        <div className="loading-screen__bar">
          <div className="loading-screen__bar-fill" style={{ width: `${percent}%` }} />
        </div>
        <div className="loading-screen__percent">{percent}%</div>
      </div>
    );
  }

  return <>{children}</>;
}

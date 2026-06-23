/**
 * src/app/providers/ScrollProvider.tsx
 *
 * Owns the single Lenis instance and the GSAP ScrollTrigger scrollerProxy
 * registration (§5, §11 step 6). No account owns Lenis setup — B's
 * UniverseTimelineController and useUniverseProgress both assume a scroll
 * source exists but don't create one. This is that source.
 *
 * Contract this hands off to the rest of the app (§7, §10):
 *   - Emits `SCROLL_PROGRESS_UPDATED` on eventBus.ts (A) with the raw Lenis
 *     scroll payload `{ scroll, limit, velocity, direction, progress }`.
 *   - Does NOT write into universeStore directly — useUniverseProgress.ts
 *     (B) is the only file that bridges this event into the store, per the
 *     two-store-one-bridge pattern in §10.
 *
 * Closes out the two scroll bugs flagged in the integration checklist:
 *   - Lenis cleanup memory leak: lenis.destroy() + listener teardown on
 *     unmount, no stale RAF loop.
 *   - ScrollTrigger proxy mismatch: scrollerProxy is registered against the
 *     Lenis-controlled element, not native window scroll.
 *
 * Assumes `eventBus.ts` (A) exposes a mitt-style `on/off/emit` API. Adjust
 * the calls below if Account A's actual signature differs.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import Lenis from '@studio-freight/lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { eventBus } from '@/core/config/eventBus';

gsap.registerPlugin(ScrollTrigger);

interface LenisScrollEvent {
  scroll: number;
  limit: number;
  velocity: number;
  direction: number;
  progress: number;
}

interface ScrollContextValue {
  lenis: Lenis | null;
  scrollProgress: number;
}

const ScrollContext = createContext<ScrollContextValue>({ lenis: null, scrollProgress: 0 });

export function useScroll(): ScrollContextValue {
  return useContext(ScrollContext);
}

interface ScrollProviderProps {
  children: ReactNode;
}

export function ScrollProvider({ children }: ScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lenis = new Lenis({
      duration: prefersReducedMotion ? 0.1 : 1.2,
      smoothWheel: !prefersReducedMotion,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    // --- ScrollTrigger proxy, registered against the Lenis-controlled
    // element (this is the fix for the proxy-mismatch bug) ---
    ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value as number, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      },
      pinType: document.documentElement.style.transform ? 'transform' : 'fixed',
    });

    function handleLenisScroll(e: LenisScrollEvent) {
      ScrollTrigger.update();
      setScrollProgress(e.progress);
      eventBus.emit('SCROLL_PROGRESS_UPDATED', e);
    }
    lenis.on('scroll', handleLenisScroll);

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    function handleRefresh() {
      lenis.resize();
    }
    ScrollTrigger.addEventListener('refresh', handleRefresh);
    ScrollTrigger.refresh();

    // --- Cleanup: this is the leak fix. Every listener added above gets
    // torn down, the RAF loop is cancelled, and the Lenis instance is
    // destroyed rather than left dangling on remount. ---
    return () => {
      cancelAnimationFrame(rafId);
      lenis.off('scroll', handleLenisScroll);
      ScrollTrigger.removeEventListener('refresh', handleRefresh);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <ScrollContext.Provider value={{ lenis: lenisRef.current, scrollProgress }}>
      {children}
    </ScrollContext.Provider>
  );
}

import { useRef, useEffect, useCallback, useState } from 'react';

export interface ParallaxVector {
  x: number;
  y: number;
}

export interface UseMouseParallaxOptions {
  /** Element to attach pointer listeners to. Defaults to window when omitted. */
  target?: React.RefObject<HTMLElement | null>;
  /** Multiplier applied to normalized pointer position. Default 1. */
  strength?: number;
  /** Smoothing factor for the eased ref (0 = instant, 1 = never arrives). Default 0.06. */
  smoothing?: number;
  /** Disable touch tracking (e.g. for desktop-only effects). Default false. */
  disableTouch?: boolean;
  /** Disable mouse tracking. Default false. */
  disableMouse?: boolean;
  /** When true, hook does nothing and returns zeroed values. Useful for reduced-motion. */
  paused?: boolean;
}

export interface UseMouseParallaxReturn {
  /** Live ref — read this inside useFrame for zero re-render overhead. -1..1 range. */
  raw: React.MutableRefObject<ParallaxVector>;
  /** Eased ref — smoothed toward `raw` every animation frame. -1..1 range. */
  eased: React.MutableRefObject<ParallaxVector>;
  /** React state mirror of `eased`, updated via rAF. Use only if you need re-renders. */
  state: ParallaxVector;
  /** Manually advance easing — call once per frame if not auto-driving via internal rAF. */
  tick: () => ParallaxVector;
}

/**
 * Tracks normalized pointer position (-1..1 on both axes) relative to a target
 * element (or the viewport). Designed to be read from an R3F useFrame callback
 * via the `raw` or `eased` ref — avoids React re-renders on every pointer move.
 *
 * SSR-safe: all DOM/window access is guarded and deferred to effects.
 * Mobile-safe: touch events are normalized identically to mouse events.
 */
export function useMouseParallax(
  options: UseMouseParallaxOptions = {},
): UseMouseParallaxReturn {
  const {
    target,
    strength = 1,
    smoothing = 0.06,
    disableTouch = false,
    disableMouse = false,
    paused = false,
  } = options;

  const raw   = useRef<ParallaxVector>({ x: 0, y: 0 });
  const eased = useRef<ParallaxVector>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const strengthRef  = useRef(strength);
  const smoothingRef = useRef(smoothing);
  strengthRef.current  = strength;
  smoothingRef.current = smoothing;

  const [state, setState] = useState<ParallaxVector>({ x: 0, y: 0 });

  const tick = useCallback((): ParallaxVector => {
    const s = smoothingRef.current;
    eased.current.x += (raw.current.x - eased.current.x) * s;
    eased.current.y += (raw.current.y - eased.current.y) * s;
    return eased.current;
  }, []);

  // Pointer event wiring
  useEffect(() => {
    if (paused || typeof window === 'undefined') return;

    const el: HTMLElement | Window = target?.current ?? window;

    const computeFromClient = (clientX: number, clientY: number) => {
      let width = window.innerWidth;
      let height = window.innerHeight;
      let offsetX = 0;
      let offsetY = 0;

      if (el !== window && el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        offsetX = rect.left;
        offsetY = rect.top;
      }

      if (width === 0 || height === 0) return;

      const nx = ((clientX - offsetX) / width - 0.5) * 2;
      const ny = -((clientY - offsetY) / height - 0.5) * 2;

      raw.current.x = nx * strengthRef.current;
      raw.current.y = ny * strengthRef.current;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (disableMouse) return;
      computeFromClient(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (disableTouch) return;
      const touch = e.touches[0];
      if (!touch) return;
      computeFromClient(touch.clientX, touch.clientY);
    };

    // Reset to center when pointer leaves the tracked surface
    const onMouseLeave = () => {
      raw.current.x = 0;
      raw.current.y = 0;
    };

    if (!disableMouse) {
      el.addEventListener('mousemove', onMouseMove as EventListener, { passive: true });
      el.addEventListener('mouseleave', onMouseLeave as EventListener, { passive: true });
    }
    if (!disableTouch) {
      el.addEventListener('touchmove', onTouchMove as EventListener, { passive: true });
    }

    return () => {
      el.removeEventListener('mousemove', onMouseMove as EventListener);
      el.removeEventListener('mouseleave', onMouseLeave as EventListener);
      el.removeEventListener('touchmove', onTouchMove as EventListener);
    };
  }, [target, disableMouse, disableTouch, paused]);

  // Internal rAF loop — keeps `eased` smoothly chasing `raw`, mirrors into React state.
  useEffect(() => {
    if (paused || typeof window === 'undefined') return;

    let running = true;

    const loop = () => {
      if (!running) return;
      const next = tick();
      setState(prev => {
        if (
          Math.abs(prev.x - next.x) < 0.0001 &&
          Math.abs(prev.y - next.y) < 0.0001
        ) {
          return prev;
        }
        return { x: next.x, y: next.y };
      });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick, paused]);

  return { raw, eased, state, tick };
}

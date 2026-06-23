import React, { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Starfield } from './Starfield';
import { NebulaLayer } from './NebulaLayer';
import { ParticleSystem } from './ParticleSystem';
import { FinaleEffects3D, CinematicAtmosphere } from './FinaleUniverseEffects';
import { useStoryProgress } from './useStoryProgress';
import { ChapterId, ChapterConfig, CHAPTERS } from './UniverseTimelineController';
import { cameraIntensityFromProgress } from './useUniverseProgress';
import { UniverseQualityManager, QualityProfile } from './UniverseQualityManager';
import { UNIVERSE_DEFAULTS } from '../core/config/universe.config';

// ─── Camera rig ───────────────────────────────────────────────────────────────

interface CameraRigProps {
  mouse:    React.MutableRefObject<{ x: number; y: number }>;
  progress: number;
}

function CameraRig({ mouse, progress }: CameraRigProps) {
  const { camera } = useThree();
  const targetPos  = useRef(new THREE.Vector3());
  const baseFov    = useRef(UNIVERSE_DEFAULTS.cameraFov);

  useFrame((state) => {
    const { parallaxStrength, driftSpeed, fovOffset } = cameraIntensityFromProgress(progress);

    targetPos.current.set(
      mouse.current.x * parallaxStrength,
      mouse.current.y * parallaxStrength * 0.5,
      0,
    );

    camera.position.x += (targetPos.current.x - camera.position.x) * 0.03;
    camera.position.y += (targetPos.current.y - camera.position.y) * 0.03;
    camera.position.x += Math.sin(state.clock.elapsedTime * driftSpeed) * 0.001;
    camera.position.y += Math.cos(state.clock.elapsedTime * driftSpeed * 0.7) * 0.0008;
    camera.lookAt(0, 0, 0);

    const cam = camera as THREE.PerspectiveCamera;
    cam.fov += (baseFov.current + fovOffset - cam.fov) * 0.01;
    cam.updateProjectionMatrix();
  });

  return null;
}

// ─── Fog sync ─────────────────────────────────────────────────────────────────

interface FogControllerProps { color: string; near: number; far: number; }

function FogController({ color, near, far }: FogControllerProps) {
  const { scene } = useThree();
  useEffect(() => {
    scene.fog = new THREE.Fog(color, near, far);
    return () => { scene.fog = null; };
  }, [scene, color, near, far]);
  return null;
}

// ─── Quality ticker ───────────────────────────────────────────────────────────

function QualityTicker({ onProfileChange }: { onProfileChange: (p: QualityProfile) => void }) {
  const qm = useRef(UniverseQualityManager.getInstance());
  useFrame(() => {
    const changed = qm.current.tick(performance.now());
    if (changed) onProfileChange(qm.current.getProfile());
  });
  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface HeroUniverseSceneProps {
  /**
   * Global story progress 0→1. When provided, component is externally controlled.
   * When omitted, auto-connects to window scroll.
   */
  progress?: number;
  /** Called on smooth progress change */
  onProgressChange?: (progress: number, chapterId: ChapterId, label: string) => void;
  /** Called when the active chapter changes */
  onChapterChange?: (chapterId: ChapterId, label: string) => void;
  /** Scroll container override (default: window) */
  scrollContainer?: React.RefObject<HTMLElement>;
  /** Show built-in chapter label overlay */
  showChapterLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export function HeroUniverseScene({
  progress: externalProgress,
  onProgressChange,
  onChapterChange,
  scrollContainer,
  showChapterLabel = true,
  className,
  style,
  children,
}: HeroUniverseSceneProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const mouseRef     = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const { state, setProgress, connectScroll } = useStoryProgress({
    smoothing: 0.05,
    onChapterChange: useCallback((chapter: ChapterConfig) => {
      onChapterChange?.(chapter.id, chapter.label);
    }, [onChapterChange]),
  });

  const [qp, setQP] = useState<QualityProfile>(
    () => UniverseQualityManager.getInstance().getProfile(),
  );
  const handleProfileChange = useCallback((p: QualityProfile) => setQP(p), []);

  // External progress control
  useEffect(() => {
    if (externalProgress !== undefined) setProgress(externalProgress);
  }, [externalProgress, setProgress]);

  // Scroll auto-driver
  useEffect(() => {
    if (externalProgress !== undefined || !mounted) return;
    const target = scrollContainer?.current ?? window;
    return connectScroll(target);
  }, [externalProgress, scrollContainer, connectScroll, mounted]);

  // Emit progress changes
  useEffect(() => {
    onProgressChange?.(state.smoothProgress, state.chapter.id, state.chapter.label);
  }, [state.smoothProgress, state.chapter.id, state.chapter.label, onProgressChange]);

  // Pointer tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !mounted) return;
    const onMouse = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - r.left) / r.width  - 0.5) * 2;
      mouseRef.current.y = -((e.clientY - r.top)  / r.height - 0.5) * 2;
    };
    const onTouch = (e: TouchEvent) => {
      if (!e.touches[0]) return;
      const r = el.getBoundingClientRect();
      mouseRef.current.x = ((e.touches[0].clientX - r.left) / r.width  - 0.5) * 2;
      mouseRef.current.y = -((e.touches[0].clientY - r.top)  / r.height - 0.5) * 2;
    };
    el.addEventListener('mousemove', onMouse, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    return () => {
      el.removeEventListener('mousemove', onMouse);
      el.removeEventListener('touchmove', onTouch);
    };
  }, [mounted]);

  const cfg  = state.config;
  const prog = state.smoothProgress;
  const fi   = state.finaleIntensity;
  const dpr  = qp.dpr;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position:   'relative',
        width:      '100%',
        height:     '100%',
        overflow:   'hidden',
        background: cfg.fog.color,
        transition: 'background 3s ease',
        ...style,
      }}
    >
      {mounted && (
        <Canvas
          camera={{
            position: UNIVERSE_DEFAULTS.cameraPosition,
            fov:      UNIVERSE_DEFAULTS.cameraFov,
            near:     0.1,
            far:      100,
          }}
          gl={{
            antialias:       false,
            powerPreference: 'high-performance',
            alpha:           false,
          }}
          dpr={[1, dpr]}
          style={{ position: 'absolute', inset: 0 }}
        >
          <FogController color={cfg.fog.color} near={cfg.fog.near} far={cfg.fog.far} />
          <ambientLight color={cfg.ambient.color} intensity={cfg.ambient.intensity} />

          <Suspense fallback={null}>
            <Starfield
              count={cfg.stars.count}
              twinkleSpeed={cfg.stars.twinkleSpeed}
              brightness={cfg.stars.brightness}
            />
            <NebulaLayer
              colors={cfg.nebula.colors}
              opacity={cfg.nebula.opacity}
              speed={cfg.nebula.speed}
            />
            <ParticleSystem
              count={cfg.particles.count}
              speed={cfg.particles.speed}
              size={cfg.particles.size}
              colors={cfg.particles.colors}
            />
            <FinaleEffects3D intensity={fi} />
          </Suspense>

          <CameraRig mouse={mouseRef} progress={prog} />
          <QualityTicker onProfileChange={handleProfileChange} />
        </Canvas>
      )}

      {/* Vignette deepens with emotional intensity */}
      <div
        style={{
          position:      'absolute',
          inset:         0,
          pointerEvents: 'none',
          background:    `radial-gradient(ellipse at 50% 50%, transparent ${30 + prog * 15}%, ${cfg.fog.color}aa 100%)`,
        }}
      />

      {/* Finale cinematic DOM overlay */}
      <CinematicAtmosphere intensity={fi} fogColor={cfg.fog.color} />

      {/* Chapter label */}
      {showChapterLabel && (
        <ChapterLabel
          label={state.chapter.label}
          subtitle={state.chapter.subtitle}
          accent={state.chapter.accent}
          chapterId={state.chapter.id}
        />
      )}

      {/* Chapter progress dots */}
      <ChapterDots currentIndex={state.chapter.index} />

      {children && (
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Chapter label overlay ────────────────────────────────────────────────────

interface ChapterLabelProps {
  label:     string;
  subtitle:  string;
  accent:    string;
  chapterId: ChapterId;
}

function ChapterLabel({ label, subtitle, accent, chapterId }: ChapterLabelProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={chapterId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1,  y: 0  }}
        exit={{    opacity: 0,  y: -6 }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          position:      'absolute',
          bottom:        28,
          left:          '50%',
          transform:     'translateX(-50%)',
          textAlign:     'center',
          pointerEvents: 'none',
          userSelect:    'none',
          zIndex:        20,
          whiteSpace:    'nowrap',
        }}
      >
        <div style={{
          color:         accent,
          fontSize:      10,
          fontFamily:    'system-ui, sans-serif',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          opacity:       0.9,
          marginBottom:  3,
        }}>
          {label}
        </div>
        <div style={{
          color:         'rgba(255,255,255,0.35)',
          fontSize:      9,
          fontFamily:    'system-ui, sans-serif',
          letterSpacing: '0.1em',
        }}>
          {subtitle}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Chapter progress dots ────────────────────────────────────────────────────

function ChapterDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div style={{
      position:      'absolute',
      right:         16,
      top:           '50%',
      transform:     'translateY(-50%)',
      display:       'flex',
      flexDirection: 'column',
      gap:           6,
      zIndex:        20,
      pointerEvents: 'none',
    }}>
      {CHAPTERS.map((ch, i) => (
        <motion.div
          key={ch.id}
          animate={{
            scale:   i === currentIndex ? 1.4 : 1,
            opacity: i === currentIndex ? 0.9 : i < currentIndex ? 0.5 : 0.2,
          }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          style={{
            width:        5,
            height:       5,
            borderRadius: '50%',
            background:   i <= currentIndex ? ch.accent : 'rgba(255,255,255,0.3)',
          }}
        />
      ))}
    </div>
  );
}

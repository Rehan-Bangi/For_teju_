/**
 * FinaleSequence.tsx
 *
 * Renders the cinematic visual treatment for each of the 6 finale
 * stages: world-slowdown overlay, character-enter spotlight, memory
 * convergence field, and delegates text-heavy beats (love reveal,
 * emotional moment, forever) to FinaleReveal.
 *
 * Built for 60fps on mobile: transforms/opacity only, no layout
 * thrashing, GPU-friendly blur kept to a single layer, and a
 * prefers-reduced-motion fallback.
 */

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import {
  FINALE_ANIMATION,
  FINALE_GLOBAL_TIMING,
  FinaleStage,
  MemoryFragment,
  REDUCED_MOTION_TIMING,
} from "../finale.config";
import { FinaleReveal } from "./FinaleReveal";

export interface FinaleSequenceProps {
  stage: FinaleStage;
  memoryFragments?: MemoryFragment[];
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  className?: string;
}

const Vignette = ({ active }: { active: boolean }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none"
    style={{
      background:
        "radial-gradient(circle at 50% 45%, rgba(0,0,0,0) 30%, rgba(20,4,14,0.85) 100%)",
    }}
    initial={{ opacity: 0 }}
    animate={{ opacity: active ? FINALE_ANIMATION.slowdown.vignetteOpacity : 0 }}
    transition={{ duration: 1.4, ease: "easeInOut" }}
  />
);

const SlowdownLayer = ({ reduced }: { reduced: boolean }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: reduced ? 0.2 : FINALE_GLOBAL_TIMING.worldSlowRampMs / 1000 }}
  >
    <motion.div
      className="w-2 h-2 rounded-full bg-rose-100"
      animate={
        reduced
          ? { opacity: [0.6, 1, 0.6] }
          : { scale: [1, 1.8, 1], opacity: [0.5, 0.9, 0.5] }
      }
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

const CharacterEnterLayer = ({ reduced }: { reduced: boolean }) => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.6 }}
  >
    <motion.div
      className="w-40 h-40 rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(255,217,232,0.55) 0%, rgba(255,217,232,0) 70%)",
      }}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: reduced ? 0.3 : 1.1, ease: "easeOut" }}
    />
  </motion.div>
);

const MemoryConvergeLayer = ({
  fragments,
  reduced,
}: {
  fragments: MemoryFragment[];
  reduced: boolean;
}) => {
  const positioned = useMemo(
    () =>
      fragments.map((f, i) => {
        const angle = (360 / Math.max(fragments.length, 1)) * i;
        const radius = FINALE_ANIMATION.memoryConverge.fragmentTravelDistance;
        return {
          ...f,
          startX: Math.cos((angle * Math.PI) / 180) * radius,
          startY: Math.sin((angle * Math.PI) / 180) * radius,
          delay: reduced ? 0 : (i * FINALE_GLOBAL_TIMING.memoryConvergeStaggerMs) / 1000,
        };
      }),
    [fragments, reduced]
  );

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative w-full h-full max-w-md max-h-md mx-auto">
        {positioned.map((f) => (
          <motion.div
            key={f.id}
            className="absolute left-1/2 top-1/2 flex flex-col items-center"
            initial={{
              x: f.startX,
              y: f.startY,
              opacity: 0,
              scale: FINALE_ANIMATION.memoryConverge.fragmentScaleFrom,
            }}
            animate={{
              x: 0,
              y: 0,
              opacity: [0, 1, 0.9],
              scale: FINALE_ANIMATION.memoryConverge.fragmentScaleTo,
            }}
            transition={{
              duration: reduced ? 0.4 : 1.4,
              delay: f.delay,
              ease: "easeInOut",
            }}
          >
            {f.imageUrl ? (
              <div
                className="w-14 h-14 rounded-xl shadow-lg shadow-rose-900/30 bg-cover bg-center border border-rose-100/30"
                style={{ backgroundImage: `url(${f.imageUrl})` }}
              />
            ) : (
              <div className="w-3 h-3 rounded-full bg-rose-100" />
            )}
            <span className="mt-1.5 text-[11px] text-rose-100/80 font-serif italic max-w-[90px] text-center leading-tight">
              {f.caption}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const FinaleSequence = ({
  stage,
  memoryFragments = [],
  onPrimaryAction,
  onSecondaryAction,
  className = "",
}: FinaleSequenceProps) => {
  const prefersReducedMotion = useReducedMotion();
  const reduced = Boolean(prefersReducedMotion);
  const transitionMs = reduced ? REDUCED_MOTION_TIMING.transitionMs : 600;

  if (stage === "idle") return null;

  return (
    <motion.div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#1a0410] ${className}`}
      style={{ willChange: "opacity, transform" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: transitionMs / 1000, ease: "easeInOut" }}
    >
      <Vignette active={stage !== "idle"} />

      <AnimatePresence mode="wait">
        {stage === "slowdown" && (
          <SlowdownLayer key="slowdown" reduced={reduced} />
        )}
        {stage === "characterEnter" && (
          <CharacterEnterLayer key="character-enter" reduced={reduced} />
        )}
        {stage === "memoriesConverge" && (
          <MemoryConvergeLayer
            key="memories-converge"
            fragments={memoryFragments}
            reduced={reduced}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 w-full">
        <FinaleReveal
          stage={stage}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      </div>
    </motion.div>
  );
};

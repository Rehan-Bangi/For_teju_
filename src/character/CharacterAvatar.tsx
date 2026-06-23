/**
 * CharacterAvatar.tsx
 *
 * Animated avatar for the FOR TEJU ❤️ character system.
 * Built with SVG + Framer Motion + CSS-driven glow. Purely visual —
 * receives a CharacterState and renders the appropriate breathing /
 * floating / glowing treatment. No behavioural logic lives here.
 */

import { motion, AnimatePresence, Variants } from "framer-motion";
import { useMemo } from "react";
import { AVATAR_ANIMATION, CharacterState, STATE_VISUALS } from "./character.config";

export interface CharacterAvatarProps {
  state: CharacterState;
  size?: number;
  className?: string;
}

const floatVariants: Variants = {
  animate: ({ distance, duration }: { distance: number; duration: number }) => ({
    y: [0, -distance, 0],
    transition: {
      duration,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }),
};

const breatheVariants: Variants = {
  animate: ({ min, max, duration }: { min: number; max: number; duration: number }) => ({
    scale: [min, max, min],
    transition: {
      duration,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }),
};

const containerVariants: Variants = {
  hidden: { opacity: 0, scale: 0.85, transition: { duration: 0.4 } },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

const Particles = ({ color }: { color: string }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        angle: (360 / 6) * i,
        delay: i * 0.18,
      })),
    []
  );

  return (
    <>
      {particles.map((p) => (
        <motion.circle
          key={p.id}
          r={2.5}
          fill={color}
          cx={50}
          cy={50}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            cx: 50 + Math.cos((p.angle * Math.PI) / 180) * 40,
            cy: 50 + Math.sin((p.angle * Math.PI) / 180) * 40,
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
};

export const CharacterAvatar = ({
  state,
  size = 96,
  className = "",
}: CharacterAvatarProps) => {
  const visuals = STATE_VISUALS[state];
  const isHidden = state === "hidden";

  return (
    <AnimatePresence>
      {!isHidden && (
        <motion.div
          key="character-avatar"
          className={`relative pointer-events-none select-none ${className}`}
          style={{ width: size, height: size }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Glow halo */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            style={{ backgroundColor: visuals.glowColor }}
            animate={{
              opacity: [
                AVATAR_ANIMATION.glow.minOpacity,
                AVATAR_ANIMATION.glow.maxOpacity,
                AVATAR_ANIMATION.glow.minOpacity,
              ],
              scale: [1, visuals.haloScale, 1],
            }}
            transition={{
              duration: AVATAR_ANIMATION.glow.durationSec,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Float wrapper */}
          <motion.div
            className="absolute inset-0"
            custom={{
              distance: AVATAR_ANIMATION.float.distance,
              duration: AVATAR_ANIMATION.float.durationSec,
            }}
            variants={floatVariants}
            animate="animate"
          >
            {/* Breathe wrapper */}
            <motion.div
              className="w-full h-full"
              custom={{
                min: AVATAR_ANIMATION.breathe.scaleMin,
                max: AVATAR_ANIMATION.breathe.scaleMax,
                duration: AVATAR_ANIMATION.breathe.durationSec,
              }}
              variants={breatheVariants}
              animate="animate"
            >
              <svg
                viewBox="0 0 100 100"
                width={size}
                height={size}
                role="img"
                aria-label="Story companion"
              >
                <defs>
                  <radialGradient id="charBodyGradient" cx="50%" cy="42%" r="60%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="55%" stopColor="#FBD9E6" />
                    <stop offset="100%" stopColor={visuals.glowColor} />
                  </radialGradient>
                </defs>

                {visuals.particles && <Particles color={visuals.glowColor} />}

                {/* Soft body */}
                <motion.circle
                  cx={50}
                  cy={50}
                  r={26}
                  fill="url(#charBodyGradient)"
                  animate={{ r: state === "celebrating" ? 28 : 26 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />

                {/* Inner light core */}
                <motion.circle
                  cx={50}
                  cy={46}
                  r={10}
                  fill="#FFFFFF"
                  opacity={0.85}
                  animate={{
                    opacity: state === "emotional" ? 0.95 : 0.7,
                    r: state === "finale" ? 12 : 10,
                  }}
                  transition={{ duration: 0.6 }}
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * FinaleReveal.tsx
 *
 * Presentational component responsible for rendering the two text-heavy
 * beats of the finale: Stage 4 (love message reveal) and Stage 6
 * (forever screen). Pure rendering — no state/progression logic.
 */

import { motion, AnimatePresence } from "framer-motion";
import { FINALE_ANIMATION, FINALE_CONTENT, FinaleStage } from "../finale.config";

export interface FinaleRevealProps {
  stage: FinaleStage;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

const letterVariants = {
  hidden: {
    opacity: 0,
    y: FINALE_ANIMATION.loveReveal.letterRiseDistance,
    filter: `blur(${FINALE_ANIMATION.loveReveal.blurFrom}px)`,
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 1.1, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -16,
    filter: "blur(6px)",
    transition: { duration: 0.6, ease: "easeIn" as const },
  },
};

const paragraphVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: 0.3 + i * 0.35, ease: "easeOut" as const },
  }),
};

const LoveMessage = () => (
  <motion.div
    className="flex flex-col items-center justify-center text-center px-6 max-w-lg mx-auto"
    variants={letterVariants}
    initial="hidden"
    animate="visible"
    exit="exit"
  >
    <h2 className="font-serif text-3xl sm:text-4xl text-rose-50 mb-6 tracking-wide">
      {FINALE_CONTENT.loveMessage.title}
    </h2>
    <div className="flex flex-col gap-4">
      {FINALE_CONTENT.loveMessage.paragraphs.map((para, i) => (
        <motion.p
          key={i}
          custom={i}
          variants={paragraphVariants}
          initial="hidden"
          animate="visible"
          className="font-serif text-lg sm:text-xl leading-relaxed text-rose-100/95"
        >
          {para}
        </motion.p>
      ))}
    </div>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.6, duration: 0.8 }}
      className="font-serif italic text-rose-200/90 mt-8 text-base"
    >
      {FINALE_CONTENT.loveMessage.signature}
    </motion.p>
  </motion.div>
);

const EmotionalMoment = () => (
  <motion.div
    className="flex items-center justify-center text-center px-8 max-w-md mx-auto"
    initial={{ opacity: 0, scale: 0.96 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.98 }}
    transition={{ duration: 1, ease: "easeOut" }}
  >
    <p className="font-serif text-xl sm:text-2xl text-rose-50 leading-relaxed">
      {FINALE_CONTENT.emotionalMomentLine}
    </p>
  </motion.div>
);

const ForeverScreen = ({
  onPrimaryAction,
  onSecondaryAction,
}: Pick<FinaleRevealProps, "onPrimaryAction" | "onSecondaryAction">) => (
  <motion.div
    className="flex flex-col items-center justify-center text-center px-6 gap-6"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1.2, ease: "easeOut" }}
  >
    <motion.h1
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.2 }}
      className="font-serif text-4xl sm:text-5xl text-rose-50 tracking-wide"
    >
      {FINALE_CONTENT.foreverScreen.heading}
    </motion.h1>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
      className="font-serif text-base sm:text-lg text-rose-100/90 max-w-sm"
    >
      {FINALE_CONTENT.foreverScreen.subheading}
    </motion.p>

    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 1.6 }}
      className="flex flex-col sm:flex-row gap-3 mt-2"
    >
      {onPrimaryAction && (
        <button
          onClick={onPrimaryAction}
          className="px-6 py-3 rounded-full bg-rose-50 text-rose-900 font-medium text-sm tracking-wide shadow-lg shadow-rose-900/20 active:scale-95 transition-transform"
        >
          {FINALE_CONTENT.foreverScreen.primaryActionLabel}
        </button>
      )}
      {onSecondaryAction && (
        <button
          onClick={onSecondaryAction}
          className="px-6 py-3 rounded-full border border-rose-100/40 text-rose-100 font-medium text-sm tracking-wide active:scale-95 transition-transform"
        >
          {FINALE_CONTENT.foreverScreen.secondaryActionLabel}
        </button>
      )}
    </motion.div>
  </motion.div>
);

export const FinaleReveal = ({
  stage,
  onPrimaryAction,
  onSecondaryAction,
}: FinaleRevealProps) => {
  return (
    <AnimatePresence mode="wait">
      {stage === "loveReveal" && <LoveMessage key="love-reveal" />}
      {stage === "emotionalMoment" && <EmotionalMoment key="emotional-moment" />}
      {stage === "forever" && (
        <ForeverScreen
          key="forever"
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      )}
    </AnimatePresence>
  );
};

/**
 * CharacterDialogue.tsx
 *
 * Renders the character's current spoken line as a small, elegant
 * dialogue bubble. Purely presentational — receives the line to show
 * and renders it; all queueing/timing lives in useCharacterState.
 */

import { AnimatePresence, motion } from "framer-motion";
import { DialogueLine } from "../character.config";

export interface CharacterDialogueProps {
  dialogue: DialogueLine | null;
  className?: string;
}

export const CharacterDialogue = ({
  dialogue,
  className = "",
}: CharacterDialogueProps) => {
  return (
    <AnimatePresence mode="wait">
      {dialogue && (
        <motion.div
          key={dialogue.id}
          className={`pointer-events-none select-none ${className}`}
          initial={{ opacity: 0, y: 8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div
            className="
              max-w-xs px-4 py-2.5
              rounded-2xl
              bg-white/90 backdrop-blur-sm
              shadow-[0_4px_24px_rgba(233,138,174,0.25)]
              border border-rose-100
            "
          >
            <p className="font-serif text-[15px] leading-snug text-rose-900 text-center italic">
              {dialogue.text}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

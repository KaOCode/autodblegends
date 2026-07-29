import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Small hand-built primitive in the spirit of animate-ui.com (motion +
 * Tailwind, no runtime dependency on their registry): staggers the entrance
 * of a list of children, used for the team-builder "reveal" moment.
 */
export function StaggerReveal({ children, className }: { children: ReactNode[]; className?: string }) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 16, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

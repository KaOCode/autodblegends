import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import type { Character } from "@autodbl/shared";
import { useLongHover } from "../lib/useLongHover";
import { CharacterDetailCard } from "./CharacterDetailCard";

const CARD_WIDTH = 420;
const CARD_MAX_HEIGHT = 420;
const MARGIN = 12;

export function CharacterHoverCard({
  character,
  children,
  onClick,
}: {
  character: Character;
  children: ReactNode;
  /** Click opens the full detail/inventory modal - kept separate from the
   * 4s hover preview, which stays a quick read-only glance. */
  onClick?: (character: Character) => void;
}) {
  const { isOpen, triggerProps } = useLongHover(4000);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const left =
      spaceRight >= CARD_WIDTH + MARGIN
        ? rect.right + MARGIN
        : Math.max(MARGIN, rect.left - CARD_WIDTH - MARGIN);
    const top = Math.min(
      Math.max(MARGIN, rect.top - CARD_MAX_HEIGHT / 3),
      window.innerHeight - CARD_MAX_HEIGHT - MARGIN,
    );
    setPosition({ top, left });
  }, [isOpen]);

  return (
    <div
      ref={anchorRef}
      {...triggerProps}
      onClick={onClick ? () => onClick(character) : undefined}
      className={onClick ? "cursor-pointer" : undefined}
    >
      {children}
      {createPortal(
        <AnimatePresence>
          {isOpen && position && (
            <div className="pointer-events-none fixed inset-0 z-50">
              <div className="pointer-events-auto absolute" style={{ top: position.top, left: position.left }}>
                <CharacterDetailCard character={character} />
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

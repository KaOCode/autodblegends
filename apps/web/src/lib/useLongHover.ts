import { useCallback, useRef, useState } from "react";

const DEFAULT_DELAY_MS = 4000;

/** Fires `isOpen` only after the pointer has rested on the trigger for
 * `delayMs` (default 4s, per spec: long hover reveals the Sorare-style
 * detail card). Moving away before the delay cancels it; touch devices get
 * a tap-and-hold of the same duration via pointerdown/up. */
export function useLongHover(delayMs: number = DEFAULT_DELAY_MS) {
  const [isOpen, setIsOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    timer.current = setTimeout(() => setIsOpen(true), delayMs);
  }, [clear, delayMs]);

  const cancel = useCallback(() => {
    clear();
    setIsOpen(false);
  }, [clear]);

  return {
    isOpen,
    triggerProps: {
      onMouseEnter: start,
      onMouseLeave: cancel,
      onPointerDown: start,
      onPointerUp: cancel,
      onPointerCancel: cancel,
    },
  };
}

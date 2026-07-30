import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { Banner, Character } from "@autodbl/shared";

export function BannerModal({
  banner,
  featuredCharacters,
  onClose,
  onOpenCharacter,
}: {
  banner: Banner;
  featuredCharacters: Character[];
  onClose: () => void;
  onOpenCharacter: (characterId: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1020] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{banner.name}</h2>
              <p className="text-xs text-white/40">
                {banner.type}
                {banner.isStepUp ? " · Step-Up" : ""} · bis {new Date(banner.endsAt).toLocaleDateString("de-DE")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Schließen"
            >
              ✕
            </button>
          </div>

          {featuredCharacters.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
              Konnte keinen Charakter aus dem Banner-Namen erkennen. Details direkt auf{" "}
              <a
                href="https://dblegends.net/summons"
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 underline"
              >
                dblegends.net
              </a>
              .
            </div>
          ) : (
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300/80">
                Erkannte Charaktere
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {featuredCharacters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onOpenCharacter(c.id)}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-2 text-left transition-colors hover:border-amber-400/40 hover:bg-white/10"
                  >
                    <img
                      src={`https://dblegends.net/assets/card_icons/BChaIco_${c.img}.webp`}
                      alt={c.name}
                      className="h-10 w-10 rounded-md object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">{c.name}</p>
                      <p className="truncate text-xs text-white/40">
                        {c.rarity} · {c.card}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

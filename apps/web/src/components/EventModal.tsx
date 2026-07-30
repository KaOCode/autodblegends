import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { DblEvent } from "@autodbl/shared";
import { useEffect } from "react";

export function EventModal({ event, onClose }: { event: DblEvent; onClose: () => void }) {
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
          className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1020] p-5"
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{event.name}</h2>
              <p className="text-xs text-white/40">
                {new Date(event.beginsAt).toLocaleString("de-DE")} – {new Date(event.endsAt).toLocaleString("de-DE")}
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

          {!event.difficulties || event.difficulties.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/50">
              Für dieses Event wurden keine Stage-Details geladen (nur für aktive/anstehende Events beim Scrape
              erfasst). Details direkt auf{" "}
              <a
                href={`https://dblegends.net/event/${event.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-300 underline"
              >
                dblegends.net
              </a>
              .
            </div>
          ) : (
            <div className="space-y-4">
              {event.difficulties.map((diff) => (
                <div key={diff.index}>
                  {event.difficulties!.length > 1 && (
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-300/80">
                      Schwierigkeit {diff.index + 1}
                    </p>
                  )}
                  <div className="space-y-2">
                    {diff.stages.map((stage, i) => (
                      <details key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <summary className="flex cursor-pointer items-center justify-between text-sm text-white">
                          <span>
                            {stage.name}
                            {stage.enemies[0]?.level ? (
                              <span className="ml-2 text-xs text-white/40">Lv {stage.enemies[0].level}</span>
                            ) : null}
                          </span>
                          {stage.stamina != null && (
                            <span className="text-xs text-white/40">Stamina {stage.stamina}</span>
                          )}
                        </summary>
                        <div className="mt-3 space-y-2 text-xs text-white/60">
                          {stage.enemies.length > 0 && (
                            <p>
                              <span className="text-white/40">Gegner: </span>
                              {stage.enemies.map((e) => e.name).join(", ")}
                            </p>
                          )}
                          {(stage.exp || stage.zeni) && (
                            <p>
                              <span className="text-white/40">Belohnung: </span>
                              {stage.exp && `EXP ${stage.exp}`} {stage.zeni && `· Zeni ${stage.zeni}`}
                            </p>
                          )}
                          {stage.firstClearDrops.length > 0 && (
                            <p>
                              <span className="text-white/40">Erstclear: </span>
                              {stage.firstClearDrops.map((d) => `${d.name} ${d.qty}`).join(", ")}
                            </p>
                          )}
                          {stage.challenges.length > 0 && (
                            <div>
                              <p className="text-white/40">Challenges:</p>
                              <ul className="ml-4 list-disc">
                                {stage.challenges.map((c, ci) => (
                                  <li key={ci}>{c.text}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

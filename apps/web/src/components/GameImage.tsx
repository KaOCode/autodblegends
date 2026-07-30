import { useState } from "react";

/** dblegends.net serves most non-character art as .webp with a .png
 * fallback (same filename), and 404s for some older/removed assets
 * entirely - mirrors the onerror fallback chain used on the site itself. */
export function GameImage({
  base,
  alt,
  className,
}: {
  /** full URL without extension, e.g. "https://dblegends.net/assets/events/story_event_3008" */
  base: string;
  alt: string;
  className?: string;
}) {
  const [stage, setStage] = useState<"webp" | "png" | "hidden">("webp");

  if (stage === "hidden") return null;

  return (
    <img
      src={`${base}.${stage}`}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setStage((s) => (s === "webp" ? "png" : "hidden"))}
    />
  );
}

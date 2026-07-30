const GOLD_STARS = 7;
const RED_STARS = 7;
const MAX_STARS = GOLD_STARS + RED_STARS;

/** DBL ranks a card 1-7 with gold stars (via Rank-Up Medals), then - once
 * maxed - continues 8-14 with red stars earned from extra copies/pulls.
 * Both rows write to the same 0-14 `value`. */
export function StarPicker({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  function renderRow(offset: number, count: number, colorClass: string) {
    return (
      <div className="flex gap-0.5" role="radiogroup" aria-label="Sterne-Rang">
        {Array.from({ length: count }, (_, i) => offset + i + 1).map((star) => {
          const filled = star <= value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={filled}
              aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
              className={`text-lg leading-none transition-transform hover:scale-125 ${
                filled ? colorClass : "text-white/20"
              }`}
              onClick={() => onChange(star === value ? offset : star)}
            >
              ★
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {renderRow(0, GOLD_STARS, "text-amber-400")}
      {renderRow(GOLD_STARS, RED_STARS, "text-red-500")}
      <p className="text-[10px] text-white/30">
        {value} / {MAX_STARS}
      </p>
    </div>
  );
}

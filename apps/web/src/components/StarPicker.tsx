const MAX_STARS = 7;

export function StarPicker({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  return (
    <div className="flex gap-0.5" role="radiogroup" aria-label="Sterne-Rang">
      {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((star) => {
        const filled = star <= value;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={filled}
            aria-label={`${star} Stern${star > 1 ? "e" : ""}`}
            className={`text-lg leading-none transition-transform hover:scale-125 ${
              filled ? "text-amber-400" : "text-white/20"
            }`}
            onClick={() => onChange(star === value ? 0 : star)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

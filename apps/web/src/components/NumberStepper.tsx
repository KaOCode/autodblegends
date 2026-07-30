export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  function clamp(v: number) {
    return Math.min(max, Math.max(min, v));
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20">
      <button
        type="button"
        className="px-2.5 py-1 text-white/60 hover:text-white disabled:opacity-30"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        −
      </button>
      <input
        type="number"
        className="w-16 bg-transparent text-center text-sm text-white outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
      />
      <button
        type="button"
        className="px-2.5 py-1 text-white/60 hover:text-white disabled:opacity-30"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        +
      </button>
    </div>
  );
}

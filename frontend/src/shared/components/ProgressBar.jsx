// Thanh tiến trình trực quan (thay cho glyph dạng chữ [████░░]).
function toneFor(pct) {
  if (pct == null) return "bg-slate-300";
  if (pct >= 80) return "bg-green-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function ProgressBar({ value, className = "", width = "w-20" }) {
  const pct = value == null ? null : Math.max(0, Math.min(100, value));
  return (
    <div
      className={`${width} h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-200 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${toneFor(pct)}`}
        style={{ width: `${pct ?? 0}%` }}
      />
    </div>
  );
}

import { MOODS } from "./weeklyReviewConstants";

// Biểu đồ mood theo tuần bằng SVG thuần (không dùng thư viện chart).
// data: [{ week_label, mood }] theo thứ tự thời gian tăng dần.
export default function MoodTrendChart({ data = [] }) {
  const points = data.filter((d) => d.mood != null);
  if (points.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-slate-400">
        Not enough mood data to draw the chart.
      </div>
    );
  }

  const W = Math.max(points.length * 60, 240);
  const H = 100;
  const padX = 24;
  const padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const x = (i) =>
    points.length === 1 ? W / 2 : padX + (i / (points.length - 1)) * innerW;
  const y = (mood) => padY + (1 - (mood - 1) / 4) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.mood)}`)
    .join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={W} height={H + 20} className="min-w-full">
        {/* gridlines cho 5 mức */}
        {MOODS.map((m) => (
          <line
            key={m.value}
            x1={padX}
            x2={W - padX}
            y1={y(m.value)}
            y2={y(m.value)}
            stroke="#f1f5f9"
            strokeWidth="1"
          />
        ))}
        {/* đường nối */}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2" />
        {/* điểm mood + emoji */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.mood)} r="4" fill="#6366f1" />
            <text
              x={x(i)}
              y={y(p.mood) - 8}
              textAnchor="middle"
              fontSize="12"
            >
              {MOODS.find((m) => m.value === p.mood)?.emoji}
            </text>
            <text
              x={x(i)}
              y={H + 12}
              textAnchor="middle"
              fontSize="9"
              fill="#94a3b8"
            >
              {p.week_label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

import { dateToX, truncateLabel } from "./timelineUtils";

const BAR_MS_COLOR = {
  done: { fill: "#22c55e", stroke: "#16a34a" },
  not_started: { fill: "#ffffff", stroke: "#6366f1" },
  missed: { fill: "#ef4444", stroke: "#dc2626" },
};

// Thanh tiến độ (Gantt bar) cho 1 bar trong 1 track.
export default function BarRenderer({
  bar,
  x,
  y,
  width,
  height,
  color,
  projectStart,
  projectEnd,
  chartWidth,
  onClick,
  onBarMilestoneClick,
  onHover,
}) {
  const progress = Math.max(0, Math.min(100, bar.progress || 0));
  const fillColor = bar.color || color || "#6366f1";
  const isBlocked = bar.status === "blocked";
  const isDone = bar.status === "done";
  const barMilestones = bar.bar_milestones || [];

  // Sắp xếp bar milestones theo x để xen kẽ label khi gần nhau.
  const markers = barMilestones
    .filter((m) => m.date)
    .map((m) => ({ m, cx: dateToX(m.date, projectStart, projectEnd, chartWidth) }))
    .sort((a, b) => a.cx - b.cx);

  return (
    <g style={{ cursor: "pointer" }}>
      <g
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(bar, e);
        }}
        onMouseEnter={(e) => {
          e.stopPropagation();
          onHover?.(bar, { x, y });
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={6}
          fill="#e2e8f0"
          stroke={isBlocked ? "#ef4444" : "transparent"}
          strokeWidth={isBlocked ? 1.5 : 0}
        />
        <rect
          x={x}
          y={y}
          width={(width * progress) / 100}
          height={height}
          rx={6}
          fill={fillColor}
          opacity={isBlocked ? 0.5 : 1}
        />
        <text
          x={x + 8}
          y={y + height / 2 + 4}
          fontSize="11"
          fill={progress > 15 ? "#ffffff" : "#334155"}
          style={{ pointerEvents: "none" }}
        >
          {bar.name} · {progress}%
        </text>
        {(isBlocked || isDone) && (
          <text
            x={x + width - 14}
            y={y + height / 2 + 4}
            fontSize="12"
            fill={isBlocked ? "#ef4444" : "#16a34a"}
            style={{ pointerEvents: "none" }}
          >
            {isBlocked ? "⚠" : "✓"}
          </text>
        )}
      </g>

      {/* Milestone markers BÊN TRONG bar — ◆ nhỏ trên cạnh trên của bar */}
      {markers.map(({ m, cx }, i) => {
        const c = BAR_MS_COLOR[m.status] || BAR_MS_COLOR.not_started;
        const s = 4; // nửa cạnh (size 6px tổng ~ nhỏ hơn milestone chính)
        const cy = y; // ngay trên cạnh trên của bar
        // Label xen kẽ trên/dưới khi các marker gần nhau (< 30px).
        const prevX = i > 0 ? markers[i - 1].cx : null;
        const near = prevX !== null && cx - prevX < 30;
        const labelY = i % 2 === 0 || !near ? cy - 8 : cy - 18;
        return (
          <g
            key={m.id}
            onClick={(e) => {
              e.stopPropagation();
              onBarMilestoneClick?.(bar, m, e);
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              onHover?.({ ...m, _barMilestone: true, name: m.name }, { x: cx, y: cy });
            }}
            onMouseLeave={() => onHover?.(null)}
          >
            <rect
              x={cx - s}
              y={cy - s}
              width={s * 2}
              height={s * 2}
              transform={`rotate(45 ${cx} ${cy})`}
              fill={c.fill}
              stroke={c.stroke}
              strokeWidth={1.5}
            />
            <text
              x={cx}
              y={labelY}
              textAnchor="middle"
              fontSize="9"
              fill="#64748b"
            >
              {truncateLabel(m.name)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

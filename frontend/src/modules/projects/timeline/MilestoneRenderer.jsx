import { MILESTONE_COLOR, truncateLabel } from "./timelineUtils";

// Diamond marker cho 1 milestone trên trục timeline.
// Label xen kẽ trên/dưới (side) + dịch phải (offsetX) khi các milestone gần nhau.
export default function MilestoneRenderer({
  milestone,
  cx,
  cy,
  side = "above",
  offsetX = 0,
  onClick,
  onHover,
}) {
  const color = MILESTONE_COLOR[milestone.status] || MILESTONE_COLOR.upcoming;
  const size = 7;
  const label = truncateLabel(milestone.name);

  const isAbove = side === "above";
  const labelY = isAbove ? cy - 20 : cy + 24;
  const connEndY = isAbove ? cy - 18 : cy + 22;
  const connStartY = isAbove ? cy - size : cy + size;

  return (
    <g
      style={{ cursor: "pointer" }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(milestone, e);
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onHover?.(milestone, { x: cx, y: cy });
      }}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Connector từ diamond tới label */}
      <line
        x1={cx}
        y1={connStartY}
        x2={cx + offsetX}
        y2={connEndY}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        transform={`rotate(45 ${cx} ${cy})`}
        fill={color}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
      {milestone.status === "at_risk" && (
        <text x={cx} y={cy - size - 6} textAnchor="middle" fontSize="11" fill="#f59e0b">
          ⚠
        </text>
      )}
      <text
        x={cx + offsetX}
        y={labelY}
        textAnchor="middle"
        fontSize="10"
        fill="#475569"
      >
        {label}
      </text>
    </g>
  );
}

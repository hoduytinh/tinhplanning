// Đường kẻ dọc đánh dấu "Hôm nay" trên timeline.
export default function TodayLine({ x, height }) {
  return (
    <g>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="#ef4444"
        strokeWidth={1.5}
        strokeDasharray="4 3"
      />
      <text x={x + 4} y={12} fontSize="10" fill="#ef4444" fontWeight="600">
        Today
      </text>
    </g>
  );
}

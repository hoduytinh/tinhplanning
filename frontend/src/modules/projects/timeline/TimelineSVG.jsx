import {
  monthTicks,
  dateToX,
  barX,
  barWidth,
  rowLayout,
  layoutMilestoneLabels,
} from "./timelineUtils";
import MilestoneRenderer from "./MilestoneRenderer";
import BarRenderer from "./BarRenderer";
import TodayLine from "./TodayLine";

// Kết hợp toàn bộ SVG của Timeline: lưới tháng, các hàng track, bars,
// milestones và đường "Today".
export default function TimelineSVG({
  rows,
  projectStart,
  projectEnd,
  chartWidth,
  today,
  onBarClick,
  onMilestoneClick,
  onBarMilestoneClick,
  onEmptyClick,
  onHover,
}) {
  const { items, totalHeight } = rowLayout(rows);
  const height = totalHeight;
  const ticks = monthTicks(projectStart, projectEnd);
  const todayX = dateToX(today, projectStart, projectEnd, chartWidth);

  return (
    <svg width={chartWidth} height={height}>
      {/* Lưới dọc theo tháng */}
      {ticks.map((t) => (
        <line
          key={t.toISOString()}
          x1={dateToX(t, projectStart, projectEnd, chartWidth)}
          y1={0}
          x2={dateToX(t, projectStart, projectEnd, chartWidth)}
          y2={height}
          stroke="#f1f5f9"
          strokeWidth={1}
        />
      ))}

      {items.map(({ row, top, height: rowH }, i) => {
        const y = top;
        const labelLayout = layoutMilestoneLabels(
          row.milestones,
          projectStart,
          projectEnd,
          chartWidth
        );
        return (
          <g key={row.key}>
            <rect
              x={0}
              y={y}
              width={chartWidth}
              height={rowH}
              fill={i % 2 === 0 ? "transparent" : "#fafafa"}
              style={{ cursor: row.type === "track" ? "copy" : "default" }}
              onClick={(e) => {
                if (row.type !== "track" || !onEmptyClick) return;
                onEmptyClick(row.track, e);
              }}
            />
            <line x1={0} y1={y + rowH} x2={chartWidth} y2={y + rowH} stroke="#f1f5f9" />

            {row.bars.map((bar) => {
              const x = barX(bar.start_date, projectStart, projectEnd, chartWidth);
              const w = barWidth(bar.start_date, bar.end_date, projectStart, projectEnd, chartWidth);
              return (
                <BarRenderer
                  key={bar.id}
                  bar={bar}
                  x={x}
                  y={y + 6}
                  width={w}
                  height={rowH - 12}
                  color={row.track?.color}
                  projectStart={projectStart}
                  projectEnd={projectEnd}
                  chartWidth={chartWidth}
                  onClick={onBarClick}
                  onBarMilestoneClick={onBarMilestoneClick}
                  onHover={onHover}
                />
              );
            })}

            {labelLayout.map(({ milestone, cx, side, offsetX }) => (
              <MilestoneRenderer
                key={milestone.id}
                milestone={milestone}
                cx={cx}
                cy={y + rowH / 2}
                side={side}
                offsetX={offsetX}
                onClick={onMilestoneClick}
                onHover={onHover}
              />
            ))}
          </g>
        );
      })}

      <TodayLine x={todayX} height={height} />
    </svg>
  );
}

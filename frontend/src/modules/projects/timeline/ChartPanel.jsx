import { forwardRef, useState } from "react";
import TimelineSVG from "./TimelineSVG";
import {
  AXIS_HEIGHT,
  dateToX,
  fmtMonthYear,
  fmtShortDate,
  monthTicks,
} from "./timelineUtils";

// Panel bên phải: cuộn ngang/dọc, bọc TimelineSVG, hiển thị tooltip hover nhẹ
// cho bar/milestone. Đồng bộ cuộn dọc với TrackPanel qua onScroll.
// Trục thời gian (tháng) là dải sticky-top nằm trong vùng cuộn ngang nên luôn
// khớp với lưới bên dưới.
const ChartPanel = forwardRef(function ChartPanel(
  {
    rows,
    projectStart,
    projectEnd,
    chartWidth,
    today,
    onBarClick,
    onMilestoneClick,
    onBarMilestoneClick,
    onEmptyClick,
    onScroll,
  },
  ref
) {
  const [hover, setHover] = useState(null); // { item, pos }
  const ticks = monthTicks(projectStart, projectEnd);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="relative flex-1 overflow-auto"
      style={{ maxHeight: "100%" }}
    >
      <div style={{ width: chartWidth, position: "relative" }}>
        <div
          className="sticky top-0 z-20 border-b border-slate-200 bg-white text-xs text-slate-500"
          style={{ height: AXIS_HEIGHT, width: chartWidth }}
        >
          {ticks.map((t) => (
            <span
              key={t.toISOString()}
              className="absolute top-1.5 whitespace-nowrap"
              style={{ left: dateToX(t, projectStart, projectEnd, chartWidth) + 2 }}
            >
              {fmtMonthYear(t)}
            </span>
          ))}
        </div>

        <TimelineSVG
          rows={rows}
          projectStart={projectStart}
          projectEnd={projectEnd}
          chartWidth={chartWidth}
          today={today}
          onBarClick={onBarClick}
          onMilestoneClick={onMilestoneClick}
          onBarMilestoneClick={onBarMilestoneClick}
          onEmptyClick={onEmptyClick}
          onHover={(item, pos) => setHover(item ? { item, pos } : null)}
        />
      </div>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-cardHover"
          style={{ left: hover.pos.x + 12, top: hover.pos.y - 8 }}
        >
          <div className="font-semibold text-slate-800">{hover.item.name}</div>
          {"date" in hover.item ? (
            <div>{fmtShortDate(hover.item.date)}</div>
          ) : (
            <>
              <div>
                {fmtShortDate(hover.item.start_date)} → {fmtShortDate(hover.item.end_date)}
                {" · "}
                {hover.item.progress}%
              </div>
              {(hover.item.bar_milestones || []).length > 0 && (
                <div className="mt-0.5 text-slate-500">
                  Milestones:{" "}
                  {
                    hover.item.bar_milestones.filter((m) => m.status === "done")
                      .length
                  }
                  /{hover.item.bar_milestones.length} done
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default ChartPanel;

import { forwardRef } from "react";
import { ChevronRight, ChevronDown, GripVertical, Pencil, Trash2 } from "lucide-react";
import { AXIS_HEIGHT, rowHeightFor } from "./timelineUtils";

// Panel bên trái: cây track (200px cố định), đồng bộ cuộn dọc với ChartPanel.
const TrackPanel = forwardRef(function TrackPanel(
  { rows, onToggleCollapse, onEditTrack, onDeleteTrack, onScroll },
  ref
) {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className="w-[200px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white"
      style={{ maxHeight: "100%" }}
    >
      {/* Spacer khớp chiều cao trục thời gian để các hàng thẳng với SVG */}
      <div
        className="sticky top-0 z-10 border-b border-slate-200 bg-white"
        style={{ height: AXIS_HEIGHT }}
      />
      {rows.map((row) => (
        <div
          key={row.key}
          className={`group flex items-center gap-1.5 border-b border-slate-100 px-2 text-sm ${
            row.type === "system" ? "bg-slate-50 font-semibold text-slate-600" : "text-slate-700 hover:bg-slate-50"
          }`}
          style={{ height: rowHeightFor(row), paddingLeft: 8 + row.depth * 16 }}
        >
          {row.type === "track" && (
            <>
              <GripVertical size={12} className="shrink-0 text-slate-300" />
              <button
                type="button"
                onClick={() => onToggleCollapse(row.track)}
                className="shrink-0 text-slate-400 hover:text-slate-600"
              >
                {row.track.is_collapsed ? (
                  <ChevronRight size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
              </button>
            </>
          )}
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: row.track?.color || "#64748b" }}
          />
          <span className="flex-1 truncate" title={row.track?.name}>
            {row.track?.name}
          </span>
          {row.type === "track" && (
            <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onEditTrack?.(row.track)}
                className="text-slate-300 hover:text-brand"
                title="Edit track"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDeleteTrack?.(row.track)}
                className="text-slate-300 hover:text-red-500"
                title="Delete track"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default TrackPanel;

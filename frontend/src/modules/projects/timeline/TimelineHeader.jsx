const ZOOM_OPTIONS = [
  { key: "week", label: "Tuần" },
  { key: "month", label: "Tháng" },
  { key: "quarter", label: "Quý" },
];

// Toolbar: nhãn cột TRACKS + chọn khoảng thời gian hiển thị + zoom + "+ Track".
// Trục thời gian (tháng) nằm trong ChartPanel để luôn khớp với lưới khi cuộn.
export default function TimelineHeader({
  zoom,
  onZoomChange,
  onAddTrack,
  rangeStart,
  rangeEnd,
  onRangeStartChange,
  onRangeEndChange,
  onResetRange,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="w-[184px] shrink-0 text-xs font-semibold text-slate-500">
          TRACKS
        </span>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Từ</span>
          <input
            type="date"
            value={rangeStart || ""}
            onChange={(e) => onRangeStartChange(e.target.value || null)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
          <span>đến</span>
          <input
            type="date"
            value={rangeEnd || ""}
            onChange={(e) => onRangeEndChange(e.target.value || null)}
            className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={onResetRange}
            className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            title="Đặt lại khoảng hiển thị theo toàn bộ dữ liệu"
          >
            Auto
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-slate-200 p-0.5">
          {ZOOM_OPTIONS.map((z) => (
            <button
              key={z.key}
              type="button"
              onClick={() => onZoomChange(z.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                zoom === z.key
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onAddTrack}
          className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-dark"
        >
          + Track
        </button>
      </div>
    </div>
  );
}

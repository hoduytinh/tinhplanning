// Helper functions thuần cho Timeline Tab: tính pixel position từ date range,
// zoom levels, và các phép biến đổi ngày tháng. Không phụ thuộc React.

export const ZOOM = {
  week: { unitWidth: 40, unit: "week", days: 7 },
  month: { unitWidth: 80, unit: "month", days: 30 },
  quarter: { unitWidth: 200, unit: "quarter", days: 90 },
};

export function parseDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toISODate(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  const d1 = parseDate(a);
  const d2 = parseDate(b);
  if (!d1 || !d2) return 0;
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((d2.getTime() - d1.getTime()) / MS_PER_DAY);
}

export function addDays(d, days) {
  const dt = new Date(parseDate(d));
  dt.setDate(dt.getDate() + days);
  return dt;
}

// Chiều cao dải trục thời gian (month axis) phía trên chart.
export const AXIS_HEIGHT = 26;

// Tính khoảng thời gian hiển thị của timeline sao cho BAO TRÙM toàn bộ:
// project start/end + mọi bar + mọi milestone (kể cả milestone trong bar).
// Có padding 2 bên. Fallback quanh hôm nay nếu không có ngày nào.
export function computeDomain(project, bars = [], milestones = []) {
  const times = [];
  const push = (v) => {
    const d = parseDate(v);
    if (d) times.push(d.getTime());
  };

  push(project?.start_date);
  push(project?.end_date);
  bars.forEach((b) => {
    push(b.start_date);
    push(b.end_date);
    (b.bar_milestones || []).forEach((m) => push(m.date));
  });
  milestones.forEach((m) => push(m.date));

  let start;
  let end;
  if (times.length === 0) {
    const today = new Date();
    start = addDays(today, -30);
    end = addDays(today, 60);
  } else {
    start = new Date(Math.min(...times));
    end = new Date(Math.max(...times));
  }

  // Padding 2 tuần mỗi bên, và đảm bảo tối thiểu ~30 ngày.
  start = addDays(start, -14);
  end = addDays(end, 14);
  if (daysBetween(start, end) < 30) end = addDays(start, 30);

  return { start: toISODate(start), end: toISODate(end) };
}

// chartWidth px cho toàn bộ [startDate, endDate] tại 1 zoom level.
export function chartWidthFor(startDate, endDate, zoom) {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const z = ZOOM[zoom] || ZOOM.month;
  return Math.max(400, (totalDays / z.days) * z.unitWidth);
}

export function dateToX(date, startDate, endDate, chartWidth) {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const offsetDays = daysBetween(startDate, date);
  return (offsetDays / totalDays) * chartWidth;
}

export function xToDate(x, startDate, endDate, chartWidth) {
  const totalDays = Math.max(1, daysBetween(startDate, endDate));
  const offsetDays = (x / chartWidth) * totalDays;
  return addDays(startDate, Math.round(offsetDays));
}

export function barX(startDate, projectStart, projectEnd, chartWidth) {
  return dateToX(startDate, projectStart, projectEnd, chartWidth);
}

export function barWidth(startDate, endDate, projectStart, projectEnd, chartWidth) {
  const x1 = dateToX(startDate, projectStart, projectEnd, chartWidth);
  const x2 = dateToX(endDate, projectStart, projectEnd, chartWidth);
  return Math.max(2, x2 - x1);
}

// Nhãn trục thời gian: chia [start, end] thành các mốc tháng (luôn dùng
// tháng làm đơn vị hiển thị header, bất kể zoom level đang chọn).
export function monthTicks(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return [];
  const ticks = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= end) {
    ticks.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
}

export function fmtMonthYear(d) {
  const dt = parseDate(d);
  if (!dt) return "";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

export function fmtShortDate(d) {
  const dt = parseDate(d);
  if (!dt) return "—";
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
}

export function weeksUntil(dateStr, today = new Date()) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return Math.round(daysBetween(today, d) / 7);
}

export function daysUntil(dateStr, today = new Date()) {
  const d = parseDate(dateStr);
  if (!d) return null;
  return daysBetween(today, d);
}

export const MILESTONE_COLOR = {
  done: "#22c55e",
  upcoming: "#6366f1",
  at_risk: "#f59e0b",
};

export const BAR_STATUS_META = {
  not_started: { label: "Not started", tone: "text-slate-500", dot: "⚪" },
  in_progress: { label: "In Progress", tone: "text-blue-600", dot: "🔵" },
  done: { label: "Done", tone: "text-green-600", dot: "✓" },
  blocked: { label: "Blocked", tone: "text-red-600", dot: "⚠" },
};

export const TRACK_COLOR_PRESETS = [
  "#6366f1",
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
  "#64748b",
];

export const ROW_HEIGHT = 40;
// Track hệ thống MARVELL MILESTONES cao hơn để chứa label trên/dưới xen kẽ.
export const SYSTEM_ROW_HEIGHT = 60;

export function rowHeightFor(row) {
  return row.type === "system" ? SYSTEM_ROW_HEIGHT : ROW_HEIGHT;
}

// Tính top offset + height cho từng row (row cao thấp khác nhau).
export function rowLayout(rows) {
  let y = 0;
  const items = rows.map((row) => {
    const height = rowHeightFor(row);
    const item = { row, top: y, height };
    y += height;
    return item;
  });
  return { items, totalHeight: y };
}

// Truncate label dài > max ký tự thành 6 ký tự + "..." (full name hiện ở tooltip).
export function truncateLabel(name, max = 8) {
  if (!name) return "";
  return name.length > max ? `${name.slice(0, 6)}...` : name;
}

// Bố trí label milestone trong 1 row: xen kẽ trên/dưới + min spacing 40px.
// Không dịch diamond, chỉ dịch label sang phải khi 2 milestone quá gần.
export function layoutMilestoneLabels(
  milestones,
  projectStart,
  projectEnd,
  chartWidth
) {
  const sorted = milestones
    .map((m) => ({ m, cx: dateToX(m.date, projectStart, projectEnd, chartWidth) }))
    .sort((a, b) => a.cx - b.cx);

  let prevX = null;
  return sorted.map((item, i) => {
    const side = i % 2 === 0 ? "above" : "below";
    let offsetX = 0;
    if (prevX !== null) {
      const spacing = item.cx - prevX;
      if (spacing < 40) offsetX = Math.max(0, 40 - spacing);
    }
    prevX = item.cx;
    return { milestone: item.m, cx: item.cx, side, offsetX };
  });
}

// Ghép tracks (flat, có parent_id) + bars + milestones thành danh sách rows
// phẳng để render đồng bộ giữa TrackPanel và ChartPanel. Row đầu tiên luôn
// là track hệ thống "MARVELL MILESTONES" (id 0).
export function buildTimelineRows(tracks, bars, milestones) {
  const byParent = new Map();
  tracks.forEach((t) => {
    if (t.is_system) return;
    const key = t.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(t);
  });
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order);
  }

  const rows = [];
  const systemTrack = tracks.find((t) => t.is_system) || {
    id: 0,
    name: "MARVELL MILESTONES",
    color: "#64748b",
    is_system: true,
  };
  rows.push({
    key: "system",
    type: "system",
    track: systemTrack,
    depth: 0,
    milestones: milestones.filter((m) => m.track_id === systemTrack.id),
    bars: [],
  });

  function walk(parentKey, depth) {
    const children = byParent.get(parentKey) || [];
    for (const t of children) {
      rows.push({
        key: `track-${t.id}`,
        type: "track",
        track: t,
        depth,
        milestones: milestones.filter((m) => m.track_id === t.id),
        bars: bars.filter((b) => b.track_id === t.id),
      });
      if (!t.is_collapsed) walk(t.id, depth + 1);
    }
  }
  walk("root", 0);
  return rows;
}


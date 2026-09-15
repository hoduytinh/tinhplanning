// Helpers dùng chung trong module dashboard.

// Greeting theo giờ hiện tại.
export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h >= 6 && h < 12) return "☀️ Chào buổi sáng";
  if (h >= 12 && h < 18) return "🌤 Chào buổi chiều";
  if (h >= 18 && h < 24) return "🌙 Chào buổi tối";
  return "🌙 Làm muộn vậy";
}

const WEEKDAYS = [
  "Chủ Nhật",
  "Thứ Hai",
  "Thứ Ba",
  "Thứ Tư",
  "Thứ Năm",
  "Thứ Sáu",
  "Thứ Bảy",
];

export function formatToday(now = new Date()) {
  const wd = WEEKDAYS[now.getDay()];
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${wd}, ${dd}/${mm}/${now.getFullYear()}`;
}

// Tên hiển thị project (prefix ưu tiên, fallback name).
export function projectLabel(p) {
  if (!p) return "";
  return p.prefix || p.name || `#${p.id}`;
}

// ISO week number của hôm nay (khớp backend).
export function currentWeekNumber(now = new Date()) {
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function currentWeekLabel(now = new Date()) {
  return `W${String(currentWeekNumber(now)).padStart(2, "0")}`;
}

// Trích số tuần từ nhãn "W58" / "W58/2026".
export function weekNumberOf(label) {
  if (!label) return null;
  const m = /[Ww]\s*(\d{1,2})/.exec(label);
  return m ? Number(m[1]) : null;
}

// Thanh progress dạng khối █/░ (10 ô) cho hiển thị kiểu bảng.
export function bar(pct, size = 10) {
  if (pct == null) return "░".repeat(size);
  const filled = Math.max(0, Math.min(size, Math.round((pct / 100) * size)));
  return "█".repeat(filled) + "░".repeat(size - filled);
}

export function fmtPct(v, digits = 1) {
  if (v == null) return "—";
  return `${Number(v).toFixed(digits)}%`;
}

// Gap status cho Recovery Radar. isPercent: metric coverage (dùng điểm %).
export function gapStatus(gap) {
  if (gap == null) return { dot: "⚪", label: "—", tone: "text-slate-400" };
  if (gap >= 0) return { dot: "🟢", label: "Ahead", tone: "text-green-600" };
  if (gap >= -10) return { dot: "🟡", label: "Close", tone: "text-amber-600" };
  return { dot: "🔴", label: "Behind", tone: "text-red-600" };
}

// Số tuần còn lại tới 1 ngày mốc.
export function weeksUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const diff = target - new Date();
  return Math.round(diff / (7 * 86400000));
}

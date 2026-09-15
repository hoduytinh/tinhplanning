// Hằng số dùng chung cho module Cuộc họp.

export const MEETING_STATUSES = [
  { value: "upcoming", label: "Sắp diễn ra", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "Đang diễn ra", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "done", label: "Đã xong", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Đã hủy", tone: "bg-slate-100 text-slate-500 border-slate-200" },
];

export const RECURRING_OPTIONS = [
  { value: "none", label: "Không lặp" },
  { value: "weekly", label: "Hàng tuần" },
  { value: "biweekly", label: "2 tuần/lần" },
  { value: "monthly", label: "Hàng tháng" },
  { value: "custom", label: "Tùy chỉnh (ngày)" },
];

export const ACTION_PRIORITIES = [
  { value: "critical", label: "🔴 Critical", tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "important", label: "🟠 Important", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "normal", label: "🟢 Normal", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export const ACTION_STATUSES = [
  { value: "open", label: "Mở", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "done", label: "Xong", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Hủy", tone: "bg-slate-100 text-slate-500 border-slate-200" },
];

export const SECTION_TYPES = [
  { value: "coverage_widget", label: "Coverage Widget", icon: "📊" },
  { value: "bug_widget", label: "Bug Stats", icon: "🐞" },
  { value: "blocker_table", label: "Bảng (Blocker/Question)", icon: "📋" },
  { value: "milestone_widget", label: "Milestones", icon: "🎯" },
  { value: "workload_widget", label: "Workload", icon: "👥" },
  { value: "decision_log", label: "Decision Log", icon: "✅" },
  { value: "risk_widget", label: "Risks", icon: "⚠️" },
  { value: "notes", label: "Ghi chú (rich text)", icon: "📝" },
  { value: "action_items", label: "Action Items", icon: "☑️" },
  { value: "custom", label: "Tùy chỉnh", icon: "🔧" },
];

export const TEMPLATE_TYPE_OPTIONS = [
  { value: "custom", label: "Tùy chỉnh" },
  { value: "dv_internal", label: "DV Internal" },
  { value: "dne", label: "DnE" },
  { value: "project_cft", label: "Project CFT" },
  { value: "bug_review", label: "Bug Review" },
  { value: "design_review", label: "Design Review" },
  { value: "one_on_one", label: "1:1" },
];

export const TEMPLATE_ICONS = ["📅", "🔵", "🟠", "🟣", "🔴", "🟡", "🟢", "🐞", "📊", "🎯", "🧩", "📝"];

export const TEMPLATE_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#10b981",
  "#0ea5e9",
  "#ec4899",
];

// Bảng màu nền nhẹ nhàng cho section (để phân biệt trực quan, không chói).
export const SECTION_COLORS = [
  { value: "#ffffff", label: "Trắng" },
  { value: "#f6f9fb", label: "Xám nhạt" },
  { value: "#e9f2ff", label: "Xanh dương nhạt" },
  { value: "#e3fdff", label: "Xanh ngọc nhạt" },
  { value: "#e5fcf7", label: "Xanh mint nhạt" },
  { value: "#eafdf0", label: "Xanh lá nhạt" },
  { value: "#fefbdd", label: "Vàng nhạt" },
  { value: "#fff4e6", label: "Cam nhạt" },
  { value: "#feeded", label: "Đỏ nhạt" },
  { value: "#fdeff7", label: "Hồng nhạt" },
  { value: "#f3f0ff", label: "Tím nhạt" },
  { value: "#edf1f6", label: "Xanh xám nhạt" },
];

export function metaFrom(list, value, fallback = null) {
  return list.find((x) => x.value === value) || fallback;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export function fmtTime(t) {
  if (!t) return "";
  // t dạng "HH:MM:SS" hoặc "HH:MM"
  return t.slice(0, 5);
}

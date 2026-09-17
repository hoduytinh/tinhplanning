// Hằng số dùng chung cho module Cuộc họp.

export const MEETING_STATUSES = [
  { value: "upcoming", label: "Upcoming", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "In Progress", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "done", label: "Done", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Cancelled", tone: "bg-slate-100 text-slate-500 border-slate-200" },
];

export const RECURRING_OPTIONS = [
  { value: "none", label: "Does not repeat" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (days)" },
];

export const ACTION_PRIORITIES = [
  { value: "critical", label: "🔴 Critical", tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "important", label: "🟠 Important", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "normal", label: "🟢 Normal", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export const ACTION_STATUSES = [
  { value: "open", label: "Open", tone: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "done", label: "Done", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Cancelled", tone: "bg-slate-100 text-slate-500 border-slate-200" },
];

export const SECTION_TYPES = [
  { value: "coverage_widget", label: "Coverage Widget", icon: "📊" },
  { value: "bug_widget", label: "Bug Stats", icon: "🐞" },
  { value: "blocker_table", label: "Table (Blocker/Question)", icon: "📋" },
  { value: "milestone_widget", label: "Milestones", icon: "🎯" },
  { value: "workload_widget", label: "Workload", icon: "👥" },
  { value: "decision_log", label: "Decision Log", icon: "✅" },
  { value: "risk_widget", label: "Risks", icon: "⚠️" },
  { value: "notes", label: "Notes (rich text)", icon: "📝" },
  { value: "action_items", label: "Action Items", icon: "☑️" },
  { value: "custom", label: "Custom", icon: "🔧" },
];

export const TEMPLATE_TYPE_OPTIONS = [
  { value: "custom", label: "Custom" },
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
  { value: "#ffffff", label: "White" },
  { value: "#f6f9fb", label: "Light Gray" },
  { value: "#e9f2ff", label: "Light Blue" },
  { value: "#e3fdff", label: "Light Cyan" },
  { value: "#e5fcf7", label: "Light Mint" },
  { value: "#eafdf0", label: "Light Green" },
  { value: "#fefbdd", label: "Light Yellow" },
  { value: "#fff4e6", label: "Light Orange" },
  { value: "#feeded", label: "Light Red" },
  { value: "#fdeff7", label: "Light Pink" },
  { value: "#f3f0ff", label: "Light Purple" },
  { value: "#edf1f6", label: "Light Slate" },
];

export function metaFrom(list, value, fallback = null) {
  return list.find((x) => x.value === value) || fallback;
}

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

export function fmtTime(t) {
  if (!t) return "";
  // t dạng "HH:MM:SS" hoặc "HH:MM"
  return t.slice(0, 5);
}

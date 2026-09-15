// Constants + helpers cho Module Projects. Tách riêng khỏi Tasks để không đụng
// tới taskConstants.js. `tone` là chuỗi class Tailwind theo design system.

// Tab/tính năng OPTIONAL của Project Detail Page — mặc định TẮT, bật qua
// "Sửa dự án" (enabled_modules). 3 tab Tổng quan/Công việc/Hoạt động luôn có
// sẵn, không nằm trong danh sách này.
export const OPTIONAL_MODULES = [
  { key: "subblocks", label: "Sub-blocks" },
  { key: "coverage", label: "Coverage" },
  { key: "documents", label: "Documents" },
  { key: "bugs", label: "Bugs" },
  { key: "signoff", label: "Signoff" },
  { key: "recovery", label: "Recovery" },
];

// Bảng màu preset cho prefix task — mặc định xanh dương (blue).
export const PREFIX_COLOR_PRESETS = [
  { value: "#3b82f6", label: "Xanh dương" },
  { value: "#6366f1", label: "Indigo" },
  { value: "#a855f7", label: "Tím" },
  { value: "#ec4899", label: "Hồng" },
  { value: "#ef4444", label: "Đỏ" },
  { value: "#f97316", label: "Cam" },
  { value: "#eab308", label: "Vàng" },
  { value: "#22c55e", label: "Xanh lá" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#64748b", label: "Xám" },
];
export const DEFAULT_PREFIX_COLOR = "#3b82f6";

export const PROJECT_STATUSES = [
  {
    value: "planning",
    label: "Planning",
    icon: "○",
    color: "#94a3b8",
    tone: "bg-slate-100 text-slate-600 border-slate-200",
  },
  {
    value: "in_progress",
    label: "In Progress",
    icon: "◑",
    color: "#3b82f6",
    tone: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    value: "review",
    label: "Review",
    icon: "◎",
    color: "#9333ea",
    tone: "bg-purple-50 text-purple-600 border-purple-200",
  },
  {
    value: "done",
    label: "Done",
    icon: "✓",
    color: "#16a34a",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
];

export const PROJECT_PRIORITIES = [
  {
    value: "critical",
    label: "🔴 Critical",
    tone: "bg-red-50 text-red-600 border-red-200",
  },
  {
    value: "important",
    label: "🟠 Important",
    tone: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    value: "normal",
    label: "🟢 Normal",
    tone: "bg-green-50 text-green-600 border-green-200",
  },
  {
    value: "backlog",
    label: "⚪ Backlog",
    tone: "bg-slate-100 text-slate-500 border-slate-200",
  },
];

// Health: on_track / at_risk / off_track / no_data
export const PROJECT_HEALTHS = [
  {
    value: "on_track",
    label: "On Track",
    dot: "🟢",
    tone: "bg-green-50 text-green-700 border-green-200",
    bar: "bg-green-500",
    color: "#16a34a",
  },
  {
    value: "at_risk",
    label: "At Risk",
    dot: "🟡",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
    bar: "bg-amber-500",
    color: "#d97706",
  },
  {
    value: "off_track",
    label: "Off Track",
    dot: "🔴",
    tone: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-500",
    color: "#dc2626",
  },
  {
    value: "no_data",
    label: "No Data",
    dot: "⚪",
    tone: "bg-slate-100 text-slate-500 border-slate-200",
    bar: "bg-slate-400",
    color: "#94a3b8",
  },
];

export const MILESTONE_STATUSES = [
  { value: "not_started", label: "Not Started", icon: "○", color: "#94a3b8" },
  { value: "in_progress", label: "In Progress", icon: "◑", color: "#3b82f6" },
  { value: "done", label: "Done", icon: "✓", color: "#16a34a" },
];

// Marvell standard milestone types. Badge màu khác nhau theo giai đoạn.
export const MILESTONE_TYPES = [
  { value: "por", label: "POR", tone: "bg-slate-100 text-slate-600 border-slate-200" },
  { value: "irtl", label: "iRTL", tone: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "cc", label: "CC", tone: "bg-purple-50 text-purple-600 border-purple-200" },
  { value: "fpf", label: "FPF", tone: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  { value: "rtlf", label: "RTLF", tone: "bg-orange-50 text-orange-600 border-orange-200" },
  { value: "fdr", label: "FDR", tone: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "tapeout", label: "TO", tone: "bg-red-50 text-red-600 border-red-200" },
  { value: "custom", label: "Custom", tone: "bg-slate-100 text-slate-500 border-slate-200" },
];

// Exit criteria gợi ý tự động theo milestone_type (hardcode trong frontend).
// Dùng làm fallback khi milestone chưa có exit_criteria lưu trong DB.
export const EXIT_CRITERIA_SUGGESTIONS = {
  por: ["Verif Strategy reviewed", "Test plan initial", "Schedule committed"],
  irtl: ["TB bring-up done", "basic tests pass", "Verif Strategy reviewed"],
  cc: ["Full TB done", "80%+ pass rate", "coverage coded", "DFT verified"],
  fpf: ["Interface coverage done", "major stress tests done"],
  rtlf: [
    "100% code/func coverage (w/ waivers)",
    "2 weeks bug-free",
    "ECO mode",
  ],
  fdr: ["All verification complete", "final netlist verified"],
  tapeout: ["Archive complete", "GDS delivered"],
  custom: [],
};

export const RISK_SEVERITIES = [
  {
    value: "high",
    label: "High",
    dot: "🔴",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
  {
    value: "medium",
    label: "Medium",
    dot: "🟡",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "low",
    label: "Low",
    dot: "🟢",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
];

export const PROJECT_SORT_OPTIONS = [
  { value: "name", label: "Tên" },
  { value: "start_date", label: "Ngày bắt đầu" },
  { value: "end_date", label: "Ngày kết thúc" },
  { value: "progress", label: "% hoàn thành" },
];

const _lookup = (list, value) => list.find((x) => x.value === value);

export const projectStatusMeta = (v) =>
  _lookup(PROJECT_STATUSES, v) || PROJECT_STATUSES[0];
export const projectPriorityMeta = (v) =>
  _lookup(PROJECT_PRIORITIES, v) || PROJECT_PRIORITIES[2];
export const healthMeta = (v) =>
  _lookup(PROJECT_HEALTHS, v) || PROJECT_HEALTHS[3];
export const milestoneStatusMeta = (v) =>
  _lookup(MILESTONE_STATUSES, v) || MILESTONE_STATUSES[0];
export const riskSeverityMeta = (v) =>
  _lookup(RISK_SEVERITIES, v) || RISK_SEVERITIES[1];
export const milestoneTypeMeta = (v) =>
  _lookup(MILESTONE_TYPES, v) || MILESTONE_TYPES[MILESTONE_TYPES.length - 1];

// Parse chuỗi exit_criteria (phân cách bằng dấu phẩy) thành mảng item.
// Fallback về gợi ý theo type nếu chưa có dữ liệu.
export function parseExitCriteria(milestone) {
  const raw = (milestone?.exit_criteria || "").trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return EXIT_CRITERIA_SUGGESTIONS[milestone?.milestone_type] || [];
}

// ---------------------------------------------------------------------------
// Coverage dashboard config
// ---------------------------------------------------------------------------
// Mỗi metric: cách lấy giá trị hiện tại từ 1 snapshot + target.
// type "field": đọc trực tiếp field. type "ratio": num/den * 100.
export const COVERAGE_METRICS = [
  { key: "pass_rate", label: "Test Pass Rate", target: 100, type: "ratio", num: "passed_tests", den: "total_tests" },
  { key: "testplan", label: "Testplan Cov", target: 100, type: "ratio", num: "testplan_passed", den: "testplan_total" },
  { key: "cov_statement", label: "Statement", target: 100, type: "field", field: "cov_statement" },
  { key: "cov_branch", label: "Branch", target: 100, type: "field", field: "cov_branch" },
  { key: "cov_toggle", label: "I/O Toggle", target: 100, type: "field", field: "cov_toggle" },
  { key: "cov_fsm", label: "FSM", target: 100, type: "field", field: "cov_fsm" },
  { key: "cov_expression", label: "Expression", target: 95, type: "field", field: "cov_expression" },
  { key: "cov_acov", label: "Func Cov (ACOV)", target: 100, type: "field", field: "cov_acov" },
];

// Lấy giá trị % của 1 metric từ snapshot (null nếu thiếu dữ liệu mẫu số).
export function coverageValue(metric, snapshot) {
  if (!snapshot) return null;
  if (metric.type === "ratio") {
    const den = Number(snapshot[metric.den]) || 0;
    if (den <= 0) return null;
    return (Number(snapshot[metric.num] || 0) / den) * 100;
  }
  const v = snapshot[metric.field];
  return v == null ? null : Number(v);
}

// Status badge: 🟢 ≥ target-5 | 🟡 target-20 .. target-5 | 🔴 dưới target-20.
export function coverageStatus(value, target) {
  if (value == null) return "gray";
  if (value >= target - 5) return "green";
  if (value >= target - 20) return "yellow";
  return "red";
}

export const COVERAGE_STATUS_META = {
  green: { dot: "🟢", tone: "bg-green-50 text-green-700 border-green-200" },
  yellow: { dot: "🟡", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  red: { dot: "🔴", tone: "bg-red-50 text-red-700 border-red-200" },
  gray: { dot: "⚪", tone: "bg-slate-100 text-slate-500 border-slate-200" },
};

// Format ngày dd/MM/yyyy cho hiển thị gọn.
export function formatShortDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// Định dạng ngày giờ đầy đủ cho activity feed.
export function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
}

// Milestone/việc quá hạn: due_date < hôm nay và chưa done.
export function isDatePast(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// ---------------------------------------------------------------------------
// Documents hub config
// ---------------------------------------------------------------------------
// Category = 1 section trên UI. order quyết định thứ tự hiển thị.
export const DOCUMENT_CATEGORIES = [
  { value: "spec", label: "Specifications", icon: "📋" },
  { value: "verif_doc", label: "Verification Docs", icon: "📊" },
  { value: "status", label: "Status & Tracking", icon: "📈" },
  { value: "tool", label: "Tools & Repos", icon: "🔗" },
  { value: "other", label: "Other", icon: "📁" },
];

// doc_type → icon + nhãn nguồn (source) hiển thị bên phải.
export const DOCUMENT_TYPES = [
  { value: "mas", label: "MAS", icon: "📄" },
  { value: "testplan", label: "Test Plan", icon: "📊" },
  { value: "verif_strategy", label: "Verif Strategy", icon: "📋" },
  { value: "tb_env", label: "TB Env", icon: "🖼" },
  { value: "dashboard", label: "Dashboard", icon: "📊" },
  { value: "tracker", label: "Tracker", icon: "📊" },
  { value: "jira", label: "JIRA", icon: "🐛" },
  { value: "ewiki", label: "Ewiki", icon: "🌐" },
  { value: "confluence", label: "Confluence", icon: "🌐" },
  { value: "sharepoint", label: "SharePoint", icon: "📄" },
  { value: "other", label: "Other", icon: "📁" },
];

export const documentCategoryMeta = (v) =>
  _lookup(DOCUMENT_CATEGORIES, v) ||
  DOCUMENT_CATEGORIES[DOCUMENT_CATEGORIES.length - 1];
export const documentTypeMeta = (v) =>
  _lookup(DOCUMENT_TYPES, v) || DOCUMENT_TYPES[DOCUMENT_TYPES.length - 1];

// URL http/https là link mở tab mới; còn lại (server path) hiển thị dạng code.
export function isWebUrl(url) {
  return /^https?:\/\//i.test((url || "").trim());
}

// ---------------------------------------------------------------------------
// Bugs config
// ---------------------------------------------------------------------------
export const BUG_SEVERITIES = [
  { value: "critical", label: "Critical", dot: "🔴", tone: "bg-red-50 text-red-700 border-red-200" },
  { value: "high", label: "High", dot: "🟠", tone: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "medium", label: "Medium", dot: "🟡", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "low", label: "Low", dot: "🟢", tone: "bg-green-50 text-green-700 border-green-200" },
];

export const BUG_STATUSES = [
  { value: "open", label: "Open", icon: "●", tone: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "in_progress", label: "In Progress", icon: "◑", tone: "bg-purple-50 text-purple-600 border-purple-200" },
  { value: "closed", label: "Closed", icon: "✓", tone: "bg-green-50 text-green-700 border-green-200" },
  { value: "cancelled", label: "Cancelled", icon: "✕", tone: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "waived", label: "Waived", icon: "⊘", tone: "bg-cyan-50 text-cyan-600 border-cyan-200" },
];

export const bugSeverityMeta = (v) =>
  _lookup(BUG_SEVERITIES, v) || BUG_SEVERITIES[2];
export const bugStatusMeta = (v) =>
  _lookup(BUG_STATUSES, v) || BUG_STATUSES[0];

// Thứ tự severity để sort (critical cao nhất).
export const BUG_SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
export const BUG_STATUS_ORDER = {
  open: 0,
  in_progress: 1,
  waived: 2,
  closed: 3,
  cancelled: 4,
};

// ---------------------------------------------------------------------------
// Signoff config
// ---------------------------------------------------------------------------
export const SIGNOFF_MILESTONES = [
  { value: "irtl", label: "iRTL" },
  { value: "cc", label: "CC" },
  { value: "fpf", label: "FPF" },
  { value: "rtlf", label: "RTLF" },
  { value: "fdr", label: "FDR" },
  { value: "to", label: "TO" },
];

export const SIGNOFF_STATUSES = [
  { value: "not_started", label: "Not Started", icon: "○", tone: "bg-slate-100 text-slate-500 border-slate-200" },
  { value: "in_progress", label: "In Progress", icon: "◑", tone: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "done", label: "Done", icon: "✓", tone: "bg-green-50 text-green-700 border-green-200" },
  { value: "waived", label: "Waived", icon: "⊘", tone: "bg-cyan-50 text-cyan-600 border-cyan-200" },
  { value: "na", label: "N/A", icon: "—", tone: "bg-slate-100 text-slate-400 border-slate-200" },
];

export const signoffStatusMeta = (v) =>
  _lookup(SIGNOFF_STATUSES, v) || SIGNOFF_STATUSES[0];

// Các trạng thái tính là "hoàn thành" khi đo tiến độ.
export const SIGNOFF_DONE_STATUSES = ["done", "waived", "na"];

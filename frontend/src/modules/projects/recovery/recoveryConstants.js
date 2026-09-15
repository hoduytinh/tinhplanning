// Constants + helpers dùng chung cho Recovery (Tab 8 + Recovery Radar).

export const METRIC_STATUS_META = {
  on_track: { dot: "🟢", label: "On Track", tone: "text-green-600" },
  close: { dot: "🟡", label: "Close", tone: "text-amber-600" },
  behind: { dot: "🔴", label: "Behind", tone: "text-red-600" },
  no_data: { dot: "⚪", label: "—", tone: "text-slate-400" },
};

export const OVERALL_STATUS_META = {
  on_track: {
    dot: "🟢",
    label: "ON TRACK",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
  close: {
    dot: "🟡",
    label: "CLOSE",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  at_risk: {
    dot: "🟡",
    label: "AT RISK",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  critical: {
    dot: "🔴",
    label: "CRITICAL",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
};

export const OUTCOME_STATUS_META = {
  planned: {
    dot: "⚪",
    label: "Planned",
    tone: "bg-slate-100 text-slate-500 border-slate-200",
  },
  done: {
    dot: "🟢",
    label: "Done",
    tone: "bg-green-50 text-green-700 border-green-200",
  },
  partial: {
    dot: "🟡",
    label: "Partial",
    tone: "bg-amber-50 text-amber-700 border-amber-200",
  },
  missed: {
    dot: "🔴",
    label: "Missed",
    tone: "bg-red-50 text-red-700 border-red-200",
  },
};

// Metric hiển thị trong Trend chart (khớp thứ tự backend trả về ở /gap và /trend).
export const TREND_METRICS = [
  { key: "pass_rate", label: "Pass Rate", getter: (s) => passRate(s), color: "#2563eb" },
  { key: "testplan", label: "Testplan", getter: (s) => testplanPct(s), color: "#9333ea" },
  { key: "statement", label: "Statement", getter: (s) => s.cov_statement, color: "#0891b2" },
  { key: "toggle", label: "Toggle", getter: (s) => s.cov_toggle, color: "#d97706" },
  { key: "branch", label: "Branch", getter: (s) => s.cov_branch, color: "#16a34a" },
  { key: "expression", label: "Expression", getter: (s) => s.cov_expression, color: "#dc2626" },
  { key: "acov", label: "ACOV", getter: (s) => s.cov_acov, color: "#7c3aed" },
];

export function passRate(s) {
  if (!s || !s.total_tests) return null;
  return (s.passed_tests / s.total_tests) * 100;
}

export function testplanPct(s) {
  if (!s || !s.testplan_total) return null;
  return (s.testplan_passed / s.testplan_total) * 100;
}

export function fmtMetricValue(name, v) {
  if (v == null) return "—";
  if (name === "Tests total" || name === "Testplan items") return String(v);
  return `${Number(v).toFixed(1)}%`;
}

export function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function currentWeekLabel(now = new Date()) {
  const d = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  );
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `W${String(week).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

export const EMPTY_ACCELERATION_ITEM = { name: "", task: "" };

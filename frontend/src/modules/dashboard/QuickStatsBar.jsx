import { useNavigate } from "react-router-dom";
import Card from "../../shared/components/Card";
import { fmtPct } from "./dashboardHelpers";

// Vùng E — dải 6 ô thống kê nhanh. Mỗi ô click điều hướng hoặc scroll.
export default function QuickStatsBar({ summary, onPendingClick }) {
  const navigate = useNavigate();
  if (!summary) return null;

  const pendingCount = summary.pending_snapshot_projects?.length || 0;
  const pendingLabel =
    pendingCount > 0
      ? `⚠️ ${summary.pending_snapshot_projects[0]?.prefix || "W?"}`
      : "✓";

  const cells = [
    {
      value: summary.active_tasks_count,
      label: "Tasks Active",
      onClick: () => navigate("/tasks"),
      tone: "text-slate-900",
    },
    {
      value: summary.overdue_count,
      label: "Overdue",
      onClick: () => navigate("/tasks"),
      tone: summary.overdue_count > 0 ? "text-red-600" : "text-slate-900",
    },
    {
      value: summary.blocked_count,
      label: "Blocked",
      onClick: () => navigate("/tasks"),
      tone: summary.blocked_count > 0 ? "text-amber-600" : "text-slate-900",
    },
    {
      value: summary.open_bugs_count,
      label: "Open Bugs",
      onClick: () => navigate("/projects"),
      tone: summary.open_bugs_count > 0 ? "text-red-600" : "text-slate-900",
    },
    {
      value: fmtPct(summary.top_pass_rate),
      label: summary.top_project_name
        ? `Pass Rate · ${summary.top_project_name}`
        : "Pass Rate",
      onClick: () =>
        summary.top_project_id &&
        navigate(`/projects/${summary.top_project_id}`),
      tone: "text-brand",
    },
    {
      value: pendingLabel,
      label: pendingCount > 0 ? "Pending Update" : "All Updated",
      onClick: onPendingClick,
      tone: pendingCount > 0 ? "text-amber-600" : "text-green-600",
    },
  ];

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={c.onClick}
            className="flex flex-col items-center justify-center gap-1 px-3 py-5 text-center transition hover:bg-slate-50"
          >
            <span className={`text-2xl font-bold ${c.tone}`}>{c.value}</span>
            <span className="text-xs font-medium text-slate-500">
              {c.label}
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

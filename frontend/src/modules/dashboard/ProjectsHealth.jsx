import { useNavigate } from "react-router-dom";
import { ArrowUp, ArrowDown, Activity } from "lucide-react";
import Card from "../../shared/components/Card";
import ProgressBar from "../../shared/components/ProgressBar";
import HealthBadge from "../projects/HealthBadge";
import { coverageValue } from "../projects/projectConstants";
import { fmtPct, projectLabel } from "./dashboardHelpers";

function Trend({ value }) {
  if (value == null || value === 0) return null;
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center ${
        up ? "text-green-600" : "text-red-600"
      }`}
    >
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
    </span>
  );
}

// Widget coverage rút gọn cho project sức khỏe xấu nhất.
function MiniCoverage({ row }) {
  const latest = row.latest_snapshot;
  const prev = row.prev_snapshot;
  if (!latest) return null;
  const metrics = [
    { key: "pass_rate", label: "Pass Rate", type: "ratio", num: "passed_tests", den: "total_tests" },
    { key: "testplan", label: "Testplan", type: "ratio", num: "testplan_passed", den: "testplan_total" },
    { key: "cov_toggle", label: "Toggle", type: "field", field: "cov_toggle" },
  ];
  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <p className="mb-2 text-xs font-semibold text-slate-700">
        {projectLabel(row)} — {latest.week_label} Coverage
      </p>
      <div className="space-y-1.5">
        {metrics.map((m) => {
          const cur = coverageValue(m, latest);
          const before = prev ? coverageValue(m, prev) : null;
          const delta =
            cur != null && before != null ? Number((cur - before).toFixed(1)) : null;
          return (
            <div key={m.key} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-slate-500">{m.label}</span>
              <ProgressBar value={cur} />
              <span className="w-12 text-right font-medium text-slate-700">
                {fmtPct(cur)}
              </span>
              {delta != null && (
                <span
                  className={`flex items-center gap-0.5 ${
                    delta >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  <Trend value={delta} />
                  {delta > 0 ? "+" : ""}
                  {delta}%
                  {delta < 0 && " ⚠️"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vùng B — Projects Health.
export default function ProjectsHealth({ rows }) {
  const navigate = useNavigate();
  const data = rows || [];
  const worst = data.find(
    (r) => r.health === "off_track" || r.health === "at_risk"
  );

  return (
    <Card className="flex h-full flex-col p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
        <Activity size={16} className="text-brand" />
        Projects Health
      </h2>
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-3">Project</th>
              <th className="py-2 pr-3">Milestone</th>
              <th className="py-2 pr-3">Health</th>
              <th className="py-2 pr-3">Pass%</th>
              <th className="py-2 pr-3">Testplan</th>
              <th className="py-2">Bugs</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Chưa có dự án active.
                </td>
              </tr>
            )}
            {data.map((r) => (
              <tr
                key={r.id}
                onClick={() => navigate(`/projects/${r.id}`)}
                title={`Tasks: ${r.tasks_total} · Done ${r.tasks_done} · Blocked ${r.tasks_blocked} · Overdue ${r.tasks_overdue}`}
                className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
              >
                <td className="py-2.5 pr-3 font-medium text-slate-800">
                  {projectLabel(r)}
                </td>
                <td className="py-2.5 pr-3 text-slate-500">
                  {r.next_milestone || "—"}
                </td>
                <td className="py-2.5 pr-3">
                  <HealthBadge health={r.health} size="sm" />
                </td>
                <td className="py-2.5 pr-3">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    {fmtPct(r.pass_rate)}
                    <Trend value={r.pass_rate_trend} />
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-slate-600">
                  {fmtPct(r.testplan_pct)}
                </td>
                <td className="py-2.5 text-slate-600">
                  {r.open_bugs > 0 ? `${r.open_bugs} Open` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {worst && <MiniCoverage row={worst} />}
    </Card>
  );
}

import { useEffect, useState } from "react";
import { LineChart, Plus } from "lucide-react";
import Card from "../../shared/components/Card";
import ProgressBar from "../../shared/components/ProgressBar";
import Select from "../../shared/components/Select";
import SnapshotForm from "./SnapshotForm";
import { fetchRegressionPulse } from "./dashboardApi";
import {
  currentWeekNumber,
  fmtPct,
  projectLabel,
  weekNumberOf,
} from "./dashboardHelpers";

function passRate(s) {
  if (!s || !s.total_tests) return null;
  return (s.passed_tests / s.total_tests) * 100;
}

function nextWeekLabel(snaps) {
  const last = snaps[snaps.length - 1];
  const n = last ? weekNumberOf(last.week_label) : null;
  const wk = n != null ? n + 1 : currentWeekNumber();
  return `W${String(wk).padStart(2, "0")}`;
}

// Vùng C — Regression Pulse.
export default function RegressionPulse({
  projects,
  projectId,
  onProjectChange,
  openFormToken = 0,
  onSnapshotSaved,
}) {
  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    if (!projectId) {
      setSnaps([]);
      return;
    }
    setLoading(true);
    fetchRegressionPulse(projectId)
      .then((data) => setSnaps(data))
      .catch(() => setSnaps([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Vùng E "Pending Update" bấm → mở form.
  useEffect(() => {
    if (openFormToken > 0) setShowForm(true);
  }, [openFormToken]);

  const project = projects.find((p) => p.id === projectId);
  const latestWeek = snaps.length
    ? weekNumberOf(snaps[snaps.length - 1].week_label)
    : null;
  const missingCurrent = latestWeek !== currentWeekNumber();
  const nextWk = nextWeekLabel(snaps);

  const handleSaved = () => {
    setShowForm(false);
    load();
    onSnapshotSaved?.();
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
          <LineChart size={16} className="text-brand" />
          Regression Pulse
          {project && (
            <span className="text-slate-400">— {projectLabel(project)}</span>
          )}
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Xem:</span>
          <Select
            value={projectId ? String(projectId) : ""}
            onChange={(e) => onProjectChange(Number(e.target.value))}
            options={projects.map((p) => ({
              value: String(p.id),
              label: projectLabel(p),
            }))}
            placeholder="Chọn dự án"
            ariaLabel="Chọn dự án"
            className="w-44"
          />
        </div>
      </div>

      {missingCurrent && snaps.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span>
            {`W${String(currentWeekNumber()).padStart(2, "0")}`} chưa được cập
            nhật
          </span>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="font-medium underline"
          >
            + Thêm ngay
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-400">Đang tải…</p>
      ) : snaps.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Chưa có snapshot cho dự án này.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <tbody>
              {snaps.map((s, i) => {
                const cur = passRate(s);
                const prev = i > 0 ? passRate(snaps[i - 1]) : null;
                const delta =
                  cur != null && prev != null ? cur - prev : null;
                const isLast = i === snaps.length - 1;
                let rowTone = "";
                if (delta != null && delta < 0) rowTone = "bg-red-50/70";
                else if (delta != null && delta >= 5) rowTone = "bg-green-50/70";
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-100 last:border-0 ${rowTone}`}
                  >
                    <td className="py-2 pr-3 font-medium text-slate-700">
                      {s.week_label}
                    </td>
                    <td className="py-2 pr-3 text-slate-500">
                      {s.total_tests} tests
                    </td>
                    <td className="py-2 pr-3 text-green-600">
                      {s.passed_tests}✓
                    </td>
                    <td className="py-2 pr-3 text-red-500">{s.failed_tests}✗</td>
                    <td className="py-2 pr-3 font-medium text-slate-700">
                      {fmtPct(cur)}
                    </td>
                    <td className="py-2 pr-3">
                      <ProgressBar value={cur} width="w-24" />
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {delta != null && (
                        <span
                          className={
                            delta < 0 ? "text-red-600" : "text-green-600"
                          }
                        >
                          {delta >= 0 ? "↑ +" : "↓ "}
                          {delta.toFixed(1)}%{delta < 0 ? " ⚠️" : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-2 text-xs text-brand">
                      {isLast && "← latest"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {snaps[snaps.length - 1]?.notes && (
            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
              📝 {snaps[snaps.length - 1].week_label} note: "
              {snaps[snaps.length - 1].notes}"
            </p>
          )}
        </div>
      )}

      {projectId && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Plus size={15} /> Update {nextWk} snapshot
        </button>
      )}

      {projectId && showForm && (
        <SnapshotForm
          projectId={projectId}
          defaultWeek={nextWk}
          onSaved={handleSaved}
          onCancel={() => setShowForm(false)}
        />
      )}
    </Card>
  );
}

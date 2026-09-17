import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, AlertCircle, Gauge, FileText, TrendingUp } from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Badge from "../../shared/components/Badge";
import {
  COVERAGE_METRICS,
  COVERAGE_STATUS_META,
  coverageStatus,
  coverageValue,
  formatShortDate,
} from "./projectConstants";
import {
  createCoverage,
  deleteCoverage,
  fetchCoverage,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

const EMPTY_SNAPSHOT = {
  week_label: "",
  snapshot_date: "",
  total_tests: 0,
  passed_tests: 0,
  failed_tests: 0,
  testplan_total: 0,
  testplan_passed: 0,
  cov_statement: 0,
  cov_branch: 0,
  cov_toggle: 0,
  cov_fsm: 0,
  cov_expression: 0,
  cov_acov: 0,
  cov_fcov: 0,
  regression_path: "",
  notes: "",
};

function fmtPct(v) {
  return v == null ? "—" : `${v.toFixed(1)}%`;
}

function DeltaCell({ delta }) {
  if (delta == null) {
    return <span className="text-slate-300">—</span>;
  }
  const up = delta >= 0;
  const sign = up ? "+" : "";
  return (
    <span className={up ? "text-green-600" : "text-red-600"}>
      {sign}
      {delta.toFixed(1)}%
    </span>
  );
}

// Tab 4 — Coverage: dashboard từ snapshot mới nhất + delta so với snapshot trước.
export default function CoverageTab({ projectId }) {
  const { role } = useAuth();
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detailSnap, setDetailSnap] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Backend trả snapshot theo ngày tăng dần → mới nhất ở cuối.
      setSnapshots(await fetchCoverage(projectId));
    } catch (err) {
      setError(err.message || "Failed to load coverage.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const latest = snapshots.length ? snapshots[snapshots.length - 1] : null;
  const previous =
    snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

  const handleCreate = async (payload) => {
    await createCoverage(projectId, payload);
    setFormOpen(false);
    await load();
  };

  const handleDelete = async (snap) => {
    if (!window.confirm(`Delete snapshot "${snap.week_label}"?`)) return;
    try {
      await deleteCoverage(projectId, snap.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete snapshot.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Gauge size={18} className="text-brand" />
          Coverage Dashboard
          {latest && (
            <span className="text-sm font-normal text-slate-500">
              — {latest.week_label}
            </span>
          )}
        </h3>
        {hasPermission(role, "projects", "update") && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus size={15} />
            Add snapshot
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && !latest && !error && (
        <Card className="p-10 text-center text-sm text-slate-500">
          No coverage snapshots yet. Add the first snapshot to start tracking.
        </Card>
      )}

      {/* Dashboard table */}
      {latest && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3 text-right">Target</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Delta</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {COVERAGE_METRICS.map((metric) => {
                const cur = coverageValue(metric, latest);
                const prev = coverageValue(metric, previous);
                const delta = cur != null && prev != null ? cur - prev : null;
                const st = coverageStatus(cur, metric.target);
                const meta = COVERAGE_STATUS_META[st];
                return (
                  <tr
                    key={metric.key}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {metric.label}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-500">
                      {metric.target}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {fmtPct(cur)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      <DeltaCell delta={delta} />
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}
                      >
                        {meta.dot}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {latest.regression_path && (
            <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
              <FileText size={13} />
              <span className="font-medium">Regression:</span>
              <span className="truncate">{latest.regression_path}</span>
            </div>
          )}
        </Card>
      )}

      {/* Mini chart: Pass% theo tuần */}
      {snapshots.length > 1 && <PassRateChart snapshots={snapshots} />}

      {/* Regression history table */}
      {snapshots.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            Regression History ({snapshots.length})
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Week</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 text-right">Pass</th>
                <th className="px-4 py-2.5 text-right">Fail</th>
                <th className="px-4 py-2.5 text-right">Pass%</th>
                <th className="px-4 py-2.5 text-right">Trend</th>
                <th className="px-4 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {[...snapshots].reverse().map((s, revIdx) => {
                // snapshots tăng dần theo ngày; bản đứng ngay trước s trong
                // thứ tự thời gian dùng để tính trend.
                const idx = snapshots.length - 1 - revIdx;
                const prev = idx > 0 ? snapshots[idx - 1] : null;
                const pass = coverageValue(COVERAGE_METRICS[0], s);
                const prevPass = coverageValue(COVERAGE_METRICS[0], prev);
                const trend =
                  pass != null && prevPass != null ? pass - prevPass : null;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setDetailSnap(s)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-700">
                      {s.week_label}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {s.total_tests}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {s.passed_tests}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">
                      {s.failed_tests}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                      {fmtPct(pass)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <TrendCell trend={trend} />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {hasPermission(role, "projects", "delete") && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(s);
                          }}
                          className="text-slate-300 transition hover:text-red-500"
                          aria-label="Delete snapshot"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <CoverageForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />

      <SnapshotDetail snap={detailSnap} onClose={() => setDetailSnap(null)} />
    </div>
  );
}

// Trend arrow: ↑ xanh / ↓ đỏ / — trung tính.
function TrendCell({ trend }) {
  if (trend == null) return <span className="text-slate-300">—</span>;
  if (Math.abs(trend) < 0.05) {
    return <span className="text-slate-400">→ 0%</span>;
  }
  const up = trend > 0;
  return (
    <span className={up ? "text-green-600" : "text-red-600"}>
      {up ? "↑" : "↓"} {up ? "+" : ""}
      {trend.toFixed(1)}%
    </span>
  );
}

// Mini line chart (inline SVG) — Pass% theo tuần, không dùng thư viện.
function PassRateChart({ snapshots }) {
  const pts = snapshots
    .map((s) => ({
      label: s.week_label,
      value: coverageValue(COVERAGE_METRICS[0], s),
    }))
    .filter((p) => p.value != null);

  if (pts.length < 2) return null;

  const W = 640;
  const H = 140;
  const padX = 32;
  const padY = 16;
  const values = pts.map((p) => p.value);
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const span = max - min || 1;

  const x = (i) => padX + (i * (W - 2 * padX)) / (pts.length - 1);
  const y = (v) => padY + (1 - (v - min) / span) * (H - 2 * padY);

  const line = pts.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${padX},${H - padY} ${line} ${x(pts.length - 1)},${H - padY}`;

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <TrendingUp size={16} className="text-brand" />
        Pass Rate Trend
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-36 w-full"
        preserveAspectRatio="none"
      >
        <polygon points={area} fill="#6366f1" fillOpacity="0.08" />
        <polyline
          points={line}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {pts.map((p, i) => (
          <g key={p.label}>
            <circle cx={x(i)} cy={y(p.value)} r="3" fill="#6366f1" />
            <text
              x={x(i)}
              y={H - 2}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "9px" }}
            >
              {p.label}
            </text>
            <text
              x={x(i)}
              y={y(p.value) - 7}
              textAnchor="middle"
              className="fill-slate-600"
              style={{ fontSize: "9px" }}
            >
              {p.value.toFixed(0)}%
            </text>
          </g>
        ))}
      </svg>
    </Card>
  );
}

// Modal chi tiết 1 snapshot.
function SnapshotDetail({ snap, onClose }) {
  if (!snap) return null;
  const rows = COVERAGE_METRICS.map((m) => ({
    label: m.label,
    value: coverageValue(m, snap),
  }));
  return (
    <Modal
      open={!!snap}
      onClose={onClose}
      title={`Snapshot — ${snap.week_label}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Total" value={snap.total_tests} />
          <Stat label="Pass" value={snap.passed_tests} />
          <Stat label="Fail" value={snap.failed_tests} />
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left">
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.label}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="px-3 py-1.5 text-slate-600">{r.label}</td>
                  <td className="px-3 py-1.5 text-right font-medium text-slate-900">
                    {fmtPct(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-slate-500">
          Date: {formatShortDate(snap.snapshot_date)}
        </div>
        {snap.regression_path && (
          <div className="break-all">
            <span className="font-medium text-slate-600">Regression: </span>
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
              {snap.regression_path}
            </code>
          </div>
        )}
        {snap.notes && (
          <div>
            <span className="font-medium text-slate-600">Notes: </span>
            <span className="text-slate-600">{snap.notes}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2 text-center">
      <div className="text-lg font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

// --- Form thêm snapshot ---------------------------------------------------
function CoverageForm({ open, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_SNAPSHOT);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_SNAPSHOT);
      setError("");
    }
  }, [open]);

  const setNum = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: Number(e.target.value) }));
  const setStr = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.week_label.trim()) {
      setError("Week label cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        week_label: form.week_label.trim(),
        snapshot_date: form.snapshot_date || null,
        regression_path: form.regression_path.trim() || null,
        notes: form.notes.trim() || null,
      });
    } catch (err) {
      setError(err.message || "Failed to save snapshot.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
  const label = "block text-xs font-medium text-slate-600";

  const numField = (key, text) => (
    <div>
      <label className={label}>{text}</label>
      <input
        type="number"
        step="0.1"
        className={field}
        value={form[key]}
        onChange={setNum(key)}
      />
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add coverage snapshot"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Week label *</label>
            <input
              className={field}
              value={form.week_label}
              onChange={setStr("week_label")}
              placeholder="W38/2026"
            />
          </div>
          <div>
            <label className={label}>Snapshot date</label>
            <input
              type="date"
              className={field}
              value={form.snapshot_date}
              onChange={setStr("snapshot_date")}
            />
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Tests
          </p>
          <div className="grid grid-cols-3 gap-3">
            {numField("total_tests", "Total")}
            {numField("passed_tests", "Passed")}
            {numField("failed_tests", "Failed")}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Testplan
          </p>
          <div className="grid grid-cols-2 gap-3">
            {numField("testplan_total", "Total")}
            {numField("testplan_passed", "Passed")}
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Coverage (%)
          </p>
          <div className="grid grid-cols-3 gap-3">
            {numField("cov_statement", "Statement")}
            {numField("cov_branch", "Branch")}
            {numField("cov_toggle", "I/O Toggle")}
            {numField("cov_fsm", "FSM")}
            {numField("cov_expression", "Expression")}
            {numField("cov_acov", "ACOV")}
            {numField("cov_fcov", "FCOV")}
          </div>
        </div>

        <div>
          <label className={label}>Regression path</label>
          <input
            className={field}
            value={form.regression_path}
            onChange={setStr("regression_path")}
            placeholder="/path/to/coverage/report"
          />
        </div>
        <div>
          <label className={label}>Notes</label>
          <textarea
            rows={2}
            className={field}
            value={form.notes}
            onChange={setStr("notes")}
          />
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from "react";
import { LineChart } from "lucide-react";
import Card from "../../../shared/components/Card";
import { fetchRecoveryTrend } from "./recoveryApi";
import { TREND_METRICS } from "./recoveryConstants";

const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function xAt(idx, n) {
  if (n <= 1) return PAD.left;
  return PAD.left + (idx / (n - 1)) * PLOT_W;
}

function yAt(value) {
  const clamped = Math.max(0, Math.min(100, value));
  return PAD.top + (1 - clamped / 100) * PLOT_H;
}

function buildPath(points) {
  // points: [{x, y} | null] — null = gap, tách thành nhiều đoạn.
  const segments = [];
  let current = [];
  for (const p of points) {
    if (p == null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(p);
    }
  }
  if (current.length) segments.push(current);
  return segments
    .map((seg) => "M " + seg.map((p) => `${p.x},${p.y}`).join(" L "))
    .join(" ");
}

// Sub-tab 3 — Trend Chart: line chart SVG + metric selector + projection +
// milestone markers + tooltip khi hover vào điểm.
export default function TrendChart({ projectId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(
    new Set(["pass_rate", "testplan", "toggle"])
  );
  const [hoverIdx, setHoverIdx] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchRecoveryTrend(projectId)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load trend."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const snapshots = data?.snapshots || [];
  const plans = data?.plans || [];
  const milestones = data?.milestones || [];
  const projections = data?.projections || [];

  const toggleMetric = (key) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const milestoneMarkers = useMemo(() => {
    const validDates = snapshots
      .map((s) => (s.snapshot_date ? new Date(s.snapshot_date) : null))
      .filter(Boolean);
    if (validDates.length < 2) return [];
    const first = validDates[0];
    const last = validDates[validDates.length - 1];
    const avgSpacing = (last - first) / (validDates.length - 1);
    if (!avgSpacing) return [];
    return milestones
      .filter((m) => m.date)
      .map((m) => {
        const d = new Date(m.date);
        const idx = (d - first) / avgSpacing;
        return { name: m.name, idx };
      })
      .filter((m) => m.idx >= -1 && m.idx <= snapshots.length + 4);
  }, [snapshots, milestones]);

  const nearestPlanFor = (idx) => {
    const snap = snapshots[idx];
    if (!snap) return null;
    return plans.find((p) => p.week_label === snap.week_label) || null;
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (error) {
    return <p className="py-10 text-center text-sm text-red-600">{error}</p>;
  }
  if (snapshots.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-slate-400">
        No coverage snapshots available to plot the trend.
      </Card>
    );
  }

  const n = snapshots.length;
  const hoverSnap = hoverIdx != null ? snapshots[hoverIdx] : null;
  const hoverPlan = hoverIdx != null ? nearestPlanFor(hoverIdx) : null;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
            <LineChart size={16} className="text-brand" />
            Recovery Trend
          </h3>
        </div>

        {/* Metric selector */}
        <div className="mb-3 flex flex-wrap gap-3">
          {TREND_METRICS.map((m) => (
            <label
              key={m.key}
              className="flex items-center gap-1.5 text-xs text-slate-600"
            >
              <input
                type="checkbox"
                checked={selected.has(m.key)}
                onChange={() => toggleMetric(m.key)}
                className="accent-brand"
              />
              <span style={{ color: m.color }}>●</span> {m.label}
            </label>
          ))}
        </div>

        <div className="relative overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full"
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* Grid + target line at 100% */}
            {[0, 25, 50, 75, 100].map((v) => (
              <line
                key={v}
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={yAt(v)}
                y2={yAt(v)}
                stroke="#e2e8f0"
                strokeDasharray={v === 100 ? "4 3" : undefined}
                strokeWidth={1}
              />
            ))}
            {[0, 25, 50, 75, 100].map((v) => (
              <text
                key={`lbl-${v}`}
                x={PAD.left - 6}
                y={yAt(v) + 3}
                textAnchor="end"
                fontSize="9"
                fill="#94a3b8"
              >
                {v}%
              </text>
            ))}

            {/* Milestone markers */}
            {milestoneMarkers.map((m) => (
              <g key={m.name}>
                <line
                  x1={xAt(m.idx, n)}
                  x2={xAt(m.idx, n)}
                  y1={PAD.top}
                  y2={HEIGHT - PAD.bottom}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={xAt(m.idx, n)}
                  y={PAD.top - 4}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#64748b"
                >
                  {m.name}
                </text>
              </g>
            ))}

            {/* Metric lines */}
            {TREND_METRICS.filter((m) => selected.has(m.key)).map((m) => {
              const points = snapshots.map((s, idx) => {
                const v = m.getter(s);
                return v == null ? null : { x: xAt(idx, n), y: yAt(v) };
              });
              return (
                <path
                  key={m.key}
                  d={buildPath(points)}
                  fill="none"
                  stroke={m.color}
                  strokeWidth={2}
                />
              );
            })}

            {/* Hover targets */}
            {snapshots.map((s, idx) => (
              <rect
                key={idx}
                x={xAt(idx, n) - (n > 1 ? PLOT_W / (n - 1) / 2 : PLOT_W / 2)}
                y={PAD.top}
                width={n > 1 ? PLOT_W / (n - 1) : PLOT_W}
                height={PLOT_H}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(idx)}
              />
            ))}
            {hoverIdx != null && (
              <line
                x1={xAt(hoverIdx, n)}
                x2={xAt(hoverIdx, n)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                stroke="#0ea5e9"
                strokeWidth={1}
              />
            )}

            {/* X axis labels */}
            {snapshots.map((s, idx) => (
              <text
                key={`x-${idx}`}
                x={xAt(idx, n)}
                y={HEIGHT - PAD.bottom + 14}
                textAnchor="middle"
                fontSize="9"
                fill="#94a3b8"
              >
                {s.week_label}
              </text>
            ))}
          </svg>

          {hoverSnap && (
            <div className="pointer-events-none absolute left-2 top-2 max-w-xs rounded-md border border-slate-200 bg-white p-2 text-xs shadow-md">
              <p className="font-semibold text-slate-800">
                {hoverSnap.week_label}: Pass{" "}
                {hoverSnap.total_tests
                  ? ((hoverSnap.passed_tests / hoverSnap.total_tests) * 100).toFixed(1)
                  : "—"}
                %
              </p>
              {hoverPlan?.issues && (
                <p className="mt-1 text-slate-600">Issues: {hoverPlan.issues}</p>
              )}
              {hoverPlan?.acceleration_items?.length > 0 && (
                <p className="mt-1 text-slate-600">
                  Plan:{" "}
                  {hoverPlan.acceleration_items
                    .map((it) => `${it.name}/${it.task}`)
                    .join(", ")}
                </p>
              )}
              {hoverPlan && hoverPlan.actual_items != null && (
                <p className="mt-1 text-slate-600">
                  Outcome: {hoverPlan.outcome_status} ({hoverPlan.actual_items}/
                  {hoverPlan.estimate_items ?? "?"} items)
                </p>
              )}
            </div>
          )}
        </div>
      </Card>

      {projections.length > 0 && (
        <Card className="p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            📈 Projection (based on recent average)
          </h4>
          <div className="space-y-1 text-sm">
            {projections.map((p) => (
              <p key={p.metric} className="text-slate-600">
                <span className="font-medium text-slate-700">{p.metric}:</span>{" "}
                {p.weeks_to_target == null
                  ? "not enough data to project"
                  : p.weeks_to_target === 0
                  ? `reached ${p.target}%`
                  : `will reach ${p.target}% by ${p.target_week_label}`}
                {p.vs_milestone === "before" && " ✓"}
                {p.vs_milestone === "after" && " ⚠️ Needs acceleration"}
              </p>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

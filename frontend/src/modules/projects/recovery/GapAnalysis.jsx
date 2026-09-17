import { useEffect, useState } from "react";
import { Pencil, Plus, Target } from "lucide-react";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import Badge from "../../../shared/components/Badge";
import {
  createRecoveryPlan,
  fetchRecoveryGap,
  updateRecoveryPlan,
} from "./recoveryApi";
import {
  METRIC_STATUS_META,
  OVERALL_STATUS_META,
  currentWeekLabel,
  fmtDate,
  fmtMetricValue,
} from "./recoveryConstants";
import PlanTargetsModal from "./PlanTargetsModal";
import WeeklyPlanForm from "./WeeklyPlanForm";

function GapRow({ metric }) {
  const meta = METRIC_STATUS_META[metric.status] || METRIC_STATUS_META.no_data;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-2 pr-3 text-slate-600">{metric.name}</td>
      <td className="py-2 pr-3 text-slate-500">
        {fmtMetricValue(metric.name, metric.plan)}
      </td>
      <td className="py-2 pr-3 font-medium text-slate-800">
        {fmtMetricValue(metric.name, metric.current)}
      </td>
      <td className="py-2 pr-3 font-medium">
        {metric.gap == null
          ? "—"
          : `${metric.gap > 0 ? "+" : ""}${fmtMetricValue(metric.name, metric.gap)}`}
      </td>
      <td className={`py-2 ${meta.tone}`}>
        {meta.dot} {meta.label}
      </td>
    </tr>
  );
}

// Sub-tab 1 — Gap Analysis: bảng so sánh plan vs current + acceleration plan
// tuần này. Cũng được dùng lại (rút gọn) bởi RecoveryRadar trên Dashboard.
export default function GapAnalysis({ projectId }) {
  const [gap, setGap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setGap(await fetchRecoveryGap(projectId));
    } catch (err) {
      setError(err.message || "Failed to load gap analysis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const plan = gap?.current_plan || null;
  const isCurrentWeek = plan && plan.week_label === currentWeekLabel();

  const handleCreatePlan = async (payload) => {
    await createRecoveryPlan(projectId, payload);
    setCreating(false);
    await load();
  };

  const handleUpdateTargets = async (payload) => {
    await updateRecoveryPlan(projectId, plan.id, payload);
    setEditOpen(false);
    await load();
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  }
  if (error) {
    return <p className="py-10 text-center text-sm text-red-600">{error}</p>;
  }
  if (!gap) return null;

  const overall = OVERALL_STATUS_META[gap.overall_status] || OVERALL_STATUS_META.on_track;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand" />
            <span className="text-sm font-bold uppercase tracking-wide text-slate-800">
              Overall:
            </span>
            <Badge tone={overall.tone}>
              {overall.dot} {overall.label}
            </Badge>
          </div>
          {gap.next_milestone && (
            <p className="text-xs text-slate-500">
              Next milestone:{" "}
              <span className="font-medium text-slate-700">
                {gap.next_milestone.name}
              </span>{" "}
              — {fmtDate(gap.next_milestone.due_date)}
              {gap.next_milestone.weeks_remaining != null &&
                ` (${gap.next_milestone.weeks_remaining} weeks left)`}
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <th className="py-1.5 pr-3"></th>
                <th className="py-1.5 pr-3">Plan</th>
                <th className="py-1.5 pr-3">Current</th>
                <th className="py-1.5 pr-3">Gap</th>
                <th className="py-1.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {gap.metrics.map((m) => (
                <GapRow key={m.name} metric={m} />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex justify-end">
          {plan ? (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              <Pencil size={13} /> Edit plan targets
            </button>
          ) : (
            !creating && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                <Plus size={13} /> Create this week's plan
              </button>
            )
          )}
        </div>
      </Card>

      {creating && (
        <WeeklyPlanForm
          previousPlan={null}
          onSubmit={handleCreatePlan}
          onCancel={() => setCreating(false)}
        />
      )}

      {plan && (
        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              {plan.week_label} Plan
              {!isCurrentWeek && (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  (most recent week with a plan)
                </span>
              )}
            </h3>
          </div>

          {plan.issues && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Issues / Blockers
              </p>
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-600">
                {plan.issues}
              </pre>
            </div>
          )}

          {plan.acceleration_items?.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Acceleration Plan
              </p>
              <div className="space-y-1">
                {plan.acceleration_items.map((it, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-medium text-slate-700">
                      👤 {it.name || "—"} →
                    </span>
                    <span className="text-slate-600">{it.task}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan.estimate_items != null && (
            <p className="text-xs text-slate-500">
              Estimate:{" "}
              <span className="font-medium text-slate-700">
                {plan.estimate_items} items
              </span>
              {plan.estimate_cumulative_from != null &&
                plan.estimate_cumulative_to != null && (
                  <>
                    {" "}
                    ({plan.estimate_cumulative_from} →{" "}
                    {plan.estimate_cumulative_to})
                  </>
                )}
            </p>
          )}
        </Card>
      )}

      <PlanTargetsModal
        open={editOpen}
        plan={plan}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdateTargets}
      />
    </div>
  );
}

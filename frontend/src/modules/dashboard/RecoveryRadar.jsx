import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Target } from "lucide-react";
import Card from "../../shared/components/Card";
import Badge from "../../shared/components/Badge";
import { fetchRecoveryGap, updateRecoveryPlan } from "../projects/recovery/recoveryApi";
import {
  METRIC_STATUS_META,
  OVERALL_STATUS_META,
  fmtDate,
  fmtMetricValue,
} from "../projects/recovery/recoveryConstants";
import OutcomeForm from "../projects/recovery/OutcomeForm";
import { projectLabel } from "./dashboardHelpers";

function GapRow({ metric }) {
  const meta = METRIC_STATUS_META[metric.status] || METRIC_STATUS_META.no_data;
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-1.5 pr-3 text-slate-600">{metric.name}</td>
      <td className="py-1.5 pr-3 text-slate-500">
        {fmtMetricValue(metric.name, metric.plan)}
      </td>
      <td className="py-1.5 pr-3 font-medium text-slate-800">
        {fmtMetricValue(metric.name, metric.current)}
      </td>
      <td className="py-1.5 pr-3 font-medium">
        {metric.gap == null
          ? "—"
          : `${metric.gap > 0 ? "+" : ""}${fmtMetricValue(metric.name, metric.gap)}`}
      </td>
      <td className={`py-1.5 ${meta.tone}`}>
        {meta.dot} {meta.label}
      </td>
    </tr>
  );
}

// Vùng D — Recovery Radar: xem nhanh gap analysis + update outcome tuần này.
// Dùng chung recoveryApi.js với Tab Recovery (Project Detail) — single source
// of truth, chỉ hiện Sub-tab 1 rút gọn (spec 7.6).
export default function RecoveryRadar({ projects, projectId }) {
  const navigate = useNavigate();
  const [gap, setGap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  const load = () => {
    if (!projectId) {
      setGap(null);
      return;
    }
    setLoading(true);
    fetchRecoveryGap(projectId)
      .catch(() => null)
      .then((g) => setGap(g))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    setOutcomeOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);
  const plan = gap?.current_plan || null;

  const handleFillOutcome = async (payload) => {
    await updateRecoveryPlan(projectId, plan.id, payload);
    setOutcomeOpen(false);
    load();
  };

  const overall = gap
    ? OVERALL_STATUS_META[gap.overall_status] || OVERALL_STATUS_META.on_track
    : null;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-800">
          <Target size={16} className="text-brand" />
          Recovery Radar
          {project && (
            <span className="text-slate-400">— {projectLabel(project)}</span>
          )}
        </h2>
        {overall && (
          <Badge tone={overall.tone}>
            {overall.dot} {overall.label}
          </Badge>
        )}
      </div>

      {!projectId ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Select a project in Regression Pulse to view the recovery plan.
        </p>
      ) : loading || !gap ? (
        <p className="py-6 text-center text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          {gap.next_milestone && (
            <p className="mb-3 text-xs text-slate-500">
              Next:{" "}
              <span className="font-medium text-slate-700">
                {gap.next_milestone.name}
              </span>{" "}
              {gap.next_milestone.weeks_remaining != null &&
                `${gap.next_milestone.weeks_remaining} weeks remaining`}
              {!gap.next_milestone.weeks_remaining &&
                gap.next_milestone.due_date &&
                ` — ${fmtDate(gap.next_milestone.due_date)}`}
            </p>
          )}

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

          {plan && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {plan.week_label} Plan
              </h3>
              {plan.acceleration_items?.length > 0 ? (
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
              ) : (
                <p className="text-xs text-slate-400">No assignments yet.</p>
              )}
              {plan.estimate_items != null && (
                <p className="mt-1.5 text-xs text-slate-500">
                  Estimate: {plan.estimate_items} items
                </p>
              )}
            </div>
          )}

          {outcomeOpen && plan ? (
            <div className="mt-3">
              <OutcomeForm
                plan={plan}
                onSubmit={handleFillOutcome}
                onCancel={() => setOutcomeOpen(false)}
              />
            </div>
          ) : (
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              {plan ? (
                <button
                  type="button"
                  onClick={() => setOutcomeOpen(true)}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Fill {plan.week_label} Outcome
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => navigate(`/projects/${projectId}`)}
                className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
              >
                View full details <ArrowRight size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import Badge from "../../../shared/components/Badge";
import {
  createRecoveryPlan,
  deleteRecoveryPlan,
  fetchRecoveryPlans,
  fetchRecoveryPlansSummary,
  updateRecoveryPlan,
} from "./recoveryApi";
import { OUTCOME_STATUS_META, currentWeekLabel } from "./recoveryConstants";
import WeeklyPlanForm from "./WeeklyPlanForm";
import OutcomeForm from "./OutcomeForm";

function PlanRow({ plan, expanded, onToggle, onDelete, onFillOutcome }) {
  const meta = OUTCOME_STATUS_META[plan.outcome_status] || OUTCOME_STATUS_META.planned;
  const isCurrentWeek = plan.week_label === currentWeekLabel();
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => onToggle(plan.id)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          <span className="text-sm font-medium text-slate-800">
            {plan.week_label}
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs text-slate-500">
          {plan.estimate_items != null && (
            <span>
              {plan.actual_items ?? "—"}/{plan.estimate_items} items
            </span>
          )}
          <Badge tone={meta.tone}>
            {meta.dot} {meta.label}
          </Badge>
        </span>
      </button>

      {expanded && (
        <div className="space-y-3 px-4 pb-4">
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

          {plan.outcome_note && (
            <p className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Outcome note: </span>
              {plan.outcome_note}
            </p>
          )}

          <div className="flex items-center gap-3">
            {isCurrentWeek && !outcomeOpen && (
              <button
                type="button"
                onClick={() => setOutcomeOpen(true)}
                className="text-xs font-medium text-brand hover:underline"
              >
                Fill Outcome
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(plan)}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:underline"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>

          {outcomeOpen && (
            <OutcomeForm
              plan={plan}
              onSubmit={async (payload) => {
                await onFillOutcome(plan, payload);
                setOutcomeOpen(false);
              }}
              onCancel={() => setOutcomeOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// Sub-tab 2 — Weekly Plans: accordion danh sách toàn bộ plans + summary bar.
export default function WeeklyPlans({ projectId }) {
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [p, s] = await Promise.all([
        fetchRecoveryPlans(projectId),
        fetchRecoveryPlansSummary(projectId),
      ]);
      setPlans(p);
      setSummary(s);
    } catch (err) {
      setError(err.message || "Failed to load plans list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCreate = async (payload) => {
    await createRecoveryPlan(projectId, payload);
    setCreating(false);
    await load();
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete plan "${plan.week_label}"?`)) return;
    try {
      await deleteRecoveryPlan(projectId, plan.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete plan.");
    }
  };

  const handleFillOutcome = async (plan, payload) => {
    await updateRecoveryPlan(projectId, plan.id, payload);
    await load();
  };

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-xs text-red-600">{error}</p>}

      {summary && summary.total > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
          <span className="text-slate-600">
            Total {summary.total} weeks: 🟢 {summary.done} Done 🟡 {summary.partial}{" "}
            Partial 🔴 {summary.missed} Missed ⚪ {summary.planned} Planned
          </span>
          {summary.avg_actual_vs_estimate_pct != null && (
            <span className="text-slate-500">
              Avg actual vs estimate:{" "}
              <span className="font-medium text-slate-700">
                {summary.avg_actual_vs_estimate_pct}%
              </span>
            </span>
          )}
        </Card>
      )}

      <div className="flex justify-end">
        {!creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={15} /> New Week Plan
          </Button>
        )}
      </div>

      {creating && (
        <WeeklyPlanForm
          previousPlan={plans[0] || null}
          onSubmit={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {plans.length === 0 && !creating && (
        <Card className="p-10 text-center text-sm text-slate-400">
          No weekly plans yet.
        </Card>
      )}

      {plans.length > 0 && (
        <Card className="overflow-hidden">
          {plans.map((plan) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              onToggle={(id) => setExpandedId((cur) => (cur === id ? null : id))}
              onDelete={handleDelete}
              onFillOutcome={handleFillOutcome}
            />
          ))}
        </Card>
      )}
    </div>
  );
}

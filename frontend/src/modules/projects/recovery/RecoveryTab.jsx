import { useState } from "react";
import GapAnalysis from "./GapAnalysis";
import WeeklyPlans from "./WeeklyPlans";
import TrendChart from "./TrendChart";

const SUB_TABS = [
  { key: "gap", label: "Gap Analysis" },
  { key: "plans", label: "Weekly Plans" },
  { key: "trend", label: "Trend Chart" },
];

// Tab 8 (Project Detail) — Recovery: single source of truth cho
// project_coverage_snapshots + project_recovery_plans, ghép 3 sub-tabs.
export default function RecoveryTab({ projectId }) {
  const [sub, setSub] = useState("gap");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 border-b border-slate-200">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSub(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
              sub === t.key
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "gap" && <GapAnalysis projectId={projectId} />}
      {sub === "plans" && <WeeklyPlans projectId={projectId} />}
      {sub === "trend" && <TrendChart projectId={projectId} />}
    </div>
  );
}

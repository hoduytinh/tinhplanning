import { MOODS, WORKLOADS } from "./weeklyReviewConstants";

// Mood tracker: chọn cảm xúc 1-5 + mức workload. Gọi onChange({mood} / {workload}).
export default function MoodTracker({ mood, workload, editable = true, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-500">
          Mood this week
        </div>
        <div className="flex items-center gap-1.5">
          {MOODS.map((m) => {
            const active = mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                disabled={!editable}
                title={m.label}
                onClick={() => editable && onChange?.({ mood: active ? null : m.value })}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition ${
                  active
                    ? "border-brand bg-brand/10 scale-110"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                } ${editable ? "" : "cursor-default opacity-90"}`}
              >
                {m.emoji}
              </button>
            );
          })}
          {mood ? (
            <span className="ml-1 text-xs text-slate-500">
              {MOODS.find((m) => m.value === mood)?.label}
            </span>
          ) : null}
        </div>
      </div>

      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-500">Workload</div>
        <div className="flex flex-wrap gap-1.5">
          {WORKLOADS.map((w) => {
            const active = workload === w.value;
            return (
              <button
                key={w.value}
                type="button"
                disabled={!editable}
                onClick={() =>
                  editable && onChange?.({ workload: active ? null : w.value })
                }
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? w.tone
                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                } ${editable ? "" : "cursor-default"}`}
              >
                {w.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

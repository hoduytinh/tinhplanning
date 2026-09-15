import { useState } from "react";
import { Plus, X } from "lucide-react";
import RichField from "./RichField";
import { PRIORITIES } from "./weeklyReviewConstants";

function TopFocusEditor({ items = [], editable, onChange }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("normal");

  const add = () => {
    const v = text.trim();
    if (!v) return;
    onChange?.([...(items || []), { text: v, priority, task_id: null }]);
    setText("");
    setPriority("normal");
  };

  const remove = (idx) => {
    onChange?.(items.filter((_, i) => i !== idx));
  };

  const tone = (p) =>
    PRIORITIES.find((x) => x.value === p)?.tone ||
    "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-slate-600">🎯 Top Focus tuần tới</div>
      <div className="space-y-1.5">
        {(items || []).map((it, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-md border border-slate-100 bg-white px-2.5 py-1.5"
          >
            <span className="text-slate-400">{idx + 1}.</span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
              {it.text}
            </span>
            <span
              className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${tone(
                it.priority
              )}`}
            >
              {PRIORITIES.find((x) => x.value === it.priority)?.label || it.priority}
            </span>
            {editable ? (
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-slate-400 hover:text-red-500"
                aria-label="Xóa"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ))}
        {(items || []).length === 0 && !editable ? (
          <div className="text-xs text-slate-400">Chưa đặt mục tiêu nào.</div>
        ) : null}
      </div>

      {editable ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Mục tiêu ưu tiên..."
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={13} /> Thêm
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Phần 3 (trái): Kế hoạch tuần tới.
export default function PlanPanel({
  review,
  editable = true,
  onFieldChange,
  onFieldCommit,
  onTopFocusChange,
}) {
  return (
    <div className="space-y-4">
      <TopFocusEditor
        items={review.top_focus || []}
        editable={editable}
        onChange={onTopFocusChange}
      />
      <RichField
        label="🚧 Rủi ro"
        value={review.risks_next_week}
        editable={editable}
        placeholder="Rủi ro có thể xảy ra tuần tới..."
        onChange={(html) => onFieldChange?.("risks_next_week", html)}
        onCommit={(html) => onFieldCommit?.("risks_next_week", html)}
      />
      <RichField
        label="🔗 Phụ thuộc"
        value={review.dependencies_next_week}
        editable={editable}
        placeholder="Phụ thuộc vào team/nguồn lực khác..."
        onChange={(html) => onFieldChange?.("dependencies_next_week", html)}
        onCommit={(html) => onFieldCommit?.("dependencies_next_week", html)}
      />
    </div>
  );
}

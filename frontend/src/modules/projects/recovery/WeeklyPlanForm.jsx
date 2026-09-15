import { useState } from "react";
import { Plus, X } from "lucide-react";
import Button from "../../../shared/components/Button";
import { todayISO, currentWeekLabel, EMPTY_ACCELERATION_ITEM } from "./recoveryConstants";

// Form "+ New Week Plan" — slide down inline (không modal).
// Dùng chung để tạo plan mới; auto-fill cumulative_from từ plan tuần trước.
export default function WeeklyPlanForm({ previousPlan, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    week_label: currentWeekLabel(),
    week_date: todayISO(),
    issues: "",
    estimate_items: "",
    estimate_cumulative_from:
      previousPlan?.estimate_cumulative_to != null
        ? String(previousPlan.estimate_cumulative_to)
        : "",
    estimate_cumulative_to: "",
  });
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateItem = (idx, field, value) =>
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  const addItem = () =>
    setItems((prev) => [...prev, { ...EMPTY_ACCELERATION_ITEM }]);
  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const numOrNull = (v) => (v === "" || v == null ? null : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.week_label.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        week_label: form.week_label.trim(),
        week_date: form.week_date || null,
        issues: form.issues.trim() || null,
        acceleration_items: items.filter((it) => it.name.trim() || it.task.trim()),
        estimate_items: numOrNull(form.estimate_items),
        estimate_cumulative_from: numOrNull(form.estimate_cumulative_from),
        estimate_cumulative_to: numOrNull(form.estimate_cumulative_to),
      });
    } catch (err) {
      setError(err.message || "Không thể tạo plan.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4"
    >
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">
          Week
          <input
            value={form.week_label}
            onChange={set("week_label")}
            placeholder="W59/2026"
            className={`${inputCls} mt-0.5 w-32`}
          />
        </label>
        <label className="text-xs text-slate-600">
          Date
          <input
            type="date"
            value={form.week_date}
            onChange={set("week_date")}
            className={`${inputCls} mt-0.5 w-40`}
          />
        </label>
      </div>

      <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
        Issues / Blockers
        <textarea
          value={form.issues}
          onChange={set("issues")}
          rows={3}
          placeholder={"• QTM: Blocked by bug\n• IOD: TB issue..."}
          className={`${inputCls} mt-1 font-normal normal-case`}
        />
      </label>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Acceleration Plan
        </p>
        <div className="space-y-1.5">
          {items.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="shrink-0 text-sm">👤</span>
              <input
                value={it.name}
                onChange={(e) => updateItem(idx, "name", e.target.value)}
                placeholder="Tên..."
                className={`${inputCls} w-28`}
              />
              <span className="shrink-0 text-slate-400">→</span>
              <input
                value={it.task}
                onChange={(e) => updateItem(idx, "task", e.target.value)}
                placeholder="Mô tả việc làm tuần này..."
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-slate-400 hover:text-red-500"
                aria-label="Xóa"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addItem}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
        >
          <Plus size={13} /> Thêm người
        </button>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          Estimate
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-slate-600">
            Items to cover
            <input
              type="number"
              value={form.estimate_items}
              onChange={set("estimate_items")}
              className={`${inputCls} mt-0.5 w-24`}
            />
          </label>
          <label className="text-xs text-slate-600">
            Cumulative from
            <input
              type="number"
              value={form.estimate_cumulative_from}
              onChange={set("estimate_cumulative_from")}
              className={`${inputCls} mt-0.5 w-24`}
            />
          </label>
          <span className="pb-1.5 text-slate-400">→</span>
          <label className="text-xs text-slate-600">
            to
            <input
              type="number"
              value={form.estimate_cumulative_to}
              onChange={set("estimate_cumulative_to")}
              className={`${inputCls} mt-0.5 w-24`}
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Đang lưu..." : "Tạo plan"}
        </Button>
      </div>
    </form>
  );
}

import { useState } from "react";
import Button from "../../../shared/components/Button";

// Form "Fill Outcome" — inline nhỏ gọn, dùng chung trong WeeklyPlans.jsx và
// RecoveryRadar.jsx. Chỉ hiện trên plan của tuần hiện tại.
export default function OutcomeForm({ plan, onSubmit, onCancel }) {
  const [actualItems, setActualItems] = useState(
    plan.actual_items != null ? String(plan.actual_items) : ""
  );
  const [note, setNote] = useState(plan.outcome_note || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        actual_items: actualItems === "" ? null : Number(actualItems),
        outcome_note: note.trim() || null,
      });
    } catch (err) {
      setError(err.message || "Không thể lưu outcome.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <form
      onSubmit={submit}
      className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
        Outcome — {plan.week_label}
      </p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <label className="block text-xs text-slate-600">
        Actual items covered
        <input
          type="number"
          value={actualItems}
          onChange={(e) => setActualItems(e.target.value)}
          className={`${inputCls} mt-0.5 w-28`}
        />
      </label>
      <label className="block text-xs text-slate-600">
        Note
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú ngắn về kết quả tuần này..."
          className={`${inputCls} mt-0.5`}
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu outcome"}
        </Button>
      </div>
    </form>
  );
}

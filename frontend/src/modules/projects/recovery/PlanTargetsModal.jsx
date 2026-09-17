import { useState } from "react";
import Modal from "../../../shared/components/Modal";
import Button from "../../../shared/components/Button";

const TARGET_FIELDS = [
  { key: "plan_tests", label: "Tests total" },
  { key: "plan_testplan", label: "Testplan items" },
  { key: "plan_pass_rate", label: "Pass Rate %" },
  { key: "plan_statement", label: "Statement %" },
  { key: "plan_branch", label: "Branch %" },
  { key: "plan_toggle", label: "Toggle %" },
  { key: "plan_expression", label: "Expression %" },
  { key: "plan_acov", label: "ACOV %" },
];

// Modal sửa plan targets của tuần hiện tại (dùng ở Sub-tab 1 — Gap Analysis).
export default function PlanTargetsModal({ open, plan, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      TARGET_FIELDS.map((f) => [
        f.key,
        plan?.[f.key] != null ? String(plan[f.key]) : "",
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        TARGET_FIELDS.map((f) => [
          f.key,
          form[f.key] === "" ? null : Number(form[f.key]),
        ])
      );
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Failed to save plan targets.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit Plan Targets — ${plan?.week_label || ""}`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-3">
          {TARGET_FIELDS.map((f) => (
            <label key={f.key} className="text-xs text-slate-600">
              {f.label}
              <input
                type="number"
                step="0.1"
                value={form[f.key]}
                onChange={set(f.key)}
                className={`${inputCls} mt-0.5`}
              />
            </label>
          ))}
        </div>
      </form>
    </Modal>
  );
}

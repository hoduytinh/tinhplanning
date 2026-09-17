import { useState } from "react";
import { createCoverage } from "../projects/projectApi";

const NUM_FIELDS = [
  { key: "total_tests", label: "Total", group: "tests" },
  { key: "passed_tests", label: "Pass", group: "tests" },
  { key: "failed_tests", label: "Fail", group: "tests" },
  { key: "testplan_total", label: "Testplan Total", group: "tp" },
  { key: "testplan_passed", label: "Testplan Passed", group: "tp" },
];

const COV_FIELDS = [
  { key: "cov_statement", label: "Statement" },
  { key: "cov_branch", label: "Branch" },
  { key: "cov_toggle", label: "Toggle" },
  { key: "cov_fsm", label: "FSM" },
  { key: "cov_expression", label: "Expression" },
  { key: "cov_acov", label: "ACOV" },
  { key: "cov_fcov", label: "FCOV" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Form nhập coverage snapshot — dùng chung. Lưu qua createCoverage của module
// projects (import trực tiếp, không sửa module đó).
export default function SnapshotForm({
  projectId,
  defaultWeek = "",
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState({
    week_label: defaultWeek,
    snapshot_date: todayISO(),
    total_tests: "",
    passed_tests: "",
    failed_tests: "",
    testplan_total: "",
    testplan_passed: "",
    cov_statement: "",
    cov_branch: "",
    cov_toggle: "",
    cov_fsm: "",
    cov_expression: "",
    cov_acov: "",
    cov_fcov: "",
    regression_path: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const num = (v) => (v === "" || v == null ? 0 : Number(v));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.week_label.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        week_label: form.week_label.trim(),
        snapshot_date: form.snapshot_date || null,
        total_tests: num(form.total_tests),
        passed_tests: num(form.passed_tests),
        failed_tests: num(form.failed_tests),
        testplan_total: num(form.testplan_total),
        testplan_passed: num(form.testplan_passed),
        cov_statement: num(form.cov_statement),
        cov_branch: num(form.cov_branch),
        cov_toggle: num(form.cov_toggle),
        cov_fsm: num(form.cov_fsm),
        cov_expression: num(form.cov_expression),
        cov_acov: num(form.cov_acov),
        cov_fcov: num(form.cov_fcov),
        regression_path: form.regression_path.trim() || null,
        notes: form.notes.trim() || null,
      };
      const created = await createCoverage(projectId, payload);
      onSaved?.(created);
    } catch (err) {
      setError(err.message || "Unable to save snapshot.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <form
      onSubmit={submit}
      className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
    >
      <div className="mb-2 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-600">
          Week
          <input
            value={form.week_label}
            onChange={set("week_label")}
            placeholder="W59"
            className={`${inputCls} mt-0.5 w-24`}
          />
        </label>
        <label className="text-xs text-slate-600">
          Date
          <input
            type="date"
            value={form.snapshot_date}
            onChange={set("snapshot_date")}
            className={`${inputCls} mt-0.5 w-40`}
          />
        </label>
      </div>

      <div className="mb-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {NUM_FIELDS.map((fld) => (
          <label key={fld.key} className="text-xs text-slate-600">
            {fld.label}
            <input
              type="number"
              value={form[fld.key]}
              onChange={set(fld.key)}
              className={`${inputCls} mt-0.5`}
            />
          </label>
        ))}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-7">
        {COV_FIELDS.map((fld) => (
          <label key={fld.key} className="text-xs text-slate-600">
            {fld.label} %
            <input
              type="number"
              step="0.1"
              value={form[fld.key]}
              onChange={set(fld.key)}
              className={`${inputCls} mt-0.5`}
            />
          </label>
        ))}
      </div>

      <label className="mb-2 block text-xs text-slate-600">
        Path
        <input
          value={form.regression_path}
          onChange={set("regression_path")}
          placeholder="/proj/dips10/TmpDir/..."
          className={`${inputCls} mt-0.5`}
        />
      </label>

      <label className="mb-2 block text-xs text-slate-600">
        Note
        <input
          value={form.notes}
          onChange={set("notes")}
          placeholder="Design change 8/17 → TB issue..."
          className={`${inputCls} mt-0.5`}
        />
      </label>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !form.week_label.trim()}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
        >
          Save snapshot
        </button>
      </div>
    </form>
  );
}

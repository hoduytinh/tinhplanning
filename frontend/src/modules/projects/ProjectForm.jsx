import { useEffect, useState } from "react";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import {
  DEFAULT_PREFIX_COLOR,
  OPTIONAL_MODULES,
  PREFIX_COLOR_PRESETS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
} from "./projectConstants";

const EMPTY = {
  name: "",
  prefix: "",
  prefix_color: DEFAULT_PREFIX_COLOR,
  description: "",
  status: "planning",
  priority: "normal",
  start_date: "",
  end_date: "",
  tags: "",
  enabled_modules: [],
};

// start_date/end_date backend là kiểu Date → gửi chuỗi "YYYY-MM-DD".
function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function ProjectForm({ open, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      if (initial) {
        setForm({
          name: initial.name ?? "",
          prefix: initial.prefix ?? "",
          prefix_color: initial.prefix_color ?? DEFAULT_PREFIX_COLOR,
          description: initial.description ?? "",
          status: initial.status ?? "planning",
          priority: initial.priority ?? "normal",
          start_date: toDateInput(initial.start_date),
          end_date: toDateInput(initial.end_date),
          tags: (initial.tags ?? []).join(", "),
          enabled_modules: initial.enabled_modules ?? [],
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleModule = (key) =>
    setForm((f) => ({
      ...f,
      enabled_modules: f.enabled_modules.includes(key)
        ? f.enabled_modules.filter((k) => k !== key)
        : [...f.enabled_modules, key],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Project name cannot be empty.");
      return;
    }
    if (!form.prefix.trim()) {
      setError("Prefix cannot be empty — used to generate tags/badges for tasks.");
      return;
    }
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        prefix: form.prefix.trim(),
        prefix_color: form.prefix_color || DEFAULT_PREFIX_COLOR,
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        enabled_modules: form.enabled_modules,
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit project" : "Create new project"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className={label}>Project name *</label>
          <input className={field} value={form.name} onChange={set("name")} />
        </div>

        <div>
          <label className={label}>Prefix *</label>
          <input
            className={field}
            value={form.prefix}
            onChange={set("prefix")}
            placeholder="TigerA0"
          />
          <p className="mt-1 text-xs text-slate-400">
            Displayed on task badges &amp; used to generate auto-tags{" "}
            <code className="rounded bg-slate-100 px-1 text-slate-600">
              {"#" + (form.prefix || "prefix").toLowerCase().replace(/\s+/g, "")}
            </code>
          </p>
        </div>

        <div>
          <label className={label}>Prefix color</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {PREFIX_COLOR_PRESETS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => setForm((f) => ({ ...f, prefix_color: c.value }))}
                className={`h-7 w-7 rounded-full border-2 transition ${
                  form.prefix_color === c.value
                    ? "border-slate-800 scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
            <input
              type="color"
              value={form.prefix_color || DEFAULT_PREFIX_COLOR}
              onChange={(e) =>
                setForm((f) => ({ ...f, prefix_color: e.target.value }))
              }
              className="h-7 w-9 cursor-pointer rounded border border-slate-200 bg-transparent p-0.5"
              title="Choose custom color"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            Preview:{" "}
            <span
              className="font-semibold"
              style={{ color: form.prefix_color || DEFAULT_PREFIX_COLOR }}
            >
              [{form.prefix || "Prefix"}]
            </span>{" "}
            Task name
          </p>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            rows={3}
            className={field}
            value={form.description}
            onChange={set("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Status</label>
            <select className={field} value={form.status} onChange={set("status")}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Priority</label>
            <select
              className={field}
              value={form.priority}
              onChange={set("priority")}
            >
              {PROJECT_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Start date</label>
            <input
              type="date"
              className={field}
              value={form.start_date}
              onChange={set("start_date")}
            />
          </div>
          <div>
            <label className={label}>End date</label>
            <input
              type="date"
              className={field}
              value={form.end_date}
              onChange={set("end_date")}
            />
          </div>
        </div>

        <div>
          <label className={label}>Tags (comma-separated)</label>
          <input
            className={field}
            value={form.tags}
            onChange={set("tags")}
            placeholder="verification, q3"
          />
        </div>

        <div>
          <label className={label}>Optional features (extra tabs)</label>
          <p className="mt-1 text-xs text-slate-400">
            The Overview/Tasks/Activity tabs are always shown. Enable any
            additional tabs you need for this project.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {OPTIONAL_MODULES.map((m) => (
              <label
                key={m.key}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-brand/40"
              >
                <input
                  type="checkbox"
                  checked={form.enabled_modules.includes(m.key)}
                  onChange={() => toggleModule(m.key)}
                  className="rounded border-slate-300 text-brand focus:ring-brand/30"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}

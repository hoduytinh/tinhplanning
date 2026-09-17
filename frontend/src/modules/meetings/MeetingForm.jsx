import { useEffect, useState } from "react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import Select from "../../shared/components/Select";
import { RECURRING_OPTIONS } from "./meetingConstants";

const EMPTY = {
  title: "",
  template_id: "",
  date: "",
  start_time: "",
  end_time: "",
  location: "",
  recurring: "none",
  recurring_interval_days: "",
};

// Modal tạo/sửa cuộc họp. `templates` để chọn template khi tạo mới.
export default function MeetingForm({
  open,
  onClose,
  onSubmit,
  templates = [],
  initial = null,
}) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title: initial.title || "",
        template_id: initial.template_id || "",
        date: initial.date || "",
        start_time: (initial.start_time || "").slice(0, 5),
        end_time: (initial.end_time || "").slice(0, 5),
        location: initial.location || "",
        recurring: initial.recurring || "none",
        recurring_interval_days: initial.recurring_interval_days || "",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setBusy(true);
    const payload = {
      title: form.title.trim(),
      template_id: form.template_id ? Number(form.template_id) : null,
      date: form.date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location.trim() || null,
      recurring: form.recurring,
      recurring_interval_days:
        form.recurring === "custom" && form.recurring_interval_days
          ? Number(form.recurring_interval_days)
          : null,
    };
    try {
      await onSubmit(payload);
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit Meeting" : "Create Meeting"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !form.title.trim()}>
            {initial ? "Save" : "Create"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title *</label>
          <input value={form.title} onChange={set("title")} className={input} placeholder="e.g. Weekly DV Sync" />
        </div>
        {!initial && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Template</label>
            <Select
              value={String(form.template_id)}
              onChange={set("template_id")}
              options={templates.map((t) => ({
                value: String(t.id),
                label: `${t.icon} ${t.name}`,
              }))}
              placeholder="No template"
              className="w-full"
              ariaLabel="Template"
            />
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input type="date" value={form.date} onChange={set("date")} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Start</label>
            <input type="time" value={form.start_time} onChange={set("start_time")} className={input} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">End</label>
            <input type="time" value={form.end_time} onChange={set("end_time")} className={input} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Location / Link</label>
          <input value={form.location} onChange={set("location")} className={input} placeholder="Meeting room / Zoom..." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Recurring</label>
            <Select
              value={form.recurring}
              onChange={set("recurring")}
              options={RECURRING_OPTIONS}
              className="w-full"
              ariaLabel="Recurring"
            />
          </div>
          {form.recurring === "custom" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Number of days</label>
              <input
                type="number"
                min="1"
                value={form.recurring_interval_days}
                onChange={set("recurring_interval_days")}
                className={input}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

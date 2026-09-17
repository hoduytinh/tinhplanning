import { useEffect, useState } from "react";
import { Check, Circle, X, Pencil, Trash2, Plus } from "lucide-react";
import Modal from "../../../shared/components/Modal";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";
import { TRACK_COLOR_PRESETS, fmtShortDate } from "./timelineUtils";
import {
  createBarMilestone,
  deleteBarMilestone,
  fetchBarMilestones,
  updateBarMilestone,
} from "./timelineApi";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "blocked", label: "Blocked" },
];

const emptyForm = {
  name: "",
  start_date: "",
  end_date: "",
  progress: 0,
  status: "not_started",
  color: "",
  notes: "",
};

// Side panel chỉnh sửa 1 bar (click vào bar mở panel này).
export default function BarSidePanel({
  bar,
  tracks,
  projectId,
  open,
  onClose,
  onSave,
  onDelete,
  onBarMilestonesChanged,
}) {
  const [form, setForm] = useState(emptyForm);
  const [bms, setBms] = useState([]);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [bmError, setBmError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");

  useEffect(() => {
    if (bar) {
      setForm({
        name: bar.name || "",
        start_date: bar.start_date || "",
        end_date: bar.end_date || "",
        progress: bar.progress ?? 0,
        status: bar.status || "not_started",
        color: bar.color || "",
        notes: bar.notes || "",
        track_id: bar.track_id,
      });
      setBms(bar.bar_milestones || []);
      setBmError("");
      setEditingId(null);
      setNewName("");
      setNewDate("");
    }
  }, [bar]);

  if (!bar) return null;
  const track = tracks.find((t) => t.id === bar.track_id);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const dateInRange = (d) => {
    if (!d) return false;
    if (bar.start_date && d < bar.start_date) return false;
    if (bar.end_date && d > bar.end_date) return false;
    return true;
  };

  const reloadBms = async () => {
    const list = await fetchBarMilestones(projectId, bar.id);
    setBms(list);
    onBarMilestonesChanged?.();
  };

  const addBm = async () => {
    setBmError("");
    if (!newName.trim() || !newDate) return;
    if (!dateInRange(newDate)) {
      setBmError("Date must be within the bar's range");
      return;
    }
    try {
      await createBarMilestone(projectId, bar.id, {
        name: newName.trim(),
        date: newDate,
      });
      setNewName("");
      setNewDate("");
      await reloadBms();
    } catch (e) {
      setBmError(e.message || "Failed to add milestone.");
    }
  };

  const toggleBm = async (bm) => {
    const next = bm.status === "done" ? "not_started" : "done";
    await updateBarMilestone(projectId, bar.id, bm.id, { status: next });
    await reloadBms();
  };

  const startEdit = (bm) => {
    setEditingId(bm.id);
    setEditName(bm.name);
    setEditDate(bm.date || "");
    setBmError("");
  };

  const saveEdit = async (bm) => {
    setBmError("");
    if (!editName.trim() || !editDate) return;
    if (!dateInRange(editDate)) {
      setBmError("Date must be within the bar's range");
      return;
    }
    try {
      await updateBarMilestone(projectId, bar.id, bm.id, {
        name: editName.trim(),
        date: editDate,
      });
      setEditingId(null);
      await reloadBms();
    } catch (e) {
      setBmError(e.message || "Failed to update milestone.");
    }
  };

  const removeBm = async (bm) => {
    await deleteBarMilestone(projectId, bar.id, bm.id);
    await reloadBms();
  };

  const statusIcon = (status) => {
    if (status === "done")
      return <Check size={14} className="text-green-600" />;
    if (status === "missed") return <X size={14} className="text-red-600" />;
    return <Circle size={14} className="text-slate-400" />;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit: ${track?.name || "Bar"}`}
      footer={
        <>
          <Button variant="danger" onClick={() => onDelete?.(bar)}>
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave?.({
                ...form,
                progress: Number(form.progress),
                color: form.color || null,
              })
            }
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Name</span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            value={form.name}
            onChange={set("name")}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">Start</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.start_date || ""}
              onChange={set("start_date")}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">End</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.end_date || ""}
              onChange={set("end_date")}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">Status</span>
            <Select
              value={form.status}
              onChange={set("status")}
              options={STATUS_OPTIONS}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">
              Progress ({form.progress}%)
            </span>
            <input
              type="range"
              min="0"
              max="100"
              className="w-full"
              value={form.progress}
              onChange={set("progress")}
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Color (optional)</span>
          <div className="flex gap-1.5">
            {TRACK_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`h-6 w-6 rounded-full border-2 ${
                  form.color === c ? "border-slate-800" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Notes</span>
          <textarea
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={form.notes}
            onChange={set("notes")}
          />
        </label>

        {/* Milestones trong bar */}
        <div className="border-t border-slate-100 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium text-slate-600">Milestones in bar</span>
            <span className="text-xs text-slate-400">
              {bms.filter((m) => m.status === "done").length}/{bms.length} done
            </span>
          </div>

          <div className="space-y-1.5">
            {bms.map((bm) =>
              editingId === bm.id ? (
                <div key={bm.id} className="flex items-center gap-1.5">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <input
                    type="date"
                    className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => saveEdit(bm)}
                    className="text-green-600 hover:text-green-700"
                    title="Save"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-slate-400 hover:text-slate-600"
                    title="Cancel"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  key={bm.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50"
                >
                  <button
                    type="button"
                    onClick={() => toggleBm(bm)}
                    title="Toggle status"
                  >
                    {statusIcon(bm.status)}
                  </button>
                  <span
                    className={`flex-1 truncate ${
                      bm.status === "done" ? "text-slate-400 line-through" : "text-slate-700"
                    }`}
                  >
                    {bm.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    {fmtShortDate(bm.date)}
                  </span>
                  <button
                    type="button"
                    onClick={() => startEdit(bm)}
                    className="text-slate-300 hover:text-slate-600"
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBm(bm)}
                    className="text-slate-300 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )
            )}
            {bms.length === 0 && (
              <p className="px-2 py-1 text-xs text-slate-400">
                No milestones in this bar yet.
              </p>
            )}
          </div>

          {/* Inline add form */}
          <div className="mt-2 flex items-center gap-1.5">
            <input
              placeholder="Milestone name"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="date"
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
              value={newDate}
              min={bar.start_date || undefined}
              max={bar.end_date || undefined}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <button
              type="button"
              onClick={addBm}
              className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {bmError && (
            <p className="mt-1 text-xs text-red-600">{bmError}</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

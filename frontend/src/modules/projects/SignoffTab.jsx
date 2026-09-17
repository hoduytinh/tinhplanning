import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Circle,
  CircleDashed,
  MinusCircle,
  Trash2,
} from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import {
  SIGNOFF_DONE_STATUSES,
  SIGNOFF_MILESTONES,
  SIGNOFF_STATUSES,
  formatShortDate,
  signoffStatusMeta,
} from "./projectConstants";
import {
  deleteSignoff,
  fetchSignoff,
  initSignoff,
  updateSignoff,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

// Icon lớn theo status trong checklist.
function StatusIcon({ status }) {
  switch (status) {
    case "done":
      return <CheckCircle2 size={18} className="text-green-600" />;
    case "in_progress":
      return <CircleDashed size={18} className="text-blue-500" />;
    case "waived":
      return <MinusCircle size={18} className="text-cyan-500" />;
    case "na":
      return <MinusCircle size={18} className="text-slate-300" />;
    default:
      return <Circle size={18} className="text-slate-300" />;
  }
}

// Tab 7 — Signoff: milestone selector + checklist theo category.
export default function SignoffTab({ projectId }) {
  const { role } = useAuth();
  const [milestone, setMilestone] = useState("rtlf");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await fetchSignoff(projectId, milestone));
    } catch (err) {
      setError(err.message || "Failed to load signoff checklist.");
    } finally {
      setLoading(false);
    }
  }, [projectId, milestone]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInit = async () => {
    setBusy(true);
    setError("");
    try {
      const list = await initSignoff(projectId, milestone);
      setItems(list);
    } catch (err) {
      setError(err.message || "Failed to create checklist.");
    } finally {
      setBusy(false);
    }
  };

  const patchItem = async (item, patch) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
    );
    try {
      const updated = await updateSignoff(projectId, item.id, patch);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      setError(err.message || "Failed to update item.");
      await load();
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Delete this item?")) return;
    try {
      await deleteSignoff(projectId, item.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete item.");
    }
  };

  // Gom theo category giữ nguyên thứ tự xuất hiện.
  const groups = useMemo(() => {
    const order = [];
    const map = new Map();
    for (const it of items) {
      if (!map.has(it.category)) {
        map.set(it.category, []);
        order.push(it.category);
      }
      map.get(it.category).push(it);
    }
    return order.map((cat) => ({ category: cat, items: map.get(cat) }));
  }, [items]);

  const total = items.length;
  const done = items.filter((i) =>
    SIGNOFF_DONE_STATUSES.includes(i.status)
  ).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const mLabel =
    SIGNOFF_MILESTONES.find((m) => m.value === milestone)?.label || milestone;

  return (
    <div className="space-y-5">
      {/* Milestone selector */}
      <div className="flex flex-wrap items-center gap-2">
        {SIGNOFF_MILESTONES.map((m) => {
          const active = m.value === milestone;
          return (
            <button
              key={m.value}
              onClick={() => setMilestone(m.value)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "border-brand bg-brand text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {m.label}
              {active && total > 0 ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Overall progress */}
      {total > 0 && (
        <Card className="p-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">
              {mLabel} Signoff Progress
            </span>
            <span className="text-slate-500">
              {done}/{total} items done · {percent}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${
                percent === 100 ? "bg-green-500" : "bg-brand"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Empty state → auto-populate */}
      {!loading && total === 0 && !error && (
        <Card className="space-y-3 p-8 text-center">
          <p className="text-sm text-slate-500">
            No checklist for {mLabel} yet. Automatically create a standard
            Marvell checklist.
          </p>
          {hasPermission(role, "projects", "update") && (
            <Button onClick={handleInit} disabled={busy}>
              <Sparkles size={15} />
              {busy ? "Creating..." : "Auto-populate checklist"}
            </Button>
          )}
        </Card>
      )}

      {/* Checklist theo category */}
      {groups.map((group) => {
        const gTotal = group.items.length;
        const gDone = group.items.filter((i) =>
          SIGNOFF_DONE_STATUSES.includes(i.status)
        ).length;
        const complete = gTotal > 0 && gDone === gTotal;
        return (
          <Card key={group.category} className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                {group.category}
              </h4>
              <span
                className={`text-xs font-medium ${
                  complete ? "text-green-600" : "text-slate-400"
                }`}
              >
                {gDone}/{gTotal} done {complete ? "✅" : ""}
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {group.items.map((item) => (
                <SignoffRow
                  key={item.id}
                  item={item}
                  role={role}
                  onPatch={(patch) => patchItem(item, patch)}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          </Card>
        );
      })}

      {total > 0 && hasPermission(role, "projects", "update") && (
        <div className="flex justify-end">
          <Button variant="secondary" size="sm" onClick={handleInit} disabled={busy}>
            <Sparkles size={14} />
            Add missing standard items
          </Button>
        </div>
      )}
    </div>
  );
}

function SignoffRow({ item, role, onPatch, onDelete }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(item.notes || "");
  const meta = signoffStatusMeta(item.status);
  const doneLike = SIGNOFF_DONE_STATUSES.includes(item.status);

  // Click icon: xoay vòng nhanh not_started → in_progress → done.
  const cycle = () => {
    const next =
      item.status === "done"
        ? "not_started"
        : item.status === "in_progress"
        ? "done"
        : "in_progress";
    onPatch({ status: next });
  };

  const saveNotes = () => {
    if (notes !== (item.notes || "")) {
      onPatch({ notes: notes.trim() || null });
    }
  };

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button onClick={cycle} aria-label="Change status" className="shrink-0">
          <StatusIcon status={item.status} />
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`flex-1 text-left text-sm ${
            doneLike ? "text-slate-400 line-through" : "text-slate-700"
          }`}
        >
          {item.item}
        </button>
        <span
          className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}
        >
          {meta.label}
        </span>
        {hasPermission(role, "projects", "delete") && (
          <button
            onClick={onDelete}
            className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="ml-7 mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {SIGNOFF_STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => onPatch({ status: s.value })}
                className={`rounded-md border px-2 py-0.5 text-xs font-medium transition ${
                  item.status === s.value
                    ? s.tone
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Notes..."
            className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          {item.completed_date && (
            <p className="text-xs text-slate-400">
              Completed: {formatShortDate(item.completed_date)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

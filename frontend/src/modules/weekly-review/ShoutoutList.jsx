import { useState } from "react";
import { Plus, X, Award } from "lucide-react";

// Danh sách shoutout (ghi nhận thành viên). Reuse pattern gọn nhẹ.
export default function ShoutoutList({ items = [], editable = true, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");

  const submit = () => {
    const person = name.trim();
    if (!person) return;
    onAdd?.({ person_name: person, reason: reason.trim() });
    setName("");
    setReason("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Award size={14} className="text-amber-500" /> Recognition / Shoutout
      </div>

      {items.length === 0 && !editable ? (
        <div className="text-xs text-slate-400">No recognitions yet.</div>
      ) : null}

      <div className="space-y-1.5">
        {items.map((s) => (
          <div
            key={s.id}
            className="flex items-start gap-2 rounded-md border border-amber-100 bg-amber-50/50 px-2.5 py-1.5"
          >
            <span className="text-sm">🏆</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-800">{s.person_name}</div>
              {s.reason ? (
                <div className="text-xs text-slate-500">{s.reason}</div>
              ) : null}
            </div>
            {editable ? (
              <button
                type="button"
                onClick={() => onRemove?.(s.id)}
                className="text-slate-400 hover:text-red-500"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {editable ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Member name"
            className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Reason (optional)"
            className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
          >
            <Plus size={13} /> Add
          </button>
        </div>
      ) : null}
    </div>
  );
}

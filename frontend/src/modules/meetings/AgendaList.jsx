import { useState } from "react";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import Button from "../../shared/components/Button";
import { addAgendaItem, deleteAgendaItem, updateAgendaItem } from "./meetingApi";

function AgendaRow({ meetingId, item, index, onChanged, onError, editable = true }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);

  const save = async () => {
    if (!title.trim()) return;
    try {
      await updateAgendaItem(meetingId, item.id, { title: title.trim() });
      setEditing(false);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete item "${item.title}"?`)) return;
    try {
      await deleteAgendaItem(meetingId, item.id);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <li className="group flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
      <span className="text-xs font-semibold text-slate-400">{index + 1}.</span>
      {editing ? (
        <>
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <button onClick={save} className="text-emerald-600 hover:text-emerald-700">
            <Check size={16} />
          </button>
          <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-slate-700">{item.title}</span>
          {editable && (
            <>
              <button
                onClick={() => setEditing(true)}
                className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-brand"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={remove}
                className="text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </>
      )}
    </li>
  );
}

export default function AgendaList({ meetingId, items, onChanged, onError, editable = true }) {
  const [title, setTitle] = useState("");

  const add = async () => {
    if (!title.trim()) return;
    try {
      await addAgendaItem(meetingId, { title: title.trim() });
      setTitle("");
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5">
        {items.length === 0 && (
          <p className="text-sm text-slate-400">No agenda items yet.</p>
        )}
        {items.map((it, i) => (
          <AgendaRow
            key={it.id}
            meetingId={meetingId}
            item={it}
            index={i}
            onChanged={onChanged}
            onError={onError}
            editable={editable}
          />
        ))}
      </ul>
      {editable && (
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add agenda item..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <Button size="sm" onClick={add} disabled={!title.trim()}>
            <Plus size={15} /> Add
          </Button>
        </div>
      )}
    </div>
  );
}

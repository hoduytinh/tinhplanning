import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Circle, ListPlus, CornerDownRight } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import Select from "../../shared/components/Select";
import { ACTION_PRIORITIES, metaFrom } from "./meetingConstants";
import {
  addActionItem,
  createTaskFromAction,
  deleteActionItem,
  updateActionItem,
} from "./meetingApi";

function ActionRow({ meetingId, item, categories, onChanged, onError, onToast, editable = true }) {
  const [busy, setBusy] = useState(false);
  const prio = metaFrom(ACTION_PRIORITIES, item.priority);
  const isDone = item.status === "done";
  const hasMeta = editable || item.assignee || item.due_date || item.category;

  const patch = async (changes) => {
    setBusy(true);
    try {
      await updateActionItem(meetingId, item.id, changes);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Xóa action item này?")) return;
    try {
      await deleteActionItem(meetingId, item.id);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const makeTask = async () => {
    setBusy(true);
    try {
      await createTaskFromAction(meetingId, item.id);
      onToast?.("Đã tạo task từ action item.");
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-1.5 last:border-b-0">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => patch({ status: isDone ? "open" : "done" })}
          className="shrink-0"
          disabled={busy || !editable}
          aria-label="Đổi trạng thái"
        >
          {isDone ? (
            <CheckCircle2 size={16} className="text-emerald-500" />
          ) : (
            <Circle size={16} className="text-slate-300 hover:text-emerald-400" />
          )}
        </button>
        <input
          defaultValue={item.content}
          readOnly={!editable}
          onBlur={(e) =>
            e.target.value.trim() &&
            e.target.value !== item.content &&
            patch({ content: e.target.value.trim() })
          }
          className={`min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm ${
            editable ? "hover:border-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30" : ""
          } ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}
        />
        {prio && (
          <Badge tone={prio.tone} className="shrink-0">
            {prio.label}
          </Badge>
        )}
        {item.carried_over_from && (
          <Badge tone="bg-violet-50 text-violet-700 border-violet-200" className="shrink-0">
            <CornerDownRight size={11} />
          </Badge>
        )}
        {item.task_id && (
          <Badge tone="bg-blue-50 text-blue-700 border-blue-200" className="shrink-0">
            #{item.task_id}
          </Badge>
        )}
        {editable && !item.task_id && (
          <button
            onClick={makeTask}
            disabled={busy}
            title="Tạo task"
            className="shrink-0 text-slate-400 hover:text-brand"
          >
            <ListPlus size={14} />
          </button>
        )}
        {editable && (
          <button onClick={remove} className="shrink-0 text-slate-400 hover:text-red-500" title="Xóa">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {hasMeta && (
        <div className="ml-6 flex flex-wrap items-center gap-1.5">
          {editable ? (
            <>
              <input
                defaultValue={item.assignee || ""}
                onBlur={(e) => e.target.value !== (item.assignee || "") && patch({ assignee: e.target.value || null })}
                placeholder="Người phụ trách"
                className="w-24 rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:border-brand focus:outline-none"
              />
              <input
                type="date"
                defaultValue={item.due_date || ""}
                onChange={(e) => patch({ due_date: e.target.value || null })}
                className="rounded border border-slate-200 px-1.5 py-0.5 text-xs focus:border-brand focus:outline-none"
              />
              <Select
                value={item.priority || ""}
                onChange={(e) => patch({ priority: e.target.value || null })}
                options={ACTION_PRIORITIES}
                placeholder="Mức"
                ariaLabel="Ưu tiên"
                className="w-28 [&_select]:py-1"
                disabled={!editable}
              />
              {categories.length > 0 && (
                <Select
                  value={item.category || ""}
                  onChange={(e) => patch({ category: e.target.value || null })}
                  options={categories.map((c) => ({ value: c, label: c }))}
                  placeholder="Nhóm"
                  ariaLabel="Nhóm"
                  className="w-24 [&_select]:py-1"
                  disabled={!editable}
                />
              )}
            </>
          ) : (
            <>
              {item.assignee && <span className="text-xs text-slate-500">👤 {item.assignee}</span>}
              {item.due_date && <span className="text-xs text-slate-500">📅 {item.due_date}</span>}
              {item.category && (
                <Badge tone="bg-slate-100 text-slate-500 border-slate-200">{item.category}</Badge>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActionItemList({
  meetingId,
  items,
  categories = [],
  onChanged,
  onError,
  onToast,
  editable = true,
}) {
  const [content, setContent] = useState("");

  const add = async () => {
    if (!content.trim()) return;
    try {
      await addActionItem(meetingId, { content: content.trim() });
      setContent("");
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  const openCount = items.filter((i) => i.status === "open").length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {items.length} action items · {openCount} đang mở
        </span>
      </div>
      <div>
        {items.length === 0 && (
          <p className="text-sm text-slate-400">Chưa có action item.</p>
        )}
        {items.map((it) => (
          <ActionRow
            key={it.id}
            meetingId={meetingId}
            item={it}
            categories={categories}
            onChanged={onChanged}
            onError={onError}
            onToast={onToast}
            editable={editable}
          />
        ))}
      </div>
      {editable && (
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Thêm action item..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <Button size="sm" onClick={add} disabled={!content.trim()}>
            <Plus size={15} /> Thêm
          </Button>
        </div>
      )}
    </div>
  );
}

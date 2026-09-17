import { useEffect, useState } from "react";
import { Check, GripVertical, Plus, User, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  createSubtask,
  deleteSubtask,
  fetchSubtasks,
  reorderSubtasks,
  updateSubtask,
} from "./subtaskApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

function toDateInput(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 10);
}

function SubtaskRow({ item, onToggle, onDelete, onFieldChange }) {
  const { role } = useAuth();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 rounded-md px-1 py-1.5 hover:bg-slate-50"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>

      <button
        type="button"
        onClick={() => onToggle(item)}
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
          item.is_done
            ? "border-brand bg-brand text-white"
            : "border-slate-300 hover:border-brand"
        }`}
        aria-label={item.is_done ? "Unmark" : "Mark as done"}
      >
        {item.is_done && <Check size={12} strokeWidth={3} />}
      </button>

      <span
        className={`flex-1 text-sm ${
          item.is_done ? "text-slate-400 line-through" : "text-slate-700"
        }`}
      >
        {item.title}
      </span>

      <span className="hidden items-center gap-1 sm:flex">
        <User size={12} className="text-slate-300" />
        <input
          value={item.assignee || ""}
          onChange={(e) => onFieldChange(item, { assignee: e.target.value })}
          placeholder="Assignee"
          className="w-20 border-0 bg-transparent p-0 text-xs text-slate-500 placeholder-slate-300 focus:outline-none focus:ring-0"
        />
      </span>

      <input
        type="date"
        value={toDateInput(item.due_date)}
        onChange={(e) =>
          onFieldChange(item, { due_date: e.target.value || null })
        }
        className="hidden w-[124px] rounded border-0 bg-transparent p-0 text-xs text-slate-500 focus:outline-none focus:ring-0 sm:block"
      />

      <button
        type="button"
        onClick={() => onDelete(item)}
        className={`text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100 ${
          hasPermission(role, "tasks", "delete") ? "" : "hidden"
        }`}
        aria-label="Delete subtask"
      >
        <X size={14} />
      </button>
    </li>
  );
}

// Checklist bên trong 1 task, có drag & drop sắp xếp + assignee/due_date.
// onChange: báo cho component cha biết tiến độ đổi (để cập nhật progress trên card).
export default function SubtaskList({ taskId, onChange }) {
  const { role } = useAuth();
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const load = async () => {
    try {
      const data = await fetchSubtasks(taskId);
      setItems(data);
      onChange?.(data);
    } catch (err) {
      setError(err.message || "Unable to load subtasks.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      await createSubtask(taskId, { title });
      setNewTitle("");
      await load();
    } catch (err) {
      setError(err.message || "Unable to add subtask.");
    }
  };

  const toggle = async (item) => {
    try {
      await updateSubtask(taskId, item.id, { is_done: !item.is_done });
      await load();
    } catch (err) {
      setError(err.message || "Unable to update subtask.");
    }
  };

  const remove = async (item) => {
    try {
      await deleteSubtask(taskId, item.id);
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete subtask.");
    }
  };

  const fieldChange = async (item, patch) => {
    // Optimistic update để gõ input mượt, không giật.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, ...patch } : i))
    );
    try {
      await updateSubtask(taskId, item.id, patch);
    } catch (err) {
      setError(err.message || "Unable to update subtask.");
      await load();
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    try {
      await reorderSubtasks(
        taskId,
        reordered.map((i) => i.id)
      );
    } catch (err) {
      setError(err.message || "Unable to reorder subtasks.");
      await load();
    }
  };

  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Sub-tasks</h4>
        {items.length > 0 && (
          <span className="text-xs text-slate-500">
            {doneCount}/{items.length} done
          </span>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="space-y-0.5">
            {items.map((item) => (
              <SubtaskRow
                key={item.id}
                item={item}
                onToggle={toggle}
                onDelete={remove}
                onFieldChange={fieldChange}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {hasPermission(role, "tasks", "update") && (
        <form onSubmit={handleAdd} className="mt-2 flex items-center gap-2">
          <Plus size={15} className="text-slate-400" />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add subtask..."
            className="flex-1 border-0 bg-transparent p-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
          />
        </form>
      )}
    </div>
  );
}


import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Sparkles,
  X,
  Check,
  CheckCircle2,
} from "lucide-react";
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
import Badge from "../../shared/components/Badge";
import {
  MILESTONE_STATUSES,
  formatShortDate,
  isDatePast,
  milestoneStatusMeta,
  milestoneTypeMeta,
  parseExitCriteria,
} from "./projectConstants";
import {
  createMilestone,
  deleteMilestone,
  fetchMilestones,
  populateStandardMilestones,
  reorderMilestones,
  updateMilestone,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

// Nhấn icon để xoay vòng trạng thái not_started → in_progress → done.
function nextStatus(current) {
  const order = MILESTONE_STATUSES.map((s) => s.value);
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

function MilestoneRow({ item, expanded, onToggleExpand, onCycle, onDelete, onSaveEdit }) {
  const { role } = useAuth();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const meta = milestoneStatusMeta(item.status);
  const typeMeta = milestoneTypeMeta(item.milestone_type);
  const overdue = item.status !== "done" && isDatePast(item.due_date);
  const criteria = parseExitCriteria(item);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [editDate, setEditDate] = useState(item.due_date || "");

  const startEdit = () => {
    setEditTitle(item.title);
    setEditDate(item.due_date || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const submitEdit = async () => {
    const title = editTitle.trim();
    if (!title) return;
    await onSaveEdit(item, { title, due_date: editDate || null });
    setEditing(false);
  };

  if (editing) {
    return (
      <li ref={setNodeRef} style={style} className="rounded-md bg-slate-50">
        <div className="flex items-center gap-2 px-1 py-1.5">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-brand focus:outline-none"
            placeholder="Tên milestone"
          />
          <input
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.target.value)}
            className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={submitEdit}
            className="text-green-500 transition hover:text-green-600"
            aria-label="Lưu"
          >
            <Check size={15} />
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="text-slate-400 transition hover:text-slate-600"
            aria-label="Hủy"
          >
            <X size={15} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} className="rounded-md hover:bg-slate-50">
      <div className="group flex items-center gap-2 px-1 py-1.5">
        <button
          type="button"
          className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          aria-label="Kéo để sắp xếp"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        <button
          type="button"
          onClick={() => onCycle(item)}
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ color: meta.color }}
          title={meta.label}
          aria-label={`Trạng thái: ${meta.label}`}
        >
          {meta.icon}
        </button>

        {/* Badge type màu theo giai đoạn Marvell */}
        {item.milestone_type && item.milestone_type !== "custom" && (
          <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
        )}

        <span
          className={`flex-1 text-sm ${
            item.status === "done"
              ? "text-slate-400 line-through"
              : "text-slate-700"
          }`}
        >
          {item.title}
        </span>

        <span
          className={`text-xs ${overdue ? "font-medium text-red-600" : "text-slate-400"}`}
        >
          {formatShortDate(item.due_date)}
        </span>

        {/* Nút xổ exit criteria */}
        {criteria.length > 0 && (
          <button
            type="button"
            onClick={() => onToggleExpand(item.id)}
            className="text-slate-300 transition hover:text-slate-600"
            aria-label={expanded ? "Thu gọn" : "Xem exit criteria"}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        )}

        {hasPermission(role, "projects", "update") && (
          <button
            type="button"
            onClick={startEdit}
            className="text-slate-300 opacity-0 transition hover:text-brand group-hover:opacity-100"
            aria-label="Sửa milestone"
          >
            <Pencil size={13} />
          </button>
        )}

        {hasPermission(role, "projects", "delete") && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
            aria-label="Xóa milestone"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Exit criteria checklist */}
      {expanded && criteria.length > 0 && (
        <ul className="mb-1.5 ml-9 space-y-1 border-l border-slate-100 pl-3">
          {criteria.map((c) => (
            <li
              key={c}
              className="flex items-center gap-1.5 text-xs text-slate-500"
            >
              <CheckCircle2 size={13} className="shrink-0 text-slate-300" />
              {c}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

// Danh sách milestone của 1 project: drag & drop sắp xếp, click icon đổi trạng thái.
export default function MilestoneList({ projectId, onChange }) {
  const { role: currentRole } = useAuth();
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(() => new Set());
  const [dismissedPrompt, setDismissedPrompt] = useState(false);
  const [populating, setPopulating] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const load = async () => {
    try {
      const data = await fetchMilestones(projectId);
      setItems(data);
      onChange?.(data);
    } catch (err) {
      setError(err.message || "Không thể tải milestone.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const toggleExpand = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAdd = async (e) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    try {
      await createMilestone(projectId, {
        title,
        due_date: newDate || null,
      });
      setNewTitle("");
      setNewDate("");
      await load();
    } catch (err) {
      setError(err.message || "Không thể thêm milestone.");
    }
  };

  const applyStandard = async () => {
    setPopulating(true);
    try {
      await populateStandardMilestones(projectId);
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message || "Không thể tạo milestone chuẩn.");
    } finally {
      setPopulating(false);
    }
  };

  const cycle = async (item) => {
    const status = nextStatus(item.status);
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status } : i))
    );
    try {
      await updateMilestone(projectId, item.id, { status });
      onChange?.();
    } catch (err) {
      setError(err.message || "Không thể cập nhật milestone.");
      await load();
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Xóa milestone "${item.title}"?`)) return;
    try {
      await deleteMilestone(projectId, item.id);
      await load();
    } catch (err) {
      setError(err.message || "Không thể xóa milestone.");
    }
  };

  const saveEdit = async (item, changes) => {
    try {
      await updateMilestone(projectId, item.id, changes);
      await load();
      onChange?.();
    } catch (err) {
      setError(err.message || "Không thể cập nhật milestone.");
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
      await reorderMilestones(
        projectId,
        reordered.map((i) => i.id)
      );
    } catch (err) {
      setError(err.message || "Không thể sắp xếp milestone.");
      await load();
    }
  };

  const doneCount = items.filter((i) => i.status === "done").length;
  const showStandardPrompt = items.length === 0 && !dismissedPrompt;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Milestones</h4>
        <div className="flex items-center gap-3">
          {items.length > 0 && (
            <span className="text-xs text-slate-500">
              {doneCount}/{items.length} hoàn thành
            </span>
          )}
          <button
            type="button"
            onClick={applyStandard}
            disabled={populating}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark disabled:opacity-50"
            title="Thêm 7 milestone chuẩn Marvell"
          >
            <Sparkles size={13} />
            Marvell Standard
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {/* Dialog gợi ý khi project chưa có milestone */}
      {showStandardPrompt && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <Sparkles size={16} className="shrink-0 text-brand" />
            <span>
              Dùng <strong>Marvell Standard Milestones</strong>? (POR → iRTL →
              CC → FPF → RTLF → FDR → Tapeout)
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={applyStandard}
              disabled={populating}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {populating ? "Đang tạo..." : "Có"}
            </button>
            <button
              type="button"
              onClick={() => setDismissedPrompt(true)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Không
            </button>
          </div>
        </div>
      )}

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
              <MilestoneRow
                key={item.id}
                item={item}
                expanded={expanded.has(item.id)}
                onToggleExpand={toggleExpand}
                onCycle={cycle}
                onDelete={remove}
                onSaveEdit={saveEdit}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {hasPermission(currentRole, "projects", "update") && (
      <form onSubmit={handleAdd} className="mt-2 flex items-center gap-2">
        <Plus size={15} className="text-slate-400" />
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Thêm milestone..."
          className="flex-1 border-0 bg-transparent p-0 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        <input
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 focus:border-brand focus:outline-none"
        />
      </form>
      )}
    </div>
  );
}

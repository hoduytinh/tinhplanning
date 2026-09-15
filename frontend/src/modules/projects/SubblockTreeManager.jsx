import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
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
import Button from "../../shared/components/Button";
import {
  createSubblock,
  deleteSubblock,
  fetchSubblocks,
  moveSubblock,
  updateSubblock,
} from "./projectApi";

// Trình quản lý cây sub-block của 1 project.
// - Thêm node root / node con
// - Sửa tên inline
// - Xóa (cascade children) có xác nhận
// - Kéo thả sắp xếp trong cùng cấp (siblings)
export default function SubblockTreeManager({ projectId }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [addingParent, setAddingParent] = useState(undefined); // undefined = none, null = root
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSubblocks(projectId);
      setTree(data);
    } catch (err) {
      setError(err.message || "Không thể tải sub-block.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const startAdd = (parentId) => {
    setAddingParent(parentId);
    setNewName("");
    if (parentId != null) setExpanded((e) => ({ ...e, [parentId]: true }));
  };

  const submitAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setAddingParent(undefined);
      return;
    }
    try {
      await createSubblock(projectId, {
        name,
        parent_id: addingParent ?? null,
      });
      setAddingParent(undefined);
      setNewName("");
      await load();
    } catch (err) {
      setError(err.message || "Không thể thêm sub-block.");
    }
  };

  const startEdit = (node) => {
    setEditingId(node.id);
    setEditName(node.name);
  };

  const submitEdit = async () => {
    const name = editName.trim();
    if (!name || name === "") {
      setEditingId(null);
      return;
    }
    try {
      await updateSubblock(projectId, editingId, { name });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message || "Không thể đổi tên.");
    }
  };

  const handleDelete = async (node) => {
    if (
      !window.confirm(
        `Xóa "${node.name}" và toàn bộ children? Task đang gán sẽ mất sub-block.`
      )
    )
      return;
    try {
      await deleteSubblock(projectId, node.id);
      await load();
    } catch (err) {
      setError(err.message || "Không thể xóa sub-block.");
    }
  };

  // Kéo thả reorder trong cùng 1 nhóm sibling (cùng parent_id).
  const handleReorder = async (parentId, orderedIds) => {
    try {
      await Promise.all(
        orderedIds.map((id, index) =>
          moveSubblock(projectId, id, { parent_id: parentId, order: index })
        )
      );
      await load();
    } catch (err) {
      setError(err.message || "Không thể sắp xếp.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">Đang tải sub-block...</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Chia project thành các sub-block (module/feature) để gán task và sinh
          auto-tag.
        </p>
        <Button size="sm" variant="secondary" onClick={() => startAdd(null)}>
          <Plus size={14} /> Node root
        </Button>
      </div>

      <SubblockLevel
        nodes={tree}
        parentId={null}
        depth={0}
        expanded={expanded}
        toggle={toggle}
        editingId={editingId}
        editName={editName}
        setEditName={setEditName}
        startEdit={startEdit}
        submitEdit={submitEdit}
        onCancelEdit={() => setEditingId(null)}
        startAdd={startAdd}
        onDelete={handleDelete}
        addingParent={addingParent}
        newName={newName}
        setNewName={setNewName}
        submitAdd={submitAdd}
        onCancelAdd={() => setAddingParent(undefined)}
        onReorder={handleReorder}
      />

      {tree.length === 0 && addingParent === undefined && (
        <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm italic text-slate-400">
          Chưa có sub-block. Bấm "Node root" để bắt đầu.
        </p>
      )}

      {addingParent === null && (
        <AddInput
          value={newName}
          onChange={setNewName}
          onSubmit={submitAdd}
          onCancel={() => setAddingParent(undefined)}
          depth={0}
        />
      )}
    </div>
  );
}

function SubblockLevel({
  nodes,
  parentId,
  depth,
  expanded,
  toggle,
  editingId,
  editName,
  setEditName,
  startEdit,
  submitEdit,
  onCancelEdit,
  startAdd,
  onDelete,
  addingParent,
  newName,
  setNewName,
  submitAdd,
  onCancelAdd,
  onReorder,
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = nodes.map((n) => n.id);
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(parentId, arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={nodes.map((n) => n.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-1">
          {nodes.map((node) => (
            <SubblockNodeRow
              key={node.id}
              node={node}
              depth={depth}
              expanded={expanded}
              toggle={toggle}
              editingId={editingId}
              editName={editName}
              setEditName={setEditName}
              startEdit={startEdit}
              submitEdit={submitEdit}
              onCancelEdit={onCancelEdit}
              startAdd={startAdd}
              onDelete={onDelete}
              addingParent={addingParent}
              newName={newName}
              setNewName={setNewName}
              submitAdd={submitAdd}
              onCancelAdd={onCancelAdd}
              onReorder={onReorder}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SubblockNodeRow({
  node,
  depth,
  expanded,
  toggle,
  editingId,
  editName,
  setEditName,
  startEdit,
  submitEdit,
  onCancelEdit,
  startAdd,
  onDelete,
  addingParent,
  newName,
  setNewName,
  submitAdd,
  onCancelAdd,
  onReorder,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = (node.children || []).length > 0;
  const isOpen = expanded[node.id] ?? true;
  const isEditing = editingId === node.id;

  return (
    <div>
      <div
        ref={setNodeRef}
        style={{ ...style, paddingLeft: `${depth * 18}px` }}
        className="group flex items-center gap-1 rounded-md px-1 py-1.5 hover:bg-slate-50"
      >
        <button
          type="button"
          className="cursor-grab touch-none text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          aria-label="Kéo để sắp xếp"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>

        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className="flex h-5 w-5 items-center justify-center text-slate-400 hover:text-slate-600"
            aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}

        {isEditing ? (
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={submitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitEdit();
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 rounded border border-brand px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        ) : (
          <span className="flex-1 truncate text-sm text-slate-700">
            {node.name}
            <code className="ml-2 rounded bg-slate-100 px-1 text-[11px] text-slate-400">
              {node.slug}
            </code>
          </span>
        )}

        <div className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => startAdd(node.id)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand"
            title="Thêm node con"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={() => startEdit(node)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            title="Đổi tên"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-500"
            title="Xóa"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <SubblockLevel
          nodes={node.children}
          parentId={node.id}
          depth={depth + 1}
          expanded={expanded}
          toggle={toggle}
          editingId={editingId}
          editName={editName}
          setEditName={setEditName}
          startEdit={startEdit}
          submitEdit={submitEdit}
          onCancelEdit={onCancelEdit}
          startAdd={startAdd}
          onDelete={onDelete}
          addingParent={addingParent}
          newName={newName}
          setNewName={setNewName}
          submitAdd={submitAdd}
          onCancelAdd={onCancelAdd}
          onReorder={onReorder}
        />
      )}

      {addingParent === node.id && (
        <AddInput
          value={newName}
          onChange={setNewName}
          onSubmit={submitAdd}
          onCancel={onCancelAdd}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

function AddInput({ value, onChange, onSubmit, onCancel, depth }) {
  return (
    <div
      style={{ paddingLeft: `${depth * 18 + 26}px` }}
      className="flex items-center gap-2 py-1"
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
          if (e.key === "Escape") onCancel();
        }}
        placeholder="Tên sub-block..."
        className="w-56 rounded border border-brand px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <button
        type="button"
        onClick={onSubmit}
        className="rounded-md bg-brand px-2 py-1 text-xs font-medium text-white hover:bg-brand-dark"
      >
        Thêm
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs text-slate-400 hover:text-slate-600"
      >
        Hủy
      </button>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Pencil, X, Trash2 } from "lucide-react";
import Select from "../../shared/components/Select";
import Button from "../../shared/components/Button";
import StatusIcon from "./StatusIcon";
import StatusSelect from "./StatusSelect";
import SubblockDropdown from "./SubblockDropdown";
import SubtaskList from "./SubtaskList";
import AttachmentList from "./AttachmentList";
import ActivityFeed from "./ActivityFeed";
import RichTextEditor from "./RichTextEditor";
import ErrorBoundary from "../../shared/components/ErrorBoundary";
import RoleGuard from "../../shared/RoleGuard";
import { PRIORITIES, TYPES, formatDate } from "./taskConstants";
import { fetchProjects } from "../projects/projectApi";

// Debounce auto-save cho mô tả: lưu sau 1s ngừng gõ, không cần bấm nút.
const DESC_AUTOSAVE_DELAY = 1000;

function toDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

// Panel "Engineering Ticket" trượt ra từ bên phải.
// Layout 2 cột: trái (60%) nội dung chính, phải (40%) metadata.
// props:
//  - task: task đang mở (null = đóng)
//  - onClose, onUpdate(patch), onDelete
export default function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
  onDelete,
  onSubtasksChange,
}) {
  const open = Boolean(task);

  const [titleDraft, setTitleDraft] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [shortDescDraft, setShortDescDraft] = useState("");
  const [editingShortDesc, setEditingShortDesc] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [descDraft, setDescDraft] = useState("");
  const [descSaveStatus, setDescSaveStatus] = useState("saved"); // saved | pending | saving
  const [descModalOpen, setDescModalOpen] = useState(false);
  const [descSize, setDescSize] = useState(null); // null = kích cỡ mặc định (CSS); {width,height} sau khi user tự kéo resize
  const descTimerRef = useRef(null);

  // Metadata (trạng thái/ưu tiên/loại/hạn chót/dự án/sub-block/tags) chỉ lưu
  // khi bấm nút "Lưu thay đổi" — mọi thay đổi trước đó chỉ nằm ở draft local.
  const [metaDraft, setMetaDraft] = useState(null);
  const [metaBaseline, setMetaBaseline] = useState(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const snapshotMeta = (t) => ({
    status: t.status,
    priority: t.priority,
    type: t.type,
    due_date: toDateInput(t.due_date),
    project_id: t.project_id ?? null,
    subblock_id: t.subblock_id ?? null,
    tags: [...(t.tags || [])],
  });

  const metaDirty =
    metaDraft && metaBaseline
      ? JSON.stringify(metaDraft) !== JSON.stringify(metaBaseline)
      : false;

  // Danh sách project thật để gán task vào dự án.
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((data) => active && setProjects(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (task) {
      setTitleDraft(task.title || "");
      setEditingTitle(false);
      setShortDescDraft(task.short_description || "");
      setEditingShortDesc(false);
      setTagInput("");
      setDescDraft(task.description || "");
      setDescSaveStatus("saved");
      setDescModalOpen(false);
      setDescSize(null);
    }
    // Hủy debounce đang chờ khi chuyển sang task khác, tránh lưu nhầm.
    return () => {
      if (descTimerRef.current) clearTimeout(descTimerRef.current);
    };
  }, [task]);

  // Reset draft metadata chỉ khi CHUYỂN sang task khác (theo id) — không phải
  // mỗi lần task cha re-render (ví dụ do autosave mô tả), để không làm mất
  // thay đổi metadata chưa lưu.
  useEffect(() => {
    if (task) {
      const snap = snapshotMeta(task);
      setMetaDraft(snap);
      setMetaBaseline(snap);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // Đóng bằng phím Esc — ưu tiên đóng popup mô tả trước, rồi mới đóng cả panel.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (descModalOpen) setDescModalOpen(false);
      else guardedClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onClose, descModalOpen, metaDirty]);

  if (!task) return null;

  const saveTitle = () => {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (t && t !== task.title) onUpdate({ title: t });
  };

  const saveShortDesc = () => {
    const t = shortDescDraft.trim();
    setEditingShortDesc(false);
    if (t !== (task.short_description || "")) onUpdate({ short_description: t || null });
  };

  // Gõ tới đâu lưu tới đó — debounce 1s, không cần bấm nút Lưu.
  const handleDescChange = (html) => {
    setDescDraft(html);
    setDescSaveStatus("pending");
    if (descTimerRef.current) clearTimeout(descTimerRef.current);
    descTimerRef.current = setTimeout(async () => {
      const clean = html === "<p></p>" ? "" : html;
      if (clean === (task.description || "")) {
        setDescSaveStatus("saved");
        return;
      }
      setDescSaveStatus("saving");
      await onUpdate({ description: clean || null });
      setDescSaveStatus("saved");
    }, DESC_AUTOSAVE_DELAY);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setMetaDraft((d) => {
      const tags = d?.tags || [];
      return tags.includes(t) ? d : { ...d, tags: [...tags, t] };
    });
    setTagInput("");
  };

  const removeTag = (tag) => {
    setMetaDraft((d) => ({
      ...d,
      tags: (d?.tags || []).filter((x) => x !== tag),
    }));
  };

  const handleSaveMeta = async () => {
    if (!metaDirty || savingMeta) return;
    setSavingMeta(true);
    try {
      const patch = {};
      for (const key of Object.keys(metaDraft)) {
        if (JSON.stringify(metaDraft[key]) !== JSON.stringify(metaBaseline[key])) {
          patch[key] =
            key === "due_date"
              ? metaDraft.due_date
                ? new Date(metaDraft.due_date).toISOString()
                : null
              : metaDraft[key];
        }
      }
      await onUpdate(patch);
      setMetaBaseline(metaDraft);
    } finally {
      setSavingMeta(false);
    }
  };

  const handleCancelMeta = () => setMetaDraft(metaBaseline);

  // Đóng panel — nếu còn thay đổi metadata chưa lưu thì hỏi lại trước khi mất.
  const guardedClose = () => {
    if (metaDirty && !window.confirm("Bạn có thay đổi chưa lưu. Đóng và bỏ qua?")) {
      return;
    }
    onClose();
  };

  // Custom resize (thay cho CSS `resize` gốc — kết hợp với overlay flex
  // center dễ gây lệch target khi thả chuột, khiến popup bị đóng nhầm khi
  // đang kéo resize). Kéo từ handle góc dưới-phải, tự cập nhật width/height.
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const boxEl = e.currentTarget.parentElement;
    const rect = boxEl.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = rect.width;
    const startH = rect.height;
    const onMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setDescSize({
        width: Math.min(Math.max(startW + dx, 420), window.innerWidth * 0.95),
        height: Math.min(Math.max(startH + dy, 320), window.innerHeight * 0.9),
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const fieldLabel = "text-xs font-medium uppercase tracking-wide text-slate-400";
  const row = "flex items-center justify-between gap-2 py-1.5";

  return (
    <>
      {/* Lớp phủ mờ — click để đóng */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/20"
        onClick={guardedClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl lg:w-[90%] xl:w-[78%]"
        role="dialog"
        aria-label="Chi tiết task"
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
          <StatusIcon
            status={metaDraft?.status ?? task.status}
            onChange={(s) => setMetaDraft((d) => ({ ...d, status: s }))}
            size={20}
          />
          <span className="text-sm text-slate-400">
            Ticket #{task.id} · Chi tiết task
          </span>
          <button
            onClick={guardedClose}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body: 2 cột 76/24 — metadata bên phải thu gọn tối đa */}
        <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[76%_24%]">
          {/* LEFT — nội dung chính */}
          <div className="overflow-y-auto border-b border-slate-200 px-5 py-4 lg:border-b-0 lg:border-r">
            {/* Title editable */}
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="w-full rounded-md border border-brand px-2 py-1 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            ) : (
              <h2
                onClick={() => setEditingTitle(true)}
                className="cursor-text rounded-md px-2 py-1 text-lg font-bold text-slate-900 hover:bg-slate-50"
                title="Click để sửa"
              >
                {task.prefix_display && (
                  <span
                    className="mr-1.5 font-bold"
                    style={{ color: task.prefix_color || "#94a3b8" }}
                  >
                    {task.prefix_display}
                  </span>
                )}
                {task.title}
              </h2>
            )}

            {/* Short description — text đơn giản, không định dạng */}
            <div className="mt-1.5 px-2">
              {editingShortDesc ? (
                <input
                  autoFocus
                  value={shortDescDraft}
                  onChange={(e) => setShortDescDraft(e.target.value)}
                  onBlur={saveShortDesc}
                  onKeyDown={(e) => e.key === "Enter" && saveShortDesc()}
                  placeholder="Short description..."
                  className="w-full rounded-md border border-brand px-2 py-1 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              ) : (
                <p
                  onClick={() => setEditingShortDesc(true)}
                  className="cursor-text rounded-md py-1 text-sm text-slate-500 hover:bg-slate-50"
                  title="Click để sửa"
                >
                  {task.short_description || (
                    <span className="italic text-slate-400">
                      Thêm short description...
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* ① Description — luôn xem dạng thu gọn (read-only); chỉ sửa
                qua nút "Sửa" → mở popup riêng, không cho gõ trực tiếp ở đây */}
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className={fieldLabel}>Content</span>
                <button
                  type="button"
                  onClick={() => setDescModalOpen(true)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand"
                >
                  <Pencil size={12} /> Sửa
                </button>
              </div>
              <div className="relative mt-1.5">
                {descDraft ? (
                  <div className="relative max-h-48 overflow-hidden rounded-lg ring-1 ring-slate-200">
                    <ErrorBoundary key={`${task.id}-preview`}>
                      <RichTextEditor content={descDraft} editable={false} />
                    </ErrorBoundary>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDescModalOpen(true)}
                    className="w-full rounded-lg border border-dashed border-slate-200 px-3 py-4 text-left text-sm italic text-slate-400 transition hover:border-brand/40 hover:text-brand"
                  >
                    Chưa có nội dung. Bấm "Sửa" để thêm...
                  </button>
                )}
              </div>
            </div>

            <div className="my-4 border-t border-slate-100" />

            {/* ② Subtasks */}
            <SubtaskList
              taskId={task.id}
              onChange={(items) => onSubtasksChange?.(task.id, items)}
            />

            <div className="my-4 border-t border-slate-100" />

            {/* ③ Attachments */}
            <AttachmentList taskId={task.id} />

            <div className="my-4 border-t border-slate-100" />

            {/* ④ Activity + Comments */}
            <ActivityFeed taskId={task.id} />
          </div>

          {/* RIGHT — metadata (thu gọn tối đa) */}
          <div className="flex flex-col overflow-y-auto px-3 py-2.5 text-sm">
            <div className="flex-1">
              <div className="divide-y divide-slate-100 border-y border-slate-100">
                <div className={row}>
                  <span className={fieldLabel}>Trạng thái</span>
                  <StatusSelect
                    ariaLabel="Trạng thái"
                    value={metaDraft?.status ?? task.status}
                    onChange={(v) => setMetaDraft((d) => ({ ...d, status: v }))}
                  />
                </div>
                <div className={row}>
                  <span className={fieldLabel}>Ưu tiên</span>
                  <Select
                    ariaLabel="Ưu tiên"
                    className="max-w-[112px]"
                    value={metaDraft?.priority ?? task.priority}
                    onChange={(e) =>
                      setMetaDraft((d) => ({ ...d, priority: e.target.value }))
                    }
                    options={PRIORITIES.map((p) => ({
                      value: p.value,
                      label: p.label,
                    }))}
                  />
                </div>
                <div className={row}>
                  <span className={fieldLabel}>Loại</span>
                  <Select
                    ariaLabel="Loại"
                    className="max-w-[112px]"
                    value={metaDraft?.type ?? task.type}
                    onChange={(e) =>
                      setMetaDraft((d) => ({ ...d, type: e.target.value }))
                    }
                    options={TYPES}
                  />
                </div>
                <div className={row}>
                  <span className={fieldLabel}>Hạn chót</span>
                  <input
                    type="date"
                    value={metaDraft?.due_date ?? toDateInput(task.due_date)}
                    onChange={(e) =>
                      setMetaDraft((d) => ({ ...d, due_date: e.target.value }))
                    }
                    className="w-[112px] rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <div className={row}>
                  <span className={fieldLabel}>Dự án</span>
                  <Select
                    ariaLabel="Dự án"
                    className="max-w-[112px]"
                    value={
                      metaDraft?.project_id != null
                        ? String(metaDraft.project_id)
                        : ""
                    }
                    onChange={(e) =>
                      setMetaDraft((d) => ({
                        ...d,
                        project_id: e.target.value
                          ? Number(e.target.value)
                          : null,
                        // Đổi project → reset sub-block (path cũ không còn hợp lệ).
                        subblock_id: null,
                      }))
                    }
                    placeholder="Không"
                    options={projects.map((p) => ({
                      value: String(p.id),
                      label: p.name,
                    }))}
                  />
                </div>
                <div className={row}>
                  <span className={fieldLabel}>Sub-block</span>
                  <SubblockDropdown
                    className="max-w-[148px]"
                    projectId={metaDraft?.project_id ?? task.project_id ?? null}
                    value={metaDraft?.subblock_id ?? null}
                    onChange={(v) =>
                      setMetaDraft((d) => ({ ...d, subblock_id: v }))
                    }
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="py-3">
                <span className={fieldLabel}>Tags</span>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {(metaDraft?.tags ?? task.tags ?? []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="text-slate-400 hover:text-red-500"
                        aria-label={`Xóa tag ${tag}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="+ tag"
                    className="w-20 border-0 bg-transparent p-0 text-xs text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Save/Cancel — thay đổi metadata chỉ lưu khi bấm nút */}
              {metaDirty && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <span className="flex-1">Có thay đổi chưa lưu</span>
                  <button
                    type="button"
                    onClick={handleCancelMeta}
                    disabled={savingMeta}
                    className="rounded-md px-2 py-1 font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="rounded-md bg-brand px-3 py-1 font-medium text-white transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {savingMeta ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              )}

              <div className="border-t border-slate-100" />

              {/* Read-only timestamps */}
              <div className="space-y-1 py-3 text-xs text-slate-400">
                <p>Tạo lúc: {formatDate(task.created_at)}</p>
                <p>Cập nhật lúc: {formatDate(task.updated_at)}</p>
              </div>
            </div>

            {/* Delete button */}
            <RoleGuard resource="tasks" action="delete">
              <Button
                variant="danger"
                className="w-full"
                onClick={() => onDelete(task)}
              >
                <Trash2 size={15} />
                Xóa task
              </Button>
            </RoleGuard>
          </div>
        </div>
      </aside>

      {/* Popup sửa mô tả — resize thủ công bằng handle riêng (không dùng CSS
          `resize` gốc vì dễ xung đột với overlay flex-center, gây đóng nhầm
          popup khi đang kéo) */}
      {descModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDescModalOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Sửa content task"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={
              descSize
                ? { width: descSize.width, height: descSize.height }
                : undefined
            }
            className={`relative flex flex-col overflow-hidden rounded-xl bg-white shadow-2xl ${
              descSize
                ? ""
                : "h-[70vh] max-h-[90vh] min-h-[320px] w-[720px] min-w-[420px] max-w-[95vw]"
            }`}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2.5">
              <span className="text-sm font-semibold text-slate-700">
                Sửa content
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {descSaveStatus === "saving" && "Đang lưu..."}
                  {descSaveStatus === "pending" && "Chưa lưu"}
                  {descSaveStatus === "saved" && "Đã lưu"}
                </span>
                <button
                  type="button"
                  onClick={() => setDescModalOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Đóng popup"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <ErrorBoundary key={`${task.id}-editor`}>
                <RichTextEditor
                  content={descDraft}
                  onChange={handleDescChange}
                  editable
                  fillHeight
                />
              </ErrorBoundary>
            </div>
            {/* Handle resize thủ công ở góc dưới-phải */}
            <div
              onMouseDown={handleResizeStart}
              className="absolute bottom-0 right-0 h-4 w-4 cursor-nwse-resize"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" className="h-full w-full text-slate-300">
                <path
                  d="M14 14L14 10M14 14L10 14M14 14L6 14M14 14L14 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


import { useEffect, useState } from "react";
import { Tag, Globe, Lock, Users, X } from "lucide-react";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import UserCombobox from "../../shared/components/UserCombobox";
import { useAuth } from "../auth/useAuth";
import StatusSelect from "./StatusSelect";
import SubblockDropdown from "./SubblockDropdown";
import {
  PRIORITIES,
  TYPES,
  computePrefixPreview,
  findSubblockPath,
} from "./taskConstants";
import { fetchProjects, fetchSubblocks } from "../projects/projectApi";
import {
  addWatcher,
  fetchUserDirectory,
  fetchWatchers,
  removeWatcher,
} from "../../shared/ownershipApi";

const EMPTY = {
  title: "",
  short_description: "",
  description: "",
  priority: "normal",
  status: "not_started",
  type: "my_task",
  due_date: "",
  project_id: "",
  subblock_id: null,
  tags: "",
  assigned_to: null,
  visibility: "normal",
  is_shared: false,
};

// Convert an ISO datetime into the value a <input type="date"> expects.
function toDateInput(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

// props:
//  - defaultProjectId: pre-fill project (ví dụ khi tạo từ Project Detail Page)
//  - lockProjectId: cố định + khóa chọn dự án (tab Công việc trong 1 dự án cụ thể)
export default function TaskForm({
  open,
  initial,
  onClose,
  onSubmit,
  defaultProjectId,
  lockProjectId,
}) {
  const [form, setForm] = useState(EMPTY);
  const { user, isAdmin } = useAuth();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [subTree, setSubTree] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [watchers, setWatchers] = useState([]);
  const [pendingViewerIds, setPendingViewerIds] = useState([]);
  const [viewerError, setViewerError] = useState("");

  // Danh sách project để gán task.
  useEffect(() => {
    let active = true;
    fetchProjects()
      .then((data) => active && setProjects(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Danh bạ user để chọn assignee/viewer (mọi user đã đăng nhập đều lấy được).
  useEffect(() => {
    let active = true;
    fetchUserDirectory()
      .then((data) => active && setDirectory(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Sửa task đã tồn tại -> tải danh sách viewer hiện tại từ server.
  // Tạo task mới -> viewer được chọn tạm (pending), thêm sau khi tạo xong.
  useEffect(() => {
    if (open && initial?.id) {
      fetchWatchers("task", initial.id)
        .then((data) => setWatchers(data))
        .catch(() => setWatchers([]));
    } else {
      setWatchers([]);
    }
    setPendingViewerIds([]);
    setViewerError("");
  }, [open, initial?.id]);

  useEffect(() => {
    if (open) {
      setError("");
      if (initial) {
        setForm({
          title: initial.title ?? "",
          short_description: initial.short_description ?? "",
          description: initial.description ?? "",
          priority: initial.priority ?? "normal",
          status: initial.status ?? "not_started",
          type: initial.type ?? "my_task",
          due_date: toDateInput(initial.due_date),
          project_id: lockProjectId
            ? String(lockProjectId)
            : initial.project_id
            ? String(initial.project_id)
            : "",
          subblock_id: initial.subblock_id ?? null,
          tags: (initial.tags ?? []).join(", "),
          assigned_to: initial.assigned_to ?? null,
          visibility:
            initial.visibility ??
            (initial.is_shared ? "shared" : "normal"),
          is_shared: initial.is_shared ?? false,
        });
      } else {
        setForm({
          ...EMPTY,
          project_id: lockProjectId
            ? String(lockProjectId)
            : defaultProjectId
            ? String(defaultProjectId)
            : "",
        });
      }
    }
  }, [open, initial, defaultProjectId, lockProjectId]);

  // Tree sub-block của project đang chọn — dùng tính preview path.
  useEffect(() => {
    let active = true;
    if (!form.project_id) {
      setSubTree([]);
      return;
    }
    fetchSubblocks(Number(form.project_id))
      .then((data) => active && setSubTree(data))
      .catch(() => active && setSubTree([]));
    return () => {
      active = false;
    };
  }, [form.project_id]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Realtime preview prefix/auto-tag.
  const selectedProject =
    projects.find((p) => String(p.id) === String(form.project_id)) || null;
  const subPath = findSubblockPath(subTree, form.subblock_id);
  const preview = computePrefixPreview(selectedProject, subPath);

  // Danh sách viewer hiển thị: task đã tồn tại -> từ server; task đang tạo ->
  // pending ids resolved qua directory để hiện tên.
  const viewerList = initial?.id
    ? watchers
    : pendingViewerIds.map((id) => {
        const u = directory.find((d) => d.id === id);
        return {
          id: `pending-${id}`,
          user_id: id,
          full_name: u?.full_name,
          username: u?.username,
        };
      });

  // Thêm 1 viewer: task đã tồn tại -> gọi API ngay; task đang tạo -> lưu tạm.
  const handleAddViewer = async (userId) => {
    if (!userId) return;
    setViewerError("");
    if (initial?.id) {
      try {
        await addWatcher("task", initial.id, userId);
        const data = await fetchWatchers("task", initial.id);
        setWatchers(data);
      } catch (err) {
        setViewerError(err.message || "Unable to add viewer.");
      }
    } else {
      setPendingViewerIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    }
  };

  const handleRemoveWatcher = async (watcher) => {
    setViewerError("");
    if (initial?.id) {
      try {
        await removeWatcher(watcher.id);
        setWatchers((prev) => prev.filter((w) => w.id !== watcher.id));
      } catch (err) {
        setViewerError(err.message || "Unable to remove viewer.");
      }
    } else {
      setPendingViewerIds((prev) => prev.filter((id) => id !== watcher.user_id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        priority: form.priority,
        status: form.status,
        type: form.type,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        subblock_id: form.project_id ? form.subblock_id : null,
        tags: form.tags
          ? form.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [],
        assigned_to: form.assigned_to,
        is_shared: form.visibility === "shared",
        visibility: form.visibility,
      };
      const saved = await onSubmit(payload);
      // Task mới tạo -> áp dụng các viewer đã chọn tạm (cần object_id vừa có).
      if (!initial && saved?.id && pendingViewerIds.length > 0) {
        await Promise.all(
          pendingViewerIds.map((uid) =>
            addWatcher("task", saved.id, uid).catch(() => {})
          )
        );
      }
    } catch (err) {
      setError(err.message || "Unable to save task.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit task" : "Create new task"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className={label}>Title *</label>
          <input className={field} value={form.title} onChange={set("title")} />
        </div>

        <div>
          <label className={label}>Short description</label>
          <input
            className={field}
            value={form.short_description}
            onChange={set("short_description")}
            placeholder="A short one-line summary..."
          />
        </div>

        {/* Project + Sub-block + preview prefix/tag */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Project</label>
            <div className="mt-1">
              <Select
                ariaLabel="Project"
                className="w-full"
                value={form.project_id}
                disabled={Boolean(lockProjectId)}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    project_id: e.target.value,
                    subblock_id: null,
                  }))
                }
                placeholder="None (Non-Proj)"
                options={projects.map((p) => ({
                  value: String(p.id),
                  label: p.name,
                }))}
              />
            </div>
          </div>
          <div>
            <label className={label}>Sub-block</label>
            <div className="mt-1">
              <SubblockDropdown
                className="w-full"
                projectId={form.project_id ? Number(form.project_id) : null}
                value={form.subblock_id}
                onChange={(v) => setForm((f) => ({ ...f, subblock_id: v }))}
              />
            </div>
          </div>
        </div>

        {/* Preview realtime */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm">
            <span
              className="font-bold"
              style={{ color: preview.prefix_color || "#94a3b8" }}
            >
              {preview.prefix_display}
            </span>{" "}
            <span className="text-slate-400">{form.title || "Task name"}</span>
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {[preview.project_tag, preview.sub_tag]
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-500"
                >
                  <Tag size={10} />
                  {tag}
                </span>
              ))}
          </div>
        </div>

        <div>
          <label className={label}>Content</label>
          <textarea
            rows={3}
            className={field}
            value={form.description}
            onChange={set("description")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Priority</label>
            <select className={field} value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <div className="mt-1">
              <StatusSelect
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v }))}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Type</label>
            <select className={field} value={form.type} onChange={set("type")}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Due date</label>
            <input
              type="date"
              className={field}
              value={form.due_date}
              onChange={set("due_date")}
            />
          </div>
        </div>

        <div>
          <label className={label}>Tags (comma-separated)</label>
          <input
            className={field}
            value={form.tags}
            onChange={set("tags")}
            placeholder="backend, review"
          />
        </div>

        {/* Ownership: Assignee, Shared/Private, Viewers */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Assignee</label>
            <div className="mt-1">
              <UserCombobox
                className="w-full"
                users={directory}
                value={form.assigned_to}
                onChange={(id) => setForm((f) => ({ ...f, assigned_to: id }))}
                placeholder="Unassigned"
              />
            </div>
          </div>
          <div>
            <label className={label}>Visibility</label>
            <div className="mt-1 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[
                { id: "normal", label: "Normal", icon: Users },
                { id: "private", label: "Private", icon: Lock },
                { id: "shared", label: "Shared", icon: Globe },
              ].map((m) => {
                const Icon = m.icon;
                const isActive = form.visibility === m.id;
                // Người tạo/admin đặt được mọi mode. Khi EDIT mà không phải
                // owner/admin thì Private bị khoá (chỉ owner/admin đặt private).
                const isOwner =
                  !initial ||
                  isAdmin ||
                  (initial.created_by != null &&
                    initial.created_by === user?.id);
                const allowed = m.id === "private" ? isOwner : true;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={!allowed}
                    onClick={() =>
                      setForm((f) => ({ ...f, visibility: m.id }))
                    }
                    title={
                      !allowed
                        ? "Only the owner or an admin can set Private"
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? "bg-emerald-500 text-white shadow-sm"
                        : allowed
                        ? "text-slate-600 hover:bg-slate-200"
                        : "cursor-not-allowed text-slate-300"
                    }`}
                  >
                    <Icon size={13} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className={label}>Viewers</label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {viewerList.length === 0 && (
              <span className="text-xs text-slate-400">No viewers yet</span>
            )}
            {viewerList.map((w) => (
              <span
                key={w.id}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                title={w.full_name || w.username}
              >
                {w.full_name || w.username}
                <button
                  type="button"
                  onClick={() => handleRemoveWatcher(w)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label={`Remove ${w.full_name || w.username}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2">
            <UserCombobox
              className="w-full"
              users={directory}
              value={null}
              excludeIds={viewerList.map((w) => w.user_id)}
              onChange={(id) => id && handleAddViewer(id)}
              placeholder="+ Add viewer"
              allowClear={false}
            />
          </div>
          {viewerError && (
            <p className="mt-1.5 text-xs text-red-500">{viewerError}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}

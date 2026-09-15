import { useEffect, useState } from "react";
import { Tag } from "lucide-react";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import StatusSelect from "./StatusSelect";
import SubblockDropdown from "./SubblockDropdown";
import {
  PRIORITIES,
  TYPES,
  computePrefixPreview,
  findSubblockPath,
} from "./taskConstants";
import { fetchProjects, fetchSubblocks } from "../projects/projectApi";

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState([]);
  const [subTree, setSubTree] = useState([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Tiêu đề không được để trống.");
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
      };
      await onSubmit(payload);
    } catch (err) {
      setError(err.message || "Không thể lưu task.");
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
      title={initial ? "Sửa task" : "Tạo task mới"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
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
          <label className={label}>Tiêu đề *</label>
          <input className={field} value={form.title} onChange={set("title")} />
        </div>

        <div>
          <label className={label}>Short description</label>
          <input
            className={field}
            value={form.short_description}
            onChange={set("short_description")}
            placeholder="Một dòng tóm tắt ngắn gọn..."
          />
        </div>

        {/* Project + Sub-block + preview prefix/tag */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Dự án</label>
            <div className="mt-1">
              <Select
                ariaLabel="Dự án"
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
                placeholder="Không (Non-Proj)"
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
            <span className="text-slate-400">{form.title || "Tên task"}</span>
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
            <label className={label}>Độ ưu tiên</label>
            <select className={field} value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Trạng thái</label>
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
            <label className={label}>Loại</label>
            <select className={field} value={form.type} onChange={set("type")}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Hạn chót</label>
            <input
              type="date"
              className={field}
              value={form.due_date}
              onChange={set("due_date")}
            />
          </div>
        </div>

        <div>
          <label className={label}>Tags (phân cách bằng dấu phẩy)</label>
          <input
            className={field}
            value={form.tags}
            onChange={set("tags")}
            placeholder="backend, review"
          />
        </div>
      </form>
    </Modal>
  );
}

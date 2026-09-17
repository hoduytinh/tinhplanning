import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  ClipboardList,
  AlertCircle,
  Eye,
} from "lucide-react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import Select from "../../shared/components/Select";
import RoleGuard from "../../shared/RoleGuard";
import StatusFilterDropdown from "./StatusFilterDropdown";
import TaskCard from "./TaskCard";
import TaskRow from "./TaskRow";
import TaskForm from "./TaskForm";
import TaskDetailPanel from "./TaskDetailPanel";
import { PRIORITIES, SORT_OPTIONS, STATUSES, TYPES } from "./taskConstants";
import { createTask, deleteTask, fetchTasks, updateTask } from "./taskApi";
import { fetchSubtasks } from "./subtaskApi";
import { fetchProjects } from "../projects/projectApi";

const DEFAULT_FILTERS = {
  priority: "",
  type: "",
  tag: "",
  project_id: "",
  ownership: "all",
  sort_by: "created_at",
  order: "desc",
};

// Ownership filter tabs (new feature — English UI).
const OWNERSHIP_TABS = [
  { value: "all", label: "All Tasks" },
  { value: "my", label: "My Tasks" },
  { value: "assigned", label: "Assigned to Me" },
  { value: "watching", label: "I'm Watching" },
  { value: "shared", label: "Shared" },
];

// Mặc định ẩn task đã "Done" hoặc "Cancelled" khỏi danh sách — lọc trạng
// thái là client-side (không gửi lên backend) vì đây là multi-select tick
// chọn nhiều trạng thái cùng lúc, còn API chỉ nhận 1 giá trị status.
const DEFAULT_STATUS_FILTER = STATUSES.filter(
  (s) => s.value !== "done" && s.value !== "cancelled"
).map((s) => s.value);

export default function TaskPage({ fixedProjectId = null, embedded = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_STATUS_FILTER);
  const [view, setView] = useState("grid"); // "grid" | "list"
  const [projects, setProjects] = useState([]);
  // Toggle chung: hiện/ẩn short_description rút gọn dưới tiêu đề trong danh
  // sách (card/row). Mặc định tắt để giảm rối.
  const [previewDescription, setPreviewDescription] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Task đang mở trong detail panel.
  const [selectedId, setSelectedId] = useState(null);
  // Tiến độ subtask theo task id: { [id]: { done, total } }
  const [progressMap, setProgressMap] = useState({});

  const selected = tasks.find((t) => t.id === selectedId) || null;
  const visibleTasks = tasks.filter((t) => statusFilter.includes(t.status));

  // Danh sách project cho filter — chỉ cần khi KHÔNG bị fix cứng project
  // (tab "Công việc" trong 1 dự án cụ thể không cần dropdown này).
  useEffect(() => {
    if (fixedProjectId) return;
    let active = true;
    fetchProjects()
      .then((data) => active && setProjects(data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fixedProjectId]);

  const loadProgress = useCallback(async (list) => {
    try {
      const entries = await Promise.all(
        list.map(async (t) => {
          const subs = await fetchSubtasks(t.id);
          return [
            t.id,
            { done: subs.filter((s) => s.is_done).length, total: subs.length },
          ];
        })
      );
      setProgressMap(Object.fromEntries(entries));
    } catch {
      // Tiến độ chỉ là phụ trợ — lỗi ở đây không chặn danh sách task.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        ...filters,
        project_id: fixedProjectId
          ? fixedProjectId
          : filters.project_id
          ? Number(filters.project_id)
          : "",
      };
      const data = await fetchTasks(params);
      setTasks(data);
      loadProgress(data);
    } catch (err) {
      setError(err.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, [filters, fixedProjectId, loadProgress]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (task) => {
    setEditing(task);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    let result;
    if (editing) {
      result = await updateTask(editing.id, payload);
    } else {
      result = await createTask(
        fixedProjectId ? { ...payload, project_id: fixedProjectId } : payload
      );
    }
    setFormOpen(false);
    await load();
    return result;
  };

  // Cập nhật 1 phần task (từ card status icon hoặc detail panel).
  const patchTask = async (task, patch) => {
    // Optimistic update để UI mượt.
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, ...patch } : t))
    );
    try {
      const updated = await updateTask(task.id, patch);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      setError(err.message || "Unable to update task.");
      await load(); // rollback bằng cách tải lại
    }
  };

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      if (selectedId === task.id) setSelectedId(null);
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete task.");
    }
  };

  const handleSubtasksChange = (taskId, items) => {
    setProgressMap((prev) => ({
      ...prev,
      [taskId]: {
        done: items.filter((s) => s.is_done).length,
        total: items.length,
      },
    }));
  };

  const viewBtn = (mode, Icon, label) => (
    <button
      onClick={() => setView(mode)}
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 items-center justify-center rounded-md transition ${
        view === mode ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      <Icon size={17} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {!embedded && (
            <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          )}
          <p className={embedded ? "text-sm text-slate-500" : "mt-0.5 text-sm text-slate-500"}>
            {loading ? "Loading..." : `${visibleTasks.length} tasks`}
          </p>
        </div>
        <RoleGuard resource="tasks" action="create">
          <Button onClick={openCreate}>
            <Plus size={16} />
            New Task
          </Button>
        </RoleGuard>
      </div>

      {/* Ownership filter tabs (new feature — English UI) */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {OWNERSHIP_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() =>
              setFilters((f) => ({ ...f, ownership: tab.value }))
            }
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              filters.ownership === tab.value
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            ariaLabel="Filter by priority"
            value={filters.priority}
            onChange={setFilter("priority")}
            placeholder="All priorities"
            options={PRIORITIES.map((p) => ({ value: p.value, label: p.label }))}
          />
          <StatusFilterDropdown selected={statusFilter} onChange={setStatusFilter} />
          <Select
            ariaLabel="Filter by type"
            value={filters.type}
            onChange={setFilter("type")}
            placeholder="All types"
            options={TYPES}
          />
          {!fixedProjectId && (
            <Select
              ariaLabel="Filter by project"
              value={filters.project_id}
              onChange={setFilter("project_id")}
              placeholder="All projects"
              options={projects.map((p) => ({
                value: String(p.id),
                label: p.name,
              }))}
            />
          )}
          <input
            value={filters.tag}
            onChange={setFilter("tag")}
            placeholder="Filter by auto-tag (e.g. #tigera0)"
            aria-label="Filter by auto-tag"
            className="w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={previewDescription}
              onChange={(e) => setPreviewDescription(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
            />
            <Eye size={14} />
            Preview description
          </label>

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Sort by</span>
              <Select
                ariaLabel="Sort by"
                value={filters.sort_by}
                onChange={setFilter("sort_by")}
                options={SORT_OPTIONS}
              />
              <Select
                ariaLabel="Order"
                value={filters.order}
                onChange={setFilter("order")}
                options={[
                  { value: "desc", label: "Descending" },
                  { value: "asc", label: "Ascending" },
                ]}
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
              {viewBtn("grid", LayoutGrid, "Grid view")}
              {viewBtn("list", ListIcon, "List view")}
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && visibleTasks.length === 0 && !error && (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <ClipboardList size={30} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              No tasks yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create a new task to start managing your work.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Create your first task
          </Button>
        </Card>
      )}

      {/* Grid view */}
      {!loading && visibleTasks.length > 0 && view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              progress={progressMap[task.id]}
              onOpen={(t) => setSelectedId(t.id)}
              onEdit={openEdit}
              onDelete={handleDelete}
              onStatusChange={patchTask}
              showDescription={previewDescription}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && visibleTasks.length > 0 && view === "list" && (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Priority / Status</th>
                <th className="hidden px-4 py-3 sm:table-cell">Due date</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {visibleTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onOpen={(t) => setSelectedId(t.id)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onStatusChange={patchTask}
                  showDescription={previewDescription}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <TaskForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
        defaultProjectId={fixedProjectId || undefined}
        lockProjectId={fixedProjectId || undefined}
      />

      <TaskDetailPanel
        task={selected}
        onClose={() => setSelectedId(null)}
        onUpdate={(patch) => selected && patchTask(selected, patch)}
        onDelete={handleDelete}
        onSubtasksChange={handleSubtasksChange}
      />
    </div>
  );
}

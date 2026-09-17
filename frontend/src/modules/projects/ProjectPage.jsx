import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  LayoutGrid,
  List as ListIcon,
  FolderKanban,
  AlertCircle,
} from "lucide-react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import Select from "../../shared/components/Select";
import RoleGuard from "../../shared/RoleGuard";
import ProjectCard from "./ProjectCard";
import ProjectRow from "./ProjectRow";
import ProjectForm from "./ProjectForm";
import {
  PROJECT_HEALTHS,
  PROJECT_PRIORITIES,
  PROJECT_SORT_OPTIONS,
  PROJECT_STATUSES,
} from "./projectConstants";
import {
  createProject,
  deleteProject,
  fetchProjects,
  fetchProjectStats,
  updateProject,
} from "./projectApi";

const DEFAULT_FILTERS = { status: "", priority: "", health: "" };

export default function ProjectPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [view, setView] = useState("grid");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadStats = useCallback(async (list) => {
    try {
      const entries = await Promise.all(
        list.map(async (p) => [p.id, await fetchProjectStats(p.id)])
      );
      setStatsMap(Object.fromEntries(entries));
    } catch {
      // Stats chỉ phụ trợ — lỗi ở đây không chặn danh sách.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchProjects(filters);
      setProjects(data);
      loadStats(data);
    } catch (err) {
      setError(err.message || "Failed to load project list.");
    } finally {
      setLoading(false);
    }
  }, [filters, loadStats]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key) => (e) =>
    setFilters((f) => ({ ...f, [key]: e.target.value }));

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (project) => {
    setEditing(project);
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    if (editing) {
      await updateProject(editing.id, payload);
    } else {
      await createProject(payload);
    }
    setFormOpen(false);
    await load();
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await deleteProject(project.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete project.");
    }
  };

  const openDetail = (project) => navigate(`/projects/${project.id}`);

  // Sắp xếp client-side theo lựa chọn.
  const sorted = [...projects].sort((a, b) => {
    let av;
    let bv;
    if (sortBy === "progress") {
      const pa = statsMap[a.id];
      const pb = statsMap[b.id];
      av = pa && pa.total ? pa.done / pa.total : 0;
      bv = pb && pb.total ? pb.done / pb.total : 0;
    } else if (sortBy === "name") {
      av = (a.name || "").toLowerCase();
      bv = (b.name || "").toLowerCase();
    } else {
      av = a[sortBy] || "";
      bv = b[sortBy] || "";
    }
    if (av < bv) return order === "asc" ? -1 : 1;
    if (av > bv) return order === "asc" ? 1 : -1;
    return 0;
  });

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
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {loading ? "Loading..." : `${projects.length} projects`}
          </p>
        </div>
        <RoleGuard resource="projects" action="create">
          <Button onClick={openCreate}>
            <Plus size={16} />
            New Project
          </Button>
        </RoleGuard>
      </div>

      {/* Filter bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            ariaLabel="Filter by status"
            value={filters.status}
            onChange={setFilter("status")}
            placeholder="All statuses"
            options={PROJECT_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
          <Select
            ariaLabel="Filter by priority"
            value={filters.priority}
            onChange={setFilter("priority")}
            placeholder="All priorities"
            options={PROJECT_PRIORITIES.map((p) => ({
              value: p.value,
              label: p.label,
            }))}
          />
          <Select
            ariaLabel="Filter by health"
            value={filters.health}
            onChange={setFilter("health")}
            placeholder="All health"
            options={PROJECT_HEALTHS.map((h) => ({
              value: h.value,
              label: h.label,
            }))}
          />

          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Sort by</span>
              <Select
                ariaLabel="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={PROJECT_SORT_OPTIONS}
              />
              <Select
                ariaLabel="Order"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                options={[
                  { value: "asc", label: "Ascending" },
                  { value: "desc", label: "Descending" },
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
      {!loading && sorted.length === 0 && !error && (
        <Card className="flex flex-col items-center justify-center gap-3 p-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FolderKanban size={30} />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              No projects yet
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Create a new project to start tracking progress.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus size={16} />
            Create your first project
          </Button>
        </Card>
      )}

      {/* Grid view */}
      {!loading && sorted.length > 0 && view === "grid" && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              stats={statsMap[project.id]}
              onOpen={openDetail}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {!loading && sorted.length > 0 && view === "list" && (
        <Card className="overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Project name</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Progress</th>
                <th className="hidden px-4 py-3 sm:table-cell">Timeline</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  stats={statsMap[project.id]}
                  onOpen={openDetail}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <ProjectForm
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

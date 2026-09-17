import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Button from "../../shared/components/Button";
import Card from "../../shared/components/Card";
import Badge from "../../shared/components/Badge";
import RoleGuard from "../../shared/RoleGuard";
import RichTextEditor from "../tasks/RichTextEditor";
import TaskPage from "../tasks/TaskPage";
import HealthBadge from "./HealthBadge";
import ProjectStats from "./ProjectStats";
import ProjectForm from "./ProjectForm";
import MilestoneList from "./MilestoneList";
import RiskLog from "./RiskLog";
import ProjectActivityFeed from "./ProjectActivityFeed";
import CoverageTab from "./CoverageTab";
import DocumentsTab from "./DocumentsTab";
import BugsTab from "./BugsTab";
import SignoffTab from "./SignoffTab";
import SubblockTreeManager from "./SubblockTreeManager";
import RecoveryTab from "./recovery/RecoveryTab";
import TimelineTab from "./timeline/TimelineTab";
import MembersTab from "./MembersTab";
import {
  COVERAGE_METRICS,
  OPTIONAL_MODULES,
  bugSeverityMeta,
  coverageValue,
  formatShortDate,
  healthMeta,
  projectPriorityMeta,
  projectStatusMeta,
} from "./projectConstants";
import {
  deleteProject,
  fetchBugStats,
  fetchLatestCoverage,
  fetchProject,
  fetchSignoffProgress,
  updateProject,
} from "./projectApi";

// 3 tab luôn có sẵn khi tạo/sửa dự án; các tab khác (OPTIONAL_MODULES) chỉ
// hiện khi được bật trong project.enabled_modules.
const BASE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "tasks", label: "Tasks" },
  { key: "timeline", label: "Timeline" },
  { key: "members", label: "Members" },
  { key: "activity", label: "Activity" },
];
const ALL_TABS = [...BASE_TABS, ...OPTIONAL_MODULES];

function visibleTabs(project) {
  const enabled = project?.enabled_modules || [];
  return ALL_TABS.filter(
    (t) => BASE_TABS.some((b) => b.key === t.key) || enabled.includes(t.key)
  );
}


export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProject(await fetchProject(id));
    } catch (err) {
      setError(err.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Làm mới dữ liệu project mà KHÔNG bật cờ loading — tránh unmount/remount
  // tab Tổng quan gây vòng lặp vô hạn khi MilestoneList gọi onChange lúc mount.
  const refreshProject = useCallback(async () => {
    try {
      setProject(await fetchProject(id));
    } catch {
      // Bỏ qua lỗi refresh phụ trợ.
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  // Nếu tab đang chọn bị tắt (sau khi sửa project) → quay về Tổng quan.
  useEffect(() => {
    if (!project) return;
    const keys = visibleTabs(project).map((t) => t.key);
    if (!keys.includes(tab)) setTab("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  const handleEditSubmit = async (payload) => {
    await updateProject(id, payload);
    setEditOpen(false);
    await loadProject();
  };

  const handleDelete = async () => {
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}"?`)) return;
    try {
      await deleteProject(id);
      navigate("/projects");
    } catch (err) {
      setError(err.message || "Failed to delete project.");
    }
  };

  const startEditDesc = () => {
    setDescDraft(project?.description || "");
    setEditingDesc(true);
  };

  const cancelEditDesc = () => {
    setEditingDesc(false);
    setDescDraft("");
  };

  const saveEditDesc = async () => {
    if (!project) return;
    if (descDraft === (project.description || "")) {
      setEditingDesc(false);
      return;
    }
    try {
      const updated = await updateProject(id, { description: descDraft });
      setProject((p) => ({ ...p, description: updated.description }));
      setEditingDesc(false);
    } catch (err) {
      setError(err.message || "Failed to save description.");
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (error && !project) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
        <Button variant="secondary" onClick={() => navigate("/projects")}>
          <ArrowLeft size={16} />
          Back to list
        </Button>
      </div>
    );
  }

  if (!project) return null;

  const status = projectStatusMeta(project.status);
  const prio = projectPriorityMeta(project.priority);
  const health = healthMeta(project.health);
  const timeline = project.timeline || {
    time_elapsed_pct: 0,
    progress_pct: 0,
  };
  const tabs = visibleTabs(project);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/projects")}
          className="mb-3 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={15} />
          Projects
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {project.name}
              </h1>
              <HealthBadge health={project.health} size="sm" />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              <Badge tone={prio.tone}>{prio.label}</Badge>
              {(project.tags || []).map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500"
                >
                  #{t}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RoleGuard resource="projects" action="update">
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil size={15} />
                Edit
              </Button>
            </RoleGuard>
            <RoleGuard resource="projects" action="delete">
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={15} />
                Delete
              </Button>
            </RoleGuard>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Cột trái: metadata + stats + timeline */}
          <div className="space-y-4">
            <Card className="space-y-4 p-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Health
                </p>
                <div className="mt-1.5">
                  <HealthBadge health={project.health} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Stats
                </p>
                <ProjectStats stats={project.stats} />
              </div>

              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Calendar size={13} />
                  Timeline
                </p>
                <p className="text-sm text-slate-600">
                  {formatShortDate(project.start_date)} →{" "}
                  {formatShortDate(project.end_date)}
                </p>
                {/* Timeline: thời gian trôi vs tiến độ */}
                <div className="mt-3 space-y-2">
                  <TimelineBar
                    label="Time elapsed"
                    pct={timeline.time_elapsed_pct}
                    barClass="bg-slate-400"
                  />
                  <TimelineBar
                    label="Progress"
                    pct={timeline.progress_pct}
                    barClass={health.bar}
                  />
                </div>
              </div>
            </Card>

            {/* Widgets tóm tắt: click để chuyển tab tương ứng */}
            <OverviewWidgets
              projectId={id}
              enabledModules={project.enabled_modules || []}
              onNavigate={(t) => setTab(t)}
            />
          </div>

          {/* Cột phải: mô tả + milestones + risks */}
          <div className="space-y-6">
            <Card className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-700">Description</h4>
                {!editingDesc && (
                  <button
                    type="button"
                    onClick={startEditDesc}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                )}
              </div>
              {editingDesc ? (
                <>
                  <div className="rounded-lg border border-slate-200">
                    <RichTextEditor
                      content={project.description || ""}
                      onChange={setDescDraft}
                      placeholder="Project description... Type / for quick formatting"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={cancelEditDesc}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={saveEditDesc}>
                      Save
                    </Button>
                  </div>
                </>
              ) : project.description ? (
                <RichTextEditor
                  content={project.description}
                  editable={false}
                />
              ) : (
                <p className="text-sm italic text-slate-400">
                  No description yet. Click “Edit” to add one.
                </p>
              )}
            </Card>

            <Card className="p-5">
              <MilestoneList projectId={id} onChange={refreshProject} />
            </Card>

            <Card className="p-5">
              <RiskLog projectId={id} />
            </Card>
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <TaskPage fixedProjectId={Number(id)} embedded />
      )}

      {tab === "timeline" && (
        <TimelineTab projectId={id} onNavigate={(t) => setTab(t)} />
      )}

      {tab === "subblocks" && (
        <Card className="p-5">
          <SubblockTreeManager projectId={id} />
        </Card>
      )}

      {tab === "activity" && (
        <Card className="p-5">
          <ProjectActivityFeed projectId={id} />
        </Card>
      )}

      {tab === "members" && <MembersTab projectId={id} />}

      {tab === "coverage" && <CoverageTab projectId={id} />}

      {tab === "documents" && <DocumentsTab projectId={id} />}

      {tab === "bugs" && <BugsTab projectId={id} />}

      {tab === "signoff" && <SignoffTab projectId={id} />}

      {tab === "recovery" && <RecoveryTab projectId={id} />}

      <ProjectForm
        open={editOpen}
        initial={project}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
}

// Widgets tóm tắt cho Overview: Coverage / Bugs / Signoff.
// Mỗi widget tự load dữ liệu, click để điều hướng sang tab tương ứng.
function OverviewWidgets({ projectId, enabledModules, onNavigate }) {
  const [coverage, setCoverage] = useState(null);
  const [bugStats, setBugStats] = useState(null);
  const [signoff, setSignoff] = useState(null);

  const hasCoverage = enabledModules.includes("coverage");
  const hasBugs = enabledModules.includes("bugs");
  const hasSignoff = enabledModules.includes("signoff");

  useEffect(() => {
    let alive = true;
    (async () => {
      const [cov, bugs, prog] = await Promise.all([
        hasCoverage ? fetchLatestCoverage(projectId).catch(() => null) : null,
        hasBugs ? fetchBugStats(projectId).catch(() => null) : null,
        hasSignoff
          ? fetchSignoffProgress(projectId, "rtlf").catch(() => null)
          : null,
      ]);
      if (!alive) return;
      setCoverage(cov);
      setBugStats(bugs);
      setSignoff(prog);
    })();
    return () => {
      alive = false;
    };
  }, [projectId, hasCoverage, hasBugs, hasSignoff]);

  const passRate = coverage ? coverageValue(COVERAGE_METRICS[0], coverage) : null;
  const testplan = coverage ? coverageValue(COVERAGE_METRICS[1], coverage) : null;
  const statement = coverage ? coverage.cov_statement : null;
  const openBugs = bugStats
    ? (bugStats.by_status.open || 0) + (bugStats.by_status.in_progress || 0)
    : 0;

  return (
    <>
      {/* Coverage summary */}
      {coverage && (
        <Card
          hover
          className="cursor-pointer space-y-2 p-4"
          onClick={() => onNavigate("coverage")}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Coverage ({coverage.week_label})
          </p>
          <MiniBar label="Pass Rate" value={passRate} />
          <MiniBar label="Testplan" value={testplan} />
          <MiniBar label="Statement" value={statement} />
        </Card>
      )}

      {/* Bug summary */}
      {bugStats && bugStats.total > 0 && (
        <Card
          hover
          className="cursor-pointer p-4"
          onClick={() => onNavigate("bugs")}
        >
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
            Bugs
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>🔴 {bugStats.by_severity.critical || 0} Critical</span>
            <span>🟠 {bugStats.by_severity.high || 0} High</span>
            <span className="font-medium text-slate-700">● {openBugs} Open</span>
          </div>
        </Card>
      )}

      {/* Signoff progress */}
      {signoff && signoff.total > 0 && (
        <Card
          hover
          className="cursor-pointer space-y-1.5 p-4"
          onClick={() => onNavigate("signoff")}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium uppercase tracking-wide text-slate-400">
              RTLF Signoff
            </span>
            <span className="text-slate-500">
              {signoff.percent}% ({signoff.done}/{signoff.total})
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                signoff.percent === 100 ? "bg-green-500" : "bg-brand"
              }`}
              style={{ width: `${signoff.percent}%` }}
            />
          </div>
        </Card>
      )}
    </>
  );
}

function MiniBar({ label, value }) {
  const pct = value == null ? 0 : Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">
          {value == null ? "—" : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TimelineBar({ label, pct, barClass }) {
  const width = Math.min(100, Math.max(0, pct || 0));
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{width}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}



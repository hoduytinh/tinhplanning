import { useCallback, useEffect, useRef, useState } from "react";
import { Minimize2, Maximize2 } from "lucide-react";
import TaskDetailPanel from "../tasks/TaskDetailPanel";
import { deleteTask, updateTask } from "../tasks/taskApi";
import { fetchProjects } from "../projects/projectApi";
import { useAuth } from "../auth/useAuth";
import ToastProvider, { useToast } from "./Toast";
import QuickStatsBar from "./QuickStatsBar";
import TodayFocus from "./TodayFocus";
import ProjectsHealth from "./ProjectsHealth";
import RegressionPulse from "./RegressionPulse";
import RecoveryRadar from "./RecoveryRadar";
import WeeklyReviewWidget from "./WeeklyReviewWidget";
import {
  fetchDashboardSummary,
  fetchProjectsHealth,
  fetchTodayFocus,
} from "./dashboardApi";
import { formatToday, greeting } from "./dashboardHelpers";

function Header({ summary, focusMode, onToggleFocus }) {
  const { user } = useAuth();
  const displayName = user?.full_name || user?.username || "";
  const atRisk = summary?.projects_at_risk?.length || 0;
  const overdue = summary?.overdue_count || 0;
  const blocked = summary?.blocked_count || 0;
  const parts = [];
  if (overdue) parts.push(`${overdue} task overdue`);
  if (blocked) parts.push(`${blocked} task blocked`);
  if (atRisk) parts.push(`${atRisk} project At Risk`);
  const context =
    parts.length > 0
      ? `You have ${parts.join(", ")}`
      : "Everything is under control 👌";

  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          {greeting()}{displayName ? `, ${displayName}` : ""} —{" "}
          <span className="font-semibold text-slate-500">{formatToday()}</span>
        </h1>
        <p className="mt-1 text-sm text-slate-500">{context}</p>
      </div>
      <button
        type="button"
        onClick={onToggleFocus}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
      >
        {focusMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        {focusMode ? "Exit Focus" : "Focus Mode"}
      </button>
    </div>
  );
}

function DashboardInner() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [focus, setFocus] = useState(null);
  const [healthRows, setHealthRows] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [pulseFormToken, setPulseFormToken] = useState(0);
  const pulseRef = useRef(null);

  const reloadSummaryFocus = useCallback(async () => {
    const [s, f] = await Promise.all([
      fetchDashboardSummary(),
      fetchTodayFocus(),
    ]);
    setSummary(s);
    setFocus(f);
  }, []);

  const reloadHealth = useCallback(async () => {
    const h = await fetchProjectsHealth();
    setHealthRows(h);
    return h;
  }, []);

  useEffect(() => {
    reloadSummaryFocus().catch(() => {});
    fetchProjects()
      .then(setProjects)
      .catch(() => {});
    reloadHealth()
      .then((h) => {
        if (h.length > 0) setSelectedProjectId((prev) => prev ?? h[0].id);
      })
      .catch(() => {});
  }, [reloadSummaryFocus, reloadHealth]);

  const handleStatusChange = async (task, status) => {
    try {
      await updateTask(task.id, { status });
      if (selectedTask?.id === task.id)
        setSelectedTask((t) => ({ ...t, status }));
      await reloadSummaryFocus();
    } catch (err) {
      toast(err.message || "Unable to change status", "error");
    }
  };

  const handleTaskUpdate = async (patch) => {
    if (!selectedTask) return;
    const optimistic = { ...selectedTask, ...patch };
    setSelectedTask(optimistic);
    try {
      const updated = await updateTask(selectedTask.id, patch);
      setSelectedTask(updated);
      await reloadSummaryFocus();
    } catch (err) {
      toast(err.message || "Unable to update task", "error");
    }
  };

  const handleTaskDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      setSelectedTask(null);
      await reloadSummaryFocus();
    } catch (err) {
      toast(err.message || "Unable to delete task", "error");
    }
  };

  const handlePendingClick = () => {
    pulseRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setPulseFormToken((n) => n + 1);
  };

  // Danh sách project cho selector C/D: ưu tiên các project trong health
  // (đã sắp health xấu nhất trước) + fallback toàn bộ projects.
  const selectorProjects = healthRows.length > 0 ? healthRows : projects;

  return (
    <div>
      <Header
        summary={summary}
        focusMode={focusMode}
        onToggleFocus={() => setFocusMode((v) => !v)}
      />

      {focusMode ? (
        <div className="h-[calc(100vh-12rem)]">
          <TodayFocus
            focus={focus}
            onOpenTask={setSelectedTask}
            onStatusChange={handleStatusChange}
            fullscreen
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[35fr_65fr]">
            <TodayFocus
              focus={focus}
              onOpenTask={setSelectedTask}
              onStatusChange={handleStatusChange}
            />
            <ProjectsHealth rows={healthRows} />
          </div>

          <div ref={pulseRef}>
            <RegressionPulse
              projects={selectorProjects}
              projectId={selectedProjectId}
              onProjectChange={setSelectedProjectId}
              openFormToken={pulseFormToken}
              onSnapshotSaved={() => {
                reloadSummaryFocus();
                reloadHealth();
              }}
            />
          </div>

          <RecoveryRadar
            projects={selectorProjects}
            projectId={selectedProjectId}
          />

          <WeeklyReviewWidget />

          <QuickStatsBar
            summary={summary}
            onPendingClick={handlePendingClick}
          />
        </div>
      )}

      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
      />
    </div>
  );
}

// Trang chủ Dashboard — bọc ToastProvider để dùng toast trong toàn cây.
export default function DashboardPage() {
  return (
    <ToastProvider>
      <DashboardInner />
    </ToastProvider>
  );
}

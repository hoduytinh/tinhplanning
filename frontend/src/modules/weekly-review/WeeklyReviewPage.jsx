import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  ChevronRight,
  Plus,
  TrendingUp,
  User,
  Folder,
  Users,
} from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import ToastProvider, { useToast } from "../dashboard/Toast";
import MoodTrendChart from "./MoodTrendChart";
import { moodMeta, workloadMeta } from "./weeklyReviewConstants";
import { createReview, fetchCurrentReview, fetchReviews } from "./weeklyReviewApi";
import { fetchProjects } from "../projects/projectApi";
import { fetchUserDirectory } from "../../shared/ownershipApi";
import RoleGuard from "../../shared/RoleGuard";

// Context badge meta (new feature — English UI).
const CONTEXT_META = {
  personal: { label: "Personal", icon: User, tone: "bg-slate-100 text-slate-600" },
  project: { label: "Project", icon: Folder, tone: "bg-indigo-50 text-indigo-700" },
  team: { label: "Team", icon: Users, tone: "bg-emerald-50 text-emerald-700" },
};

function ContextBadge({ contextType, name }) {
  const meta = CONTEXT_META[contextType] || CONTEXT_META.personal;
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${meta.tone}`}
      title={name}
    >
      <Icon size={11} />
      {name && name !== "Personal" ? name : meta.label}
    </span>
  );
}

function ReviewRow({ review, onOpen }) {
  const mood = moodMeta(review.mood);
  const wl = workloadMeta(review.workload);
  return (
    <button
      type="button"
      onClick={() => onOpen(review.id)}
      className="flex w-full items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2.5 text-left transition hover:border-brand/40 hover:bg-slate-50"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <CalendarRange size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{review.week_label}</span>
          <ContextBadge
            contextType={review.context_type}
            name={review.name}
          />
          {review.status === "completed" ? (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
              Completed
            </span>
          ) : (
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
              Draft
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">
          {review.week_start} → {review.week_end}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {mood ? <span className="text-lg" title={mood.label}>{mood.emoji}</span> : null}
        {wl ? (
          <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${wl.tone}`}>
            {wl.label}
          </span>
        ) : null}
        <ChevronRight size={16} className="text-slate-300" />
      </div>
    </button>
  );
}

function ListInner() {
  const navigate = useNavigate();
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Multi-context create modal (new feature — English UI).
  const [createOpen, setCreateOpen] = useState(false);
  const [ctxName, setCtxName] = useState("");
  const [ctxType, setCtxType] = useState("personal");
  const [ctxProjects, setCtxProjects] = useState([]);
  const [ctxMembers, setCtxMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [projects, setProjects] = useState([]);
  const [directory, setDirectory] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await fetchReviews());
    } catch (err) {
      toast(err.message || "Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => {});
    fetchUserDirectory().then(setDirectory).catch(() => {});
  }, []);

  const openCurrent = async () => {
    try {
      const current = await fetchCurrentReview();
      navigate(`/weekly-review/${current.id}`);
    } catch (err) {
      toast(err.message || "Failed to open current week", "error");
    }
  };

  const openCreate = () => {
    setCtxName("");
    setCtxType("personal");
    setCtxProjects([]);
    setCtxMembers([]);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const payload = {
        name:
          ctxName.trim() ||
          (ctxType === "personal" ? "Personal" : ctxType === "project" ? "Project Review" : "Team Review"),
        context_type: ctxType,
        project_ids: ctxType === "project" ? ctxProjects : null,
        team_members: ctxType === "team" ? ctxMembers : null,
      };
      const created = await createReview(payload);
      setCreateOpen(false);
      navigate(`/weekly-review/${created.id}`);
    } catch (err) {
      toast(err.message || "Failed to create", "error");
    } finally {
      setCreating(false);
    }
  };

  const toggleInList = (list, setList, id) =>
    setList(
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    );

  // Chuỗi mood theo thứ tự thời gian tăng dần cho biểu đồ.
  const trend = [...reviews]
    .sort((a, b) => new Date(a.week_start) - new Date(b.week_start))
    .map((r) => ({ week_label: r.week_label, mood: r.mood }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Weekly Review</h1>
          <p className="text-sm text-slate-500">
            Reflect on the past week, plan for next week, and generate a CFT report.
          </p>
        </div>
        <div className="flex gap-2">
          <RoleGuard resource="weekly_review" action="create">
            <Button variant="secondary" size="sm" onClick={openCreate}>
              <Plus size={15} /> New
            </Button>
          </RoleGuard>
          <Button size="sm" onClick={openCurrent}>
            Open Current Week
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <TrendingUp size={15} className="text-brand" /> Mood Trend
        </div>
        <MoodTrendChart data={trend} />
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Review History ({reviews.length})
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No reviews yet. Click "Open Current Week" to get started.
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <ReviewRow key={r.id} review={r} onOpen={(id) => navigate(`/weekly-review/${id}`)} />
            ))}
          </div>
        )}
      </Card>

      {/* Multi-context create modal (new feature — English UI) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Weekly Review"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={submitCreate} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Context
            </label>
            <div className="flex gap-2">
              {["personal", "project", "team"].map((t) => {
                const meta = CONTEXT_META[t];
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCtxType(t)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      ctxType === t
                        ? "border-brand bg-brand/5 text-brand"
                        : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={15} />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
              Name
            </label>
            <input
              value={ctxName}
              onChange={(e) => setCtxName(e.target.value)}
              placeholder={
                ctxType === "personal"
                  ? "Personal"
                  : ctxType === "project"
                  ? "e.g. TigerA0 Weekly"
                  : "e.g. Verification Team"
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {ctxType === "project" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Projects
              </label>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      toggleInList(ctxProjects, setCtxProjects, p.id)
                    }
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      ctxProjects.includes(p.id)
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ctxType === "team" && (
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                Team members
              </label>
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {directory.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleInList(ctxMembers, setCtxMembers, u.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                      ctxMembers.includes(u.id)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {u.full_name || u.username}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function WeeklyReviewPage() {
  return (
    <ToastProvider>
      <ListInner />
    </ToastProvider>
  );
}

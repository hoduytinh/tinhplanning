import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import ToastProvider, { useToast } from "../dashboard/Toast";
import AutoSummary from "./AutoSummary";
import ReflectionPanel from "./ReflectionPanel";
import PlanPanel from "./PlanPanel";
import CftReportPanel from "./CftReportPanel";
import RoleGuard from "../../shared/RoleGuard";
import CompleteDialog from "./CompleteDialog";
import {
  addShoutout,
  completeReview,
  createReview,
  deleteShoutout,
  fetchReview,
  fetchSummary,
  generateCft,
  updateCft,
  updateReview,
} from "./weeklyReviewApi";

function SectionHeader({ index, title, desc }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
        {index}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {desc ? <p className="text-xs text-slate-400">{desc}</p> : null}
      </div>
    </div>
  );
}

function DetailInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [review, setReview] = useState(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [cftLoading, setCftLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const editable = review?.status !== "completed";

  const loadReview = useCallback(async () => {
    const data = await fetchReview(id);
    setReview(data);
    return data;
  }, [id]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await fetchSummary(id);
      setSummary(data);
    } catch (err) {
      toast(err.message || "Failed to load summary", "error");
    } finally {
      setSummaryLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    loadReview().catch((err) => toast(err.message || "Failed to load review", "error"));
    loadSummary();
  }, [loadReview, loadSummary, toast]);

  const patch = async (changes) => {
    const prev = review;
    setReview((r) => ({ ...r, ...changes }));
    try {
      const updated = await updateReview(id, changes);
      setReview(updated);
    } catch (err) {
      setReview(prev);
      toast(err.message || "Failed to save", "error");
    }
  };

  const handleFieldChange = (field, value) =>
    setReview((r) => ({ ...r, [field]: value }));

  const handleFieldCommit = (field, value) => patch({ [field]: value });

  const handleMoodChange = (changes) => patch(changes);
  const handleTopFocusChange = (items) => patch({ top_focus: items });

  const handleAddShoutout = async (payload) => {
    try {
      await addShoutout(id, payload);
      await loadReview();
    } catch (err) {
      toast(err.message || "Failed to add", "error");
    }
  };

  const handleRemoveShoutout = async (sid) => {
    try {
      await deleteShoutout(id, sid);
      await loadReview();
    } catch (err) {
      toast(err.message || "Failed to delete", "error");
    }
  };

  const handleGenerateCft = async () => {
    setCftLoading(true);
    try {
      const updated = await generateCft(id);
      setReview(updated);
      toast("CFT report generated");
    } catch (err) {
      toast(err.message || "Failed to generate report", "error");
    } finally {
      setCftLoading(false);
    }
  };

  const handleSaveCft = async (content) => {
    try {
      const updated = await updateCft(id, content);
      setReview(updated);
      toast("Report saved");
    } catch (err) {
      toast(err.message || "Failed to save", "error");
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeReview(id);
      toast("This week's review completed 🎉");
      setCompleteOpen(false);
      // Tạo/nhảy sang review của tuần kế tiếp.
      const nextStart = new Date(review.week_end);
      nextStart.setDate(nextStart.getDate() + 1);
      const iso = nextStart.toISOString().slice(0, 10);
      const next = await createReview({ week_start: iso });
      navigate(`/weekly-review/${next.id}`);
    } catch (err) {
      toast(err.message || "Failed to complete", "error");
    } finally {
      setCompleting(false);
    }
  };

  if (!review) {
    return <div className="p-6 text-sm text-slate-400">Loading review...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/weekly-review")}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              Weekly Review — {review.week_label}
              {review.status === "completed" ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 size={12} /> Completed
                </span>
              ) : (
                <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
                  Draft
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              {review.week_start} → {review.week_end}
            </p>
          </div>
        </div>
        {editable ? (
          <RoleGuard resource="weekly_review" action="update">
            <Button size="sm" onClick={() => setCompleteOpen(true)}>
              <CheckCircle2 size={15} /> Complete Week
            </Button>
          </RoleGuard>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Lock size={14} /> Locked
          </span>
        )}
      </div>

      <Card className="p-4">
        <SectionHeader
          index={1}
          title="Automatic Summary"
          desc="Realtime data from Tasks, Meetings, Bugs, Coverage"
        />
        <AutoSummary
          summary={summary}
          loading={summaryLoading}
          onRefresh={loadSummary}
        />
      </Card>

      <Card className="p-4">
        <SectionHeader index={2} title="Weekly Reflection" desc="Reflection & mood" />
        <ReflectionPanel
          review={review}
          editable={editable}
          onFieldChange={handleFieldChange}
          onFieldCommit={handleFieldCommit}
          onMoodChange={handleMoodChange}
          onAddShoutout={handleAddShoutout}
          onRemoveShoutout={handleRemoveShoutout}
        />
      </Card>

      <Card className="p-4">
        <SectionHeader index={3} title="Plan & Report" desc="Prepare for next week" />
        <div className="grid gap-5 lg:grid-cols-2">
          <PlanPanel
            review={review}
            editable={editable}
            onFieldChange={handleFieldChange}
            onFieldCommit={handleFieldCommit}
            onTopFocusChange={handleTopFocusChange}
          />
          <CftReportPanel
            content={review.cft_report_content}
            generatedAt={review.cft_report_generated_at}
            editable={editable}
            loading={cftLoading}
            onGenerate={handleGenerateCft}
            onSave={handleSaveCft}
          />
        </div>
      </Card>

      <CompleteDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={handleComplete}
        review={review}
        summary={summary}
        loading={completing}
      />
    </div>
  );
}

export default function WeeklyReviewDetail() {
  return (
    <ToastProvider>
      <DetailInner />
    </ToastProvider>
  );
}

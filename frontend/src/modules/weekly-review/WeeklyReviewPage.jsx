import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, ChevronRight, Plus, TrendingUp } from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import ToastProvider, { useToast } from "../dashboard/Toast";
import MoodTrendChart from "./MoodTrendChart";
import { moodMeta, workloadMeta } from "./weeklyReviewConstants";
import { createReview, fetchCurrentReview, fetchReviews } from "./weeklyReviewApi";
import RoleGuard from "../../shared/RoleGuard";

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
          {review.status === "completed" ? (
            <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-700">
              Hoàn thành
            </span>
          ) : (
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
              Nháp
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReviews(await fetchReviews());
    } catch (err) {
      toast(err.message || "Không tải được danh sách", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCurrent = async () => {
    try {
      const current = await fetchCurrentReview();
      navigate(`/weekly-review/${current.id}`);
    } catch (err) {
      toast(err.message || "Không mở được tuần hiện tại", "error");
    }
  };

  const createNew = async () => {
    try {
      const created = await createReview({});
      navigate(`/weekly-review/${created.id}`);
    } catch (err) {
      toast(err.message || "Không tạo được", "error");
    }
  };

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
            Nhìn lại tuần qua, lên kế hoạch tuần tới và tạo báo cáo CFT.
          </p>
        </div>
        <div className="flex gap-2">
          <RoleGuard resource="weekly_review" action="create">
            <Button variant="secondary" size="sm" onClick={createNew}>
              <Plus size={15} /> Tạo mới
            </Button>
          </RoleGuard>
          <Button size="sm" onClick={openCurrent}>
            Mở tuần hiện tại
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <TrendingUp size={15} className="text-brand" /> Xu hướng cảm xúc
        </div>
        <MoodTrendChart data={trend} />
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-semibold text-slate-700">
          Lịch sử review ({reviews.length})
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-slate-400">Đang tải...</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            Chưa có review nào. Nhấn "Mở tuần hiện tại" để bắt đầu.
          </div>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <ReviewRow key={r.id} review={r} onOpen={(id) => navigate(`/weekly-review/${id}`)} />
            ))}
          </div>
        )}
      </Card>
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

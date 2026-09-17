import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange, ChevronRight, CheckCircle2, Ban } from "lucide-react";
import Card from "../../shared/components/Card";
import { moodMeta } from "../weekly-review/weeklyReviewConstants";
import {
  fetchCurrentReview,
  fetchSummary,
} from "../weekly-review/weeklyReviewApi";

// Widget Dashboard: hiển thị nhanh review tuần hiện tại + số liệu chính.
export default function WeeklyReviewWidget() {
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchCurrentReview();
        if (!alive) return;
        setReview(r);
        const s = await fetchSummary(r.id);
        if (alive) setSummary(s);
      } catch {
        /* im lặng trên dashboard */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const t = summary?.tasks;
  const mood = moodMeta(review?.mood);

  return (
    <Card
      hover
      className="cursor-pointer p-4"
      onClick={() => navigate(review ? `/weekly-review/${review.id}` : "/weekly-review")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarRange size={16} className="text-brand" /> Weekly Review
        </div>
        <ChevronRight size={16} className="text-slate-300" />
      </div>

      {review ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-slate-900">{review.week_label}</span>
            <div className="flex items-center gap-2">
              {mood ? <span className="text-lg">{mood.emoji}</span> : null}
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-100 px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <CheckCircle2 size={12} /> Completed
              </div>
              <div className="text-lg font-bold text-emerald-600">
                {t?.completed_count ?? "—"}
              </div>
            </div>
            <div className="rounded-lg border border-slate-100 px-2.5 py-1.5">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Ban size={12} /> Blocked
              </div>
              <div
                className={`text-lg font-bold ${
                  t?.blocked_count ? "text-red-600" : "text-slate-700"
                }`}
              >
                {t?.blocked_count ?? "—"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-400">Open to start this week's review.</div>
      )}
    </Card>
  );
}

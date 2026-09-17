import { useEffect, useState } from "react";
import { History, MessageSquare, Send, Trash2 } from "lucide-react";
import {
  createComment,
  deleteComment,
  fetchActivities,
  fetchComments,
} from "./activityApi";
import { formatDate, PRIORITIES, STATUSES } from "./taskConstants";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

const ACTION_LABELS = {
  task_created: "created the task",
  status_changed: "changed status",
  priority_changed: "changed priority",
  due_date_changed: "changed due date",
  tags_changed: "changed tags",
};

// Badge nhỏ highlight giá trị (status/priority/tags) cho dễ nhận biết giữa
// dòng log in nghiêng — trả về "—" nhạt khi rỗng.
function ValueBadge({ action, value }) {
  if (!value || value === "—") {
    return <span className="not-italic text-slate-400">—</span>;
  }
  if (action === "status_changed") {
    const meta = STATUSES.find((s) => s.value === value);
    return (
      <span
        className="not-italic rounded-full border px-1.5 py-0.5 text-[11px] font-semibold"
        style={
          meta
            ? {
                color: meta.color,
                borderColor: meta.color,
                backgroundColor: `${meta.color}1a`,
              }
            : undefined
        }
      >
        {meta ? meta.label : value}
      </span>
    );
  }
  if (action === "priority_changed") {
    const meta = PRIORITIES.find((p) => p.value === value);
    return (
      <span
        className={`not-italic rounded-full border px-1.5 py-0.5 text-[11px] font-semibold ${
          meta ? meta.tone : "border-slate-200 bg-slate-100 text-slate-600"
        }`}
      >
        {meta ? meta.label : value}
      </span>
    );
  }
  if (action === "tags_changed") {
    const tags = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    return (
      <span className="inline-flex flex-wrap items-center gap-1 align-middle">
        {tags.map((t) => (
          <span
            key={t}
            className="not-italic rounded-full bg-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand"
          >
            {t}
          </span>
        ))}
      </span>
    );
  }
  return <span className="not-italic font-semibold text-slate-600">{value}</span>;
}

// Dòng log hoạt động tự động — chữ chìm/nhạt giống font ngày tháng để không
// lấn át bình luận thật; chỉ giá trị đặc biệt (status/priority/tags qua
// ValueBadge) mới giữ màu nổi bật để dễ nhận biết.
function ActivityLine({ item }) {
  const label = ACTION_LABELS[item.action] || item.action;
  const hasDiff = item.old_value != null || item.new_value != null;
  return (
    <p className="text-xs italic leading-relaxed text-slate-400">
      <span>{label}</span>
      {hasDiff && (
        <>
          {": "}
          <ValueBadge action={item.action} value={item.old_value} />
          <span className="mx-1 not-italic text-slate-400">→</span>
          <ValueBadge action={item.action} value={item.new_value} />
        </>
      )}{" "}
      <span className="not-italic text-slate-400">
        · {formatDate(item.created_at)}
      </span>
    </p>
  );
}

// Dòng thời gian gộp Activity (tự động ghi log) + Comment (thủ công).
// props: taskId
export default function ActivityFeed({ taskId }) {
  const { role } = useAuth();
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [acts, coms] = await Promise.all([
        fetchActivities(taskId),
        fetchComments(taskId),
      ]);
      setActivities(acts);
      setComments(coms);
    } catch (err) {
      setError(err.message || "Unable to load activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    try {
      await createComment(taskId, content);
      setNewComment("");
      await load();
    } catch (err) {
      setError(err.message || "Unable to post comment.");
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await deleteComment(taskId, id);
      await load();
    } catch (err) {
      setError(err.message || "Unable to delete comment.");
    }
  };

  const timeline = [
    ...activities.map((a) => ({ ...a, kind: "activity" })),
    ...comments.map((c) => ({ ...c, kind: "comment" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-700">
        Activity &amp; Comments
      </h4>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {!loading && timeline.length === 0 && (
        <p className="text-sm italic text-slate-400">No activity yet.</p>
      )}

      <ul className="space-y-3">
        {timeline.map((item) => (
          <li key={`${item.kind}-${item.id}`} className="flex gap-2.5">
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                item.kind === "comment"
                  ? "bg-amber-100 text-amber-600"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {item.kind === "comment" ? (
                <MessageSquare size={13} />
              ) : (
                <History size={13} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {item.kind === "comment" ? (
                <div className="group rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="whitespace-pre-wrap text-sm font-medium text-amber-950">
                      {item.content}
                    </p>
                    {hasPermission(role, "tasks", "update") && (
                      <button
                        onClick={() => handleDeleteComment(item.id)}
                        className="shrink-0 text-amber-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                        aria-label="Delete comment"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                  <span className="mt-1 block text-xs text-amber-600/70">
                    {formatDate(item.created_at)}
                  </span>
                </div>
              ) : (
                <ActivityLine item={item} />
              )}
            </div>
          </li>
        ))}
      </ul>

      {hasPermission(role, "tasks", "update") && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3"
        >
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <button
            type="submit"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-white transition hover:bg-brand-dark disabled:opacity-40"
            aria-label="Send comment"
            disabled={!newComment.trim()}
          >
            <Send size={15} />
          </button>
        </form>
      )}
    </div>
  );
}

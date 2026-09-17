import { useEffect, useState } from "react";
import { History, MessageSquare, Send, Trash2 } from "lucide-react";
import {
  createProjectComment,
  deleteProjectComment,
  fetchProjectActivities,
  fetchProjectComments,
} from "./projectApi";
import { formatDateTime } from "./projectConstants";

const ACTION_LABELS = {
  project_created: "created the project",
  status_changed: "changed status",
  priority_changed: "changed priority",
  start_date_changed: "changed start date",
  end_date_changed: "changed end date",
  milestone_added: "added a milestone",
  milestone_status_changed: "changed milestone status",
  milestone_deleted: "deleted a milestone",
  risk_added: "added a risk",
  risk_deleted: "deleted a risk",
};

function ActivityLine({ item }) {
  const label = ACTION_LABELS[item.action] || item.action;
  const hasDiff = item.old_value != null || item.new_value != null;
  return (
    <p className="text-xs italic leading-relaxed text-slate-400">
      <span>{label}</span>
      {hasDiff && (
        <>
          {": "}
          <span className="not-italic font-semibold text-slate-500">
            {item.old_value || "—"}
          </span>
          <span className="mx-1 not-italic text-slate-400">→</span>
          <span className="not-italic font-semibold text-slate-600">
            {item.new_value || "—"}
          </span>
        </>
      )}{" "}
      <span className="not-italic text-slate-400">
        · {formatDateTime(item.created_at)}
      </span>
    </p>
  );
}

// Dòng thời gian gộp Activity (tự động) + Comment (thủ công) của 1 project.
// Component riêng cho Projects — không đụng ActivityFeed.jsx của Tasks.
export default function ProjectActivityFeed({ projectId }) {
  const [activities, setActivities] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [acts, coms] = await Promise.all([
        fetchProjectActivities(projectId),
        fetchProjectComments(projectId),
      ]);
      setActivities(acts);
      setComments(coms);
    } catch (err) {
      setError(err.message || "Failed to load activity.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    try {
      await createProjectComment(projectId, content);
      setNewComment("");
      await load();
    } catch (err) {
      setError(err.message || "Failed to post comment.");
    }
  };

  const handleDeleteComment = async (id) => {
    try {
      await deleteProjectComment(projectId, id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete comment.");
    }
  };

  const timeline = [
    ...activities.map((a) => ({ ...a, kind: "activity" })),
    ...comments.map((c) => ({ ...c, kind: "comment" })),
  ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-700">
        Activity &amp; comments
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
                    <button
                      onClick={() => handleDeleteComment(item.id)}
                      className="shrink-0 text-amber-400 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                      aria-label="Delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <span className="mt-1 block text-xs text-amber-600/70">
                    {formatDateTime(item.created_at)}
                  </span>
                </div>
              ) : (
                <ActivityLine item={item} />
              )}
            </div>
          </li>
        ))}
      </ul>

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
    </div>
  );
}

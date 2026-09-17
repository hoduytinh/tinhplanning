import { CheckCircle, XCircle } from "lucide-react";

export default function ActionConfirm({ action, onConfirm, onReject }) {
  if (action.action !== "create_task") return null;
  const task = action.data || {};

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm">
      <p className="mb-2 font-medium text-indigo-700">✨ AI wants to create this task:</p>

      <div className="space-y-1 text-slate-700">
        <p>
          <span className="text-slate-500">Title:</span> {task.title}
        </p>
        <p>
          <span className="text-slate-500">Priority:</span> {task.priority}
        </p>
        <p>
          <span className="text-slate-500">Status:</span> {task.status}
        </p>
        {task.due_date && (
          <p>
            <span className="text-slate-500">Due:</span> {task.due_date}
          </p>
        )}
        {task.tags?.length > 0 && (
          <p>
            <span className="text-slate-500">Tags:</span>{" "}
            {Array.isArray(task.tags) ? task.tags.join(", ") : task.tags}
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onConfirm}
          className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
        >
          <CheckCircle size={14} /> Create task
        </button>
        <button
          onClick={onReject}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <XCircle size={14} /> Dismiss
        </button>
      </div>
    </div>
  );
}

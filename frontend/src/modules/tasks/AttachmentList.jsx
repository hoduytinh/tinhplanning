import { useEffect, useState } from "react";
import { Link2, Plus, Trash2 } from "lucide-react";
import {
  createAttachment,
  deleteAttachment,
  fetchAttachments,
} from "./attachmentApi";
import { formatDate } from "./taskConstants";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

// Danh sách attachment dạng link (không upload file).
// props: taskId
export default function AttachmentList({ taskId }) {
  const { role } = useAuth();
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setItems(await fetchAttachments(taskId));
    } catch (err) {
      setError(err.message || "Không thể tải attachment.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!url.trim() || !label.trim()) return;
    try {
      await createAttachment(taskId, { url: url.trim(), label: label.trim() });
      setUrl("");
      setLabel("");
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message || "Không thể thêm attachment.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAttachment(taskId, id);
      await load();
    } catch (err) {
      setError(err.message || "Không thể xóa attachment.");
    }
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Attachments</h4>
        {hasPermission(role, "tasks", "update") && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand"
          >
            <Plus size={13} /> Thêm link
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {items.length === 0 && !adding && (
        <p className="text-sm italic text-slate-400">Chưa có attachment nào.</p>
      )}

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
          >
            <Link2 size={14} className="shrink-0 text-slate-400" />
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 truncate text-sm text-brand hover:underline"
              title={item.url}
            >
              {item.label}
            </a>
            <span className="hidden shrink-0 text-xs text-slate-400 sm:inline">
              {formatDate(item.created_at)}
            </span>
            {hasPermission(role, "tasks", "delete") && (
              <button
                onClick={() => handleDelete(item.id)}
                className="shrink-0 text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
                aria-label="Xóa attachment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <form
          onSubmit={handleAdd}
          className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3"
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nhãn hiển thị (vd: PR #123)"
            className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-dark"
            >
              Thêm
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

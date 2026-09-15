import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Search,
  FolderOpen,
} from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPES,
  documentCategoryMeta,
  documentTypeMeta,
  isWebUrl,
} from "./projectConstants";
import {
  createDocument,
  deleteDocument,
  fetchDocuments,
  updateDocument,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

const EMPTY_DOC = {
  title: "",
  url: "",
  category: "spec",
  doc_type: "mas",
  notes: "",
};

// Tab 5 — Documents: hub tài liệu, chia theo category.
export default function DocumentsTab({ projectId }) {
  const { role } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setDocs(await fetchDocuments(projectId));
    } catch (err) {
      setError(err.message || "Không thể tải tài liệu.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    if (editing) {
      await updateDocument(projectId, editing.id, payload);
    } else {
      await createDocument(projectId, payload);
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Xóa tài liệu "${doc.title}"?`)) return;
    try {
      await deleteDocument(projectId, doc.id);
      await load();
    } catch (err) {
      setError(err.message || "Không thể xóa tài liệu.");
    }
  };

  const openEdit = (doc) => {
    setEditing(doc);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  // Lọc theo search + category, sau đó gom nhóm theo category.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = docs.filter((d) => {
      if (catFilter && d.category !== catFilter) return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.notes || "").toLowerCase().includes(q) ||
        (d.url || "").toLowerCase().includes(q)
      );
    });
    return DOCUMENT_CATEGORIES.map((cat) => ({
      ...cat,
      items: filtered.filter((d) => d.category === cat.value),
    })).filter((g) => g.items.length > 0);
  }, [docs, query, catFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tài liệu..."
              className="w-56 rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <Select
            ariaLabel="Lọc theo category"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            placeholder="Tất cả category"
            options={DOCUMENT_CATEGORIES.map((c) => ({
              value: c.value,
              label: `${c.icon} ${c.label}`,
            }))}
          />
        </div>
        {hasPermission(role, "projects", "update") && (
          <Button size="sm" onClick={openNew}>
            <Plus size={15} />
            Thêm Document
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && docs.length === 0 && !error && (
        <Card className="p-10 text-center text-sm text-slate-500">
          Chưa có tài liệu nào. Thêm document đầu tiên để xây dựng hub tài liệu.
        </Card>
      )}

      {!loading && docs.length > 0 && grouped.length === 0 && (
        <Card className="p-8 text-center text-sm text-slate-500">
          Không có tài liệu khớp bộ lọc.
        </Card>
      )}

      {grouped.map((group) => (
        <div key={group.value}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>{group.icon}</span>
            {group.label.toUpperCase()}
            <span className="text-xs font-normal text-slate-400">
              ({group.items.length})
            </span>
          </h3>
          <Card className="divide-y divide-slate-100">
            {group.items.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                role={role}
                onEdit={() => openEdit(doc)}
                onDelete={() => handleDelete(doc)}
              />
            ))}
          </Card>
        </div>
      ))}

      <DocumentForm
        open={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function DocumentRow({ doc, role, onEdit, onDelete }) {
  const type = documentTypeMeta(doc.doc_type);
  const web = isWebUrl(doc.url);
  const [copied, setCopied] = useState(false);

  const copyPath = async () => {
    try {
      await navigator.clipboard.writeText(doc.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Bỏ qua nếu clipboard không khả dụng.
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-base" title={type.label}>
        {type.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-700">
            {doc.title}
          </span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
            {type.label}
          </span>
        </div>
        {web ? (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-slate-400 hover:text-brand"
          >
            {doc.url}
          </a>
        ) : (
          <div className="flex items-center gap-1.5">
            <code className="truncate rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
              {doc.url}
            </code>
            <button
              onClick={copyPath}
              className="shrink-0 text-slate-400 hover:text-brand"
              aria-label="Copy path"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
        )}
        {doc.notes && (
          <p className="mt-0.5 truncate text-xs text-slate-400">{doc.notes}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {web && (
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-brand"
            aria-label="Mở link"
          >
            <ExternalLink size={15} />
          </a>
        )}
        {hasPermission(role, "projects", "update") && (
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Sửa"
          >
            <Pencil size={15} />
          </button>
        )}
        {hasPermission(role, "projects", "delete") && (
          <button
            onClick={onDelete}
            className="rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Xóa"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

function DocumentForm({ open, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_DOC);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              title: initial.title || "",
              url: initial.url || "",
              category: initial.category || "spec",
              doc_type: initial.doc_type || "mas",
              notes: initial.notes || "",
            }
          : EMPTY_DOC
      );
      setError("");
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      setError("Title và URL không được để trống.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        title: form.title.trim(),
        url: form.url.trim(),
        category: form.category,
        doc_type: form.doc_type,
        notes: form.notes.trim() || null,
      });
    } catch (err) {
      setError(err.message || "Không thể lưu tài liệu.");
    } finally {
      setSaving(false);
    }
  };

  const field =
    "mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
  const label = "block text-xs font-medium text-slate-600";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <FolderOpen size={16} />
          {initial ? "Sửa document" : "Thêm document"}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label className={label}>Title *</label>
          <input
            className={field}
            value={form.title}
            onChange={set("title")}
            placeholder="Tiger_IHWA_MAS.docx"
          />
        </div>
        <div>
          <label className={label}>URL / Server path *</label>
          <input
            className={field}
            value={form.url}
            onChange={set("url")}
            placeholder="https://... hoặc /proj/dips10/..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Category</label>
            <select className={field} value={form.category} onChange={set("category")}>
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Doc type</label>
            <select className={field} value={form.doc_type} onChange={set("doc_type")}>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>Ghi chú</label>
          <textarea
            rows={2}
            className={field}
            value={form.notes}
            onChange={set("notes")}
          />
        </div>
      </form>
    </Modal>
  );
}

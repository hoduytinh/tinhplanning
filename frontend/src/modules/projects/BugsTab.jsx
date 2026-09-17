import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Bug as BugIcon,
} from "lucide-react";
import Card from "../../shared/components/Card";
import Button from "../../shared/components/Button";
import Modal from "../../shared/components/Modal";
import Select from "../../shared/components/Select";
import {
  BUG_SEVERITIES,
  BUG_SEVERITY_ORDER,
  BUG_STATUSES,
  BUG_STATUS_ORDER,
  bugSeverityMeta,
  bugStatusMeta,
  formatShortDate,
  isWebUrl,
} from "./projectConstants";
import {
  createBug,
  deleteBug,
  fetchBugStats,
  fetchBugs,
  updateBug,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

const EMPTY_BUG = {
  bug_id: "",
  title: "",
  description: "",
  severity: "high",
  status: "open",
  jira_url: "",
  found_by: "",
  fixed_by: "",
  found_date: "",
  closed_date: "",
  root_cause: "",
  notes: "",
};

// Tab 6 — Bugs: stats bar + bảng bug + expand row.
export default function BugsTab({ projectId }) {
  const { role } = useAuth();
  const [bugs, setBugs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  const [sevFilter, setSevFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("severity");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, s] = await Promise.all([
        fetchBugs(projectId),
        fetchBugStats(projectId),
      ]);
      setBugs(list);
      setStats(s);
    } catch (err) {
      setError(err.message || "Failed to load bugs.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    if (editing) {
      await updateBug(projectId, editing.id, payload);
    } else {
      await createBug(projectId, payload);
    }
    setFormOpen(false);
    setEditing(null);
    await load();
  };

  const handleDelete = async (bug) => {
    if (!window.confirm(`Delete bug "${bug.bug_id}"?`)) return;
    try {
      await deleteBug(projectId, bug.id);
      await load();
    } catch (err) {
      setError(err.message || "Failed to delete bug.");
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visible = useMemo(() => {
    let list = bugs.filter((b) => {
      if (sevFilter && b.severity !== sevFilter) return false;
      if (statusFilter && b.status !== statusFilter) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "severity") {
        return (
          (BUG_SEVERITY_ORDER[a.severity] ?? 9) -
          (BUG_SEVERITY_ORDER[b.severity] ?? 9)
        );
      }
      if (sortBy === "status") {
        return (
          (BUG_STATUS_ORDER[a.status] ?? 9) - (BUG_STATUS_ORDER[b.status] ?? 9)
        );
      }
      // date: mới nhất trước (found_date desc, fallback created_at).
      const da = a.found_date || a.created_at || "";
      const dbb = b.found_date || b.created_at || "";
      return dbb.localeCompare(da);
    });
    return list;
  }, [bugs, sevFilter, statusFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {stats && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            {BUG_SEVERITIES.map((s) => (
              <span key={s.value} className="flex items-center gap-1 text-slate-600">
                {s.dot} {s.label}:{" "}
                <span className="font-semibold text-slate-900">
                  {stats.by_severity[s.value] || 0}
                </span>
              </span>
            ))}
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex flex-wrap items-center gap-3 text-slate-600">
            {BUG_STATUSES.map((s) => (
              <span key={s.value}>
                {s.label}:{" "}
                <span className="font-semibold text-slate-900">
                  {stats.by_status[s.value] || 0}
                </span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            ariaLabel="Filter severity"
            value={sevFilter}
            onChange={(e) => setSevFilter(e.target.value)}
            placeholder="All severities"
            options={BUG_SEVERITIES.map((s) => ({
              value: s.value,
              label: `${s.dot} ${s.label}`,
            }))}
          />
          <Select
            ariaLabel="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="All statuses"
            options={BUG_STATUSES.map((s) => ({
              value: s.value,
              label: s.label,
            }))}
          />
          <Select
            ariaLabel="Sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "severity", label: "Sort: Severity" },
              { value: "status", label: "Sort: Status" },
              { value: "date", label: "Sort: Date" },
            ]}
          />
        </div>
        {hasPermission(role, "projects", "update") && (
          <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus size={15} />
            Add Bug
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {!loading && bugs.length === 0 && !error && (
        <Card className="p-10 text-center text-sm text-slate-500">
          No bugs have been recorded yet.
        </Card>
      )}

      {/* Bug table */}
      {visible.length > 0 && (
        <Card className="overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2.5 w-8"></th>
                <th className="px-3 py-2.5">ID</th>
                <th className="px-3 py-2.5">Title</th>
                <th className="px-3 py-2.5">Sev</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">JIRA</th>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((bug) => {
                const sev = bugSeverityMeta(bug.severity);
                const st = bugStatusMeta(bug.status);
                const isOpen = expanded.has(bug.id);
                const hasDetail =
                  bug.description || bug.root_cause || bug.notes;
                return (
                  <BugRows
                    key={bug.id}
                    bug={bug}
                    sev={sev}
                    st={st}
                    isOpen={isOpen}
                    hasDetail={hasDetail}
                    onToggle={() => toggleExpand(bug.id)}
                    onEdit={() => { setEditing(bug); setFormOpen(true); }}
                    onDelete={() => handleDelete(bug)}
                  />
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <BugForm
        open={formOpen}
        initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function BugRows({ bug, sev, st, isOpen, hasDetail, onToggle, onEdit, onDelete }) {
  const { role } = useAuth();
  const web = isWebUrl(bug.jira_url);
  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50">
        <td className="px-3 py-2.5">
          {hasDetail ? (
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Expand"
            >
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          ) : null}
        </td>
        <td className="px-3 py-2.5 font-medium text-slate-700">{bug.bug_id}</td>
        <td className="px-3 py-2.5 text-slate-600">{bug.title}</td>
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${sev.tone}`}
          >
            {sev.dot} {sev.label}
          </span>
        </td>
        <td className="px-3 py-2.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${st.tone}`}
          >
            {st.icon} {st.label}
          </span>
        </td>
        <td className="px-3 py-2.5">
          {web ? (
            <a
              href={bug.jira_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
            >
              JIRA <ExternalLink size={12} />
            </a>
          ) : (
            <span className="text-xs text-slate-300">—</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-xs text-slate-500">
          {bug.found_date ? formatShortDate(bug.found_date) : "—"}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            {hasPermission(role, "projects", "update") && (
              <button
                onClick={onEdit}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {hasPermission(role, "projects", "delete") && (
              <button
                onClick={onDelete}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Delete"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isOpen && hasDetail && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td></td>
          <td colSpan={7} className="px-3 py-3">
            <div className="space-y-2 text-sm text-slate-600">
              {bug.description && (
                <div>
                  <span className="font-medium text-slate-700">Description: </span>
                  {bug.description}
                </div>
              )}
              {bug.root_cause && (
                <div>
                  <span className="font-medium text-slate-700">Root cause: </span>
                  {bug.root_cause}
                </div>
              )}
              {bug.notes && (
                <div>
                  <span className="font-medium text-slate-700">Notes: </span>
                  {bug.notes}
                </div>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {bug.found_by && <span>Found by: {bug.found_by}</span>}
                {bug.fixed_by && <span>Fixed by: {bug.fixed_by}</span>}
                {bug.closed_date && (
                  <span>Closed: {formatShortDate(bug.closed_date)}</span>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function BugForm({ open, initial, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY_BUG);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        initial
          ? {
              bug_id: initial.bug_id || "",
              title: initial.title || "",
              description: initial.description || "",
              severity: initial.severity || "high",
              status: initial.status || "open",
              jira_url: initial.jira_url || "",
              found_by: initial.found_by || "",
              fixed_by: initial.fixed_by || "",
              found_date: initial.found_date || "",
              closed_date: initial.closed_date || "",
              root_cause: initial.root_cause || "",
              notes: initial.notes || "",
            }
          : EMPTY_BUG
      );
      setError("");
    }
  }, [open, initial]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.bug_id.trim() || !form.title.trim()) {
      setError("Bug ID and Title cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        bug_id: form.bug_id.trim(),
        title: form.title.trim(),
        description: form.description.trim() || null,
        severity: form.severity,
        status: form.status,
        jira_url: form.jira_url.trim() || null,
        found_by: form.found_by.trim() || null,
        fixed_by: form.fixed_by.trim() || null,
        found_date: form.found_date || null,
        closed_date: form.closed_date || null,
        root_cause: form.root_cause.trim() || null,
        notes: form.notes.trim() || null,
      });
    } catch (err) {
      setError(err.message || "Failed to save bug.");
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
          <BugIcon size={16} />
          {initial ? "Edit bug" : "Add bug"}
        </span>
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
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
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Bug ID *</label>
            <input
              className={field}
              value={form.bug_id}
              onChange={set("bug_id")}
              placeholder="B175"
            />
          </div>
          <div className="col-span-2">
            <label className={label}>Title *</label>
            <input
              className={field}
              value={form.title}
              onChange={set("title")}
              placeholder="IOD Bad Completion miss"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Severity</label>
            <select className={field} value={form.severity} onChange={set("severity")}>
              {BUG_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.dot} {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Status</label>
            <select className={field} value={form.status} onChange={set("status")}>
              {BUG_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={label}>JIRA URL</label>
          <input
            className={field}
            value={form.jira_url}
            onChange={set("jira_url")}
            placeholder="https://jira/GLC5681-09"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label}>Found by</label>
            <input className={field} value={form.found_by} onChange={set("found_by")} />
          </div>
          <div>
            <label className={label}>Fixed by</label>
            <input className={field} value={form.fixed_by} onChange={set("fixed_by")} />
          </div>
          <div>
            <label className={label}>Found date</label>
            <input
              type="date"
              className={field}
              value={form.found_date}
              onChange={set("found_date")}
            />
          </div>
          <div>
            <label className={label}>Closed date</label>
            <input
              type="date"
              className={field}
              value={form.closed_date}
              onChange={set("closed_date")}
            />
          </div>
        </div>
        <div>
          <label className={label}>Description</label>
          <textarea rows={2} className={field} value={form.description} onChange={set("description")} />
        </div>
        <div>
          <label className={label}>Root cause</label>
          <textarea rows={2} className={field} value={form.root_cause} onChange={set("root_cause")} />
        </div>
        <div>
          <label className={label}>Notes</label>
          <textarea rows={2} className={field} value={form.notes} onChange={set("notes")} />
        </div>
      </form>
    </Modal>
  );
}

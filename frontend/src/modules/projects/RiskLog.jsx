import { useEffect, useState } from "react";
import { Plus, X, Check, Pencil, ShieldAlert } from "lucide-react";
import Badge from "../../shared/components/Badge";
import { RISK_SEVERITIES, riskSeverityMeta } from "./projectConstants";
import {
  createRisk,
  deleteRisk,
  fetchRisks,
  updateRisk,
} from "./projectApi";
import { useAuth } from "../auth/useAuth";
import { hasPermission } from "../../shared/permissions";

function RiskItem({ item, onSeverityChange, onDelete, onSaveEdit }) {
  const { role } = useAuth();
  const meta = riskSeverityMeta(item.severity);
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState(item.description);
  const [editMitigation, setEditMitigation] = useState(item.mitigation || "");

  const field =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

  const startEdit = () => {
    setEditDesc(item.description);
    setEditMitigation(item.mitigation || "");
    setEditing(true);
  };

  const submitEdit = async () => {
    const description = editDesc.trim();
    if (!description) return;
    await onSaveEdit(item, {
      description,
      mitigation: editMitigation.trim() || null,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={2}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Mô tả rủi ro..."
            className={field}
          />
          <input
            value={editMitigation}
            onChange={(e) => setEditMitigation(e.target.value)}
            placeholder="Biện pháp giảm thiểu (tùy chọn)"
            className={field}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={submitEdit}
              className="flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              <Check size={13} /> Lưu
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-slate-100 p-3 hover:border-slate-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-slate-700">{item.description}</p>
          {item.mitigation && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Giảm thiểu: </span>
              {item.mitigation}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={item.severity}
            onChange={(e) => onSeverityChange(item, e.target.value)}
            className="rounded-md border border-slate-200 px-1.5 py-0.5 text-xs focus:border-brand focus:outline-none"
            aria-label="Mức độ nghiêm trọng"
          >
            {RISK_SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          {hasPermission(role, "projects", "update") && (
            <button
              type="button"
              onClick={startEdit}
              className="text-slate-300 opacity-0 transition hover:text-brand group-hover:opacity-100"
              aria-label="Sửa rủi ro"
            >
              <Pencil size={13} />
            </button>
          )}
          {hasPermission(role, "projects", "delete") && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="text-slate-300 opacity-0 transition hover:text-red-500 group-hover:opacity-100"
              aria-label="Xóa rủi ro"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="mt-1.5">
        <Badge tone={meta.tone}>
          {meta.dot} {meta.label}
        </Badge>
      </div>
    </li>
  );
}

// Nhật ký rủi ro của project: thêm mô tả + biện pháp giảm thiểu, đổi mức độ.
export default function RiskLog({ projectId }) {
  const { role: currentRole } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [desc, setDesc] = useState("");
  const [mitigation, setMitigation] = useState("");
  const [severity, setSeverity] = useState("medium");

  const load = async () => {
    try {
      setItems(await fetchRisks(projectId));
    } catch (err) {
      setError(err.message || "Không thể tải rủi ro.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const description = desc.trim();
    if (!description) return;
    try {
      await createRisk(projectId, {
        description,
        severity,
        mitigation: mitigation.trim() || null,
      });
      setDesc("");
      setMitigation("");
      setSeverity("medium");
      setAdding(false);
      await load();
    } catch (err) {
      setError(err.message || "Không thể thêm rủi ro.");
    }
  };

  const changeSeverity = async (item, value) => {
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, severity: value } : i))
    );
    try {
      await updateRisk(projectId, item.id, { severity: value });
      await load();
    } catch (err) {
      setError(err.message || "Không thể cập nhật rủi ro.");
      await load();
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Xóa rủi ro này?")) return;
    try {
      await deleteRisk(projectId, item.id);
      await load();
    } catch (err) {
      setError(err.message || "Không thể xóa rủi ro.");
    }
  };

  const saveEdit = async (item, changes) => {
    try {
      await updateRisk(projectId, item.id, changes);
      await load();
    } catch (err) {
      setError(err.message || "Không thể cập nhật rủi ro.");
    }
  };

  const field =
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <ShieldAlert size={15} className="text-amber-500" />
          Rủi ro
        </h4>
        {!adding && hasPermission(currentRole, "projects", "update") && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-medium text-brand hover:text-brand-dark"
          >
            <Plus size={13} />
            Thêm
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {items.length === 0 && !adding && (
        <p className="text-xs text-slate-400">Chưa có rủi ro nào được ghi nhận.</p>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <RiskItem
            key={item.id}
            item={item}
            onSeverityChange={changeSeverity}
            onDelete={remove}
            onSaveEdit={saveEdit}
          />
        ))}
      </ul>

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Mô tả rủi ro..."
            className={field}
          />
          <input
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            placeholder="Biện pháp giảm thiểu (tùy chọn)"
            className={field}
          />
          <div className="flex items-center gap-2">
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none"
            >
              {RISK_SEVERITIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
            >
              Lưu
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setDesc("");
                setMitigation("");
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

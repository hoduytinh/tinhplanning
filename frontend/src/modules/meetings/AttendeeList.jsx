import { useState } from "react";
import { Plus, Trash2, Crown, ExternalLink } from "lucide-react";
import Badge from "../../shared/components/Badge";
import Button from "../../shared/components/Button";
import { addAttendee, removeAttendee } from "./meetingApi";

export default function AttendeeList({ meetingId, attendees, onChanged, onError, editable = true }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isExternal, setIsExternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await addAttendee(meetingId, {
        name: name.trim(),
        role: role.trim() || null,
        is_host: isHost,
        is_external: isExternal,
      });
      setName("");
      setRole("");
      setIsHost(false);
      setIsExternal(false);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (att) => {
    if (!window.confirm(`Xóa "${att.name}" khỏi danh sách?`)) return;
    try {
      await removeAttendee(meetingId, att.id);
      onChanged?.();
    } catch (err) {
      onError?.(err.message);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {attendees.length === 0 && (
          <p className="text-sm text-slate-400">Chưa có người tham dự.</p>
        )}
        {attendees.map((a) => (
          <Badge
            key={a.id}
            tone="bg-slate-50 text-slate-700 border-slate-200"
            className="group py-1"
          >
            {a.is_host && <Crown size={12} className="text-amber-500" />}
            {a.is_external && <ExternalLink size={12} className="text-blue-500" />}
            <span>{a.name}</span>
            {a.role && <span className="text-slate-400">· {a.role}</span>}
            {editable && (
              <button
                onClick={() => remove(a)}
                className="ml-1 text-slate-300 hover:text-red-500"
                aria-label="Xóa"
              >
                <Trash2 size={12} />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {editable && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Tên"
            className="min-w-[120px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Vai trò"
            className="min-w-[100px] flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={isHost} onChange={(e) => setIsHost(e.target.checked)} />
            Host
          </label>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={isExternal}
              onChange={(e) => setIsExternal(e.target.checked)}
            />
            External
          </label>
          <Button size="sm" onClick={add} disabled={busy || !name.trim()}>
            <Plus size={15} /> Thêm
          </Button>
        </div>
      )}
    </div>
  );
}

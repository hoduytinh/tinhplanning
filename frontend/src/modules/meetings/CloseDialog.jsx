import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import { closeMeeting, toggleChecklistItem } from "./meetingApi";

// Hộp thoại kết thúc cuộc họp: xác nhận checklist -> close -> báo kết quả.
export default function CloseDialog({ open, meeting, onClose, onDone, onError }) {
  const [checklist, setChecklist] = useState(meeting?.close_checklist || []);
  const [busy, setBusy] = useState(false);

  const openCount = (meeting?.action_items || []).filter(
    (a) => a.status === "open"
  ).length;
  const willRecur = meeting?.recurring && meeting.recurring !== "none";

  const toggle = async (item) => {
    try {
      const updated = await toggleChecklistItem(
        meeting.id,
        item.id,
        !item.is_checked
      );
      setChecklist((prev) => prev.map((c) => (c.id === item.id ? updated : c)));
    } catch (err) {
      onError?.(err.message);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const result = await closeMeeting(meeting.id);
      onDone?.(result);
    } catch (err) {
      onError?.(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!meeting) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Kết thúc cuộc họp"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button onClick={confirm} disabled={busy}>
            {busy ? "Đang xử lý..." : "Kết thúc họp"}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm">
        {checklist.length > 0 && (
          <div>
            <p className="mb-2 font-medium text-slate-700">Checklist trước khi đóng</p>
            <ul className="space-y-1">
              {checklist.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => toggle(c)}
                    className="flex w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-slate-50"
                  >
                    {c.is_checked ? (
                      <CheckSquare size={16} className="text-emerald-500" />
                    ) : (
                      <Square size={16} className="text-slate-300" />
                    )}
                    <span className={c.is_checked ? "text-slate-500 line-through" : "text-slate-700"}>
                      {c.item}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-3 text-slate-600">
          <p>
            • <strong>{openCount}</strong> action item đang mở
            {willRecur ? " sẽ được chuyển sang cuộc họp kế tiếp." : "."}
          </p>
          {willRecur && (
            <p className="mt-1">
              • Một cuộc họp mới (lặp {meeting.recurring}) sẽ được tạo tự động.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

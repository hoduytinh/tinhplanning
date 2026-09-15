import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import { CheckCircle2, AlertTriangle } from "lucide-react";

// Hộp thoại hoàn thành review: hiển thị checklist + cảnh báo lưu snapshot.
export default function CompleteDialog({ open, onClose, onConfirm, review, summary, loading }) {
  const t = summary?.tasks;
  const checklist = [
    { label: "Đã điền phần nhìn lại (highlights / challenges)", done: !!(review?.highlights || review?.challenges) },
    { label: "Đã chọn cảm xúc & khối lượng công việc", done: review?.mood != null || !!review?.workload },
    { label: "Đã đặt kế hoạch tuần tới", done: !!(review?.top_focus?.length || review?.focus_next_week) },
    { label: "Đã tạo báo cáo CFT", done: !!review?.cft_report_content },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hoàn thành Weekly Review"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button size="sm" onClick={onConfirm} disabled={loading}>
            {loading ? "Đang lưu..." : "Xác nhận hoàn thành"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Checklist</div>
          <ul className="space-y-1.5">
            {checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  size={16}
                  className={c.done ? "text-emerald-500" : "text-slate-300"}
                />
                <span className={c.done ? "text-slate-700" : "text-slate-400"}>
                  {c.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            Khi hoàn thành, số liệu tuần sẽ được <strong>chụp snapshot</strong> và lưu
            cố định
            {t ? ` (${t.completed_count} task hoàn thành, ${t.created_count} task mới)` : ""}.
            Review sẽ chuyển sang trạng thái <strong>Completed</strong>.
          </div>
        </div>
      </div>
    </Modal>
  );
}

import { useState } from "react";
import Modal from "../../../shared/components/Modal";
import Button from "../../../shared/components/Button";

const emptyForm = { name: "", start_date: "", end_date: "", progress: 0 };

// Form nhanh tạo bar mới trong 1 track (mở khi click vùng trống của track).
export default function BarCreateForm({ track, open, onClose, onCreate }) {
  const [form, setForm] = useState(emptyForm);

  if (!track) return null;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = () => {
    if (!form.name.trim()) return;
    onCreate?.({
      track_id: track.id,
      name: form.name.trim(),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress: Number(form.progress) || 0,
      status: "not_started",
    });
    setForm(emptyForm);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Thêm bar vào "${track.name}"`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>Tạo</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Tên bar</span>
          <input
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            value={form.name}
            onChange={set("name")}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">Bắt đầu</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.start_date}
              onChange={set("start_date")}
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-slate-600">Kết thúc</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={form.end_date}
              onChange={set("end_date")}
            />
          </label>
        </div>
      </div>
    </Modal>
  );
}

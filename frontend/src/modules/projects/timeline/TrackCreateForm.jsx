import { useEffect, useState } from "react";
import Modal from "../../../shared/components/Modal";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";
import { TRACK_COLOR_PRESETS } from "./timelineUtils";

const emptyForm = { name: "", color: TRACK_COLOR_PRESETS[0], parent_id: "" };

// Form tạo/sửa track (tên, màu, track cha tùy chọn).
// Truyền `initial` (track) để chuyển sang chế độ sửa.
export default function TrackCreateForm({ open, onClose, tracks, onCreate, initial }) {
  const isEdit = !!initial;
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || "",
        color: initial.color || TRACK_COLOR_PRESETS[0],
        parent_id: initial.parent_id ? String(initial.parent_id) : "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [initial, open]);

  const parentOptions = [
    { value: "", label: "— Không (track gốc) —" },
    ...tracks
      .filter((t) => !t.is_system && (!initial || t.id !== initial.id))
      .map((t) => ({ value: String(t.id), label: t.name })),
  ];

  const submit = () => {
    if (!form.name.trim()) return;
    onCreate?.({
      name: form.name.trim(),
      color: form.color,
      parent_id: form.parent_id ? Number(form.parent_id) : null,
    });
    setForm(emptyForm);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa track" : "Thêm track mới"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={submit}>{isEdit ? "Lưu" : "Tạo"}</Button>
        </>
      }
    >
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Tên track</span>
          <input
            autoFocus
            className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Track cha</span>
          <Select
            value={form.parent_id}
            onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}
            options={parentOptions}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium text-slate-600">Màu</span>
          <div className="flex gap-1.5">
            {TRACK_COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={`h-6 w-6 rounded-full border-2 ${
                  form.color === c ? "border-slate-800" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </label>
      </div>
    </Modal>
  );
}

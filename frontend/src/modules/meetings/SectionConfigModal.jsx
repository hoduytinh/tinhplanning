import { useState } from "react";
import { Check } from "lucide-react";
import Modal from "../../shared/components/Modal";
import Button from "../../shared/components/Button";
import Select from "../../shared/components/Select";
import { SECTION_TYPES, SECTION_COLORS } from "./meetingConstants";

// Modal thêm section mới vào cuộc họp (chọn loại + tiêu đề + màu nền + cột nếu là bảng).
export default function SectionConfigModal({ open, onClose, onSubmit }) {
  const [type, setType] = useState("notes");
  const [title, setTitle] = useState("");
  const [columns, setColumns] = useState("");
  const [color, setColor] = useState(SECTION_COLORS[0].value);
  const [busy, setBusy] = useState(false);

  const isTable = ![
    "notes",
    "custom",
    "milestone_widget",
    "action_items",
  ].includes(type);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const content = {};
    if (isTable && columns.trim()) {
      content.columns = columns.split(",").map((c) => c.trim()).filter(Boolean);
    }
    try {
      await onSubmit({
        section_type: type,
        title: title.trim(),
        is_required: false,
        color,
        content,
      });
      setType("notes");
      setTitle("");
      setColumns("");
      setColor(SECTION_COLORS[0].value);
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add section"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !title.trim()}>
            Add
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={SECTION_TYPES.map((s) => ({
              value: s.value,
              label: `${s.icon} ${s.label}`,
            }))}
            className="w-full"
            ariaLabel="Section type"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Coverage Status"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Background color</label>
          <div className="flex flex-wrap gap-2">
            {SECTION_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                title={c.label}
                aria-label={c.label}
                style={{ backgroundColor: c.value }}
                className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                  color === c.value
                    ? "border-brand ring-2 ring-brand/40"
                    : "border-slate-300"
                }`}
              >
                {color === c.value && <Check size={14} className="text-slate-600" />}
              </button>
            ))}
          </div>
        </div>
        {isTable && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Columns (comma-separated)
            </label>
            <input
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              placeholder="Block, Pass%, Owner, Status"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
            />
            <p className="mt-1 text-xs text-slate-400">
              Leave blank to use the widget type's default columns.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

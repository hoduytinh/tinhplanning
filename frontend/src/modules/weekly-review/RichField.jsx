import RichTextEditor from "../tasks/RichTextEditor";

// Ô nhập rich text có tiêu đề, dùng lại RichTextEditor của module Tasks.
// Lưu khi blur (onCommit(html)); cập nhật cục bộ khi gõ (onChange(html)).
export default function RichField({
  label,
  hint,
  value,
  editable = true,
  placeholder = "Nhập nội dung...",
  onChange,
  onCommit,
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold text-slate-600">{label}</span>
        {hint ? <span className="text-[11px] text-slate-400">{hint}</span> : null}
      </div>
      {editable ? (
        <div className="rounded-lg border border-slate-200 focus-within:border-brand">
          <RichTextEditor
            content={value || ""}
            editable
            placeholder={placeholder}
            onChange={onChange}
            onBlur={onCommit}
          />
        </div>
      ) : (
        <div
          className="rte-content prose prose-sm max-w-none rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm text-slate-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{
            __html: value || '<span class="text-slate-400">Chưa có nội dung.</span>',
          }}
        />
      )}
    </div>
  );
}

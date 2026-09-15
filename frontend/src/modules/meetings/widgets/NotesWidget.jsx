import { useEffect, useRef, useState } from "react";
import RichTextEditor from "../../tasks/RichTextEditor";

// Widget ghi chú rich text, tự lưu sau khi ngừng gõ (debounce 800ms).
export default function NotesWidget({ value = "", onChange, readOnly = false }) {
  const [html, setHtml] = useState(value || "");
  const timer = useRef(null);

  useEffect(() => {
    setHtml(value || "");
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (next) => {
    setHtml(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), 800);
  };

  if (readOnly) {
    if (!html) {
      return <p className="text-sm italic text-slate-400">Chưa có ghi chú.</p>;
    }
    return <RichTextEditor content={html} editable={false} />;
  }

  return (
    <RichTextEditor
      content={html}
      onChange={handleChange}
      onBlur={() => {
        clearTimeout(timer.current);
        onChange(html);
      }}
      placeholder="Nhập ghi chú..."
    />
  );
}

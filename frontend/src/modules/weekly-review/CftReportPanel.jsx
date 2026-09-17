import { useEffect, useState } from "react";
import { FileText, Copy, Check, Sparkles, Pencil, Save } from "lucide-react";

// Phần 3 (phải): Báo cáo CFT. Generate từ số liệu, Copy, Edit thủ công.
export default function CftReportPanel({
  content,
  generatedAt,
  editable = true,
  loading = false,
  onGenerate,
  onSave,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || "");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(content || "");
  }, [content, editing]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const save = () => {
    onSave?.(draft);
    setEditing(false);
  };

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <FileText size={15} className="text-indigo-500" /> CFT Report
        </div>
        <div className="flex items-center gap-1.5">
          {editable ? (
            <button
              type="button"
              onClick={onGenerate}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-500 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-50"
            >
              <Sparkles size={13} /> Generate
            </button>
          ) : null}
          <button
            type="button"
            onClick={copy}
            disabled={!content}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {editable ? (
            editing ? (
              <button
                type="button"
                onClick={save}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Save size={13} /> Save
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                <Pencil size={13} /> Edit
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="flex-1 p-3">
        {editing ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={16}
            className="h-full min-h-[300px] w-full resize-none rounded-md border border-slate-200 p-2 font-mono text-xs text-slate-700 focus:border-brand focus:outline-none"
          />
        ) : content ? (
          <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
            {content}
          </pre>
        ) : (
          <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-400">
            <FileText size={28} className="mb-2 text-slate-300" />
            No report yet. {editable ? 'Click "Generate" to create a report from this week\'s data.' : ""}
          </div>
        )}
      </div>

      {generatedAt ? (
        <div className="border-t border-slate-100 px-3 py-1.5 text-[11px] text-slate-400">
          Generated at: {new Date(generatedAt).toLocaleString("en-US")}
        </div>
      ) : null}
    </div>
  );
}

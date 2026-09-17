import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import Button from "../../../shared/components/Button";

// Bảng chỉnh sửa inline chung, điều khiển bởi mảng cột (columns).
// value = { columns: [...], rows: [{col: value}] }. onChange trả về value mới.
export default function EditableTable({ columns = [], rows = [], onChange, readOnly = false }) {
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(columns.map((c) => [c, ""]))
  );

  const cols = columns.length ? columns : ["Content"];

  const updateCell = (rowIdx, col, val) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [col]: val } : r));
    onChange({ columns: cols, rows: next });
  };

  const removeRow = (rowIdx) => {
    onChange({ columns: cols, rows: rows.filter((_, i) => i !== rowIdx) });
  };

  const addRow = () => {
    const hasValue = Object.values(draft).some((v) => String(v).trim() !== "");
    if (!hasValue) return;
    onChange({ columns: cols, rows: [...rows, { ...draft }] });
    setDraft(Object.fromEntries(cols.map((c) => [c, ""])));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500">
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5 whitespace-nowrap">
                {c}
              </th>
            ))}
            {!readOnly && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} className="px-2 py-3 text-center text-slate-400">
                No data yet
              </td>
            </tr>
          )}
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-slate-100">
              {cols.map((c) => (
                <td key={c} className="px-1 py-1">
                  {readOnly ? (
                    <span className="px-1 text-slate-700">{row[c] || "—"}</span>
                  ) : (
                    <input
                      value={row[c] ?? ""}
                      onChange={(e) => updateCell(rowIdx, c, e.target.value)}
                      className="w-full min-w-[80px] rounded border border-transparent bg-transparent px-1.5 py-1 text-slate-700 hover:border-slate-200 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                    />
                  )}
                </td>
              ))}
              {!readOnly && (
                <td className="px-1 py-1 text-right">
                  <button
                    onClick={() => removeRow(rowIdx)}
                    className="text-slate-400 hover:text-red-500"
                    aria-label="Delete row"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {!readOnly && (
            <tr className="bg-slate-50/60">
              {cols.map((c) => (
                <td key={c} className="px-1 py-1">
                  <input
                    value={draft[c] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [c]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addRow()}
                    placeholder={c}
                    className="w-full min-w-[80px] rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
                  />
                </td>
              ))}
              <td className="px-1 py-1 text-right">
                <Button size="sm" variant="ghost" onClick={addRow} aria-label="Add row">
                  <Plus size={15} />
                </Button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

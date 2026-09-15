import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { fetchSubblocks } from "../projects/projectApi";
import { findSubblockPath } from "./taskConstants";

// Dropdown chọn sub-block dạng cây, chọn được ở bất kỳ độ sâu nào.
// props:
//  - projectId: id project (null = disabled, bắt user chọn project trước)
//  - value: subblock_id đang chọn (null = không có)
//  - onChange(subblockId | null)
//  - className
export default function SubblockDropdown({
  projectId,
  value,
  onChange,
  className = "",
}) {
  const [tree, setTree] = useState([]);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState({});
  const boxRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (!projectId) {
      setTree([]);
      return;
    }
    fetchSubblocks(projectId)
      .then((data) => active && setTree(data))
      .catch(() => active && setTree([]));
    return () => {
      active = false;
    };
  }, [projectId]);

  // Đóng khi click ra ngoài.
  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const path = findSubblockPath(tree, value);
  const label = path.length ? path.map((n) => n.name).join(" › ") : "";

  const disabled = !projectId;

  const toggleExpand = (id) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const select = (id) => {
    onChange(id);
    setOpen(false);
  };

  const renderNodes = (nodes, depth = 0) =>
    nodes.map((n) => {
      const hasChildren = (n.children || []).length > 0;
      const isOpen = expanded[n.id] ?? true;
      const selected = n.id === value;
      return (
        <div key={n.id}>
          <div
            className={`flex items-center gap-1 rounded-md px-1 py-1 text-sm ${
              selected
                ? "bg-brand/10 text-brand"
                : "text-slate-700 hover:bg-slate-50"
            }`}
            style={{ paddingLeft: `${depth * 14 + 4}px` }}
          >
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(n.id)}
                className="flex h-4 w-4 items-center justify-center text-slate-400 hover:text-slate-600"
                aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
              >
                {isOpen ? (
                  <ChevronDown size={13} />
                ) : (
                  <ChevronRight size={13} />
                )}
              </button>
            ) : (
              <span className="inline-block h-4 w-4" />
            )}
            <button
              type="button"
              onClick={() => select(n.id)}
              className="flex-1 truncate text-left"
            >
              {n.name}
            </button>
          </div>
          {hasChildren && isOpen && renderNodes(n.children, depth + 1)}
        </div>
      );
    });

  return (
    <div ref={boxRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        title={disabled ? "Chọn project trước" : undefined}
        className={`flex w-full items-center gap-1 rounded-lg border px-3 py-2 text-sm transition ${
          disabled
            ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="flex-1 truncate text-left">
          {disabled ? "Chọn project trước" : label || "Không có (root)"}
        </span>
        {value != null && !disabled && (
          <X
            size={14}
            className="text-slate-400 hover:text-red-500"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        )}
        <ChevronDown size={16} className="text-slate-400" />
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full min-w-[220px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => select(null)}
            className={`mb-1 flex w-full items-center rounded-md px-2 py-1 text-sm ${
              value == null
                ? "bg-brand/10 text-brand"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Không có (root level)
          </button>
          {tree.length === 0 ? (
            <p className="px-2 py-2 text-xs italic text-slate-400">
              Project chưa có sub-block nào.
            </p>
          ) : (
            renderNodes(tree)
          )}
        </div>
      )}
    </div>
  );
}

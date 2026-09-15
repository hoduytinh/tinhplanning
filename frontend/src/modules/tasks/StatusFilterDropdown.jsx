import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { STATUSES } from "./taskConstants";

// Bộ lọc trạng thái dạng tick-chọn (multi-select): tick vào trạng thái nào
// thì các task có trạng thái đó được hiển thị. Menu render qua Portal với
// position: fixed để không bị cắt bởi overflow-hidden của Card cha (giống
// StatusIcon.jsx / Dropdown.jsx).
export default function StatusFilterDropdown({ selected, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        btnRef.current &&
        !btnRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({ left: rect.left, top: rect.bottom + 4 });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  const toggle = (value) => {
    if (selected.includes(value)) onChange(selected.filter((v) => v !== value));
    else onChange([...selected, value]);
  };

  const label = "Trạng thái";

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-left text-sm text-slate-700 transition hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <span className="truncate">{label}</span>
      </button>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", left: pos.left, top: pos.top }}
            className="z-50 min-w-[220px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-cardHover"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
              <button
                type="button"
                className="text-xs font-medium text-brand hover:underline"
                onClick={() => onChange(STATUSES.map((s) => s.value))}
              >
                Chọn tất cả
              </button>
              <button
                type="button"
                className="text-xs font-medium text-slate-400 hover:underline"
                onClick={() => onChange([])}
              >
                Bỏ chọn
              </button>
            </div>
            {STATUSES.map((s) => {
              const checked = selected.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={checked}
                  onClick={() => toggle(s.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? "border-brand bg-brand text-white" : "border-slate-300"
                    }`}
                  >
                    {checked && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span
                    style={{ color: s.color }}
                    className="w-4 shrink-0 text-center font-bold"
                  >
                    {s.icon}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

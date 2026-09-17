import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { STATUSES } from "./taskConstants";

// Dropdown trạng thái có màu — thay cho <select> gốc vì thẻ <option> của
// trình duyệt KHÔNG thể hiển thị màu cho từng icon (chỉ ra chữ đen thui,
// nhìn không rõ ý nghĩa). Component này render icon + màu lấy trực tiếp
// từ STATUSES (taskConstants.js), giống hệt dropdown trong StatusIcon.jsx.
export default function StatusSelect({
  value,
  onChange,
  className = "",
  ariaLabel = "Status",
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = STATUSES.find((s) => s.value === value) || STATUSES[0];

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className={`relative inline-block w-full ${className}`} ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-left text-sm text-slate-700 transition hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${meta.tone}`}
        >
          <meta.icon size={12} strokeWidth={2.5} />
        </span>
        <span className="truncate">{meta.label}</span>
      </button>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 w-full min-w-[220px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-cardHover"
        >
          {STATUSES.map((s) => {
            const active = s.value === value;
            return (
              <button
                key={s.value}
                type="button"
                role="menuitem"
                title={s.description}
                onClick={() => {
                  setOpen(false);
                  if (s.value !== value) onChange(s.value);
                }}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  active ? "font-medium text-slate-900" : "text-slate-600"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${s.tone}`}
                >
                  <s.icon size={13} strokeWidth={2.5} />
                </span>
                <span className="flex flex-col">
                  <span>{s.label}</span>
                  <span className="text-xs font-normal text-slate-400">
                    {s.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

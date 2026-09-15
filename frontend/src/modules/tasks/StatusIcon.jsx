import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { STATUSES } from "./taskConstants";

// Icon click được: click mở dropdown các lựa chọn trạng thái, hover hiện tooltip
// ý nghĩa thực tế. Icon + màu lấy trực tiếp từ STATUSES (taskConstants.js).
//
// Dropdown được render qua Portal vào document.body với position: fixed, thay
// vì absolute lồng trong DOM tại chỗ. Lý do: hàng cuối trong bảng List view
// nằm trong <Card overflow-hidden>, nên menu absolute mở xuống sẽ bị cắt mất.
// Portal + tính toán vị trí theo getBoundingClientRect() (và tự lật lên trên
// nếu không đủ chỗ bên dưới) giúp menu luôn hiển thị đầy đủ.
export default function StatusIcon({ status, onChange, size = 18 }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const meta = STATUSES.find((s) => s.value === status) || STATUSES[0];

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
    const MENU_HEIGHT_ESTIMATE = 320;
    const updatePos = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT_ESTIMATE;
      setPos({
        left: rect.left,
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        title={`${meta.label} — ${meta.description}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex items-center justify-center rounded-md p-0.5 transition hover:bg-slate-100"
        aria-label={`Trạng thái: ${meta.label}`}
      >
        <span
          style={{ color: meta.color, fontSize: size, lineHeight: 1 }}
          className="font-bold"
        >
          {meta.icon}
        </span>
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom }}
            className="z-50 min-w-[220px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-cardHover"
            onClick={(e) => e.stopPropagation()}
          >
            {STATUSES.map((s) => {
              const active = s.value === status;
              return (
                <button
                  key={s.value}
                  role="menuitem"
                  title={s.description}
                  onClick={() => {
                    setOpen(false);
                    if (s.value !== status) onChange(s.value);
                  }}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                    active ? "font-medium text-slate-900" : "text-slate-600"
                  }`}
                >
                  <span
                    style={{ color: s.color }}
                    className="w-4 shrink-0 text-center font-bold"
                  >
                    {s.icon}
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
          </div>,
          document.body
        )}
    </div>
  );
}


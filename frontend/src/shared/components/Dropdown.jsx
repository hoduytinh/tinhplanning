import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Dropdown menu đơn giản gắn với 1 nút trigger (thường là icon ⋯).
// items: [{ label, icon, onClick, danger }]
//
// Menu được render qua Portal vào document.body với position: fixed thay vì
// absolute lồng tại chỗ, để không bị cắt bởi ancestor overflow-hidden (ví dụ
// hàng cuối trong bảng List view nằm trong <Card overflow-hidden>).
export default function Dropdown({ trigger, items, align = "right" }) {
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
    const MENU_HEIGHT_ESTIMATE = 120;
    const updatePos = () => {
      const rect = btnRef.current?.getBoundingClientRect();
      if (!rect) return;
      const openUpward = window.innerHeight - rect.bottom < MENU_HEIGHT_ESTIMATE;
      setPos({
        left: align === "right" ? undefined : rect.left,
        right: align === "right" ? window.innerWidth - rect.right : undefined,
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
  }, [open, align]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              left: pos.left,
              right: pos.right,
              top: pos.top,
              bottom: pos.bottom,
            }}
            className="z-50 min-w-[140px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-cardHover"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${
                  item.danger ? "text-red-600" : "text-slate-700"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

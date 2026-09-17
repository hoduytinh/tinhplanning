import { useEffect } from "react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  resizable = false,
}) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const maxWidth = SIZE_CLASSES[size] || SIZE_CLASSES.md;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={
          resizable
            ? `relative z-10 flex h-[26rem] max-h-[90vh] min-h-[14rem] w-[34rem] min-w-[20rem] max-w-[95vw] resize flex-col overflow-hidden rounded-2xl bg-white shadow-xl`
            : `relative z-10 flex max-h-[90vh] w-full flex-col rounded-2xl bg-white shadow-xl ${maxWidth}`
        }
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

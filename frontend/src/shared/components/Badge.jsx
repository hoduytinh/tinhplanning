// Badge nhận trực tiếp class màu (bg/text/border) từ design system.
// Truyền qua prop `tone` (chuỗi class Tailwind) để kiểm soát màu chính xác.
export default function Badge({ children, tone = "", className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${tone} ${className}`}
    >
      {children}
    </span>
  );
}

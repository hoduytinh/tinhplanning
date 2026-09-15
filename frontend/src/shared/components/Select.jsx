import { ChevronDown } from "lucide-react";

// Select đẹp: bọc <select> gốc để giữ khả năng truy cập, ẩn mũi tên mặc định
// và thêm chevron của lucide.
export default function Select({
  value,
  onChange,
  options,
  placeholder,
  className = "",
  ariaLabel,
  disabled = false,
}) {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

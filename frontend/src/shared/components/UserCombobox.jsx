import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

// Bỏ dấu tiếng Việt + hạ chữ thường để search không cần gõ dấu
// (vd: gõ "an" vẫn khớp "Ân", "Anh", "Ánh"...).
function stripDiacritics(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Searchable single-pick combobox for choosing a user out of the full
// directory — filters instantly as you type (name or username).
// Used for: task Assignee, "+ Add viewer" (watchers), project members, etc.
//
// props:
//  - users: [{ id, username, full_name, avatar_url }]
//  - value: selected user id (or null)
//  - onChange(userId | null)
//  - excludeIds: user ids to hide from the list (e.g. already added)
//  - placeholder, className
export default function UserCombobox({
  users = [],
  value = null,
  onChange,
  excludeIds = [],
  placeholder = "Search by name...",
  className = "",
  allowClear = true,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selectedUser = users.find((u) => u.id === value) || null;
  const excludeSet = useMemo(() => new Set(excludeIds), [excludeIds]);

  const filtered = useMemo(() => {
    const q = stripDiacritics(query.trim());
    return users
      .filter((u) => !excludeSet.has(u.id))
      .filter(
        (u) =>
          !q ||
          stripDiacritics(u.full_name).includes(q) ||
          stripDiacritics(u.username).includes(q)
      )
      .slice(0, 40);
  }, [users, query, excludeSet]);

  const pick = (id) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      >
        <span className={`truncate ${selectedUser ? "" : "text-slate-400"}`}>
          {selectedUser ? selectedUser.full_name || selectedUser.username : placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-60 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <div className="mb-1.5 flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1">
            <Search size={13} className="shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name or @username..."
              className="w-full border-0 bg-transparent p-0 text-sm text-slate-700 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {allowClear && value != null && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-red-500 hover:bg-red-50"
              >
                Clear selection
              </button>
            )}
            {filtered.length === 0 && (
              <div className="px-2 py-2 text-xs text-slate-400">No users found</div>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => pick(u.id)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50 ${
                  u.id === value ? "bg-brand/5 text-brand" : "text-slate-700"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                  {(u.full_name || u.username || "?").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {u.full_name || u.username}
                  {u.full_name && (
                    <span className="ml-1 text-xs text-slate-400">@{u.username}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Cấu hình hiển thị role dùng chung (badge màu + icon + nhãn tiếng Việt).
export const ROLE_META = {
  admin: { label: "Admin", icon: "👑", tone: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  moderator: { label: "Moderator", icon: "🛡", tone: "bg-purple-50 text-purple-700 border-purple-200" },
  user: { label: "User", icon: "👤", tone: "bg-slate-50 text-slate-700 border-slate-200" },
  viewer: { label: "Viewer", icon: "👁", tone: "bg-gray-50 text-gray-600 border-gray-200" },
};

export const ROLE_OPTIONS = [
  { value: "admin", label: "👑 Admin" },
  { value: "moderator", label: "🛡 Moderator" },
  { value: "user", label: "👤 User" },
  { value: "viewer", label: "👁 Viewer" },
];

export const STATUS_META = {
  pending: { label: "Chờ duyệt", tone: "bg-amber-50 text-amber-700 border-amber-200" },
  active: { label: "Đã duyệt", tone: "bg-green-50 text-green-700 border-green-200" },
  rejected: { label: "Đã từ chối", tone: "bg-red-50 text-red-700 border-red-200" },
};

export function roleMeta(role) {
  return ROLE_META[role] || ROLE_META.user;
}

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.active;
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

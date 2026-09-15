import { useAuth } from "../modules/auth/useAuth";
import { hasPermission } from "./permissions";

// Hiển thị children chỉ khi user có quyền. Hai cách dùng:
//   1) Theo quyền tài nguyên (khuyến nghị): <RoleGuard resource="tasks" action="delete">
//   2) Theo danh sách role: <RoleGuard roles={["admin","moderator"]}>
// RoleGuard trả THẲNG children (không bọc DOM) nên an toàn với layout inline.
export default function RoleGuard({
  roles,
  resource,
  action,
  children,
  fallback = null,
}) {
  const { user } = useAuth();
  if (!user) return fallback;

  if (resource && action) {
    return hasPermission(user.role, resource, action) ? children : fallback;
  }

  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) return fallback;
  return children;
}

// Ma trận quyền phía frontend — PHẢI khớp với backend/core/permissions.py.
// Dùng cho RoleGuard (ẩn/hiện nút) chứ không thay thế kiểm tra ở backend.
export const PERMISSIONS = {
  admin: {
    tasks: ["create", "read", "update", "delete"],
    projects: ["create", "read", "update", "delete"],
    meetings: ["create", "read", "update", "delete"],
    meeting_templates: ["create", "read", "update", "delete"],
    weekly_review: ["create", "read", "update", "delete"],
    users: ["create", "read", "update", "delete"],
    settings: ["read", "update"],
  },
  moderator: {
    tasks: ["create", "read", "update", "delete"],
    projects: ["create", "read", "update", "delete"],
    meetings: ["create", "read", "update", "delete"],
    meeting_templates: ["create", "read", "update"],
    weekly_review: ["create", "read", "update"],
    users: ["read"],
    settings: ["read"],
  },
  user: {
    tasks: ["create", "read_own", "update_own", "delete_own"],
    projects: ["read", "create"],
    meetings: ["create", "read", "update_own"],
    meeting_templates: ["read"],
    weekly_review: ["create_own", "read_own", "update_own"],
    users: [],
    settings: [],
  },
  viewer: {
    tasks: ["read_own"],
    projects: ["read"],
    meetings: ["read"],
    meeting_templates: [],
    weekly_review: [],
    users: [],
    settings: [],
  },
};

// Kiểm tra role có action (hoặc biến thể *_own) trên resource không.
// Frontend không phân biệt được "own" (thiếu owner field) nên coi *_own như có quyền
// ở mức role — backend vẫn là nơi thực thi cuối cùng.
export function hasPermission(role, resource, action) {
  const actions = PERMISSIONS[role]?.[resource] || [];
  if (actions.includes(action)) return true;
  return actions.includes(`${action}_own`);
}

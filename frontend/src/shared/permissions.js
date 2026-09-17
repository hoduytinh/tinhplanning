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
    tasks: ["create", "read", "update", "delete_own"],
    projects: ["create", "read", "update", "delete_own"],
    meetings: ["create", "read", "update", "delete_own"],
    meeting_templates: ["create", "read", "update"],
    weekly_review: ["create", "read", "update"],
    users: ["read"],
    settings: ["read"],
  },
  user: {
    tasks: ["create", "read_own", "update_own", "delete_own"],
    projects: ["read", "create", "delete_own"],
    meetings: ["create", "read", "update_own", "delete_own"],
    meeting_templates: ["read"],
    weekly_review: ["create_own", "read_own", "update_own", "delete_own"],
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

// Kiểm tra quyền trên 1 object CỤ THỂ, có tính tới ownership.
// - Nếu role có action "đầy đủ" (vd "delete") -> luôn được (admin/mod tuỳ module).
// - Nếu chỉ có biến thể "*_own" -> chỉ được khi user là người tạo object đó.
// Dùng cho nút Delete/Edit từng item (backend vẫn là nơi thực thi cuối cùng).
export function canOnObject(role, resource, action, object, userId) {
  const actions = PERMISSIONS[role]?.[resource] || [];
  if (actions.includes(action)) return true;
  if (actions.includes(`${action}_own`)) {
    return object?.created_by != null && object.created_by === userId;
  }
  return false;
}

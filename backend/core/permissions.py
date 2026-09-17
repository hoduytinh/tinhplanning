"""Permission matrix + helper checks for role-based access control."""
from __future__ import annotations

PERMISSIONS: dict[str, dict[str, list[str]]] = {
    "admin": {
        "tasks": ["create", "read", "update", "delete"],
        "projects": ["create", "read", "update", "delete"],
        "meetings": ["create", "read", "update", "delete"],
        "meeting_templates": ["create", "read", "update", "delete"],
        "weekly_review": ["create", "read", "update", "delete"],
        "users": ["create", "read", "update", "delete"],
        "settings": ["read", "update"],
    },
    "moderator": {
        "tasks": ["create", "read", "update", "delete_own"],
        "projects": ["create", "read", "update", "delete_own"],
        "meetings": ["create", "read", "update", "delete_own"],
        "meeting_templates": ["create", "read", "update"],
        "weekly_review": ["create", "read", "update"],
        "users": ["read"],
        "settings": ["read"],
    },
    "user": {
        "tasks": ["create", "read_own", "update_own", "delete_own"],
        "projects": ["read", "create", "delete_own"],
        "meetings": ["create", "read", "update_own", "delete_own"],
        "meeting_templates": ["read"],
        "weekly_review": ["create_own", "read_own", "update_own", "delete_own"],
        "users": [],
        "settings": [],
    },
    "viewer": {
        "tasks": ["read_own"],
        "projects": ["read"],
        "meetings": ["read"],
        "meeting_templates": [],
        "weekly_review": [],
        "users": [],
        "settings": [],
    },
}


def get_permissions(role: str) -> dict[str, list[str]]:
    return PERMISSIONS.get(role, {})


def has_permission(role: str, resource: str, action: str) -> bool:
    """Kiểm tra role có action (hoặc biến thể *_own) trên resource không."""
    actions = PERMISSIONS.get(role, {}).get(resource, [])
    if action in actions:
        return True
    # "create" khớp nếu có "create_own", tương tự cho read/update/delete.
    return f"{action}_own" in actions


def can_access_all(role: str) -> bool:
    """Role có quyền xem toàn bộ dữ liệu (không giới hạn own)."""
    return role in ("admin", "moderator")

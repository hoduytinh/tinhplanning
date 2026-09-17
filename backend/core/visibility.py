"""Ownership & Visibility rules (cross-module).

Trung tâm quyết định user nào được xem object nào. Quy tắc theo role + quan hệ
sở hữu/thành viên/watch. `is_shared=True` override tất cả (mọi user đều xem).

Dùng ở 2 nơi:
- Single object: `can_view(user, obj, object_type, db)` -> bool
- List/query   : các helper `*_visibility_condition()` trả về điều kiện
  SQLAlchemy để lọc ngay trong query (hiệu quả hơn lọc sau khi fetch).

Module CHỈ THÊM MỚI, không sửa core/permissions.py (permission ghi/sửa/xoá).
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from modules.projects.member_models import ProjectMember
from modules.watchers.models import ObjectWatcher

# Vai trò xem được tất cả (không áp dụng visibility filter).
_FULL_ACCESS_ROLES = {"admin", "moderator"}

VISIBILITY_RULES: dict[str, dict[str, str]] = {
    "task": {
        "admin": "all",
        "moderator": "all",
        "user": "project_member_or_owner",
        "viewer": "assigned_or_watching",
    },
    "project": {
        "admin": "all",
        "moderator": "all",
        "user": "member",
        "viewer": "member",
    },
    "meeting": {
        "admin": "all",
        "moderator": "all",
        "user": "attendee_or_watching",
        "viewer": "attendee_or_watching",
    },
    "weekly_review": {
        "admin": "all",
        "moderator": "all",
        "user": "own_or_shared",
        "viewer": "shared_only",
    },
}


def can_access_all(role: str | None) -> bool:
    """admin/moderator xem được mọi object, bỏ qua visibility filter."""
    return role in _FULL_ACCESS_ROLES


# --- Quan hệ phụ trợ -------------------------------------------------------


def get_member_project_ids(db: Session, user_id: int) -> set[int]:
    """Các project mà user là thành viên (bất kể role lead/member/watcher)."""
    rows = db.execute(
        select(ProjectMember.project_id).where(ProjectMember.user_id == user_id)
    ).scalars()
    return set(rows)


def get_watching_ids(db: Session, user_id: int, object_type: str) -> set[int]:
    """Các object_id mà user đang watch cho 1 object_type."""
    rows = db.execute(
        select(ObjectWatcher.object_id).where(
            ObjectWatcher.user_id == user_id,
            ObjectWatcher.object_type == object_type,
        )
    ).scalars()
    return set(rows)


# --- Điều kiện query cho list endpoints -----------------------------------


def task_visibility_condition(
    db: Session, user, TaskModel
) -> ColumnElement[bool] | None:
    """Điều kiện WHERE lọc tasks user được xem. None => xem tất cả."""
    if can_access_all(user.role):
        return None

    conditions = [
        TaskModel.is_shared.is_(True),
        TaskModel.created_by == user.id,
        TaskModel.assigned_to == user.id,
    ]

    if user.role == "user":
        project_ids = get_member_project_ids(db, user.id)
        if project_ids:
            conditions.append(TaskModel.project_id.in_(project_ids))
    else:  # viewer: assigned_or_watching
        watching = get_watching_ids(db, user.id, "task")
        if watching:
            conditions.append(TaskModel.id.in_(watching))

    from sqlalchemy import or_

    return or_(*conditions)


def project_visibility_condition(
    db: Session, user, ProjectModel
) -> ColumnElement[bool] | None:
    """Điều kiện WHERE lọc projects user được xem. None => xem tất cả."""
    if can_access_all(user.role):
        return None

    from sqlalchemy import or_

    project_ids = get_member_project_ids(db, user.id)
    conditions = [
        ProjectModel.is_shared.is_(True),
        ProjectModel.created_by == user.id,
    ]
    if project_ids:
        conditions.append(ProjectModel.id.in_(project_ids))
    return or_(*conditions)


def weekly_review_visibility_condition(
    db: Session, user, ReviewModel
) -> ColumnElement[bool] | None:
    """Điều kiện WHERE lọc weekly reviews user được xem. None => tất cả."""
    if can_access_all(user.role):
        return None

    from sqlalchemy import or_

    conditions = [ReviewModel.is_shared.is_(True)]
    if user.role == "user":
        conditions.append(ReviewModel.created_by == user.id)
    # team_members là JSON array => không lọc SQL được portable; xử lý ở
    # can_view cho single object. Ở list, shared + own đã đủ cho phần lớn case.
    return or_(*conditions)


# --- Kiểm tra single object ------------------------------------------------


def _user_in_json_list(value, user_id: int) -> bool:
    return bool(value) and user_id in value


def can_view(db: Session, user, obj, object_type: str) -> bool:
    """Kiểm tra 1 user có xem được 1 object cụ thể không."""
    # is_shared override tất cả.
    if getattr(obj, "is_shared", False):
        return True
    if can_access_all(user.role):
        return True

    if object_type == "task":
        if obj.created_by == user.id or obj.assigned_to == user.id:
            return True
        if user.role == "user" and obj.project_id is not None:
            return obj.project_id in get_member_project_ids(db, user.id)
        return obj.id in get_watching_ids(db, user.id, "task")

    if object_type == "project":
        if obj.created_by == user.id:
            return True
        return obj.id in get_member_project_ids(db, user.id)

    if object_type == "meeting":
        if obj.created_by == user.id:
            return True
        return obj.id in get_watching_ids(db, user.id, "meeting")

    if object_type == "weekly_review":
        if user.role == "viewer":
            return _user_in_json_list(getattr(obj, "team_members", None), user.id)
        return obj.created_by == user.id or _user_in_json_list(
            getattr(obj, "team_members", None), user.id
        )

    return False


def can_toggle_share(user, obj) -> bool:
    """Ai được bật/tắt is_shared: admin/moderator hoặc người tạo object."""
    if can_access_all(user.role):
        return True
    return getattr(obj, "created_by", None) == user.id


# --- Quản lý watchers/viewers -----------------------------------------------


def _load_watchable_object(db: Session, object_type: str, object_id: int):
    """Lấy object gốc theo object_type để kiểm tra quyền quản lý watcher."""
    if object_type == "task":
        from modules.tasks.models import Task

        return db.get(Task, object_id)
    if object_type == "project":
        from modules.projects.models import Project

        return db.get(Project, object_id)
    if object_type == "meeting":
        from modules.meetings.models import Meeting

        return db.get(Meeting, object_id)
    if object_type == "weekly_review":
        from modules.weekly_review.models import WeeklyReview

        return db.get(WeeklyReview, object_id)
    if object_type == "bug":
        from modules.projects.models import ProjectBug

        return db.get(ProjectBug, object_id)
    if object_type == "document":
        from modules.projects.models import ProjectDocument

        return db.get(ProjectDocument, object_id)
    return None


def can_manage_watchers(db: Session, user, object_type: str, object_id: int) -> bool:
    """Ai được thêm/xoá NGƯỜI KHÁC làm watcher/viewer của 1 object.

    Tự thêm/xoá watch của chính mình luôn được phép (xử lý riêng ở router).
    Thêm/xoá người khác cần: admin/moderator, người tạo object, hoặc (với
    task) người được assign.
    """
    if can_access_all(user.role):
        return True
    obj = _load_watchable_object(db, object_type, object_id)
    if obj is None:
        return False
    if getattr(obj, "created_by", None) == user.id:
        return True
    if object_type == "task" and getattr(obj, "assigned_to", None) == user.id:
        return True
    return False

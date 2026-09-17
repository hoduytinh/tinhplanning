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

# Vai trò xem được tất cả object bất kể visibility mode: CHỈ admin (quyền tối
# cao). Moderator KHÔNG còn full-access lên private (chỉ normal/shared).
_SUPREME_ROLES = {"admin"}

# 3 chế độ hiển thị hợp lệ.
VISIBILITY_VALUES = ("normal", "private", "shared")


def can_access_all(role: str | None) -> bool:
    """Chỉ admin có quyền tối cao xem MỌI object (kể cả private).

    Lưu ý: moderator KHÔNG còn full-access — chỉ xem được normal & shared,
    còn private thì phải là owner/assigned/viewer mới thấy.
    """
    return role in _SUPREME_ROLES


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
    """Điều kiện WHERE lọc tasks user được xem. None => xem tất cả.

    3 chế độ:
    - shared  : mọi user thấy.
    - private : chỉ owner/assigned/viewer (watcher) thấy — mod KHÔNG.
    - normal  : mod thấy tất cả; user thấy nếu owner/assigned/viewer/member
                project; viewer thấy nếu assigned/viewer.
    """
    if user.role == "admin":
        return None  # admin: quyền tối cao, xem tất cả

    from sqlalchemy import and_, or_

    watching = get_watching_ids(db, user.id, "task")
    owner_like = [
        TaskModel.created_by == user.id,
        TaskModel.assigned_to == user.id,
    ]
    if watching:
        owner_like.append(TaskModel.id.in_(watching))
    owner_cond = or_(*owner_like)

    if user.role == "moderator":
        normal_cond = TaskModel.visibility == "normal"
    elif user.role == "user":
        project_ids = get_member_project_ids(db, user.id)
        normal_terms = [owner_cond]
        if project_ids:
            normal_terms.append(TaskModel.project_id.in_(project_ids))
        normal_cond = and_(TaskModel.visibility == "normal", or_(*normal_terms))
    else:  # viewer
        normal_cond = and_(TaskModel.visibility == "normal", owner_cond)

    return or_(
        TaskModel.visibility == "shared",
        and_(TaskModel.visibility == "private", owner_cond),
        normal_cond,
    )


def project_visibility_condition(
    db: Session, user, ProjectModel
) -> ColumnElement[bool] | None:
    """Điều kiện WHERE lọc projects user được xem. None => xem tất cả."""
    if user.role == "admin":
        return None

    from sqlalchemy import and_, or_

    project_ids = get_member_project_ids(db, user.id)
    member_terms = [ProjectModel.created_by == user.id]
    if project_ids:
        member_terms.append(ProjectModel.id.in_(project_ids))
    member_cond = or_(*member_terms)

    if user.role == "moderator":
        normal_cond = ProjectModel.visibility == "normal"
    else:
        normal_cond = and_(ProjectModel.visibility == "normal", member_cond)

    return or_(
        ProjectModel.visibility == "shared",
        and_(ProjectModel.visibility == "private", member_cond),
        normal_cond,
    )


def weekly_review_visibility_condition(
    db: Session, user, ReviewModel
) -> ColumnElement[bool] | None:
    """Điều kiện WHERE lọc weekly reviews user được xem. None => tất cả."""
    if user.role == "admin":
        return None

    from sqlalchemy import and_, or_

    owner_cond = ReviewModel.created_by == user.id
    if user.role == "moderator":
        normal_cond = ReviewModel.visibility == "normal"
    else:
        # team_members là JSON array => không lọc SQL portable; xử lý ở
        # can_view cho single object. Ở list, shared + own đã đủ phần lớn case.
        normal_cond = and_(ReviewModel.visibility == "normal", owner_cond)

    return or_(
        ReviewModel.visibility == "shared",
        and_(ReviewModel.visibility == "private", owner_cond),
        normal_cond,
    )


# --- Kiểm tra single object ------------------------------------------------


def _user_in_json_list(value, user_id: int) -> bool:
    return bool(value) and user_id in value


def can_view(db: Session, user, obj, object_type: str) -> bool:
    """Kiểm tra 1 user có xem được 1 object cụ thể không (3 chế độ)."""
    vis = getattr(obj, "visibility", None) or (
        "shared" if getattr(obj, "is_shared", False) else "normal"
    )
    # admin: quyền tối cao, xem tất cả kể cả private.
    if user.role == "admin":
        return True
    # shared: mọi user.
    if vis == "shared":
        return True

    is_owner = getattr(obj, "created_by", None) == user.id

    if object_type == "task":
        owner_like = (
            is_owner
            or getattr(obj, "assigned_to", None) == user.id
            or obj.id in get_watching_ids(db, user.id, "task")
        )
        if vis == "private":
            return owner_like
        # normal
        if user.role == "moderator":
            return True
        if owner_like:
            return True
        if user.role == "user" and obj.project_id is not None:
            return obj.project_id in get_member_project_ids(db, user.id)
        return False

    if object_type == "project":
        owner_like = is_owner or obj.id in get_member_project_ids(db, user.id)
        if vis == "private":
            return owner_like
        return user.role == "moderator" or owner_like

    if object_type == "meeting":
        owner_like = is_owner or obj.id in get_watching_ids(db, user.id, "meeting")
        if vis == "private":
            return owner_like
        return user.role == "moderator" or owner_like

    if object_type == "weekly_review":
        in_team = _user_in_json_list(getattr(obj, "team_members", None), user.id)
        owner_like = is_owner or in_team
        if vis == "private":
            return owner_like
        if user.role == "moderator":
            return True
        if user.role == "viewer":
            return in_team
        return owner_like

    return False


def can_set_visibility(user, obj, target_visibility: str) -> bool:
    """Ai được đổi chế độ visibility của object sang `target_visibility`.

    - admin: đặt bất kỳ chế độ nào (quyền tối cao).
    - owner (người tạo): đặt bất kỳ chế độ nào trên object CỦA MÌNH, kể cả
      private (owner tự quyết định độ riêng tư của item mình tạo).
    - moderator (không phải owner): CHỈ đặt được normal/shared, KHÔNG private.
    - còn lại: không được đổi.
    """
    if user.role == "admin":
        return True
    is_owner = getattr(obj, "created_by", None) == user.id
    if is_owner:
        return True
    if target_visibility == "private":
        return False  # chỉ owner/admin mới đặt private
    return user.role == "moderator"


def can_delete(user, obj) -> bool:
    """Ai được xoá 1 object: admin (tất cả) hoặc chính người tạo (own).

    Moderator KHÔNG còn quyền xoá mọi object — chỉ xoá được cái mình tạo.
    """
    if user.role == "admin":
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

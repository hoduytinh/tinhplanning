"""Business logic for the Tasks module."""
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.tasks.models import Task
from modules.tasks.schemas import TaskCreate, TaskUpdate

# Priority ordering used for sorting (P0 is most important).
_PRIORITY_ORDER = {"P0": 0, "P1": 1, "P2": 2}


class TaskNotFoundError(Exception):
    """Raised when a task with the given id does not exist."""

    def __init__(self, task_id: int) -> None:
        super().__init__(f"Task {task_id} not found")
        self.task_id = task_id


class TaskPermissionError(Exception):
    """Raised when the current user is not allowed to perform the action."""

    def __init__(self, message: str = "You don't have permission for this action") -> None:
        super().__init__(message)


def _tags_to_str(tags: list[str] | None) -> str | None:
    if tags is None:
        return None
    return ",".join(t.strip() for t in tags if t.strip())


def list_tasks(
    db: Session,
    *,
    priority: str | None = None,
    status: str | None = None,
    type: str | None = None,
    project_id: int | None = None,
    due_before: datetime | None = None,
    due_after: datetime | None = None,
    sort_by: str = "created_at",
    order: str = "desc",
    current_user=None,
    ownership: str = "all",
) -> list[Task]:
    stmt = select(Task)

    if priority:
        stmt = stmt.where(Task.priority == priority)
    if status:
        stmt = stmt.where(Task.status == status)
    if type:
        stmt = stmt.where(Task.type == type)
    if project_id is not None:
        stmt = stmt.where(Task.project_id == project_id)
    if due_before is not None:
        stmt = stmt.where(Task.due_date <= due_before)
    if due_after is not None:
        stmt = stmt.where(Task.due_date >= due_after)

    # --- Ownership & Visibility layer ---
    if current_user is not None:
        from core.visibility import get_watching_ids, task_visibility_condition

        # Bước 1: lọc theo quyền xem (role + membership/owner/assigned/share).
        vis = task_visibility_condition(db, current_user, Task)
        if vis is not None:
            stmt = stmt.where(vis)

        # Bước 2: lọc theo tab ownership người dùng chọn.
        if ownership == "my":
            stmt = stmt.where(Task.created_by == current_user.id)
        elif ownership == "assigned":
            stmt = stmt.where(Task.assigned_to == current_user.id)
        elif ownership == "watching":
            watching = get_watching_ids(db, current_user.id, "task")
            stmt = stmt.where(Task.id.in_(watching) if watching else False)
        elif ownership == "shared":
            stmt = stmt.where(Task.is_shared.is_(True))

    tasks = list(db.execute(stmt).scalars().all())

    reverse = order == "desc"
    if sort_by == "priority":
        tasks.sort(key=lambda t: _PRIORITY_ORDER.get(t.priority, 99), reverse=reverse)
    elif sort_by == "due_date":
        # Tasks without a due date always sort last.
        tasks.sort(
            key=lambda t: (t.due_date is None, t.due_date or datetime.max),
            reverse=reverse,
        )
    else:  # created_at (default)
        tasks.sort(key=lambda t: t.created_at, reverse=reverse)

    return tasks


def get_task(db: Session, task_id: int) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise TaskNotFoundError(task_id)
    return task


def create_task(db: Session, payload: TaskCreate, current_user_id: int | None = None) -> Task:
    # visibility là nguồn chân lý; is_shared đồng bộ = (visibility == "shared").
    vis = payload.visibility.value if payload.visibility else "normal"
    if vis == "normal" and payload.is_shared:
        vis = "shared"  # tương thích client cũ chỉ gửi is_shared
    task = Task(
        title=payload.title,
        short_description=payload.short_description,
        description=payload.description,
        priority=payload.priority.value,
        status=payload.status.value,
        type=payload.type.value,
        due_date=payload.due_date,
        project_id=payload.project_id,
        subblock_id=payload.subblock_id,
        tags=_tags_to_str(payload.tags),
        created_by=current_user_id,
        assigned_to=payload.assigned_to,
        visibility=vis,
        is_shared=(vis == "shared"),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Import lùi để tránh circular import (activity_service cần get_task ở đây).
    from modules.tasks.activity_service import log_activity

    log_activity(db, task.id, "task_created", None, task.title)
    return task


def update_task(db: Session, task_id: int, payload: TaskUpdate, current_user=None) -> Task:
    from modules.tasks.activity_service import log_activity

    task = get_task(db, task_id)
    data = payload.model_dump(exclude_unset=True)

    # --- Ownership: đổi visibility cần quyền tương ứng ---
    # (admin bất kỳ; owner bất kỳ trên item của mình; mod chỉ normal/shared).
    if current_user is not None:
        from core.visibility import can_set_visibility

        target_vis = None
        if data.get("visibility") is not None:
            v = data["visibility"]
            target_vis = v.value if hasattr(v, "value") else v
        elif "is_shared" in data and data["is_shared"] is not None:
            target_vis = "shared" if data["is_shared"] else "normal"
        if target_vis is not None and target_vis != task.visibility:
            if not can_set_visibility(current_user, task, target_vis):
                raise TaskPermissionError(
                    "You don't have permission to set this visibility mode"
                )

    # Chụp lại giá trị cũ của các field cần auto-log TRƯỚC khi ghi đè.
    before = {
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date,
        "tags": task.tags,
    }

    for field, value in data.items():
        if field == "tags":
            task.tags = _tags_to_str(value)
        elif field in {"priority", "status", "type", "visibility"} and value is not None:
            setattr(task, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(task, field, value)

    # Đồng bộ is_shared theo visibility (visibility là nguồn chân lý). Nếu
    # client chỉ gửi is_shared (đường cũ), suy ngược ra visibility.
    if "visibility" in data and data["visibility"] is not None:
        task.is_shared = task.visibility == "shared"
    elif "is_shared" in data and data["is_shared"] is not None:
        task.visibility = "shared" if data["is_shared"] else "normal"
        task.is_shared = bool(data["is_shared"])

    db.commit()
    db.refresh(task)

    # --- auto-log các thay đổi quan trọng ---
    if "status" in data and task.status != before["status"]:
        log_activity(db, task.id, "status_changed", before["status"], task.status)
    if "priority" in data and task.priority != before["priority"]:
        log_activity(db, task.id, "priority_changed", before["priority"], task.priority)
    if "due_date" in data and task.due_date != before["due_date"]:
        log_activity(
            db,
            task.id,
            "due_date_changed",
            before["due_date"].isoformat() if before["due_date"] else None,
            task.due_date.isoformat() if task.due_date else None,
        )
    if "tags" in data and task.tags != before["tags"]:
        log_activity(db, task.id, "tags_changed", before["tags"], task.tags)

    return task


# ---------------------------------------------------------------------------
# Prefix & Auto-tagging (cross-module)
# ---------------------------------------------------------------------------
def _project_tag_from_prefix(prefix: str) -> str:
    """#tag từ prefix project: lowercase, bỏ khoảng trắng."""
    return "#" + (prefix or "").lower().replace(" ", "")


def compute_task_prefix(db: Session, task: Task) -> dict:
    """Tính prefix_display / project_tag / sub_tag cho 1 task.

    - Không thuộc project → [Non-Proj] / #non-proj / None.
    - Có project → prefix từ project.prefix (fallback name); nếu có sub-block
      thì nối thêm đường dẫn slug.
    """
    if task.project_id is None:
        return {
            "prefix_display": "[Non-Proj]",
            "project_tag": "#non-proj",
            "sub_tag": None,
            "prefix_color": "#94a3b8",
        }

    # Import lùi để tránh circular import giữa modules.tasks và modules.projects.
    from modules.projects.models import Project
    from modules.projects.subblock_service import (
        generate_slug,
        get_subblock_path,
    )

    project = db.get(Project, task.project_id)
    if project is None:
        # project_id trỏ tới project đã xoá → coi như non-proj.
        return {
            "prefix_display": "[Non-Proj]",
            "project_tag": "#non-proj",
            "sub_tag": None,
            "prefix_color": "#94a3b8",
        }

    prefix = (project.prefix or project.name or "proj").strip()
    project_tag = _project_tag_from_prefix(prefix)
    display_parts = [prefix]
    sub_tag = None

    if task.subblock_id is not None:
        path = get_subblock_path(db, task.subblock_id)
        if path:
            display_parts.extend(node.name for node in path)
            slugs = [node.slug or generate_slug(node.name) for node in path]
            sub_tag = project_tag + "-" + "-".join(slugs)

    prefix_display = "".join(f"[{p}]" for p in display_parts)
    return {
        "prefix_display": prefix_display,
        "project_tag": project_tag,
        "sub_tag": sub_tag,
        "prefix_color": project.prefix_color or "#3b82f6",
    }


def matches_tag(info: dict, tag: str) -> bool:
    """Task (đã có info prefix) có khớp với auto-tag đang lọc không?

    - #non-proj → chỉ task không project.
    - #tigera0 → mọi task của project (project_tag bằng hoặc sub_tag bắt đầu bằng).
    - #tigera0-ihwa → task có sub_tag bắt đầu bằng chuỗi đó.
    """
    tag = (tag or "").strip().lower()
    if not tag:
        return True
    project_tag = (info.get("project_tag") or "").lower()
    sub_tag = (info.get("sub_tag") or "").lower()
    if project_tag == tag:
        return True
    if sub_tag and (sub_tag == tag or sub_tag.startswith(tag + "-") or sub_tag.startswith(tag)):
        return True
    return False


def delete_task(db: Session, task_id: int, current_user=None) -> None:
    task = get_task(db, task_id)
    # Ownership: chỉ admin (tất cả) hoặc người tạo (own) được xoá. Mod KHÔNG
    # còn quyền xoá task của người khác.
    if current_user is not None:
        from core.visibility import can_delete

        if not can_delete(current_user, task):
            raise TaskPermissionError("You don't have permission to delete this task")
    db.delete(task)
    db.commit()

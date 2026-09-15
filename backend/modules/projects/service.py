"""Business logic for the Projects module — bao gồm logic tính Health.

Health được tính dựa trên các Task thuộc project (Task.project_id). Module này
chỉ ĐỌC bảng tasks, không sửa gì của Module Tasks.
"""
from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import Project
from modules.projects.schemas import (
    ProjectCreate,
    ProjectStats,
    ProjectTimeline,
    ProjectUpdate,
)
from modules.tasks.models import Task


class ProjectNotFoundError(Exception):
    def __init__(self, project_id: int) -> None:
        super().__init__(f"Project {project_id} not found")
        self.project_id = project_id


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------
def list_projects(
    db: Session,
    *,
    status: str | None = None,
    priority: str | None = None,
    health: str | None = None,
) -> list[Project]:
    stmt = select(Project).where(Project.is_deleted.is_(False))
    if status:
        stmt = stmt.where(Project.status == status)
    if priority:
        stmt = stmt.where(Project.priority == priority)
    if health:
        stmt = stmt.where(Project.health == health)
    stmt = stmt.order_by(Project.created_at.desc())
    return list(db.execute(stmt).scalars().all())


def get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or project.is_deleted:
        raise ProjectNotFoundError(project_id)
    return project


def create_project(db: Session, payload: ProjectCreate) -> Project:
    project = Project(
        name=payload.name,
        prefix=(payload.prefix or None),
        prefix_color=payload.prefix_color or "#3b82f6",
        description=payload.description,
        status=payload.status.value,
        priority=payload.priority.value,
        start_date=payload.start_date,
        end_date=payload.end_date,
        tags=payload.tags or [],
        enabled_modules=payload.enabled_modules or [],
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # Tính health ngay sau khi tạo (thường là no_data vì chưa có task).
    _apply_health(db, project)

    from modules.projects.activity_service import log_activity

    log_activity(db, project.id, "project_created", None, project.name)
    return project


def update_project(db: Session, project_id: int, payload: ProjectUpdate) -> Project:
    from modules.projects.activity_service import log_activity

    project = get_project(db, project_id)
    data = payload.model_dump(exclude_unset=True)

    before = {
        "status": project.status,
        "priority": project.priority,
        "start_date": project.start_date,
        "end_date": project.end_date,
    }

    for field, value in data.items():
        if field in {"status", "priority"} and value is not None:
            setattr(project, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(project, field, value)

    db.commit()
    db.refresh(project)

    # Timeline / status đổi → tính lại health.
    _apply_health(db, project)

    if "status" in data and project.status != before["status"]:
        log_activity(db, project.id, "status_changed", before["status"], project.status)
    if "priority" in data and project.priority != before["priority"]:
        log_activity(
            db, project.id, "priority_changed", before["priority"], project.priority
        )
    if "start_date" in data and project.start_date != before["start_date"]:
        log_activity(
            db,
            project.id,
            "start_date_changed",
            str(before["start_date"]) if before["start_date"] else None,
            str(project.start_date) if project.start_date else None,
        )
    if "end_date" in data and project.end_date != before["end_date"]:
        log_activity(
            db,
            project.id,
            "end_date_changed",
            str(before["end_date"]) if before["end_date"] else None,
            str(project.end_date) if project.end_date else None,
        )

    return project


def delete_project(db: Session, project_id: int) -> None:
    """Soft delete — chỉ set cờ is_deleted, không xóa hẳn."""
    project = get_project(db, project_id)
    project.is_deleted = True
    db.commit()


# ---------------------------------------------------------------------------
# Tasks thuộc project
# ---------------------------------------------------------------------------
def list_project_tasks(db: Session, project_id: int) -> list[Task]:
    get_project(db, project_id)
    stmt = (
        select(Task)
        .where(Task.project_id == project_id)
        .order_by(Task.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


# ---------------------------------------------------------------------------
# Stats + Timeline + Health
# ---------------------------------------------------------------------------
_DONE_STATUSES = {"done"}
_CLOSED_STATUSES = {"done", "cancelled"}


def compute_stats(db: Session, project_id: int) -> ProjectStats:
    tasks = list_project_tasks(db, project_id)
    now = datetime.utcnow()

    total = len(tasks)
    done = sum(1 for t in tasks if t.status in _DONE_STATUSES)
    blocked = sum(1 for t in tasks if t.status == "blocked")
    overdue = sum(
        1
        for t in tasks
        if t.due_date is not None
        and t.due_date < now
        and t.status not in _CLOSED_STATUSES
    )
    return ProjectStats(total=total, done=done, blocked=blocked, overdue=overdue)


def _time_elapsed_pct(start: date | None, end: date | None) -> int | None:
    if start is None or end is None:
        return None
    total_days = (end - start).days
    if total_days <= 0:
        # Timeline 1 ngày hoặc lệch → coi như đã qua 100% nếu hôm nay >= end.
        return 100 if date.today() >= end else 0
    elapsed = (date.today() - start).days
    pct = round(elapsed / total_days * 100)
    return max(0, min(100, pct))


def compute_timeline(project: Project, stats: ProjectStats) -> ProjectTimeline:
    time_pct = _time_elapsed_pct(project.start_date, project.end_date)
    progress_pct = round(stats.done / stats.total * 100) if stats.total else 0
    return ProjectTimeline(
        time_elapsed_pct=time_pct if time_pct is not None else 0,
        progress_pct=progress_pct,
    )


def compute_health(project: Project, stats: ProjectStats) -> tuple[str, str]:
    """Trả về (health, reason).

    ⚪ No Data:   chưa có task hoặc chưa set timeline
    🔴 Off Track: overdue > 0  HOẶC  % done thấp hơn % thời gian > 20%
    🟡 At Risk:   có blocked   HOẶC  % done thấp hơn % thời gian 10-20%
    🟢 On Track:  % done >= % thời gian  VÀ  blocked = 0
    """
    time_pct = _time_elapsed_pct(project.start_date, project.end_date)

    if stats.total == 0 or time_pct is None:
        return "no_data", "Chưa có task hoặc chưa đặt timeline."

    progress_pct = round(stats.done / stats.total * 100)
    gap = time_pct - progress_pct  # dương = tiến độ chậm hơn thời gian

    if stats.overdue > 0 or gap > 20:
        if stats.overdue > 0:
            return "off_track", f"Có {stats.overdue} task trễ hạn."
        return "off_track", f"Tiến độ chậm hơn thời gian {gap}%."

    if stats.blocked > 0 or gap >= 10:
        if stats.blocked > 0:
            return "at_risk", f"Có {stats.blocked} task đang bị block."
        return "at_risk", f"Tiến độ chậm hơn thời gian {gap}%."

    if progress_pct >= time_pct and stats.blocked == 0:
        return "on_track", "Tiến độ bám sát hoặc vượt kế hoạch."

    # Còn lại (gap 0-10%, không blocked/overdue) → vẫn coi on_track.
    return "on_track", "Tiến độ ổn định."


def _apply_health(db: Session, project: Project) -> str:
    """Tính lại health và lưu vào cột projects.health."""
    stats = compute_stats(db, project.id)
    health, _reason = compute_health(project, stats)
    if project.health != health:
        project.health = health
        db.commit()
        db.refresh(project)
    return health

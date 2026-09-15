"""Business logic for project bugs (bug tracker)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectBug
from modules.projects.schemas import BugCreate, BugStats, BugUpdate
from modules.projects.service import get_project

_SEVERITIES = ["critical", "high", "medium", "low"]
_STATUSES = ["open", "in_progress", "closed", "cancelled", "waived"]


class BugNotFoundError(Exception):
    def __init__(self, bug_pk: int) -> None:
        super().__init__(f"Bug {bug_pk} not found")
        self.bug_pk = bug_pk


def list_bugs(db: Session, project_id: int) -> list[ProjectBug]:
    get_project(db, project_id)
    stmt = (
        select(ProjectBug)
        .where(ProjectBug.project_id == project_id)
        .order_by(ProjectBug.created_at.asc(), ProjectBug.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_bug(db: Session, project_id: int, payload: BugCreate) -> ProjectBug:
    get_project(db, project_id)
    bug = ProjectBug(
        project_id=project_id,
        **{
            **payload.model_dump(),
            "severity": payload.severity.value,
            "status": payload.status.value,
        },
    )
    db.add(bug)
    db.commit()
    db.refresh(bug)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "bug_added", None, f"{bug.bug_id}: {bug.title}")
    return bug


def _get_bug(db: Session, project_id: int, bug_pk: int) -> ProjectBug:
    bug = db.get(ProjectBug, bug_pk)
    if bug is None or bug.project_id != project_id:
        raise BugNotFoundError(bug_pk)
    return bug


def update_bug(
    db: Session, project_id: int, bug_pk: int, payload: BugUpdate
) -> ProjectBug:
    bug = _get_bug(db, project_id, bug_pk)
    data = payload.model_dump(exclude_unset=True)
    before_status = bug.status
    for field, value in data.items():
        if field in {"severity", "status"} and value is not None:
            setattr(bug, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(bug, field, value)
    db.commit()
    db.refresh(bug)

    if "status" in data and bug.status != before_status:
        from modules.projects.activity_service import log_activity

        log_activity(
            db,
            project_id,
            "bug_status_changed",
            f"{bug.bug_id}: {before_status}",
            bug.status,
        )
    return bug


def delete_bug(db: Session, project_id: int, bug_pk: int) -> None:
    bug = _get_bug(db, project_id, bug_pk)
    db.delete(bug)
    db.commit()


def bug_stats(db: Session, project_id: int) -> BugStats:
    bugs = list_bugs(db, project_id)
    by_severity = {key: 0 for key in _SEVERITIES}
    by_status = {key: 0 for key in _STATUSES}
    for bug in bugs:
        by_severity[bug.severity] = by_severity.get(bug.severity, 0) + 1
        by_status[bug.status] = by_status.get(bug.status, 0) + 1
    return BugStats(by_severity=by_severity, by_status=by_status, total=len(bugs))

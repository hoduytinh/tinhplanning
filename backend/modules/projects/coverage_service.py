"""Business logic for project coverage snapshots."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectCoverageSnapshot
from modules.projects.schemas import CoverageCreate, CoverageUpdate
from modules.projects.service import get_project


class CoverageSnapshotNotFoundError(Exception):
    def __init__(self, snapshot_id: int) -> None:
        super().__init__(f"Coverage snapshot {snapshot_id} not found")
        self.snapshot_id = snapshot_id


def list_snapshots(db: Session, project_id: int) -> list[ProjectCoverageSnapshot]:
    get_project(db, project_id)
    stmt = (
        select(ProjectCoverageSnapshot)
        .where(ProjectCoverageSnapshot.project_id == project_id)
        .order_by(
            ProjectCoverageSnapshot.snapshot_date.asc(),
            ProjectCoverageSnapshot.id.asc(),
        )
    )
    return list(db.execute(stmt).scalars().all())


def latest_snapshot(
    db: Session, project_id: int
) -> ProjectCoverageSnapshot | None:
    get_project(db, project_id)
    stmt = (
        select(ProjectCoverageSnapshot)
        .where(ProjectCoverageSnapshot.project_id == project_id)
        .order_by(
            ProjectCoverageSnapshot.snapshot_date.desc(),
            ProjectCoverageSnapshot.id.desc(),
        )
        .limit(1)
    )
    return db.execute(stmt).scalars().first()


def create_snapshot(
    db: Session, project_id: int, payload: CoverageCreate
) -> ProjectCoverageSnapshot:
    get_project(db, project_id)
    snapshot = ProjectCoverageSnapshot(project_id=project_id, **payload.model_dump())
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "coverage_added", None, snapshot.week_label)
    return snapshot


def _get_snapshot(
    db: Session, project_id: int, snapshot_id: int
) -> ProjectCoverageSnapshot:
    snapshot = db.get(ProjectCoverageSnapshot, snapshot_id)
    if snapshot is None or snapshot.project_id != project_id:
        raise CoverageSnapshotNotFoundError(snapshot_id)
    return snapshot


def update_snapshot(
    db: Session, project_id: int, snapshot_id: int, payload: CoverageUpdate
) -> ProjectCoverageSnapshot:
    snapshot = _get_snapshot(db, project_id, snapshot_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(snapshot, field, value)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def delete_snapshot(db: Session, project_id: int, snapshot_id: int) -> None:
    snapshot = _get_snapshot(db, project_id, snapshot_id)
    db.delete(snapshot)
    db.commit()

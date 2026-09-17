"""Business logic for the Timeline tab (Tab 3).

Quản lý tracks (tree), bars, và milestones (dùng lại project_milestones với
track_id). Cung cấp endpoint aggregation /timeline trả về toàn bộ dữ liệu để
frontend render Gantt bằng SVG.
"""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.projects.models import (
    BarMilestone,
    ProjectMilestone,
    TimelineBar,
    TimelineTrack,
)
from modules.projects.service import get_project
from modules.projects.timeline_schemas import (
    BarCreate,
    BarMilestoneCreate,
    BarMilestoneUpdate,
    BarUpdate,
    TimelineMilestoneCreate,
    TimelineMilestoneUpdate,
    TrackCreate,
    TrackUpdate,
)

# ID ảo cho track hệ thống "MARVELL MILESTONES" (không tồn tại trong DB).
SYSTEM_TRACK_ID = 0


class TrackNotFoundError(Exception):
    def __init__(self, track_id: int) -> None:
        super().__init__(f"Timeline track {track_id} not found")
        self.track_id = track_id


class BarNotFoundError(Exception):
    def __init__(self, bar_id: int) -> None:
        super().__init__(f"Timeline bar {bar_id} not found")
        self.bar_id = bar_id


class TimelineMilestoneNotFoundError(Exception):
    def __init__(self, milestone_id: int) -> None:
        super().__init__(f"Timeline milestone {milestone_id} not found")
        self.milestone_id = milestone_id


class BarMilestoneNotFoundError(Exception):
    def __init__(self, bar_milestone_id: int) -> None:
        super().__init__(f"Bar milestone {bar_milestone_id} not found")
        self.bar_milestone_id = bar_milestone_id


class TimelineValidationError(Exception):
    """Vi phạm ràng buộc nghiệp vụ (vd xóa milestone chuẩn Marvell)."""


class StandardMilestoneError(Exception):
    """Thao tác bị cấm trên milestone chuẩn Marvell (đổi tên / xóa)."""


def _is_standard(m: ProjectMilestone) -> bool:
    return bool(m.is_marvell_standard) or (m.milestone_type or "custom") != "custom"


# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------
def list_tracks(db: Session, project_id: int) -> list[TimelineTrack]:
    get_project(db, project_id)
    stmt = (
        select(TimelineTrack)
        .where(TimelineTrack.project_id == project_id)
        .order_by(TimelineTrack.order.asc(), TimelineTrack.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def get_track(db: Session, project_id: int, track_id: int) -> TimelineTrack:
    track = db.get(TimelineTrack, track_id)
    if track is None or track.project_id != project_id:
        raise TrackNotFoundError(track_id)
    return track


def create_track(
    db: Session, project_id: int, payload: TrackCreate
) -> TimelineTrack:
    get_project(db, project_id)
    if payload.parent_id is not None:
        get_track(db, project_id, payload.parent_id)

    order = payload.order
    if order is None:
        order = (
            db.execute(
                select(func.coalesce(func.max(TimelineTrack.order), -1)).where(
                    TimelineTrack.project_id == project_id
                )
            ).scalar_one()
            + 1
        )

    track = TimelineTrack(
        project_id=project_id,
        parent_id=payload.parent_id,
        name=payload.name,
        color=payload.color,
        order=order,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return track


def update_track(
    db: Session, project_id: int, track_id: int, payload: TrackUpdate
) -> TimelineTrack:
    track = get_track(db, project_id, track_id)
    data = payload.model_dump(exclude_unset=True)
    if "parent_id" in data and data["parent_id"] is not None:
        if data["parent_id"] == track_id:
            raise TimelineValidationError("A track cannot be its own parent.")
        get_track(db, project_id, data["parent_id"])
    for field, value in data.items():
        setattr(track, field, value)
    db.commit()
    db.refresh(track)
    return track


def delete_track(db: Session, project_id: int, track_id: int) -> None:
    track = get_track(db, project_id, track_id)
    # Gỡ milestone khỏi track (không xóa milestone chuẩn Marvell — trả về
    # track hệ thống). Milestone custom trong track thì xóa hẳn.
    milestones = db.execute(
        select(ProjectMilestone).where(ProjectMilestone.track_id == track_id)
    ).scalars().all()
    for m in milestones:
        if _is_standard(m):
            m.track_id = None
        else:
            db.delete(m)
    # Bars trong track (và sub-track) sẽ bị CASCADE xóa theo FK.
    db.delete(track)
    db.commit()


# ---------------------------------------------------------------------------
# Bars
# ---------------------------------------------------------------------------
def list_bars(db: Session, project_id: int) -> list[TimelineBar]:
    get_project(db, project_id)
    stmt = (
        select(TimelineBar)
        .where(TimelineBar.project_id == project_id)
        .order_by(TimelineBar.order.asc(), TimelineBar.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def get_bar(db: Session, project_id: int, bar_id: int) -> TimelineBar:
    bar = db.get(TimelineBar, bar_id)
    if bar is None or bar.project_id != project_id:
        raise BarNotFoundError(bar_id)
    return bar


def create_bar(db: Session, project_id: int, payload: BarCreate) -> TimelineBar:
    get_project(db, project_id)
    get_track(db, project_id, payload.track_id)

    order = payload.order
    if order is None:
        order = (
            db.execute(
                select(func.coalesce(func.max(TimelineBar.order), -1)).where(
                    TimelineBar.track_id == payload.track_id
                )
            ).scalar_one()
            + 1
        )

    bar = TimelineBar(
        project_id=project_id,
        track_id=payload.track_id,
        name=payload.name,
        start_date=payload.start_date,
        end_date=payload.end_date,
        progress=payload.progress,
        color=payload.color,
        status=payload.status.value,
        notes=payload.notes,
        order=order,
    )
    db.add(bar)
    db.commit()
    db.refresh(bar)
    return bar


def update_bar(
    db: Session, project_id: int, bar_id: int, payload: BarUpdate
) -> TimelineBar:
    bar = get_bar(db, project_id, bar_id)
    data = payload.model_dump(exclude_unset=True)
    if "track_id" in data and data["track_id"] is not None:
        get_track(db, project_id, data["track_id"])
    if "status" in data and data["status"] is not None:
        data["status"] = (
            data["status"].value
            if hasattr(data["status"], "value")
            else data["status"]
        )
    for field, value in data.items():
        setattr(bar, field, value)
    db.commit()
    db.refresh(bar)
    return bar


def delete_bar(db: Session, project_id: int, bar_id: int) -> None:
    bar = get_bar(db, project_id, bar_id)
    db.delete(bar)
    db.commit()


# ---------------------------------------------------------------------------
# Milestones (timeline view)
# ---------------------------------------------------------------------------
def _list_milestones(db: Session, project_id: int) -> list[ProjectMilestone]:
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order.asc(), ProjectMilestone.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def get_milestone(
    db: Session, project_id: int, milestone_id: int
) -> ProjectMilestone:
    m = db.get(ProjectMilestone, milestone_id)
    if m is None or m.project_id != project_id:
        raise TimelineMilestoneNotFoundError(milestone_id)
    return m


def create_milestone(
    db: Session, project_id: int, payload: TimelineMilestoneCreate
) -> ProjectMilestone:
    get_project(db, project_id)
    if payload.track_id is not None:
        get_track(db, project_id, payload.track_id)

    order = (
        db.execute(
            select(func.coalesce(func.max(ProjectMilestone.order), -1)).where(
                ProjectMilestone.project_id == project_id
            )
        ).scalar_one()
        + 1
    )
    m = ProjectMilestone(
        project_id=project_id,
        title=payload.title,
        due_date=payload.due_date,
        status=payload.status,
        order=order,
        milestone_type=payload.milestone_type,
        exit_criteria=payload.exit_criteria,
        track_id=payload.track_id,
        is_marvell_standard=False,
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


def update_milestone(
    db: Session, project_id: int, milestone_id: int, payload: TimelineMilestoneUpdate
) -> ProjectMilestone:
    m = get_milestone(db, project_id, milestone_id)
    data = payload.model_dump(exclude_unset=True)
    # Milestone chuẩn Marvell: cho phép sửa date/status/notes/exit_criteria,
    # nhưng KHÔNG cho đổi title (name).
    if _is_standard(m) and "title" in data and data["title"] != m.title:
        raise StandardMilestoneError(
            "Không thể đổi tên milestone chuẩn Marvell."
        )
    if "track_id" in data and data["track_id"] is not None:
        get_track(db, project_id, data["track_id"])
    for field, value in data.items():
        setattr(m, field, value)
    db.commit()
    db.refresh(m)
    return m


def delete_milestone(db: Session, project_id: int, milestone_id: int) -> None:
    m = get_milestone(db, project_id, milestone_id)
    if _is_standard(m):
        raise StandardMilestoneError(
            "Không thể xóa milestone chuẩn Marvell."
        )
    db.delete(m)
    db.commit()


# ---------------------------------------------------------------------------
# Bar milestones (markers bên trong 1 bar)
# ---------------------------------------------------------------------------
def _validate_bar_milestone_date(bar: TimelineBar, d: date | None) -> None:
    if d is None:
        return
    if bar.start_date is not None and d < bar.start_date:
        raise TimelineValidationError("Date must fall within the bar's range.")
    if bar.end_date is not None and d > bar.end_date:
        raise TimelineValidationError("Date must fall within the bar's range.")


def list_bar_milestones(
    db: Session, project_id: int, bar_id: int
) -> list[BarMilestone]:
    get_bar(db, project_id, bar_id)
    stmt = (
        select(BarMilestone)
        .where(BarMilestone.bar_id == bar_id)
        .order_by(BarMilestone.date.asc(), BarMilestone.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def get_bar_milestone(
    db: Session, project_id: int, bar_id: int, bm_id: int
) -> BarMilestone:
    get_bar(db, project_id, bar_id)
    bm = db.get(BarMilestone, bm_id)
    if bm is None or bm.bar_id != bar_id:
        raise BarMilestoneNotFoundError(bm_id)
    return bm


def create_bar_milestone(
    db: Session, project_id: int, bar_id: int, payload: BarMilestoneCreate
) -> BarMilestone:
    bar = get_bar(db, project_id, bar_id)
    _validate_bar_milestone_date(bar, payload.date)
    bm = BarMilestone(
        bar_id=bar_id,
        name=payload.name,
        date=payload.date,
        notes=payload.notes,
        status="not_started",
    )
    db.add(bm)
    db.commit()
    db.refresh(bm)
    return bm


def update_bar_milestone(
    db: Session, project_id: int, bar_id: int, bm_id: int, payload: BarMilestoneUpdate
) -> BarMilestone:
    bar = get_bar(db, project_id, bar_id)
    bm = get_bar_milestone(db, project_id, bar_id, bm_id)
    data = payload.model_dump(exclude_unset=True)
    if "date" in data:
        _validate_bar_milestone_date(bar, data["date"])
    if "status" in data and data["status"] is not None:
        data["status"] = (
            data["status"].value
            if hasattr(data["status"], "value")
            else data["status"]
        )
    for field, value in data.items():
        setattr(bm, field, value)
    db.commit()
    db.refresh(bm)
    return bm


def delete_bar_milestone(
    db: Session, project_id: int, bar_id: int, bm_id: int
) -> None:
    bm = get_bar_milestone(db, project_id, bar_id, bm_id)
    db.delete(bm)
    db.commit()


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------
def _milestone_display_status(m: ProjectMilestone, today: date) -> str:
    if m.status == "done":
        return "done"
    if m.due_date is not None and m.due_date < today:
        return "at_risk"
    return "upcoming"


def _to_timeline_milestone(m: ProjectMilestone, today: date) -> dict:
    return {
        "id": m.id,
        "project_id": m.project_id,
        "track_id": m.track_id,
        "name": m.title,
        "date": m.due_date,
        "status": _milestone_display_status(m, today),
        "raw_status": m.status,
        "milestone_type": m.milestone_type or "custom",
        "is_marvell_standard": _is_standard(m),
        "exit_criteria": m.exit_criteria,
        "vp_checklist_url": m.vp_checklist_url,
    }


def list_timeline_milestones(db: Session, project_id: int) -> list[dict]:
    get_project(db, project_id)
    today = date.today()
    return [_to_timeline_milestone(m, today) for m in _list_milestones(db, project_id)]


def get_timeline(db: Session, project_id: int) -> dict:
    project = get_project(db, project_id)
    today = date.today()

    tracks = list_tracks(db, project_id)
    bars = list_bars(db, project_id)
    milestones = _list_milestones(db, project_id)

    # Track hệ thống ảo cho milestone chuẩn Marvell (track_id null).
    system_track = {
        "id": SYSTEM_TRACK_ID,
        "project_id": project_id,
        "parent_id": None,
        "name": "MARVELL MILESTONES",
        "color": "#64748b",
        "order": -1,
        "is_collapsed": False,
        "is_system": True,
    }
    track_nodes = [system_track]
    for t in tracks:
        track_nodes.append(
            {
                "id": t.id,
                "project_id": t.project_id,
                "parent_id": t.parent_id,
                "name": t.name,
                "color": t.color,
                "order": t.order,
                "is_collapsed": t.is_collapsed,
                "is_system": False,
            }
        )

    # Milestone không có track_id -> gán về track hệ thống (id 0).
    ms_out = []
    for m in milestones:
        d = _to_timeline_milestone(m, today)
        if d["track_id"] is None:
            d["track_id"] = SYSTEM_TRACK_ID
        ms_out.append(d)

    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "start_date": project.start_date,
            "end_date": project.end_date,
        },
        "today": today,
        "tracks": track_nodes,
        "bars": bars,
        "milestones": ms_out,
    }

"""API endpoints for the Timeline tab (Tab 3).

Router riêng, đăng ký trong main.py — không đụng tới projects/router.py.
Tất cả path dưới /api/projects/{project_id}/timeline.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.projects import timeline_service
from modules.projects.service import ProjectNotFoundError
from modules.projects.timeline_service import (
    BarMilestoneNotFoundError,
    BarNotFoundError,
    StandardMilestoneError,
    TimelineMilestoneNotFoundError,
    TimelineValidationError,
    TrackNotFoundError,
)
from modules.projects.timeline_schemas import (
    BarCreate,
    BarMilestoneCreate,
    BarMilestoneRead,
    BarMilestoneUpdate,
    BarRead,
    BarUpdate,
    TimelineData,
    TimelineMilestone,
    TimelineMilestoneCreate,
    TimelineMilestoneUpdate,
    TrackCreate,
    TrackRead,
    TrackUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["timeline"])


def _project_404(exc: ProjectNotFoundError) -> HTTPException:
    return HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Full aggregation
# ---------------------------------------------------------------------------
@router.get("/{project_id}/timeline", response_model=TimelineData)
def get_timeline(project_id: int, db: Session = Depends(get_db)):
    try:
        return timeline_service.get_timeline(db, project_id)
    except ProjectNotFoundError as exc:
        raise _project_404(exc)


# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------
@router.get("/{project_id}/timeline/tracks", response_model=list[TrackRead])
def list_tracks(project_id: int, db: Session = Depends(get_db)):
    try:
        return timeline_service.list_tracks(db, project_id)
    except ProjectNotFoundError as exc:
        raise _project_404(exc)


@router.post(
    "/{project_id}/timeline/tracks",
    response_model=TrackRead,
    status_code=status.HTTP_201_CREATED,
)
def create_track(
    project_id: int, payload: TrackCreate, db: Session = Depends(get_db)
):
    try:
        return timeline_service.create_track(db, project_id, payload)
    except ProjectNotFoundError as exc:
        raise _project_404(exc)
    except TrackNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch(
    "/{project_id}/timeline/tracks/{track_id}", response_model=TrackRead
)
def update_track(
    project_id: int,
    track_id: int,
    payload: TrackUpdate,
    db: Session = Depends(get_db),
):
    try:
        return timeline_service.update_track(db, project_id, track_id, payload)
    except (ProjectNotFoundError, TrackNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TimelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete(
    "/{project_id}/timeline/tracks/{track_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_track(project_id: int, track_id: int, db: Session = Depends(get_db)):
    try:
        timeline_service.delete_track(db, project_id, track_id)
    except (ProjectNotFoundError, TrackNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Bars
# ---------------------------------------------------------------------------
@router.get("/{project_id}/timeline/bars", response_model=list[BarRead])
def list_bars(project_id: int, db: Session = Depends(get_db)):
    try:
        return timeline_service.list_bars(db, project_id)
    except ProjectNotFoundError as exc:
        raise _project_404(exc)


@router.post(
    "/{project_id}/timeline/bars",
    response_model=BarRead,
    status_code=status.HTTP_201_CREATED,
)
def create_bar(project_id: int, payload: BarCreate, db: Session = Depends(get_db)):
    try:
        return timeline_service.create_bar(db, project_id, payload)
    except (ProjectNotFoundError, TrackNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch("/{project_id}/timeline/bars/{bar_id}", response_model=BarRead)
def update_bar(
    project_id: int,
    bar_id: int,
    payload: BarUpdate,
    db: Session = Depends(get_db),
):
    try:
        return timeline_service.update_bar(db, project_id, bar_id, payload)
    except (ProjectNotFoundError, BarNotFoundError, TrackNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/{project_id}/timeline/bars/{bar_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_bar(project_id: int, bar_id: int, db: Session = Depends(get_db)):
    try:
        timeline_service.delete_bar(db, project_id, bar_id)
    except (ProjectNotFoundError, BarNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Bar milestones (markers bên trong 1 bar)
# ---------------------------------------------------------------------------
@router.get(
    "/{project_id}/timeline/bars/{bar_id}/milestones",
    response_model=list[BarMilestoneRead],
)
def list_bar_milestones(
    project_id: int, bar_id: int, db: Session = Depends(get_db)
):
    try:
        return timeline_service.list_bar_milestones(db, project_id, bar_id)
    except (ProjectNotFoundError, BarNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post(
    "/{project_id}/timeline/bars/{bar_id}/milestones",
    response_model=BarMilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
def create_bar_milestone(
    project_id: int,
    bar_id: int,
    payload: BarMilestoneCreate,
    db: Session = Depends(get_db),
):
    try:
        return timeline_service.create_bar_milestone(
            db, project_id, bar_id, payload
        )
    except (ProjectNotFoundError, BarNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TimelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.patch(
    "/{project_id}/timeline/bars/{bar_id}/milestones/{bm_id}",
    response_model=BarMilestoneRead,
)
def update_bar_milestone(
    project_id: int,
    bar_id: int,
    bm_id: int,
    payload: BarMilestoneUpdate,
    db: Session = Depends(get_db),
):
    try:
        return timeline_service.update_bar_milestone(
            db, project_id, bar_id, bm_id, payload
        )
    except (
        ProjectNotFoundError,
        BarNotFoundError,
        BarMilestoneNotFoundError,
    ) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except TimelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete(
    "/{project_id}/timeline/bars/{bar_id}/milestones/{bm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_bar_milestone(
    project_id: int, bar_id: int, bm_id: int, db: Session = Depends(get_db)
):
    try:
        timeline_service.delete_bar_milestone(db, project_id, bar_id, bm_id)
    except (
        ProjectNotFoundError,
        BarNotFoundError,
        BarMilestoneNotFoundError,
    ) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ---------------------------------------------------------------------------
# Milestones (timeline view)
# ---------------------------------------------------------------------------
@router.get(
    "/{project_id}/timeline/milestones", response_model=list[TimelineMilestone]
)
def list_milestones(project_id: int, db: Session = Depends(get_db)):
    try:
        return timeline_service.list_timeline_milestones(db, project_id)
    except ProjectNotFoundError as exc:
        raise _project_404(exc)


@router.post(
    "/{project_id}/timeline/milestones",
    response_model=TimelineMilestone,
    status_code=status.HTTP_201_CREATED,
)
def create_milestone(
    project_id: int,
    payload: TimelineMilestoneCreate,
    db: Session = Depends(get_db),
):
    try:
        m = timeline_service.create_milestone(db, project_id, payload)
        return timeline_service._to_timeline_milestone(m, timeline_service.date.today())
    except (ProjectNotFoundError, TrackNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.patch(
    "/{project_id}/timeline/milestones/{milestone_id}",
    response_model=TimelineMilestone,
)
def update_milestone(
    project_id: int,
    milestone_id: int,
    payload: TimelineMilestoneUpdate,
    db: Session = Depends(get_db),
):
    try:
        m = timeline_service.update_milestone(
            db, project_id, milestone_id, payload
        )
        return timeline_service._to_timeline_milestone(m, timeline_service.date.today())
    except (
        ProjectNotFoundError,
        TimelineMilestoneNotFoundError,
        TrackNotFoundError,
    ) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except StandardMilestoneError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except TimelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.delete(
    "/{project_id}/timeline/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_milestone(
    project_id: int, milestone_id: int, db: Session = Depends(get_db)
):
    try:
        timeline_service.delete_milestone(db, project_id, milestone_id)
    except (ProjectNotFoundError, TimelineMilestoneNotFoundError) as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except StandardMilestoneError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except TimelineValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

"""Pydantic schemas for the Timeline tab (Tab 3).

Tách riêng khỏi schemas.py chính — chỉ phục vụ các endpoint /timeline.
"""
from datetime import date, datetime
from datetime import date as DateT
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class BarStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    done = "done"
    blocked = "blocked"


class BarMilestoneStatus(str, Enum):
    not_started = "not_started"
    done = "done"
    missed = "missed"


# ---------------------------------------------------------------------------
# Bar milestones (markers bên trong 1 bar)
# ---------------------------------------------------------------------------
class BarMilestoneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    date: DateT | None = None
    notes: str | None = None


class BarMilestoneUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    date: DateT | None = None
    status: BarMilestoneStatus | None = None
    notes: str | None = None


class BarMilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    bar_id: int
    name: str
    date: DateT | None
    status: BarMilestoneStatus
    notes: str | None
    created_at: datetime



# ---------------------------------------------------------------------------
# Tracks
# ---------------------------------------------------------------------------
class TrackCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    parent_id: int | None = None
    color: str = Field(default="#6366f1", max_length=16)
    order: int | None = None


class TrackUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    parent_id: int | None = None
    color: str | None = Field(default=None, max_length=16)
    order: int | None = None
    is_collapsed: bool | None = None


class TrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    parent_id: int | None
    name: str
    color: str
    order: int
    is_collapsed: bool
    created_at: datetime


# ---------------------------------------------------------------------------
# Bars
# ---------------------------------------------------------------------------
class BarCreate(BaseModel):
    track_id: int
    name: str = Field(..., min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    progress: int = Field(default=0, ge=0, le=100)
    color: str | None = Field(default=None, max_length=16)
    status: BarStatus = BarStatus.not_started
    notes: str | None = None
    order: int | None = None


class BarUpdate(BaseModel):
    track_id: int | None = None
    name: str | None = Field(default=None, min_length=1, max_length=255)
    start_date: date | None = None
    end_date: date | None = None
    progress: int | None = Field(default=None, ge=0, le=100)
    color: str | None = Field(default=None, max_length=16)
    status: BarStatus | None = None
    notes: str | None = None
    order: int | None = None


class BarRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    track_id: int
    name: str
    start_date: date | None
    end_date: date | None
    progress: int
    color: str | None
    status: BarStatus
    notes: str | None
    order: int
    created_at: datetime
    updated_at: datetime
    bar_milestones: list[BarMilestoneRead] = []


# ---------------------------------------------------------------------------
# Milestones (dùng lại bảng project_milestones, thêm track_id)
# ---------------------------------------------------------------------------
class TimelineMilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    due_date: date | None = None
    track_id: int | None = None
    milestone_type: str = Field(default="custom", max_length=16)
    exit_criteria: str | None = None
    status: str = Field(default="not_started", max_length=16)


class TimelineMilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    due_date: date | None = None
    track_id: int | None = None
    milestone_type: str | None = Field(default=None, max_length=16)
    exit_criteria: str | None = None
    status: str | None = Field(default=None, max_length=16)


class TimelineMilestone(BaseModel):
    """Milestone đã tính toán trạng thái hiển thị cho timeline."""

    id: int
    project_id: int
    track_id: int | None
    name: str
    date: date | None
    # done / upcoming / at_risk (tính từ due_date vs today)
    status: str
    # trạng thái gốc trong DB: not_started / in_progress / done
    raw_status: str
    milestone_type: str
    is_marvell_standard: bool
    exit_criteria: str | None
    vp_checklist_url: str | None


# ---------------------------------------------------------------------------
# Aggregation cho /timeline
# ---------------------------------------------------------------------------
class TimelineTrackNode(BaseModel):
    id: int
    project_id: int | None = None
    parent_id: int | None = None
    name: str
    color: str
    order: int
    is_collapsed: bool
    is_system: bool = False


class TimelineProject(BaseModel):
    id: int
    name: str
    start_date: date | None
    end_date: date | None


class TimelineData(BaseModel):
    project: TimelineProject
    today: date
    tracks: list[TimelineTrackNode]
    bars: list[BarRead]
    milestones: list[TimelineMilestone]

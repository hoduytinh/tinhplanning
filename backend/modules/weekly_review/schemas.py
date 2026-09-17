"""Pydantic v2 schemas for the Weekly Review module."""
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class ReviewStatus(str, Enum):
    draft = "draft"
    completed = "completed"


class Workload(str, Enum):
    light = "light"
    normal = "normal"
    heavy = "heavy"
    overloaded = "overloaded"


# ----------------------------- Shoutouts ---------------------------------- #
class ShoutoutBase(BaseModel):
    person_name: str = Field(..., min_length=1, max_length=255)
    reason: str = Field(default="", max_length=500)


class ShoutoutCreate(ShoutoutBase):
    pass


class ShoutoutRead(ShoutoutBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    created_at: datetime


# ----------------------------- Snapshot ----------------------------------- #
class SnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    tasks_completed_count: int
    tasks_completed_ids: list | None = None
    tasks_created_count: int
    tasks_blocked_count: int
    tasks_overdue_count: int
    meetings_count: int
    meetings_action_items_total: int
    meetings_action_items_open: int
    bugs_closed_count: int
    bugs_new_count: int
    bugs_open_count: int
    coverage_deltas: list | None = None
    recovery_plan_id: int | None = None
    recovery_actual_items: int | None = None
    recovery_estimate_items: int | None = None
    recovery_outcome_status: str | None = None
    created_at: datetime


# ----------------------------- Weekly Review ------------------------------ #
class TopFocusItem(BaseModel):
    text: str = ""
    priority: str | None = None
    task_id: int | None = None


class WeeklyReviewBase(BaseModel):
    highlights: str | None = None
    challenges: str | None = None
    lessons: str | None = None
    team_notes: str | None = None
    focus_next_week: str | None = None
    risks_next_week: str | None = None
    dependencies_next_week: str | None = None
    top_focus: list[TopFocusItem] | None = None
    mood: int | None = Field(default=None, ge=1, le=5)
    workload: Workload | None = None


class WeeklyReviewCreate(BaseModel):
    week_start: date | None = None  # nếu None -> tuần hiện tại
    # Multi-context: personal / project / team
    name: str = Field(default="Personal", max_length=255)
    context_type: str = Field(default="personal", pattern="^(personal|project|team)$")
    project_ids: list[int] | None = None
    team_members: list[int] | None = None


class WeeklyReviewUpdate(WeeklyReviewBase):
    cft_report_content: str | None = None


class WeeklyReviewListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_label: str
    week_start: date
    week_end: date
    mood: int | None = None
    workload: Workload | None = None
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime
    # Multi-context + ownership
    name: str = "Personal"
    context_type: str = "personal"
    created_by: int | None = None
    is_shared: bool = False


class WeeklyReviewRead(WeeklyReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    week_label: str
    week_start: date
    week_end: date
    cft_report_content: str | None = None
    cft_report_generated_at: datetime | None = None
    status: ReviewStatus
    created_at: datetime
    updated_at: datetime
    # Multi-context + ownership
    name: str = "Personal"
    context_type: str = "personal"
    project_ids: list[int] | None = None
    team_members: list[int] | None = None
    created_by: int | None = None
    is_shared: bool = False
    shoutouts: list[ShoutoutRead] = []
    snapshot: SnapshotRead | None = None


class CftUpdate(BaseModel):
    cft_report_content: str = ""

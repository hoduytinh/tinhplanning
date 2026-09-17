"""Pydantic schemas for the Tasks module."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator


class Priority(str, Enum):
    critical = "critical"
    important = "important"
    normal = "normal"
    backlog = "backlog"


class Status(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    blocked = "blocked"
    in_review = "in_review"
    done = "done"
    cancelled = "cancelled"


class TaskType(str, Enum):
    my_task = "my_task"
    delegated = "delegated"
    waiting_for = "waiting_for"


class Visibility(str, Enum):
    normal = "normal"
    private = "private"
    shared = "shared"


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    # Text đơn giản hiển thị rút gọn trong danh sách (bật/tắt bằng toggle
    # "Preview description" ở toolbar). Khác với description (Content) là rich text.
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    priority: Priority = Priority.normal
    status: Status = Status.not_started
    type: TaskType = TaskType.my_task
    due_date: datetime | None = None
    project_id: int | None = None
    subblock_id: int | None = None
    tags: list[str] = Field(default_factory=list)


class TaskCreate(TaskBase):
    # Ownership layer — cho phép gán assignee & đặt chế độ visibility ngay khi
    # tạo task. `visibility` là nguồn chân lý (normal/private/shared).
    assigned_to: int | None = None
    visibility: Visibility = Visibility.normal
    is_shared: bool = False


class TaskUpdate(BaseModel):
    """All fields optional for partial updates."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    short_description: str | None = Field(default=None, max_length=500)
    description: str | None = None
    priority: Priority | None = None
    status: Status | None = None
    type: TaskType | None = None
    due_date: datetime | None = None
    project_id: int | None = None
    subblock_id: int | None = None
    tags: list[str] | None = None
    # Ownership layer
    assigned_to: int | None = None
    visibility: Visibility | None = None
    is_shared: bool | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    # Ownership layer
    created_by: int | None = None
    assigned_to: int | None = None
    visibility: str = "normal"
    is_shared: bool = False

    # Computed (không lưu DB) — router enrich sau khi validate.
    # prefix_display: chuỗi badge "[TigerA0][IHWA][IOD]" hoặc "[Non-Proj]".
    prefix_display: str | None = None
    project_tag: str | None = None  # vd "#tigera0" / "#non-proj"
    sub_tag: str | None = None  # vd "#tigera0-ihwa-iod"
    prefix_color: str | None = None  # hex màu prefix, theo cài đặt project

    @field_validator("tags", mode="before")
    @classmethod
    def _split_tags(cls, value: object) -> list[str]:
        """Convert stored comma-separated string into a list."""
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [t.strip() for t in value.split(",") if t.strip()]
        return value  # already a list

    @field_serializer("tags")
    def _serialize_tags(self, value: list[str]) -> list[str]:
        return value

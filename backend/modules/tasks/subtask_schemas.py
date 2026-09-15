"""Pydantic schemas for subtasks."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class SubtaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    is_done: bool = False
    order: int = 0
    assignee: str | None = Field(default=None, max_length=120)
    due_date: date | None = None


class SubtaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    order: int | None = None
    assignee: str | None = Field(default=None, max_length=120)
    due_date: date | None = None


class SubtaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    is_done: bool | None = None
    order: int | None = None
    assignee: str | None = Field(default=None, max_length=120)
    due_date: date | None = None


class SubtaskRead(SubtaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    created_at: datetime


class SubtaskReorder(BaseModel):
    # Danh sách id theo đúng thứ tự mong muốn sau khi kéo thả.
    ordered_ids: list[int]

"""Pydantic schemas for Project Members."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProjectMemberCreate(BaseModel):
    user_id: int
    role: str = Field(default="member", pattern="^(lead|member|watcher)$")


class ProjectMemberUpdate(BaseModel):
    role: str = Field(..., pattern="^(lead|member|watcher)$")


class ProjectMemberRead(BaseModel):
    """Member kèm thông tin user để render bảng Members trên UI."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    user_id: int
    role: str
    added_by: int | None = None
    created_at: datetime

    # Enriched user info
    username: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None

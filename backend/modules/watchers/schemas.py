"""Pydantic schemas for the Object Watchers feature."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WatcherCreate(BaseModel):
    object_type: str = Field(..., max_length=32)
    object_id: int
    # None => thêm chính mình (self-watch). Khác current_user => cần quyền quản lý
    # object đó (creator/assignee/admin/moderator) để thêm người khác làm viewer.
    user_id: int | None = None


class WatcherRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    object_type: str
    object_id: int
    user_id: int
    created_at: datetime


class WatcherUser(BaseModel):
    """Watcher kèm thông tin user để hiển thị avatar/tên trên UI."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    username: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None

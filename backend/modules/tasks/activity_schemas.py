"""Pydantic schemas for auto-logged task activity (read-only from the API)."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    action: str
    old_value: str | None
    new_value: str | None
    created_at: datetime

"""Pydantic schemas for task attachments."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AttachmentCreate(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    label: str = Field(..., min_length=1, max_length=255)


class AttachmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    url: str
    label: str
    created_at: datetime

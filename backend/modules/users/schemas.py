"""Pydantic v2 schemas for the Users module."""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Role(str, Enum):
    admin = "admin"
    moderator = "moderator"
    user = "user"
    viewer = "viewer"


class UserStatus(str, Enum):
    pending = "pending"
    active = "active"
    rejected = "rejected"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str | None = None
    full_name: str | None = None
    role: Role
    is_active: bool
    status: UserStatus
    avatar_url: str | None = None
    can_approve: bool = False
    last_login_at: datetime | None = None
    register_reason: str | None = None
    reviewed_by: int | None = None
    reviewed_at: datetime | None = None
    reject_reason: str | None = None
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str | None = None
    email: str | None = None
    role: Role = Role.user


class UserUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    role: Role | None = None
    is_active: bool | None = None
    avatar_url: str | None = None
    can_approve: bool | None = None


class ResetPasswordResult(BaseModel):
    user_id: int
    new_password: str


class ApprovalPermissionUpdate(BaseModel):
    can_approve: bool


class RejectRequest(BaseModel):
    reason: str | None = None

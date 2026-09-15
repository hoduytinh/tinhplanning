"""Pydantic schemas for the Auth module."""
from pydantic import BaseModel, Field

from modules.users.schemas import Role


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str | None = None
    email: str | None = None
    reason: str | None = None


class TokenUser(BaseModel):
    id: int
    username: str
    full_name: str | None = None
    role: Role
    avatar_url: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: TokenUser


class RefreshRequest(BaseModel):
    refresh_token: str


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    avatar_url: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6, max_length=128)


class MessageResponse(BaseModel):
    message: str

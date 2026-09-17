"""User management endpoints (admin / moderator)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.auth import get_current_user, require_can_approve, require_role
from core.database import get_db
from modules.users import service
from modules.users.models import User
from modules.users.schemas import (
    ApprovalPermissionUpdate,
    RejectRequest,
    ResetPasswordResult,
    UserCreate,
    UserDirectoryItem,
    UserResponse,
    UserUpdate,
)
from modules.users.service import (
    EmailTakenError,
    UsernameTakenError,
    UserNotFoundError,
)

router = APIRouter(prefix="/users", tags=["users"])


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


def _bad_request(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


# --- Pending (admin hoặc moderator có can_approve) --- #
@router.get("/pending", response_model=list[UserResponse])
def list_pending(
    db: Session = Depends(get_db),
    _: User = Depends(require_can_approve),
):
    return service.list_pending(db)


@router.post("/{user_id}/approve", response_model=UserResponse)
def approve(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_approve),
):
    try:
        return service.approve_user(db, user_id, current_user)
    except UserNotFoundError as exc:
        raise _not_found(exc)


@router.post("/{user_id}/reject", response_model=UserResponse)
def reject(
    user_id: int,
    payload: RejectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_can_approve),
):
    try:
        return service.reject_user(db, user_id, payload.reason, current_user)
    except UserNotFoundError as exc:
        raise _not_found(exc)


# --- List / read (admin + moderator read-only) --- #
@router.get("/directory", response_model=list[UserDirectoryItem])
def user_directory(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Danh bạ tối giản (id, username, full_name, avatar) cho mọi user đã đăng
    nhập — dùng để chọn assignee/watcher/member. Không lộ email/role/status."""
    return service.list_active_directory(db)


@router.get("", response_model=list[UserResponse])
def list_users(
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "moderator")),
):
    return service.list_users(db, status=status_filter)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin", "moderator")),
):
    try:
        return service.get_user(db, user_id)
    except UserNotFoundError as exc:
        raise _not_found(exc)


# --- Admin only mutations --- #
@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        return service.create_user(db, payload)
    except (UsernameTakenError, EmailTakenError) as exc:
        raise _bad_request(exc)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        return service.update_user(db, user_id, payload)
    except UserNotFoundError as exc:
        raise _not_found(exc)
    except (UsernameTakenError, EmailTakenError) as exc:
        raise _bad_request(exc)


@router.delete("/{user_id}", response_model=UserResponse)
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    if current_user.id == user_id:
        raise _bad_request(Exception("You cannot deactivate your own account"))
    try:
        return service.deactivate_user(db, user_id)
    except UserNotFoundError as exc:
        raise _not_found(exc)


@router.post("/{user_id}/reset-password", response_model=ResetPasswordResult)
def reset_password(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        user, new_password = service.reset_password(db, user_id)
    except UserNotFoundError as exc:
        raise _not_found(exc)
    return ResetPasswordResult(user_id=user.id, new_password=new_password)


@router.patch("/{user_id}/approval-permission", response_model=UserResponse)
def set_approval_permission(
    user_id: int,
    payload: ApprovalPermissionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    try:
        return service.set_approval_permission(db, user_id, payload.can_approve)
    except UserNotFoundError as exc:
        raise _not_found(exc)

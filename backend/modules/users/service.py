"""User CRUD + approval logic."""
from __future__ import annotations

import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from core.security import hash_password
from modules.users.models import User
from modules.users.schemas import UserCreate, UserUpdate


class UserNotFoundError(Exception):
    def __init__(self, user_id: int) -> None:
        super().__init__(f"User {user_id} not found")
        self.user_id = user_id


class UsernameTakenError(Exception):
    pass


class EmailTakenError(Exception):
    pass


def _now() -> datetime:
    return datetime.now(timezone.utc)


def generate_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def get_user(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError(user_id)
    return user


def get_user_by_username(db: Session, username: str) -> User | None:
    return db.execute(
        select(User).where(User.username == username)
    ).scalar_one_or_none()


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()


def list_users(db: Session, status: str | None = None) -> list[User]:
    stmt = select(User)
    if status:
        stmt = stmt.where(User.status == status)
    stmt = stmt.order_by(User.created_at.desc())
    return db.execute(stmt).scalars().all()


def list_pending(db: Session) -> list[User]:
    return list_users(db, status="pending")


def _ensure_unique(db: Session, username: str, email: str | None, exclude_id: int | None = None) -> None:
    existing = get_user_by_username(db, username)
    if existing and existing.id != exclude_id:
        raise UsernameTakenError("Username đã tồn tại")
    if email:
        existing_email = get_user_by_email(db, email)
        if existing_email and existing_email.id != exclude_id:
            raise EmailTakenError("Email đã tồn tại")


def create_user(db: Session, payload: UserCreate) -> User:
    _ensure_unique(db, payload.username, payload.email)
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role.value if hasattr(payload.role, "value") else payload.role,
        is_active=True,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def register_user(
    db: Session,
    username: str,
    password: str,
    full_name: str | None,
    email: str | None,
    reason: str | None,
) -> User:
    _ensure_unique(db, username, email)
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        full_name=full_name,
        register_reason=reason,
        role="user",
        status="pending",
        is_active=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user_id: int, payload: UserUpdate) -> User:
    user = get_user(db, user_id)
    data = payload.model_dump(exclude_unset=True)
    if "email" in data and data["email"]:
        _ensure_unique(db, user.username, data["email"], exclude_id=user.id)
    for field, value in data.items():
        if field == "role" and value is not None:
            setattr(user, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: int) -> User:
    """Soft delete: chỉ vô hiệu hóa, không xóa data."""
    user = get_user(db, user_id)
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user


def reset_password(db: Session, user_id: int, new_password: str | None = None) -> tuple[User, str]:
    user = get_user(db, user_id)
    password = new_password or generate_password()
    user.password_hash = hash_password(password)
    db.commit()
    db.refresh(user)
    return user, password


def change_password(db: Session, user: User, new_password: str) -> User:
    user.password_hash = hash_password(new_password)
    db.commit()
    db.refresh(user)
    return user


def approve_user(db: Session, user_id: int, reviewer: User) -> User:
    user = get_user(db, user_id)
    user.status = "active"
    user.is_active = True
    user.reviewed_by = reviewer.id
    user.reviewed_at = _now()
    user.reject_reason = None
    db.commit()
    db.refresh(user)
    return user


def reject_user(db: Session, user_id: int, reason: str | None, reviewer: User) -> User:
    user = get_user(db, user_id)
    user.status = "rejected"
    user.is_active = False
    user.reviewed_by = reviewer.id
    user.reviewed_at = _now()
    user.reject_reason = reason
    db.commit()
    db.refresh(user)
    return user


def set_approval_permission(db: Session, user_id: int, can_approve: bool) -> User:
    user = get_user(db, user_id)
    user.can_approve = can_approve
    db.commit()
    db.refresh(user)
    return user


def touch_last_login(db: Session, user: User) -> None:
    user.last_login_at = _now()
    db.commit()


def seed_admin(db: Session) -> None:
    """Tạo admin account từ biến môi trường (idempotent).

    Không hardcode credentials. Cần set ADMIN_USERNAME + ADMIN_PASSWORD trong .env.
    Admin được tạo với status=active (không qua approval flow).
    """
    import logging

    from core.config import settings

    logger = logging.getLogger("leadboard.seed")
    admin_username = settings.ADMIN_USERNAME
    admin_password = settings.ADMIN_PASSWORD

    if not admin_password:
        logger.warning("ADMIN_PASSWORD not set — skipping admin seed")
        return

    existing = get_user_by_username(db, admin_username)
    if existing:
        logger.info("Admin user '%s' already exists — skipping", admin_username)
        return

    admin = User(
        username=admin_username,
        password_hash=hash_password(admin_password),
        full_name="Administrator",
        role="admin",
        is_active=True,
        status="active",
    )
    db.add(admin)
    db.commit()
    logger.info("Admin user '%s' created", admin_username)

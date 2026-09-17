"""Business logic for the Object Watchers feature."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.users.models import User
from modules.watchers.models import WATCHABLE_TYPES, ObjectWatcher


class WatcherError(Exception):
    """Raised for invalid watcher operations."""


def _validate_type(object_type: str) -> None:
    if object_type not in WATCHABLE_TYPES:
        raise WatcherError(
            f"Invalid object_type '{object_type}'. "
            f"Must be one of: {', '.join(sorted(WATCHABLE_TYPES))}"
        )


def add_watcher(
    db: Session, *, object_type: str, object_id: int, user_id: int
) -> ObjectWatcher:
    _validate_type(object_type)

    existing = db.execute(
        select(ObjectWatcher).where(
            ObjectWatcher.object_type == object_type,
            ObjectWatcher.object_id == object_id,
            ObjectWatcher.user_id == user_id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing

    watcher = ObjectWatcher(
        object_type=object_type, object_id=object_id, user_id=user_id
    )
    db.add(watcher)
    db.commit()
    db.refresh(watcher)
    return watcher


def get_watcher(db: Session, watcher_id: int) -> ObjectWatcher:
    watcher = db.get(ObjectWatcher, watcher_id)
    if watcher is None:
        raise WatcherError("Watcher not found")
    return watcher


def remove_watcher(db: Session, watcher_id: int) -> None:
    """Xoá 1 watcher theo id. Quyền hạn được kiểm tra ở router trước khi gọi."""
    watcher = get_watcher(db, watcher_id)
    db.delete(watcher)
    db.commit()


def list_watchers(
    db: Session, *, object_type: str, object_id: int
) -> list[dict]:
    """Danh sách watcher của 1 object, kèm thông tin user để render UI."""
    _validate_type(object_type)
    rows = db.execute(
        select(ObjectWatcher, User)
        .join(User, User.id == ObjectWatcher.user_id)
        .where(
            ObjectWatcher.object_type == object_type,
            ObjectWatcher.object_id == object_id,
        )
        .order_by(ObjectWatcher.created_at)
    ).all()
    return [
        {
            "id": w.id,
            "user_id": u.id,
            "username": u.username,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
        }
        for (w, u) in rows
    ]

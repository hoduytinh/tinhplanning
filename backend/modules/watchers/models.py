"""SQLAlchemy model for the Object Watchers feature (Ownership layer).

Bảng `object_watchers` (tạo ở migration 0021_watchers_members) lưu việc user
theo dõi (watch) một object bất kỳ trong hệ thống — task, project, meeting,
weekly_review, bug, document. Dùng cho filter "I'm Watching" và visibility.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

# Các loại object hợp lệ có thể watch.
WATCHABLE_TYPES = {"task", "project", "meeting", "weekly_review", "bug", "document"}


class ObjectWatcher(Base):
    __tablename__ = "object_watchers"
    __table_args__ = (
        UniqueConstraint(
            "object_type", "object_id", "user_id", name="uq_object_watchers_unique"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    object_type: Mapped[str] = mapped_column(String(32), nullable=False)
    object_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

"""SQLAlchemy model for the Tasks module."""
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Field text đơn giản, hiển thị rút gọn trong danh sách task (khi bật
    # toggle "Preview description" ở toolbar) — khác với description (Content)
    # là rich text chi tiết.
    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # critical / important / normal / backlog
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    # not_started / in_progress / blocked / in_review / done / cancelled
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="not_started")
    # my_task / delegated / waiting_for
    type: Mapped[str] = mapped_column(String(16), nullable=False, default="my_task")

    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Trỏ tới project_subblocks.id (nullable). Dùng để tính prefix/auto-tag.
    subblock_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Comma-separated tags stored as text for SQLite simplicity.
    tags: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

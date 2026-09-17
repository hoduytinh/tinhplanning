"""SQLAlchemy model for Project Members (Ownership & Visibility layer).

Bảng `project_members` (tạo ở migration 0021_watchers_members) lưu thành viên
của mỗi project cùng role trong project đó:
- lead    : quản lý project (add/remove member, sửa settings, assign task)
- member  : thành viên bình thường
- watcher : chỉ theo dõi

Chỉ THÊM MỚI — file riêng, không sửa models.py gốc của Projects module.
"""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

PROJECT_MEMBER_ROLES = {"lead", "member", "watcher"}


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_members_unique"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # lead / member / watcher
    role: Mapped[str] = mapped_column(
        String(16), nullable=False, default="member", server_default="member"
    )
    added_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

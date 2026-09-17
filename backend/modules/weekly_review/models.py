"""SQLAlchemy models for the Weekly Review module.

Tables (added via Alembic migration 0018_weekly_reviews):
- weekly_reviews          : 1 bản review cho mỗi tuần
- weekly_review_shoutouts : lời khen/ghi nhận thành viên
- weekly_review_snapshot  : ảnh chụp số liệu tuần (lưu khi complete)

Module này CHỈ ĐỌC dữ liệu từ Tasks / Projects / Meetings, không ghi ngược.
"""
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base
from core.ownership import OwnershipMixin


class WeeklyReview(OwnershipMixin, Base):
    __tablename__ = "weekly_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_label: Mapped[str] = mapped_column(String(16), nullable=False)
    week_start: Mapped[date] = mapped_column(Date, nullable=False)
    week_end: Mapped[date] = mapped_column(Date, nullable=False)

    # Multi-context (Ownership layer) — mỗi review là 1 context độc lập.
    name: Mapped[str] = mapped_column(
        String(255), nullable=False, default="Personal", server_default="Personal"
    )
    # personal / project / team / custom
    context_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="personal", server_default="personal"
    )
    # Danh sách project id làm data source cho auto-summary.
    project_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Danh sách user id được xem review (ngoài admin/moderator + created_by).
    team_members: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Reflection (rich text HTML)
    highlights: Mapped[str | None] = mapped_column(Text, nullable=True)
    challenges: Mapped[str | None] = mapped_column(Text, nullable=True)
    lessons: Mapped[str | None] = mapped_column(Text, nullable=True)
    team_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Plan
    focus_next_week: Mapped[str | None] = mapped_column(Text, nullable=True)
    risks_next_week: Mapped[str | None] = mapped_column(Text, nullable=True)
    dependencies_next_week: Mapped[str | None] = mapped_column(Text, nullable=True)
    top_focus: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Mood tracker
    mood: Mapped[int | None] = mapped_column(Integer, nullable=True)
    workload: Mapped[str | None] = mapped_column(String(16), nullable=True)

    # CFT report
    cft_report_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    cft_report_generated_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )

    status: Mapped[str] = mapped_column(String(16), nullable=False, default="draft")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    shoutouts: Mapped[list["WeeklyReviewShoutout"]] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        order_by="WeeklyReviewShoutout.id",
    )
    snapshot: Mapped["WeeklyReviewSnapshot | None"] = relationship(
        back_populates="review",
        cascade="all, delete-orphan",
        uselist=False,
    )


class WeeklyReviewShoutout(Base):
    __tablename__ = "weekly_review_shoutouts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("weekly_reviews.id", ondelete="CASCADE"), nullable=False
    )
    person_name: Mapped[str] = mapped_column(String(255), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    review: Mapped["WeeklyReview"] = relationship(back_populates="shoutouts")


class WeeklyReviewSnapshot(Base):
    __tablename__ = "weekly_review_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    review_id: Mapped[int] = mapped_column(
        ForeignKey("weekly_reviews.id", ondelete="CASCADE"), nullable=False
    )
    tasks_completed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tasks_completed_ids: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tasks_created_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tasks_blocked_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    tasks_overdue_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meetings_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    meetings_action_items_total: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    meetings_action_items_open: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    bugs_closed_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bugs_new_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    bugs_open_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    coverage_deltas: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recovery_plan_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recovery_actual_items: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recovery_estimate_items: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recovery_outcome_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

    review: Mapped["WeeklyReview"] = relationship(back_populates="snapshot")

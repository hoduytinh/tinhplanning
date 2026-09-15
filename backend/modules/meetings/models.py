"""SQLAlchemy models for the Meetings module.

Tables (all added via Alembic migration 0016_meetings):
- meeting_templates       : reusable meeting blueprints (system + custom)
- meetings                : an actual meeting instance
- meeting_attendees       : who attends a meeting
- meeting_agenda_items    : ordered agenda list
- meeting_sections        : widgets / notes rendered in a meeting
- meeting_action_items    : follow-up items (can spawn tasks, carry over)
- meeting_close_checklist : checklist shown when closing a meeting
"""
from datetime import date, datetime, time

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class MeetingTemplate(Base):
    __tablename__ = "meeting_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False, default="custom")
    icon: Mapped[str] = mapped_column(String(16), nullable=False, default="📅")
    color: Mapped[str] = mapped_column(String(16), nullable=False, default="#6366f1")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    template_id: Mapped[int | None] = mapped_column(
        ForeignKey("meeting_templates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subblock_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_subblocks.id", ondelete="SET NULL"), nullable=True
    )
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    recurring: Mapped[str] = mapped_column(String(16), nullable=False, default="none")
    recurring_interval_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    parent_meeting_id: Mapped[int | None] = mapped_column(
        ForeignKey("meetings.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="upcoming")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    runtime_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    attendees: Mapped[list["MeetingAttendee"]] = relationship(
        "MeetingAttendee",
        cascade="all, delete-orphan",
        order_by="MeetingAttendee.id",
    )
    agenda_items: Mapped[list["MeetingAgendaItem"]] = relationship(
        "MeetingAgendaItem",
        cascade="all, delete-orphan",
        order_by="MeetingAgendaItem.order",
    )
    sections: Mapped[list["MeetingSection"]] = relationship(
        "MeetingSection",
        cascade="all, delete-orphan",
        order_by="MeetingSection.order",
    )
    action_items: Mapped[list["MeetingActionItem"]] = relationship(
        "MeetingActionItem",
        cascade="all, delete-orphan",
        order_by="MeetingActionItem.id",
        foreign_keys="MeetingActionItem.meeting_id",
    )
    close_checklist: Mapped[list["MeetingCloseChecklistItem"]] = relationship(
        "MeetingCloseChecklistItem",
        cascade="all, delete-orphan",
        order_by="MeetingCloseChecklistItem.order",
    )


class MeetingAttendee(Base):
    __tablename__ = "meeting_attendees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_host: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_external: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class MeetingAgendaItem(Base):
    __tablename__ = "meeting_agenda_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class MeetingSection(Base):
    __tablename__ = "meeting_sections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    color: Mapped[str] = mapped_column(String(16), nullable=False, default="#f8fafc")
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class MeetingActionItem(Base):
    __tablename__ = "meeting_action_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True
    )
    content: Mapped[str] = mapped_column(String(500), nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(255), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    priority: Mapped[str | None] = mapped_column(String(16), nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    carried_over_from: Mapped[int | None] = mapped_column(
        ForeignKey("meeting_action_items.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class MeetingCloseChecklistItem(Base):
    __tablename__ = "meeting_close_checklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    item: Mapped[str] = mapped_column(String(500), nullable=False)
    is_checked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

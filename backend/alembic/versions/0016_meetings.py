"""create meetings module tables

Revision ID: 0016_meetings
Revises: 0015_bar_milestones
Create Date: 2026-09-15
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0016_meetings"
down_revision: str | None = "0015_bar_milestones"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "meeting_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False, server_default="custom"),
        sa.Column("icon", sa.String(length=16), nullable=False, server_default="📅"),
        sa.Column("color", sa.String(length=16), nullable=False, server_default="#6366f1"),
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "meetings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column(
            "template_id",
            sa.Integer(),
            sa.ForeignKey("meeting_templates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "subblock_id",
            sa.Integer(),
            sa.ForeignKey("project_subblocks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("recurring", sa.String(length=16), nullable=False, server_default="none"),
        sa.Column("recurring_interval_days", sa.Integer(), nullable=True),
        sa.Column(
            "parent_meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="upcoming"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("runtime_config", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meetings_template_id", "meetings", ["template_id"])
    op.create_index("ix_meetings_project_id", "meetings", ["project_id"])
    op.create_index("ix_meetings_status", "meetings", ["status"])
    op.create_index("ix_meetings_date", "meetings", ["date"])

    op.create_table(
        "meeting_attendees",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=128), nullable=True),
        sa.Column("is_host", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_external", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meeting_attendees_meeting_id", "meeting_attendees", ["meeting_id"])

    op.create_table(
        "meeting_agenda_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_meeting_agenda_items_meeting_id", "meeting_agenda_items", ["meeting_id"]
    )

    op.create_table(
        "meeting_sections",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("section_type", sa.String(length=32), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_meeting_sections_meeting_id", "meeting_sections", ["meeting_id"])

    op.create_table(
        "meeting_action_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("content", sa.String(length=500), nullable=False),
        sa.Column("assignee", sa.String(length=255), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("priority", sa.String(length=16), nullable=True),
        sa.Column("category", sa.String(length=64), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="open"),
        sa.Column(
            "carried_over_from",
            sa.Integer(),
            sa.ForeignKey("meeting_action_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_meeting_action_items_meeting_id", "meeting_action_items", ["meeting_id"]
    )

    op.create_table(
        "meeting_close_checklist",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "meeting_id",
            sa.Integer(),
            sa.ForeignKey("meetings.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("item", sa.String(length=500), nullable=False),
        sa.Column("is_checked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index(
        "ix_meeting_close_checklist_meeting_id", "meeting_close_checklist", ["meeting_id"]
    )


def downgrade() -> None:
    op.drop_index(
        "ix_meeting_close_checklist_meeting_id", table_name="meeting_close_checklist"
    )
    op.drop_table("meeting_close_checklist")
    op.drop_index(
        "ix_meeting_action_items_meeting_id", table_name="meeting_action_items"
    )
    op.drop_table("meeting_action_items")
    op.drop_index("ix_meeting_sections_meeting_id", table_name="meeting_sections")
    op.drop_table("meeting_sections")
    op.drop_index(
        "ix_meeting_agenda_items_meeting_id", table_name="meeting_agenda_items"
    )
    op.drop_table("meeting_agenda_items")
    op.drop_index(
        "ix_meeting_attendees_meeting_id", table_name="meeting_attendees"
    )
    op.drop_table("meeting_attendees")
    op.drop_index("ix_meetings_date", table_name="meetings")
    op.drop_index("ix_meetings_status", table_name="meetings")
    op.drop_index("ix_meetings_project_id", table_name="meetings")
    op.drop_index("ix_meetings_template_id", table_name="meetings")
    op.drop_table("meetings")
    op.drop_table("meeting_templates")

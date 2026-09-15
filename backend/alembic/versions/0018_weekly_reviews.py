"""create weekly review module tables

Revision ID: 0018_weekly_reviews
Revises: 0017_meeting_section_color
Create Date: 2026-09-15

Tạo 3 bảng cho module Weekly Review:
- weekly_reviews           : 1 bản review cho mỗi tuần (reflection + plan + CFT)
- weekly_review_shoutouts  : lời khen/ghi nhận thành viên trong tuần
- weekly_review_snapshot   : ảnh chụp số liệu tuần (lưu lại lúc complete)
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0018_weekly_reviews"
down_revision: str | None = "0017_meeting_section_color"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "weekly_reviews",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("week_label", sa.String(length=16), nullable=False),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("week_end", sa.Date(), nullable=False),
        # Reflection (nhập tay, rich text HTML)
        sa.Column("highlights", sa.Text(), nullable=True),
        sa.Column("challenges", sa.Text(), nullable=True),
        sa.Column("lessons", sa.Text(), nullable=True),
        sa.Column("team_notes", sa.Text(), nullable=True),
        # Plan (nhập tay)
        sa.Column("focus_next_week", sa.Text(), nullable=True),
        sa.Column("risks_next_week", sa.Text(), nullable=True),
        sa.Column("dependencies_next_week", sa.Text(), nullable=True),
        # Top focus có cấu trúc: [{text, priority, task_id}]
        sa.Column("top_focus", sa.JSON(), nullable=True),
        # Mood tracker
        sa.Column("mood", sa.Integer(), nullable=True),
        sa.Column("workload", sa.String(length=16), nullable=True),
        # CFT report
        sa.Column("cft_report_content", sa.Text(), nullable=True),
        sa.Column("cft_report_generated_at", sa.DateTime(), nullable=True),
        # Status
        sa.Column("status", sa.String(length=16), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_weekly_reviews_week_start", "weekly_reviews", ["week_start"])
    op.create_index("ix_weekly_reviews_status", "weekly_reviews", ["status"])

    op.create_table(
        "weekly_review_shoutouts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "review_id",
            sa.Integer(),
            sa.ForeignKey("weekly_reviews.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("person_name", sa.String(length=255), nullable=False),
        sa.Column("reason", sa.String(length=500), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_weekly_review_shoutouts_review_id", "weekly_review_shoutouts", ["review_id"]
    )

    op.create_table(
        "weekly_review_snapshot",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "review_id",
            sa.Integer(),
            sa.ForeignKey("weekly_reviews.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("tasks_completed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_completed_ids", sa.JSON(), nullable=True),
        sa.Column("tasks_created_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_blocked_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tasks_overdue_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meetings_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "meetings_action_items_total", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column(
            "meetings_action_items_open", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("bugs_closed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bugs_new_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("bugs_open_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("coverage_deltas", sa.JSON(), nullable=True),
        sa.Column("recovery_plan_id", sa.Integer(), nullable=True),
        sa.Column("recovery_actual_items", sa.Integer(), nullable=True),
        sa.Column("recovery_estimate_items", sa.Integer(), nullable=True),
        sa.Column("recovery_outcome_status", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_weekly_review_snapshot_review_id", "weekly_review_snapshot", ["review_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_weekly_review_snapshot_review_id", table_name="weekly_review_snapshot")
    op.drop_table("weekly_review_snapshot")
    op.drop_index(
        "ix_weekly_review_shoutouts_review_id", table_name="weekly_review_shoutouts"
    )
    op.drop_table("weekly_review_shoutouts")
    op.drop_index("ix_weekly_reviews_status", table_name="weekly_reviews")
    op.drop_index("ix_weekly_reviews_week_start", table_name="weekly_reviews")
    op.drop_table("weekly_reviews")

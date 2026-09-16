"""create timeline_tracks + timeline_bars; extend project_milestones for Timeline

Revision ID: 0014_timeline
Revises: 0013_recovery_plan_full
Create Date: 2026-09-15

Tab 3 (Timeline) — Gantt nâng cấp render bằng inline SVG:
- Bảng mới `timeline_tracks`: track/sub-track (tree không giới hạn depth).
- Bảng mới `timeline_bars`: thanh tiến độ trong 1 track.
- Nâng cấp `project_milestones`: thêm track_id (milestone thuộc track nào) và
  is_marvell_standard (milestone chuẩn Marvell không xóa được).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0014_timeline"
down_revision: str | None = "0013_recovery_plan_full"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "timeline_tracks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "parent_id",
            sa.Integer(),
            sa.ForeignKey("timeline_tracks.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column(
            "color", sa.String(length=16), nullable=False, server_default="#6366f1"
        ),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "is_collapsed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_timeline_tracks_project_id", "timeline_tracks", ["project_id"]
    )
    op.create_index(
        "ix_timeline_tracks_parent_id", "timeline_tracks", ["parent_id"]
    )

    op.create_table(
        "timeline_bars",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "track_id",
            sa.Integer(),
            sa.ForeignKey("timeline_tracks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(length=16), nullable=True),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_timeline_bars_track_id", "timeline_bars", ["track_id"]
    )
    op.create_index(
        "ix_timeline_bars_project_id", "timeline_bars", ["project_id"]
    )

    with op.batch_alter_table("project_milestones") as batch_op:
        batch_op.add_column(sa.Column("track_id", sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "is_marvell_standard",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )

    # Đánh dấu các milestone chuẩn Marvell đã tồn tại (type != custom).
    # Dùng literal TRUE (không phải 1) để chạy được trên cả SQLite (>=3.23)
    # lẫn PostgreSQL — PostgreSQL từ chối gán integer vào cột boolean.
    op.execute(
        "UPDATE project_milestones SET is_marvell_standard = TRUE "
        "WHERE milestone_type IS NOT NULL AND milestone_type != 'custom'"
    )


def downgrade() -> None:
    with op.batch_alter_table("project_milestones") as batch_op:
        batch_op.drop_column("is_marvell_standard")
        batch_op.drop_column("track_id")

    op.drop_index("ix_timeline_bars_project_id", table_name="timeline_bars")
    op.drop_index("ix_timeline_bars_track_id", table_name="timeline_bars")
    op.drop_table("timeline_bars")

    op.drop_index("ix_timeline_tracks_parent_id", table_name="timeline_tracks")
    op.drop_index("ix_timeline_tracks_project_id", table_name="timeline_tracks")
    op.drop_table("timeline_tracks")

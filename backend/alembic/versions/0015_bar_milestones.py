"""create bar_milestones (milestone markers bên trong 1 timeline bar)

Revision ID: 0015_bar_milestones
Revises: 0014_timeline
Create Date: 2026-09-15

Tab 3 (Timeline) — cho phép đặt milestone markers (◆ nhỏ) BÊN TRONG mỗi bar
tại các mốc quan trọng. Chỉ THÊM MỚI bảng `bar_milestones`, không đụng dữ liệu
hay bảng cũ.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0015_bar_milestones"
down_revision: str | None = "0014_timeline"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "bar_milestones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "bar_id",
            sa.Integer(),
            sa.ForeignKey("timeline_bars.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("date", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_bar_milestones_bar_id", "bar_milestones", ["bar_id"])


def downgrade() -> None:
    op.drop_index("ix_bar_milestones_bar_id", table_name="bar_milestones")
    op.drop_table("bar_milestones")

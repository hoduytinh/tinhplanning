"""add prefix_color to projects (color-coded task title prefix)

Revision ID: 0009_project_prefix_color
Revises: 0008_project_enabled_modules
Create Date: 2026-09-15

Cho phép mỗi project chọn 1 màu để làm nổi bật prefix "[Prefix]" trong tiêu
đề task. Mặc định TẤT CẢ project (mới lẫn cũ) là xanh dương "#3b82f6".
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0009_project_prefix_color"
down_revision: str | None = "0008_project_enabled_modules"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEFAULT_COLOR = "#3b82f6"


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.add_column(
            sa.Column(
                "prefix_color",
                sa.String(length=16),
                nullable=False,
                server_default=_DEFAULT_COLOR,
            )
        )
    with op.batch_alter_table("projects") as batch:
        batch.alter_column("prefix_color", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.drop_column("prefix_color")

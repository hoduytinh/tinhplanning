"""add show_description to tasks (toggle mô tả trong danh sách)

Revision ID: 0010_task_show_description
Revises: 0009_project_prefix_color
Create Date: 2026-09-15

Để giảm rối trong danh sách task, mô tả rút gọn không còn tự động hiện dưới
tiêu đề. Thêm cờ show_description (mặc định False cho task cũ lẫn mới) —
người dùng tick chọn trong form task nếu muốn thấy mô tả ngay trong card/row.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0010_task_show_description"
down_revision: str | None = "0009_project_prefix_color"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(
            sa.Column(
                "show_description",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.drop_column("show_description")

"""replace show_description with short_description on tasks

Revision ID: 0011_task_short_description
Revises: 0010_task_show_description
Create Date: 2026-09-15

Đổi hướng UX: thay vì tick "hiện mô tả" theo từng task, việc xem trước mô tả
trong danh sách giờ do 1 toggle chung "Preview description" ở toolbar Tasks
điều khiển. Bỏ show_description; thêm short_description — field text đơn
giản, riêng biệt với description (đổi tên hiển thị thành "Content").
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0011_task_short_description"
down_revision: str | None = "0010_task_show_description"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(sa.Column("short_description", sa.String(length=500), nullable=True))
        batch.drop_column("show_description")


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(
            sa.Column(
                "show_description",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch.drop_column("short_description")

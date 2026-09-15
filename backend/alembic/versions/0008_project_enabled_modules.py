"""add enabled_modules (optional project tabs) to projects

Revision ID: 0008_project_enabled_modules
Revises: 0007_prefix_subblocks
Create Date: 2026-09-21

Project Detail Page mặc định chỉ có 3 tab: Tổng quan/Công việc/Hoạt động.
Các tab khác (Coverage/Documents/Bugs/Signoff/Sub-blocks) là optional, bật/tắt
qua project settings. Backfill project đã có sẵn dữ liệu ở các tab đó (được
tạo trước migration này) → bật cả 5 module để không mất quyền truy cập dữ
liệu cũ; project mới tạo sau migration mặc định enabled_modules=[] (rỗng),
do frontend gửi lên tường minh.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0008_project_enabled_modules"
down_revision: str | None = "0007_prefix_subblocks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ALL_MODULES = '["coverage","documents","bugs","signoff","subblocks"]'


def upgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.add_column(
            sa.Column(
                "enabled_modules",
                sa.JSON(),
                nullable=True,
                server_default=sa.text(f"'{_ALL_MODULES}'"),
            )
        )
    # Bỏ server_default sau khi backfill xong — insert mới sẽ luôn do
    # service.py set tường minh từ payload (mặc định [] nếu không gửi).
    with op.batch_alter_table("projects") as batch:
        batch.alter_column("enabled_modules", server_default=None)


def downgrade() -> None:
    with op.batch_alter_table("projects") as batch:
        batch.drop_column("enabled_modules")

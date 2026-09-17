"""add visibility mode (normal/private/shared) to owned tables

Revision ID: 0023_visibility_modes
Revises: 0022_weekly_review_multicontext
Create Date: 2026-09-17

Ownership & Visibility layer — bước 3.
Thêm cột `visibility` (normal/private/shared) vào mọi object table đã có
ownership fields. `visibility` trở thành nguồn chân lý cho chế độ hiển thị:
- normal  : theo visibility rules chuẩn (mặc định).
- private : chỉ owner + assigned + viewer; chỉ admin xem thêm được.
- shared  : mọi user đều xem.

Backfill: các bản ghi đang is_shared=True -> visibility='shared'; còn lại giữ
mặc định 'normal'. Cột is_shared được giữ lại (đồng bộ = visibility=='shared')
để tương thích code cũ.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0023_visibility_modes"
down_revision: str | None = "0022_weekly_review_multicontext"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Cùng tập bảng đã được thêm created_by + is_shared ở 0020.
_OWNED_TABLES = [
    "tasks",
    "projects",
    "meetings",
    "weekly_reviews",
    "project_bugs",
    "project_documents",
    "meeting_action_items",
]


def upgrade() -> None:
    for table in _OWNED_TABLES:
        with op.batch_alter_table(table) as batch:
            batch.add_column(
                sa.Column(
                    "visibility",
                    sa.String(length=16),
                    nullable=False,
                    server_default="normal",
                )
            )
        # Backfill: object đang chia sẻ công khai -> visibility='shared'.
        op.execute(
            f"UPDATE {table} SET visibility = 'shared' WHERE is_shared = 1"
        )


def downgrade() -> None:
    for table in reversed(_OWNED_TABLES):
        with op.batch_alter_table(table) as batch:
            batch.drop_column("visibility")

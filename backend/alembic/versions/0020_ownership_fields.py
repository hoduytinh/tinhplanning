"""add ownership fields (created_by, assigned_to, is_shared) to core tables

Revision ID: 0020_ownership_fields
Revises: 0019_auth_users
Create Date: 2026-09-16

Ownership & Visibility layer — bước 1.
Thêm cột sở hữu/chia sẻ vào tất cả object tables:
- created_by  (ai tạo)            → thêm vào mọi bảng
- assigned_to (ai được giao)      → chỉ tasks
- is_shared   (share công khai)   → thêm vào mọi bảng

Cột created_by/assigned_to để nullable (dữ liệu cũ chưa có chủ sở hữu).
Không đặt ràng buộc FK cứng để tương thích batch-mode của SQLite; quan hệ
tới users.id là quan hệ logic (ứng dụng tự đảm bảo).
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0020_ownership_fields"
down_revision: str | None = "0019_auth_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Bảng được thêm created_by + is_shared.
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
            batch.add_column(sa.Column("created_by", sa.Integer(), nullable=True))
            batch.add_column(
                sa.Column(
                    "is_shared",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )

    # assigned_to chỉ dành cho tasks.
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(sa.Column("assigned_to", sa.Integer(), nullable=True))

    # Index phục vụ filter theo ownership.
    op.create_index("ix_tasks_created_by", "tasks", ["created_by"])
    op.create_index("ix_tasks_assigned_to", "tasks", ["assigned_to"])
    op.create_index("ix_tasks_is_shared", "tasks", ["is_shared"])
    op.create_index("ix_projects_created_by", "projects", ["created_by"])
    op.create_index("ix_meetings_created_by", "meetings", ["created_by"])
    op.create_index(
        "ix_weekly_reviews_created_by", "weekly_reviews", ["created_by"]
    )


def downgrade() -> None:
    op.drop_index("ix_weekly_reviews_created_by", table_name="weekly_reviews")
    op.drop_index("ix_meetings_created_by", table_name="meetings")
    op.drop_index("ix_projects_created_by", table_name="projects")
    op.drop_index("ix_tasks_is_shared", table_name="tasks")
    op.drop_index("ix_tasks_assigned_to", table_name="tasks")
    op.drop_index("ix_tasks_created_by", table_name="tasks")

    with op.batch_alter_table("tasks") as batch:
        batch.drop_column("assigned_to")

    for table in reversed(_OWNED_TABLES):
        with op.batch_alter_table(table) as batch:
            batch.drop_column("is_shared")
            batch.drop_column("created_by")

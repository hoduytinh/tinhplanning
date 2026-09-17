"""add multi-context fields to weekly_reviews

Revision ID: 0022_weekly_review_multicontext
Revises: 0021_watchers_members
Create Date: 2026-09-16

Ownership & Visibility layer — bước 3.
Weekly Review hỗ trợ nhiều context độc lập (personal/project/team/custom):
- name          : tên context (vd "TigerA0 IHWA Team", "Personal")
- context_type  : personal / project / team / custom
- project_ids   : JSON array project ids làm data source cho auto-summary
- team_members  : JSON array user ids được xem review (ngoài admin/moderator)

created_by và is_shared đã được thêm ở migration 0020_ownership_fields.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0022_weekly_review_multicontext"
down_revision: str | None = "0021_watchers_members"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("weekly_reviews") as batch:
        batch.add_column(
            sa.Column(
                "name",
                sa.String(length=255),
                nullable=False,
                server_default="Personal",
            )
        )
        batch.add_column(
            sa.Column(
                "context_type",
                sa.String(length=16),
                nullable=False,
                server_default="personal",
            )
        )
        batch.add_column(sa.Column("project_ids", sa.JSON(), nullable=True))
        batch.add_column(sa.Column("team_members", sa.JSON(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("weekly_reviews") as batch:
        batch.drop_column("team_members")
        batch.drop_column("project_ids")
        batch.drop_column("context_type")
        batch.drop_column("name")

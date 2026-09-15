"""add project prefix, subblock tree and task subblock link

Revision ID: 0007_prefix_subblocks
Revises: 0006_documents_bugs_signoff
Create Date: 2026-09-14

Task Prefix & Auto-tagging (cross-module):
  (1) thêm cột `prefix` vào projects,
  (2) tạo bảng project_subblocks (tree đệ quy),
  (3) thêm cột `subblock_id` vào tasks.
Chỉ THÊM MỚI — không drop/không sửa cột cũ.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0007_prefix_subblocks"
down_revision: str | None = "0006_documents_bugs_signoff"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- projects: thêm prefix ---------------------------------------
    with op.batch_alter_table("projects") as batch:
        batch.add_column(sa.Column("prefix", sa.String(length=64), nullable=True))

    # --- project_subblocks -------------------------------------------
    op.create_table(
        "project_subblocks",
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
            sa.ForeignKey("project_subblocks.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("depth", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_project_subblocks_project_id", "project_subblocks", ["project_id"]
    )
    op.create_index(
        "ix_project_subblocks_parent_id", "project_subblocks", ["parent_id"]
    )

    # --- tasks: thêm subblock_id -------------------------------------
    with op.batch_alter_table("tasks") as batch:
        batch.add_column(sa.Column("subblock_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("tasks") as batch:
        batch.drop_column("subblock_id")

    op.drop_index("ix_project_subblocks_parent_id", table_name="project_subblocks")
    op.drop_index("ix_project_subblocks_project_id", table_name="project_subblocks")
    op.drop_table("project_subblocks")

    with op.batch_alter_table("projects") as batch:
        batch.drop_column("prefix")

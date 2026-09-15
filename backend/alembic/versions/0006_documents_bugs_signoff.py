"""add project documents, bugs and signoff checklist tables

Revision ID: 0006_documents_bugs_signoff
Revises: 0005_milestones_coverage
Create Date: 2026-09-14

Module 2 mở rộng tiếp: (1) project_documents (document hub),
(2) project_bugs (bug tracker), (3) project_signoff_items (signoff checklist).
Chỉ THÊM MỚI — không drop/không sửa bảng/cột cũ.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0006_documents_bugs_signoff"
down_revision: str | None = "0005_milestones_coverage"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- project_documents -------------------------------------------
    op.create_table(
        "project_documents",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column(
            "category", sa.String(length=16), nullable=False, server_default="other"
        ),
        sa.Column(
            "doc_type", sa.String(length=24), nullable=False, server_default="other"
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_project_documents_project_id", "project_documents", ["project_id"]
    )

    # --- project_bugs ------------------------------------------------
    op.create_table(
        "project_bugs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("bug_id", sa.String(length=64), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "severity", sa.String(length=16), nullable=False, server_default="medium"
        ),
        sa.Column(
            "status", sa.String(length=16), nullable=False, server_default="open"
        ),
        sa.Column("jira_url", sa.String(length=1024), nullable=True),
        sa.Column("found_by", sa.String(length=128), nullable=True),
        sa.Column("fixed_by", sa.String(length=128), nullable=True),
        sa.Column("found_date", sa.Date(), nullable=True),
        sa.Column("closed_date", sa.Date(), nullable=True),
        sa.Column("root_cause", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_project_bugs_project_id", "project_bugs", ["project_id"])

    # --- project_signoff_items ---------------------------------------
    op.create_table(
        "project_signoff_items",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("item", sa.String(length=512), nullable=False),
        sa.Column("milestone", sa.String(length=16), nullable=False),
        sa.Column(
            "status",
            sa.String(length=16),
            nullable=False,
            server_default="not_started",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_date", sa.Date(), nullable=True),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_project_signoff_items_project_id",
        "project_signoff_items",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_project_signoff_items_project_id", table_name="project_signoff_items"
    )
    op.drop_table("project_signoff_items")
    op.drop_index("ix_project_bugs_project_id", table_name="project_bugs")
    op.drop_table("project_bugs")
    op.drop_index(
        "ix_project_documents_project_id", table_name="project_documents"
    )
    op.drop_table("project_documents")

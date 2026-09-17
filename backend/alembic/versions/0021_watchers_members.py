"""create object_watchers and project_members tables

Revision ID: 0021_watchers_members
Revises: 0020_ownership_fields
Create Date: 2026-09-16

Ownership & Visibility layer — bước 2.
- object_watchers : ai đang theo dõi object nào (task/project/meeting/...)
- project_members : thành viên của project + role (lead/member/watcher)
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0021_watchers_members"
down_revision: str | None = "0020_ownership_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "object_watchers",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        # task / project / meeting / weekly_review / bug / document
        sa.Column("object_type", sa.String(length=32), nullable=False),
        sa.Column("object_id", sa.Integer(), nullable=False),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "object_type",
            "object_id",
            "user_id",
            name="uq_object_watchers_unique",
        ),
    )
    op.create_index(
        "ix_object_watchers_object",
        "object_watchers",
        ["object_type", "object_id"],
    )
    op.create_index(
        "ix_object_watchers_user_id", "object_watchers", ["user_id"]
    )

    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # lead / member / watcher
        sa.Column(
            "role", sa.String(length=16), nullable=False, server_default="member"
        ),
        sa.Column("added_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "project_id", "user_id", name="uq_project_members_unique"
        ),
    )
    op.create_index(
        "ix_project_members_project_id", "project_members", ["project_id"]
    )
    op.create_index(
        "ix_project_members_user_id", "project_members", ["user_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_project_members_user_id", table_name="project_members")
    op.drop_index("ix_project_members_project_id", table_name="project_members")
    op.drop_table("project_members")
    op.drop_index("ix_object_watchers_user_id", table_name="object_watchers")
    op.drop_index("ix_object_watchers_object", table_name="object_watchers")
    op.drop_table("object_watchers")

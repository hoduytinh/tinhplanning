"""add attachments, comments, activities; upgrade subtasks

Revision ID: 0003_task_collaboration
Revises: 0002_create_subtasks
Create Date: 2026-09-14
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0003_task_collaboration"
down_revision: str | None = "0002_create_subtasks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- task_attachments ---------------------------------------------
    op.create_table(
        "task_attachments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_task_attachments_task_id", "task_attachments", ["task_id"]
    )

    # --- task_comments ---------------------------------------------
    op.create_table(
        "task_comments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_task_comments_task_id", "task_comments", ["task_id"])

    # --- task_activities ---------------------------------------------
    op.create_table(
        "task_activities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "task_id",
            sa.Integer(),
            sa.ForeignKey("tasks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.String(length=512), nullable=True),
        sa.Column("new_value", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_task_activities_task_id", "task_activities", ["task_id"])

    # --- upgrade subtasks: add assignee + due_date (order already exists) ---
    with op.batch_alter_table("subtasks", schema=None) as batch_op:
        batch_op.add_column(sa.Column("assignee", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("due_date", sa.Date(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("subtasks", schema=None) as batch_op:
        batch_op.drop_column("due_date")
        batch_op.drop_column("assignee")

    op.drop_index("ix_task_activities_task_id", table_name="task_activities")
    op.drop_table("task_activities")

    op.drop_index("ix_task_comments_task_id", table_name="task_comments")
    op.drop_table("task_comments")

    op.drop_index("ix_task_attachments_task_id", table_name="task_attachments")
    op.drop_table("task_attachments")

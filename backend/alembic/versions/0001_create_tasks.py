"""create tasks table

Revision ID: 0001_create_tasks
Revises:
Create Date: 2026-09-14
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_create_tasks"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(length=8), nullable=False, server_default="P2"),
        sa.Column("status", sa.String(length=16), nullable=False, server_default="todo"),
        sa.Column("type", sa.String(length=16), nullable=False, server_default="my_task"),
        sa.Column("due_date", sa.DateTime(), nullable=True),
        sa.Column("project_id", sa.Integer(), nullable=True),
        sa.Column("tags", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_priority", "tasks", ["priority"])
    op.create_index("ix_tasks_project_id", "tasks", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_tasks_project_id", table_name="tasks")
    op.drop_index("ix_tasks_priority", table_name="tasks")
    op.drop_index("ix_tasks_status", table_name="tasks")
    op.drop_table("tasks")

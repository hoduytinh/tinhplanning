"""create project_recovery_plans table (Recovery Radar)

Revision ID: 0012_project_recovery_plans
Revises: 0011_task_short_description
Create Date: 2026-09-15

Bảng mới cho widget Recovery Radar (Dashboard Vùng D): lưu kế hoạch phục hồi
(Plan) theo tuần cho mỗi project + danh sách người/việc tăng tốc.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0012_project_recovery_plans"
down_revision: str | None = "0011_task_short_description"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "project_recovery_plans",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_label", sa.String(length=32), nullable=False),
        sa.Column("plan_tests", sa.Integer(), nullable=True),
        sa.Column("plan_testplan", sa.Integer(), nullable=True),
        sa.Column("plan_pass_rate", sa.Float(), nullable=True),
        sa.Column("plan_statement", sa.Float(), nullable=True),
        sa.Column("plan_toggle", sa.Float(), nullable=True),
        sa.Column("plan_expression", sa.Float(), nullable=True),
        sa.Column("acceleration_items", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_project_recovery_plans_project_id",
        "project_recovery_plans",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_project_recovery_plans_project_id",
        table_name="project_recovery_plans",
    )
    op.drop_table("project_recovery_plans")

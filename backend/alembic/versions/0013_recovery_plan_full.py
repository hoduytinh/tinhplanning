"""extend project_recovery_plans for full Recovery tab

Revision ID: 0013_recovery_plan_full
Revises: 0012_project_recovery_plans
Create Date: 2026-09-15

Mở rộng bảng `project_recovery_plans` (tạo ở 0012, mới dùng cho Recovery
Radar rút gọn) để phục vụ Tab Recovery đầy đủ trong Project Detail:
- week_date, plan_branch, plan_acov
- issues (đổi tên từ `notes`)
- estimate_items, estimate_cumulative_from, estimate_cumulative_to
- actual_items, outcome_note, outcome_status
- updated_at
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0013_recovery_plan_full"
down_revision: str | None = "0012_project_recovery_plans"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("project_recovery_plans") as batch_op:
        batch_op.add_column(sa.Column("week_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("plan_branch", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("plan_acov", sa.Float(), nullable=True))
        batch_op.alter_column("notes", new_column_name="issues")
        batch_op.add_column(
            sa.Column("estimate_items", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("estimate_cumulative_from", sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column("estimate_cumulative_to", sa.Integer(), nullable=True)
        )
        batch_op.add_column(sa.Column("actual_items", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("outcome_note", sa.Text(), nullable=True))
        batch_op.add_column(
            sa.Column(
                "outcome_status",
                sa.String(length=16),
                nullable=False,
                server_default="planned",
            )
        )
        batch_op.add_column(
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.func.now(),
                nullable=False,
            )
        )


def downgrade() -> None:
    with op.batch_alter_table("project_recovery_plans") as batch_op:
        batch_op.drop_column("updated_at")
        batch_op.drop_column("outcome_status")
        batch_op.drop_column("outcome_note")
        batch_op.drop_column("actual_items")
        batch_op.drop_column("estimate_cumulative_to")
        batch_op.drop_column("estimate_cumulative_from")
        batch_op.drop_column("estimate_items")
        batch_op.alter_column("issues", new_column_name="notes")
        batch_op.drop_column("plan_acov")
        batch_op.drop_column("plan_branch")
        batch_op.drop_column("week_date")

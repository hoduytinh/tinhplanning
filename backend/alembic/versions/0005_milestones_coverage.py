"""add marvell milestone fields + project coverage snapshots

Revision ID: 0005_milestones_coverage
Revises: 0004_create_projects
Create Date: 2026-09-14

Module 2 mở rộng: (1) thêm cột chuẩn Marvell cho project_milestones,
(2) thêm bảng project_coverage_snapshots. Chỉ THÊM MỚI — không drop/không sửa
cột cũ. SQLite dùng batch_alter_table để ALTER an toàn.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0005_milestones_coverage"
down_revision: str | None = "0004_create_projects"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- project_milestones: thêm cột chuẩn Marvell -------------------
    with op.batch_alter_table("project_milestones") as batch:
        batch.add_column(
            sa.Column(
                "milestone_type",
                sa.String(length=16),
                nullable=False,
                server_default="custom",
            )
        )
        batch.add_column(sa.Column("exit_criteria", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column("vp_checklist_url", sa.String(length=512), nullable=True)
        )

    # --- project_coverage_snapshots ----------------------------------
    op.create_table(
        "project_coverage_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("week_label", sa.String(length=32), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=True),
        # test pass metrics
        sa.Column("total_tests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("passed_tests", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("failed_tests", sa.Integer(), nullable=False, server_default="0"),
        # testplan
        sa.Column("testplan_total", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("testplan_passed", sa.Integer(), nullable=False, server_default="0"),
        # coverage metrics (%)
        sa.Column("cov_statement", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_branch", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_toggle", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_fsm", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_expression", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_acov", sa.Float(), nullable=False, server_default="0"),
        sa.Column("cov_fcov", sa.Float(), nullable=False, server_default="0"),
        sa.Column("regression_path", sa.String(length=512), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_project_coverage_snapshots_project_id",
        "project_coverage_snapshots",
        ["project_id"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_project_coverage_snapshots_project_id",
        table_name="project_coverage_snapshots",
    )
    op.drop_table("project_coverage_snapshots")
    with op.batch_alter_table("project_milestones") as batch:
        batch.drop_column("vp_checklist_url")
        batch.drop_column("exit_criteria")
        batch.drop_column("milestone_type")

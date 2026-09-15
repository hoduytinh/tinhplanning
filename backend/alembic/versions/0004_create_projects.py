"""create projects, milestones, risks, project activity + comments

Revision ID: 0004_create_projects
Revises: 0003_task_collaboration
Create Date: 2026-09-14

Module 2 — Projects. Chỉ THÊM MỚI bảng, không sửa/không drop schema cũ của
Module Tasks. Cột tasks.project_id đã tồn tại từ 0001 nên không đụng tới.
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0004_create_projects"
down_revision: str | None = "0003_task_collaboration"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # --- projects -----------------------------------------------------
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        # planning / in_progress / review / done
        sa.Column("status", sa.String(length=16), nullable=False, server_default="planning"),
        # critical / important / normal / backlog
        sa.Column("priority", sa.String(length=16), nullable=False, server_default="normal"),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        # tags lưu dạng JSON array
        sa.Column("tags", sa.JSON(), nullable=True),
        # health tự tính: on_track / at_risk / off_track / no_data
        sa.Column("health", sa.String(length=16), nullable=False, server_default="no_data"),
        # soft delete
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_priority", "projects", ["priority"])
    op.create_index("ix_projects_is_deleted", "projects", ["is_deleted"])

    # --- project_milestones ------------------------------------------
    op.create_table(
        "project_milestones",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        # not_started / in_progress / done
        sa.Column("status", sa.String(length=16), nullable=False, server_default="not_started"),
        sa.Column("order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_milestones_project_id", "project_milestones", ["project_id"])

    # --- project_risks -----------------------------------------------
    op.create_table(
        "project_risks",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("description", sa.Text(), nullable=False),
        # low / medium / high
        sa.Column("severity", sa.String(length=8), nullable=False, server_default="medium"),
        sa.Column("mitigation", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_risks_project_id", "project_risks", ["project_id"])

    # --- project_activities (audit trail tự động) --------------------
    op.create_table(
        "project_activities",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("old_value", sa.String(length=512), nullable=True),
        sa.Column("new_value", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_activities_project_id", "project_activities", ["project_id"])

    # --- project_comments --------------------------------------------
    op.create_table(
        "project_comments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "project_id",
            sa.Integer(),
            sa.ForeignKey("projects.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_comments_project_id", "project_comments", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_project_comments_project_id", table_name="project_comments")
    op.drop_table("project_comments")

    op.drop_index("ix_project_activities_project_id", table_name="project_activities")
    op.drop_table("project_activities")

    op.drop_index("ix_project_risks_project_id", table_name="project_risks")
    op.drop_table("project_risks")

    op.drop_index("ix_project_milestones_project_id", table_name="project_milestones")
    op.drop_table("project_milestones")

    op.drop_index("ix_projects_is_deleted", table_name="projects")
    op.drop_index("ix_projects_priority", table_name="projects")
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_table("projects")

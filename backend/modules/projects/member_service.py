"""Business logic for Project Members."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.member_models import ProjectMember
from modules.projects.models import Project
from modules.users.models import User


class ProjectMemberError(Exception):
    """Raised for invalid project member operations."""


def _get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None or getattr(project, "is_deleted", False):
        raise ProjectMemberError("Project not found")
    return project


def is_project_lead(db: Session, project_id: int, user_id: int) -> bool:
    """User có phải lead của project không (dùng để check quyền quản lý)."""
    row = db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
            ProjectMember.role == "lead",
        )
    ).scalar_one_or_none()
    return row is not None


def can_manage_members(db: Session, project: Project, user) -> bool:
    """Admin/moderator, người tạo project, hoặc project lead được quản lý."""
    if user.role in {"admin", "moderator"}:
        return True
    if project.created_by == user.id:
        return True
    return is_project_lead(db, project.id, user.id)


def list_members(db: Session, project_id: int) -> list[dict]:
    _get_project(db, project_id)
    rows = db.execute(
        select(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at)
    ).all()
    return [
        {
            "id": m.id,
            "project_id": m.project_id,
            "user_id": m.user_id,
            "role": m.role,
            "added_by": m.added_by,
            "created_at": m.created_at,
            "username": u.username,
            "full_name": u.full_name,
            "avatar_url": u.avatar_url,
        }
        for (m, u) in rows
    ]


def add_member(
    db: Session, project_id: int, *, user_id: int, role: str, added_by: int
) -> dict:
    _get_project(db, project_id)

    if db.get(User, user_id) is None:
        raise ProjectMemberError("User not found")

    existing = db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    ).scalar_one_or_none()
    if existing is not None:
        raise ProjectMemberError("User is already a member of this project")

    member = ProjectMember(
        project_id=project_id, user_id=user_id, role=role, added_by=added_by
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return _member_with_user(db, member)


def update_member_role(
    db: Session, project_id: int, member_id: int, role: str
) -> dict:
    member = db.get(ProjectMember, member_id)
    if member is None or member.project_id != project_id:
        raise ProjectMemberError("Member not found")
    member.role = role
    db.commit()
    db.refresh(member)
    return _member_with_user(db, member)


def remove_member(db: Session, project_id: int, member_id: int) -> None:
    member = db.get(ProjectMember, member_id)
    if member is None or member.project_id != project_id:
        raise ProjectMemberError("Member not found")
    db.delete(member)
    db.commit()


def _member_with_user(db: Session, member: ProjectMember) -> dict:
    user = db.get(User, member.user_id)
    return {
        "id": member.id,
        "project_id": member.project_id,
        "user_id": member.user_id,
        "role": member.role,
        "added_by": member.added_by,
        "created_at": member.created_at,
        "username": user.username if user else None,
        "full_name": user.full_name if user else None,
        "avatar_url": user.avatar_url if user else None,
    }

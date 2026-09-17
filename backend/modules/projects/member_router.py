"""API endpoints for Project Members.

Routes (prefix /api/projects):
- GET    /api/projects/{project_id}/members
- POST   /api/projects/{project_id}/members
- PATCH  /api/projects/{project_id}/members/{member_id}
- DELETE /api/projects/{project_id}/members/{member_id}

Chỉ admin/moderator, người tạo project, hoặc project lead được thêm/sửa/xoá.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from modules.projects import member_service
from modules.projects.member_schemas import (
    ProjectMemberCreate,
    ProjectMemberRead,
    ProjectMemberUpdate,
)

router = APIRouter(prefix="/api/projects", tags=["project-members"])


def _require_manage(db: Session, project_id: int, current_user):
    try:
        project = member_service._get_project(db, project_id)
    except member_service.ProjectMemberError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if not member_service.can_manage_members(db, project, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to manage members of this project",
        )
    return project


@router.get("/{project_id}/members", response_model=list[ProjectMemberRead])
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
) -> list[ProjectMemberRead]:
    try:
        rows = member_service.list_members(db, project_id)
    except member_service.ProjectMemberError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [ProjectMemberRead(**r) for r in rows]


@router.post(
    "/{project_id}/members",
    response_model=ProjectMemberRead,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    project_id: int,
    payload: ProjectMemberCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ProjectMemberRead:
    _require_manage(db, project_id, current_user)
    try:
        row = member_service.add_member(
            db,
            project_id,
            user_id=payload.user_id,
            role=payload.role,
            added_by=current_user.id,
        )
    except member_service.ProjectMemberError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ProjectMemberRead(**row)


@router.patch(
    "/{project_id}/members/{member_id}", response_model=ProjectMemberRead
)
def update_member(
    project_id: int,
    member_id: int,
    payload: ProjectMemberUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ProjectMemberRead:
    _require_manage(db, project_id, current_user)
    try:
        row = member_service.update_member_role(
            db, project_id, member_id, payload.role
        )
    except member_service.ProjectMemberError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return ProjectMemberRead(**row)


@router.delete(
    "/{project_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    _require_manage(db, project_id, current_user)
    try:
        member_service.remove_member(db, project_id, member_id)
    except member_service.ProjectMemberError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

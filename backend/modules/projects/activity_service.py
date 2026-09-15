"""Business logic for project activity trail + comments.

Activity được ghi tự động (log_activity) từ service.py / milestone_service.py /
risk_service.py. Comment do người dùng tạo thủ công qua endpoint.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectActivity, ProjectComment
from modules.projects.schemas import ProjectCommentCreate
from modules.projects.service import get_project


class ProjectCommentNotFoundError(Exception):
    def __init__(self, comment_id: int) -> None:
        super().__init__(f"Comment {comment_id} not found")
        self.comment_id = comment_id


# --- Activities -----------------------------------------------------------
def list_activities(db: Session, project_id: int) -> list[ProjectActivity]:
    get_project(db, project_id)
    stmt = (
        select(ProjectActivity)
        .where(ProjectActivity.project_id == project_id)
        .order_by(ProjectActivity.created_at.asc())
    )
    return list(db.execute(stmt).scalars().all())


def log_activity(
    db: Session,
    project_id: int,
    action: str,
    old_value: str | None = None,
    new_value: str | None = None,
) -> ProjectActivity:
    activity = ProjectActivity(
        project_id=project_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


# --- Comments -------------------------------------------------------------
def list_comments(db: Session, project_id: int) -> list[ProjectComment]:
    get_project(db, project_id)
    stmt = (
        select(ProjectComment)
        .where(ProjectComment.project_id == project_id)
        .order_by(ProjectComment.created_at.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_comment(
    db: Session, project_id: int, payload: ProjectCommentCreate
) -> ProjectComment:
    get_project(db, project_id)
    comment = ProjectComment(project_id=project_id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, project_id: int, comment_id: int) -> None:
    comment = db.get(ProjectComment, comment_id)
    if comment is None or comment.project_id != project_id:
        raise ProjectCommentNotFoundError(comment_id)
    db.delete(comment)
    db.commit()

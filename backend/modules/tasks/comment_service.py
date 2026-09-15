"""Business logic for manual task comments."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.tasks.comment_models import TaskComment
from modules.tasks.comment_schemas import CommentCreate
from modules.tasks.service import get_task


class CommentNotFoundError(Exception):
    def __init__(self, comment_id: int) -> None:
        super().__init__(f"Comment {comment_id} not found")
        self.comment_id = comment_id


def list_comments(db: Session, task_id: int) -> list[TaskComment]:
    get_task(db, task_id)
    stmt = (
        select(TaskComment)
        .where(TaskComment.task_id == task_id)
        .order_by(TaskComment.created_at.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_comment(db: Session, task_id: int, payload: CommentCreate) -> TaskComment:
    get_task(db, task_id)
    comment = TaskComment(task_id=task_id, content=payload.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, task_id: int, comment_id: int) -> None:
    get_task(db, task_id)
    comment = db.get(TaskComment, comment_id)
    if comment is None or comment.task_id != task_id:
        raise CommentNotFoundError(comment_id)
    db.delete(comment)
    db.commit()

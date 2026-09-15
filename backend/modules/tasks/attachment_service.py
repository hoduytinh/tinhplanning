"""Business logic for task attachments (link-only)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.tasks.attachment_models import TaskAttachment
from modules.tasks.attachment_schemas import AttachmentCreate
from modules.tasks.service import get_task


class AttachmentNotFoundError(Exception):
    def __init__(self, attachment_id: int) -> None:
        super().__init__(f"Attachment {attachment_id} not found")
        self.attachment_id = attachment_id


def list_attachments(db: Session, task_id: int) -> list[TaskAttachment]:
    get_task(db, task_id)
    stmt = (
        select(TaskAttachment)
        .where(TaskAttachment.task_id == task_id)
        .order_by(TaskAttachment.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def create_attachment(
    db: Session, task_id: int, payload: AttachmentCreate
) -> TaskAttachment:
    get_task(db, task_id)
    attachment = TaskAttachment(task_id=task_id, url=payload.url, label=payload.label)
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


def delete_attachment(db: Session, task_id: int, attachment_id: int) -> None:
    get_task(db, task_id)
    attachment = db.get(TaskAttachment, attachment_id)
    if attachment is None or attachment.task_id != task_id:
        raise AttachmentNotFoundError(attachment_id)
    db.delete(attachment)
    db.commit()

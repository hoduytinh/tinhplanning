"""API endpoints for the Tasks module."""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.tasks import service
from modules.tasks import subtask_service
from modules.tasks import attachment_service
from modules.tasks import comment_service
from modules.tasks import activity_service
from modules.tasks.schemas import (
    Priority,
    Status,
    TaskCreate,
    TaskRead,
    TaskType,
    TaskUpdate,
)
from modules.tasks.service import TaskNotFoundError
from modules.tasks.subtask_schemas import (
    SubtaskCreate,
    SubtaskRead,
    SubtaskReorder,
    SubtaskUpdate,
)
from modules.tasks.subtask_service import SubtaskNotFoundError
from modules.tasks.attachment_schemas import AttachmentCreate, AttachmentRead
from modules.tasks.attachment_service import AttachmentNotFoundError
from modules.tasks.comment_schemas import CommentCreate, CommentRead
from modules.tasks.comment_service import CommentNotFoundError
from modules.tasks.activity_schemas import ActivityRead

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _read(db: Session, task) -> TaskRead:
    """TaskRead + computed prefix/auto-tag fields."""
    info = service.compute_task_prefix(db, task)
    return TaskRead.model_validate(task).model_copy(update=info)


@router.get("", response_model=list[TaskRead])
def list_tasks(
    db: Session = Depends(get_db),
    priority: Priority | None = None,
    task_status: Status | None = Query(default=None, alias="status"),
    type: TaskType | None = None,
    project_id: int | None = None,
    subblock_id: int | None = None,
    tag: str | None = Query(default=None, description="Lọc theo auto-tag, vd #tigera0"),
    due_before: datetime | None = None,
    due_after: datetime | None = None,
    sort_by: str = Query(default="created_at", pattern="^(priority|due_date|created_at)$"),
    order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> list[TaskRead]:
    tasks = service.list_tasks(
        db,
        priority=priority.value if priority else None,
        status=task_status.value if task_status else None,
        type=type.value if type else None,
        project_id=project_id,
        due_before=due_before,
        due_after=due_after,
        sort_by=sort_by,
        order=order,
    )
    if subblock_id is not None:
        tasks = [t for t in tasks if t.subblock_id == subblock_id]
    result = [_read(db, t) for t in tasks]
    if tag:
        result = [
            r
            for r in result
            if service.matches_tag(
                {"project_tag": r.project_tag, "sub_tag": r.sub_tag}, tag
            )
        ]
    return result


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(get_db)) -> TaskRead:
    try:
        return _read(db, service.get_task(db, task_id))
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)) -> TaskRead:
    return _read(db, service.create_task(db, payload))


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int, payload: TaskUpdate, db: Session = Depends(get_db)
) -> TaskRead:
    try:
        return _read(db, service.update_task(db, task_id, payload))
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_task(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Subtasks (checklist inside a task)
# ---------------------------------------------------------------------------


@router.get("/{task_id}/subtasks", response_model=list[SubtaskRead])
def list_subtasks(task_id: int, db: Session = Depends(get_db)) -> list[SubtaskRead]:
    try:
        items = subtask_service.list_subtasks(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [SubtaskRead.model_validate(s) for s in items]


@router.post(
    "/{task_id}/subtasks",
    response_model=SubtaskRead,
    status_code=status.HTTP_201_CREATED,
)
def create_subtask(
    task_id: int, payload: SubtaskCreate, db: Session = Depends(get_db)
) -> SubtaskRead:
    try:
        return SubtaskRead.model_validate(
            subtask_service.create_subtask(db, task_id, payload)
        )
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=SubtaskRead)
def update_subtask(
    task_id: int,
    subtask_id: int,
    payload: SubtaskUpdate,
    db: Session = Depends(get_db),
) -> SubtaskRead:
    try:
        return SubtaskRead.model_validate(
            subtask_service.update_subtask(db, task_id, subtask_id, payload)
        )
    except (TaskNotFoundError, SubtaskNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{task_id}/subtasks/{subtask_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_subtask(
    task_id: int, subtask_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        subtask_service.delete_subtask(db, task_id, subtask_id)
    except (TaskNotFoundError, SubtaskNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/{task_id}/subtasks/reorder", response_model=list[SubtaskRead])
def reorder_subtasks(
    task_id: int, payload: SubtaskReorder, db: Session = Depends(get_db)
) -> list[SubtaskRead]:
    """Cập nhật thứ tự sub-task sau khi kéo thả (drag & drop)."""
    try:
        items = subtask_service.reorder_subtasks(db, task_id, payload.ordered_ids)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [SubtaskRead.model_validate(s) for s in items]


# ---------------------------------------------------------------------------
# Attachments (link-only, no file upload)
# ---------------------------------------------------------------------------


@router.get("/{task_id}/attachments", response_model=list[AttachmentRead])
def list_attachments(
    task_id: int, db: Session = Depends(get_db)
) -> list[AttachmentRead]:
    try:
        items = attachment_service.list_attachments(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [AttachmentRead.model_validate(a) for a in items]


@router.post(
    "/{task_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_attachment(
    task_id: int, payload: AttachmentCreate, db: Session = Depends(get_db)
) -> AttachmentRead:
    try:
        return AttachmentRead.model_validate(
            attachment_service.create_attachment(db, task_id, payload)
        )
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{task_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_attachment(
    task_id: int, attachment_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        attachment_service.delete_attachment(db, task_id, attachment_id)
    except (TaskNotFoundError, AttachmentNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Comments (manual)
# ---------------------------------------------------------------------------


@router.get("/{task_id}/comments", response_model=list[CommentRead])
def list_comments(task_id: int, db: Session = Depends(get_db)) -> list[CommentRead]:
    try:
        items = comment_service.list_comments(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [CommentRead.model_validate(c) for c in items]


@router.post(
    "/{task_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    task_id: int, payload: CommentCreate, db: Session = Depends(get_db)
) -> CommentRead:
    try:
        return CommentRead.model_validate(
            comment_service.create_comment(db, task_id, payload)
        )
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{task_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    task_id: int, comment_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        comment_service.delete_comment(db, task_id, comment_id)
    except (TaskNotFoundError, CommentNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Activities (read-only auto-log — no POST from frontend)
# ---------------------------------------------------------------------------


@router.get("/{task_id}/activities", response_model=list[ActivityRead])
def list_activities(task_id: int, db: Session = Depends(get_db)) -> list[ActivityRead]:
    try:
        items = activity_service.list_activities(db, task_id)
    except TaskNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [ActivityRead.model_validate(a) for a in items]

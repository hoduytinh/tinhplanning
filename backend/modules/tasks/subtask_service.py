"""Business logic for subtasks."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.tasks.service import get_task  # reuse task existence check
from modules.tasks.subtask_models import Subtask
from modules.tasks.subtask_schemas import SubtaskCreate, SubtaskUpdate


class SubtaskNotFoundError(Exception):
    def __init__(self, subtask_id: int) -> None:
        super().__init__(f"Subtask {subtask_id} not found")
        self.subtask_id = subtask_id


def list_subtasks(db: Session, task_id: int) -> list[Subtask]:
    # Ensure the parent task exists (raises TaskNotFoundError otherwise).
    get_task(db, task_id)
    stmt = (
        select(Subtask)
        .where(Subtask.task_id == task_id)
        .order_by(Subtask.order.asc(), Subtask.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_subtask(db: Session, task_id: int, payload: SubtaskCreate) -> Subtask:
    get_task(db, task_id)

    order = payload.order
    if order is None:
        # Append to the end.
        max_order = db.execute(
            select(func.coalesce(func.max(Subtask.order), -1)).where(
                Subtask.task_id == task_id
            )
        ).scalar_one()
        order = max_order + 1

    subtask = Subtask(
        task_id=task_id,
        title=payload.title,
        order=order,
        assignee=payload.assignee,
        due_date=payload.due_date,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


def reorder_subtasks(db: Session, task_id: int, ordered_ids: list[int]) -> list[Subtask]:
    """Bulk-update `order` to match the given id sequence (drag & drop)."""
    get_task(db, task_id)
    subtasks = {s.id: s for s in list_subtasks(db, task_id)}
    for index, sid in enumerate(ordered_ids):
        if sid in subtasks:
            subtasks[sid].order = index
    db.commit()
    return list_subtasks(db, task_id)


def _get_subtask(db: Session, task_id: int, subtask_id: int) -> Subtask:
    subtask = db.get(Subtask, subtask_id)
    if subtask is None or subtask.task_id != task_id:
        raise SubtaskNotFoundError(subtask_id)
    return subtask


def update_subtask(
    db: Session, task_id: int, subtask_id: int, payload: SubtaskUpdate
) -> Subtask:
    subtask = _get_subtask(db, task_id, subtask_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(subtask, field, value)
    db.commit()
    db.refresh(subtask)
    return subtask


def delete_subtask(db: Session, task_id: int, subtask_id: int) -> None:
    subtask = _get_subtask(db, task_id, subtask_id)
    db.delete(subtask)
    db.commit()

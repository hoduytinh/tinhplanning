"""Business logic for the auto-logged task activity trail.

This module is written to (log_activity) by modules/tasks/service.py whenever
a task is created or its status/priority/due_date/tags change. There is no
POST endpoint — the frontend can only read the trail.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.tasks.activity_models import TaskActivity
from modules.tasks.service import get_task


def list_activities(db: Session, task_id: int) -> list[TaskActivity]:
    get_task(db, task_id)
    stmt = (
        select(TaskActivity)
        .where(TaskActivity.task_id == task_id)
        .order_by(TaskActivity.created_at.asc())
    )
    return list(db.execute(stmt).scalars().all())


def log_activity(
    db: Session,
    task_id: int,
    action: str,
    old_value: str | None = None,
    new_value: str | None = None,
) -> TaskActivity:
    activity = TaskActivity(
        task_id=task_id, action=action, old_value=old_value, new_value=new_value
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity

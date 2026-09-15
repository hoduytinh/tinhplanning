"""Service layer (CRUD + snapshot + complete) for the Weekly Review module."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from . import summary_service
from .models import WeeklyReview, WeeklyReviewShoutout, WeeklyReviewSnapshot
from .schemas import (
    ShoutoutCreate,
    WeeklyReviewCreate,
    WeeklyReviewUpdate,
)


class WeeklyReviewNotFoundError(Exception):
    def __init__(self, review_id: int) -> None:
        super().__init__(f"Weekly review {review_id} not found")
        self.review_id = review_id


class ShoutoutNotFoundError(Exception):
    def __init__(self, shoutout_id: int) -> None:
        super().__init__(f"Shoutout {shoutout_id} not found")
        self.shoutout_id = shoutout_id


# ------------------------------------------------------------------ CRUD --- #
def list_reviews(db: Session) -> list[WeeklyReview]:
    return (
        db.execute(select(WeeklyReview).order_by(WeeklyReview.week_start.desc()))
        .scalars()
        .all()
    )


def get_review(db: Session, review_id: int) -> WeeklyReview:
    review = db.get(WeeklyReview, review_id)
    if review is None:
        raise WeeklyReviewNotFoundError(review_id)
    return review


def _find_by_week_start(db: Session, week_start: date) -> WeeklyReview | None:
    return db.execute(
        select(WeeklyReview).where(WeeklyReview.week_start == week_start)
    ).scalar_one_or_none()


def create_review(db: Session, payload: WeeklyReviewCreate) -> WeeklyReview:
    week_start, week_end = summary_service.week_bounds(payload.week_start)
    existing = _find_by_week_start(db, week_start)
    if existing is not None:
        return existing
    review = WeeklyReview(
        week_label=summary_service.week_label(week_start),
        week_start=week_start,
        week_end=week_end,
        status="draft",
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


def get_or_create_current(db: Session) -> WeeklyReview:
    week_start, _ = summary_service.week_bounds()
    existing = _find_by_week_start(db, week_start)
    if existing is not None:
        return existing
    return create_review(db, WeeklyReviewCreate(week_start=week_start))


def update_review(
    db: Session, review_id: int, payload: WeeklyReviewUpdate
) -> WeeklyReview:
    review = get_review(db, review_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "workload" and value is not None:
            setattr(review, field, value.value if hasattr(value, "value") else value)
        elif field == "top_focus" and value is not None:
            setattr(review, field, [_dump(i) for i in value])
        else:
            setattr(review, field, value)
    db.commit()
    db.refresh(review)
    return review


def _dump(item):
    if hasattr(item, "model_dump"):
        return item.model_dump()
    return item


def delete_review(db: Session, review_id: int) -> None:
    review = get_review(db, review_id)
    db.delete(review)
    db.commit()


# ------------------------------------------------------------- Shoutouts --- #
def add_shoutout(
    db: Session, review_id: int, payload: ShoutoutCreate
) -> WeeklyReviewShoutout:
    get_review(db, review_id)  # ensure exists
    shoutout = WeeklyReviewShoutout(
        review_id=review_id,
        person_name=payload.person_name,
        reason=payload.reason,
    )
    db.add(shoutout)
    db.commit()
    db.refresh(shoutout)
    return shoutout


def delete_shoutout(db: Session, review_id: int, shoutout_id: int) -> None:
    shoutout = db.get(WeeklyReviewShoutout, shoutout_id)
    if shoutout is None or shoutout.review_id != review_id:
        raise ShoutoutNotFoundError(shoutout_id)
    db.delete(shoutout)
    db.commit()


# --------------------------------------------------------------- Summary --- #
def summary_for_review(db: Session, review_id: int) -> dict:
    review = get_review(db, review_id)
    return summary_service.compute_auto_summary(db, review.week_start, review.week_end)


# -------------------------------------------------------------- Snapshot --- #
def save_snapshot(db: Session, review_id: int) -> WeeklyReviewSnapshot:
    review = get_review(db, review_id)
    data = summary_service.compute_auto_summary(db, review.week_start, review.week_end)
    t = data["tasks"]
    m = data["meetings"]
    b = data["bugs"]
    recovery = data.get("recovery") or []
    rec = recovery[0] if recovery else {}

    snapshot = review.snapshot or WeeklyReviewSnapshot(review_id=review.id)
    snapshot.tasks_completed_count = t["completed_count"]
    snapshot.tasks_completed_ids = t["completed_ids"]
    snapshot.tasks_created_count = t["created_count"]
    snapshot.tasks_blocked_count = t["blocked_count"]
    snapshot.tasks_overdue_count = t["overdue_count"]
    snapshot.meetings_count = m["count"]
    snapshot.meetings_action_items_total = m["action_items_total"]
    snapshot.meetings_action_items_open = m["action_items_open"]
    snapshot.bugs_closed_count = b["closed_count"]
    snapshot.bugs_new_count = b["new_count"]
    snapshot.bugs_open_count = b["open_count"]
    snapshot.coverage_deltas = data["coverage_deltas"]
    snapshot.recovery_plan_id = rec.get("id")
    snapshot.recovery_actual_items = rec.get("actual_items")
    snapshot.recovery_estimate_items = rec.get("estimate_items")
    snapshot.recovery_outcome_status = rec.get("outcome_status")

    if snapshot.id is None:
        db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return snapshot


# ------------------------------------------------------------------- CFT --- #
def generate_cft(db: Session, review_id: int) -> WeeklyReview:
    review = get_review(db, review_id)
    review.cft_report_content = summary_service.generate_cft_report(db, review)
    review.cft_report_generated_at = datetime.now()
    db.commit()
    db.refresh(review)
    return review


def update_cft(db: Session, review_id: int, content: str) -> WeeklyReview:
    review = get_review(db, review_id)
    review.cft_report_content = content
    db.commit()
    db.refresh(review)
    return review


# -------------------------------------------------------------- Complete --- #
def complete_review(db: Session, review_id: int) -> WeeklyReview:
    review = get_review(db, review_id)
    save_snapshot(db, review_id)
    review.status = "completed"
    db.commit()
    db.refresh(review)
    return review

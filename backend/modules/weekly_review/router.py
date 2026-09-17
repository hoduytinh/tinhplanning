"""API endpoints for the Weekly Review module."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db

from . import service
from .schemas import (
    CftUpdate,
    ShoutoutCreate,
    ShoutoutRead,
    SnapshotRead,
    WeeklyReviewCreate,
    WeeklyReviewListItem,
    WeeklyReviewRead,
    WeeklyReviewUpdate,
)
from .service import ShoutoutNotFoundError, WeeklyReviewNotFoundError

router = APIRouter(prefix="/api/weekly-reviews", tags=["weekly-reviews"])


def _not_found(exc: Exception) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ------------------------------------------------------------- Reviews ---- #
@router.get("", response_model=list[WeeklyReviewListItem])
def list_reviews(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    return service.list_reviews(db, current_user=current_user)


@router.post("", response_model=WeeklyReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: WeeklyReviewCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.create_review(db, payload, current_user_id=current_user.id)


@router.get("/current", response_model=WeeklyReviewRead)
def get_current(
    db: Session = Depends(get_db), current_user=Depends(get_current_user)
):
    return service.get_or_create_current(db, current_user_id=current_user.id)


@router.get("/{review_id}", response_model=WeeklyReviewRead)
def get_review(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.get_review(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.patch("/{review_id}", response_model=WeeklyReviewRead)
def update_review(
    review_id: int, payload: WeeklyReviewUpdate, db: Session = Depends(get_db)
):
    try:
        return service.update_review(db, review_id, payload)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: int, db: Session = Depends(get_db)):
    try:
        service.delete_review(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


# ------------------------------------------------------------ Shoutouts --- #
@router.get("/{review_id}/shoutouts", response_model=list[ShoutoutRead])
def list_shoutouts(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.get_review(db, review_id).shoutouts
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.post(
    "/{review_id}/shoutouts",
    response_model=ShoutoutRead,
    status_code=status.HTTP_201_CREATED,
)
def add_shoutout(
    review_id: int, payload: ShoutoutCreate, db: Session = Depends(get_db)
):
    try:
        return service.add_shoutout(db, review_id, payload)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.delete(
    "/{review_id}/shoutouts/{shoutout_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_shoutout(review_id: int, shoutout_id: int, db: Session = Depends(get_db)):
    try:
        service.delete_shoutout(db, review_id, shoutout_id)
    except (WeeklyReviewNotFoundError, ShoutoutNotFoundError) as exc:
        raise _not_found(exc)


# -------------------------------------------------------------- Summary --- #
@router.get("/{review_id}/summary")
def get_summary(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.summary_for_review(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.post("/{review_id}/snapshot", response_model=SnapshotRead)
def save_snapshot(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.save_snapshot(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


# ------------------------------------------------------------------ CFT --- #
@router.post("/{review_id}/generate-cft", response_model=WeeklyReviewRead)
def generate_cft(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.generate_cft(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


@router.patch("/{review_id}/cft", response_model=WeeklyReviewRead)
def update_cft(review_id: int, payload: CftUpdate, db: Session = Depends(get_db)):
    try:
        return service.update_cft(db, review_id, payload.cft_report_content)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)


# ------------------------------------------------------------- Complete --- #
@router.post("/{review_id}/complete", response_model=WeeklyReviewRead)
def complete_review(review_id: int, db: Session = Depends(get_db)):
    try:
        return service.complete_review(db, review_id)
    except WeeklyReviewNotFoundError as exc:
        raise _not_found(exc)

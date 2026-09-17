"""API endpoints for the Object Watchers feature.

Routes (prefix /api/watchers):
- POST   /api/watchers                              -> add a watch (self or,
                                                        with manage permission,
                                                        another user as viewer)
- DELETE /api/watchers/{watcher_id}                 -> remove a watch
- GET    /api/watchers?object_type=task&object_id=1 -> list watchers of object
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.visibility import can_manage_watchers
from modules.watchers import service
from modules.watchers.schemas import WatcherCreate, WatcherRead, WatcherUser

router = APIRouter(prefix="/api/watchers", tags=["watchers"])


@router.get("", response_model=list[WatcherUser])
def list_watchers(
    object_type: str = Query(...),
    object_id: int = Query(...),
    db: Session = Depends(get_db),
) -> list[WatcherUser]:
    try:
        rows = service.list_watchers(
            db, object_type=object_type, object_id=object_id
        )
    except service.WatcherError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return [WatcherUser(**r) for r in rows]


@router.post("", response_model=WatcherRead, status_code=status.HTTP_201_CREATED)
def add_watcher(
    payload: WatcherCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> WatcherRead:
    target_user_id = payload.user_id or current_user.id
    # Thêm NGƯỜI KHÁC (không phải chính mình) làm viewer/watcher cần quyền
    # quản lý object đó (creator/assignee/admin/moderator).
    if target_user_id != current_user.id and not can_manage_watchers(
        db, current_user, payload.object_type, payload.object_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add viewers to this item",
        )
    try:
        watcher = service.add_watcher(
            db,
            object_type=payload.object_type,
            object_id=payload.object_id,
            user_id=target_user_id,
        )
    except service.WatcherError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return WatcherRead.model_validate(watcher)


@router.delete("/{watcher_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_watcher(
    watcher_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> None:
    try:
        watcher = service.get_watcher(db, watcher_id)
    except service.WatcherError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    # Tự bỏ watch của mình luôn được phép; xoá watcher khác cần quyền quản lý.
    if watcher.user_id != current_user.id and not can_manage_watchers(
        db, current_user, watcher.object_type, watcher.object_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove this viewer",
        )
    service.remove_watcher(db, watcher_id)

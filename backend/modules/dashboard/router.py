"""API endpoints cho Dashboard module.

Gồm 4 endpoint aggregation (read-only) dưới /api/dashboard và 3 endpoint
Recovery plan dưới /api/projects/{id}/recovery. Tất cả nằm trong module
dashboard — không sửa router của module khác.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.dashboard import service
from modules.dashboard.schemas import (
    DashboardSummary,
    ProjectHealthRow,
    RecoveryGap,
    RecoveryPlanCreate,
    RecoveryPlanRead,
    RecoveryPlansSummary,
    RecoveryPlanUpdate,
    RecoveryTrend,
    TodayFocus,
)
from modules.dashboard.service import RecoveryPlanNotFoundError
from modules.projects.schemas import CoverageRead
from modules.projects.service import ProjectNotFoundError

router = APIRouter(prefix="/api", tags=["dashboard"])


# ---------------------------------------------------------------------------
# Aggregation (read-only)
# ---------------------------------------------------------------------------
@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    return DashboardSummary(**service.get_summary(db))


@router.get("/dashboard/today-focus", response_model=TodayFocus)
def dashboard_today_focus(db: Session = Depends(get_db)) -> TodayFocus:
    return TodayFocus(**service.get_today_focus(db))


@router.get("/dashboard/projects-health", response_model=list[ProjectHealthRow])
def dashboard_projects_health(db: Session = Depends(get_db)) -> list[ProjectHealthRow]:
    return [ProjectHealthRow(**row) for row in service.get_projects_health(db)]


@router.get(
    "/dashboard/regression-pulse/{project_id}", response_model=list[CoverageRead]
)
def dashboard_regression_pulse(
    project_id: int, db: Session = Depends(get_db)
) -> list[CoverageRead]:
    try:
        snaps = service.get_regression_pulse(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [CoverageRead.model_validate(s) for s in snaps]


# ---------------------------------------------------------------------------
# Recovery plans (Vùng D)
# ---------------------------------------------------------------------------
# Recovery — Tab 8 (Project Detail) + Recovery Radar (Dashboard, Vùng D).
# Single source of truth: cả 2 nơi gọi cùng các endpoint dưới đây.
# ---------------------------------------------------------------------------
@router.get(
    "/projects/{project_id}/recovery/plans", response_model=list[RecoveryPlanRead]
)
def recovery_plans_list(
    project_id: int, db: Session = Depends(get_db)
) -> list[RecoveryPlanRead]:
    try:
        plans = service.list_recovery_plans(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [RecoveryPlanRead.model_validate(p) for p in plans]


@router.get(
    "/projects/{project_id}/recovery/plans/latest",
    response_model=RecoveryPlanRead | None,
)
def recovery_plans_latest(
    project_id: int, db: Session = Depends(get_db)
) -> RecoveryPlanRead | None:
    try:
        plan = service.latest_recovery(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return RecoveryPlanRead.model_validate(plan) if plan else None


@router.get(
    "/projects/{project_id}/recovery/plans/summary",
    response_model=RecoveryPlansSummary,
)
def recovery_plans_summary(
    project_id: int, db: Session = Depends(get_db)
) -> RecoveryPlansSummary:
    try:
        return RecoveryPlansSummary(**service.get_recovery_plans_summary(db, project_id))
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/projects/{project_id}/recovery/gap", response_model=RecoveryGap)
def recovery_gap(project_id: int, db: Session = Depends(get_db)) -> RecoveryGap:
    try:
        return RecoveryGap(**service.compute_gap(db, project_id))
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/projects/{project_id}/recovery/trend", response_model=RecoveryTrend)
def recovery_trend(project_id: int, db: Session = Depends(get_db)) -> RecoveryTrend:
    try:
        return RecoveryTrend(**service.get_recovery_trend(db, project_id))
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/projects/{project_id}/recovery/plans",
    response_model=RecoveryPlanRead,
    status_code=status.HTTP_201_CREATED,
)
def recovery_plans_create(
    project_id: int,
    payload: RecoveryPlanCreate,
    db: Session = Depends(get_db),
) -> RecoveryPlanRead:
    try:
        plan = service.create_recovery(db, project_id, payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return RecoveryPlanRead.model_validate(plan)


@router.patch(
    "/projects/{project_id}/recovery/plans/{plan_id}", response_model=RecoveryPlanRead
)
def recovery_plans_update(
    project_id: int,
    plan_id: int,
    payload: RecoveryPlanUpdate,
    db: Session = Depends(get_db),
) -> RecoveryPlanRead:
    try:
        plan = service.update_recovery(db, project_id, plan_id, payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RecoveryPlanNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return RecoveryPlanRead.model_validate(plan)


@router.delete(
    "/projects/{project_id}/recovery/plans/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def recovery_plans_delete(
    project_id: int, plan_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        service.delete_recovery(db, project_id, plan_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except RecoveryPlanNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


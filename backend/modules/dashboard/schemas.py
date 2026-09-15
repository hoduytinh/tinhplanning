"""Pydantic schemas cho Dashboard module."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from modules.projects.schemas import CoverageRead, ProjectHealth
from modules.tasks.schemas import TaskRead


# ---------------------------------------------------------------------------
# Summary (Vùng E / header context)
# ---------------------------------------------------------------------------
class ProjectRiskBrief(BaseModel):
    id: int
    name: str
    prefix: str | None = None
    health: ProjectHealth
    pass_rate: float | None = None


class PendingSnapshotProject(BaseModel):
    id: int
    name: str
    prefix: str | None = None
    latest_week: str | None = None


class DashboardSummary(BaseModel):
    overdue_count: int
    blocked_count: int
    active_tasks_count: int
    open_bugs_count: int
    done_today_count: int
    projects_at_risk: list[ProjectRiskBrief]
    pending_snapshot_projects: list[PendingSnapshotProject]
    top_pass_rate: float | None = None
    top_project_id: int | None = None
    top_project_name: str | None = None


# ---------------------------------------------------------------------------
# Today's Focus (Vùng A)
# ---------------------------------------------------------------------------
class FocusTask(TaskRead):
    """TaskRead + note đầu tiên (dùng cho blocked task)."""

    first_note: str | None = None


class TodayFocus(BaseModel):
    urgent: list[FocusTask]
    blocked: list[FocusTask]
    due_this_week: list[FocusTask]
    done_today: list[FocusTask]


# ---------------------------------------------------------------------------
# Projects Health (Vùng B)
# ---------------------------------------------------------------------------
class ProjectHealthRow(BaseModel):
    id: int
    name: str
    prefix: str | None = None
    status: str
    health: ProjectHealth
    next_milestone: str | None = None
    pass_rate: float | None = None
    pass_rate_trend: float | None = None  # so với snapshot trước
    testplan_pct: float | None = None
    open_bugs: int = 0
    latest_snapshot: CoverageRead | None = None
    prev_snapshot: CoverageRead | None = None
    # quick stats task cho tooltip
    tasks_total: int = 0
    tasks_done: int = 0
    tasks_blocked: int = 0
    tasks_overdue: int = 0


# ---------------------------------------------------------------------------
# Recovery — Tab 8 (Project Detail) + Recovery Radar (Dashboard, Vùng D)
# ---------------------------------------------------------------------------
class AccelerationItem(BaseModel):
    name: str = ""
    task: str = ""


class RecoveryPlanBase(BaseModel):
    week_label: str = Field(..., min_length=1, max_length=32)
    week_date: date | None = None
    plan_tests: int | None = None
    plan_testplan: int | None = None
    plan_pass_rate: float | None = None
    plan_statement: float | None = None
    plan_branch: float | None = None
    plan_toggle: float | None = None
    plan_expression: float | None = None
    plan_acov: float | None = None
    issues: str | None = None
    acceleration_items: list[AccelerationItem] = Field(default_factory=list)
    estimate_items: int | None = None
    estimate_cumulative_from: int | None = None
    estimate_cumulative_to: int | None = None


class RecoveryPlanCreate(RecoveryPlanBase):
    pass


class RecoveryPlanUpdate(BaseModel):
    week_label: str | None = Field(default=None, min_length=1, max_length=32)
    week_date: date | None = None
    plan_tests: int | None = None
    plan_testplan: int | None = None
    plan_pass_rate: float | None = None
    plan_statement: float | None = None
    plan_branch: float | None = None
    plan_toggle: float | None = None
    plan_expression: float | None = None
    plan_acov: float | None = None
    issues: str | None = None
    acceleration_items: list[AccelerationItem] | None = None
    estimate_items: int | None = None
    estimate_cumulative_from: int | None = None
    estimate_cumulative_to: int | None = None
    actual_items: int | None = None
    outcome_note: str | None = None


class RecoveryPlanRead(RecoveryPlanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    actual_items: int | None = None
    outcome_note: str | None = None
    outcome_status: str
    created_at: datetime
    updated_at: datetime


# --- Gap analysis (Sub-tab 1 / Recovery Radar) ----------------------------
class NextMilestoneBrief(BaseModel):
    name: str
    due_date: date | None = None
    weeks_remaining: int | None = None


class GapMetric(BaseModel):
    name: str
    plan: float | None = None
    current: float | None = None
    gap: float | None = None
    gap_pct: float | None = None
    trend: str  # up / down / flat
    status: str  # on_track / close / behind / no_data


class RecoveryGap(BaseModel):
    week_label: str | None = None
    snapshot_date: date | None = None
    metrics: list[GapMetric]
    overall_status: str  # on_track / close / at_risk / critical
    next_milestone: NextMilestoneBrief | None = None
    current_plan: RecoveryPlanRead | None = None


# --- Trend (Sub-tab 3) -----------------------------------------------------
class ProjectionRow(BaseModel):
    metric: str
    current: float | None = None
    target: float | None = None
    weekly_rate: float | None = None
    target_week_label: str | None = None
    weeks_to_target: int | None = None
    vs_milestone: str | None = None  # before / after / unknown


class RecoveryTrend(BaseModel):
    snapshots: list[CoverageRead]
    plans: list[RecoveryPlanRead]
    milestones: list[dict]
    projections: list[ProjectionRow]


# --- Summary bar (Sub-tab 2) -------------------------------------------------
class RecoveryPlansSummary(BaseModel):
    total: int
    done: int
    partial: int
    missed: int
    planned: int
    avg_actual_vs_estimate_pct: float | None = None

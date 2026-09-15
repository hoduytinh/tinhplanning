"""Business logic cho Dashboard — chỉ đọc/aggregate + CRUD recovery plans.

Aggregation dùng lại logic có sẵn của Module Projects (compute_stats,
compute_health) và Module Tasks (compute_task_prefix) — không sửa gì của các
module đó.
"""
import re
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.dashboard.models import ProjectRecoveryPlan
from modules.dashboard.schemas import (
    NextMilestoneBrief,
    RecoveryPlanCreate,
    RecoveryPlanUpdate,
)
from modules.projects import service as project_service
from modules.projects.models import (
    Project,
    ProjectBug,
    ProjectCoverageSnapshot,
    ProjectMilestone,
)
from modules.tasks.comment_models import TaskComment
from modules.tasks.models import Task
from modules.tasks.service import compute_task_prefix

_CLOSED_TASK = {"done", "cancelled"}
_OPEN_BUG = {"open", "in_progress"}
_HEALTH_RANK = {"off_track": 0, "at_risk": 1, "on_track": 2, "no_data": 3}


class RecoveryPlanNotFoundError(Exception):
    def __init__(self, plan_id: int) -> None:
        super().__init__(f"Recovery plan {plan_id} not found")
        self.plan_id = plan_id


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> datetime:
    return datetime.utcnow()


def _today() -> date:
    return _now().date()


def current_week_number() -> int:
    return _today().isocalendar()[1]


def current_week_label() -> str:
    return f"W{current_week_number():02d}"


def _week_number_of(label: str | None) -> int | None:
    if not label:
        return None
    m = re.search(r"[Ww]\s*(\d{1,2})", label)
    return int(m.group(1)) if m else None


def _pass_rate(snap: ProjectCoverageSnapshot | None) -> float | None:
    if snap is None or not snap.total_tests:
        return None
    return round(snap.passed_tests / snap.total_tests * 100, 1)


def _testplan_pct(snap: ProjectCoverageSnapshot | None) -> float | None:
    if snap is None or not snap.testplan_total:
        return None
    return round(snap.testplan_passed / snap.testplan_total * 100, 1)


def _snapshots(db: Session, project_id: int) -> list[ProjectCoverageSnapshot]:
    """Snapshot của 1 project, cũ → mới."""
    stmt = (
        select(ProjectCoverageSnapshot)
        .where(ProjectCoverageSnapshot.project_id == project_id)
        .order_by(
            ProjectCoverageSnapshot.snapshot_date.asc(),
            ProjectCoverageSnapshot.id.asc(),
        )
    )
    return list(db.execute(stmt).scalars().all())


def _active_projects(db: Session) -> list[Project]:
    stmt = (
        select(Project)
        .where(Project.is_deleted.is_(False))
        .where(Project.status != "done")
        .order_by(Project.created_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def _open_bugs_count(db: Session, project_id: int) -> int:
    bugs = db.execute(
        select(ProjectBug).where(ProjectBug.project_id == project_id)
    ).scalars().all()
    return sum(1 for b in bugs if b.status in _OPEN_BUG)


def _next_milestone(db: Session, project_id: int) -> str | None:
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order.asc(), ProjectMilestone.id.asc())
    )
    for ms in db.execute(stmt).scalars().all():
        if ms.status != "done":
            return ms.title
    return None


def _all_tasks(db: Session) -> list[Task]:
    return list(db.execute(select(Task)).scalars().all())


def _enrich(db: Session, task: Task, *, with_note: bool = False) -> dict:
    """Trả về dict để build FocusTask (TaskRead + computed + first_note)."""
    from modules.dashboard.schemas import FocusTask

    info = compute_task_prefix(db, task)
    focus = FocusTask.model_validate(task).model_copy(update=info)
    if with_note:
        note = db.execute(
            select(TaskComment)
            .where(TaskComment.task_id == task.id)
            .order_by(TaskComment.created_at.asc(), TaskComment.id.asc())
            .limit(1)
        ).scalars().first()
        focus = focus.model_copy(update={"first_note": note.content if note else None})
    return focus


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
def _worst_active_with_snapshot(
    db: Session,
) -> tuple[Project | None, ProjectCoverageSnapshot | None]:
    """Project active có health xấu nhất và có ít nhất 1 snapshot."""
    best: tuple[int, Project, ProjectCoverageSnapshot] | None = None
    for p in _active_projects(db):
        snaps = _snapshots(db, p.id)
        if not snaps:
            continue
        rank = _HEALTH_RANK.get(p.health, 3)
        if best is None or rank < best[0]:
            best = (rank, p, snaps[-1])
    if best is None:
        return None, None
    return best[1], best[2]


def get_summary(db: Session) -> dict:
    tasks = _all_tasks(db)
    now = _now()
    today = _today()

    overdue = sum(
        1
        for t in tasks
        if t.due_date is not None
        and t.due_date < now
        and t.status not in _CLOSED_TASK
    )
    blocked = sum(1 for t in tasks if t.status == "blocked")
    active = sum(1 for t in tasks if t.status not in _CLOSED_TASK)
    done_today = sum(
        1
        for t in tasks
        if t.status == "done" and t.updated_at and t.updated_at.date() == today
    )

    projects = _active_projects(db)
    open_bugs = sum(_open_bugs_count(db, p.id) for p in projects)

    at_risk = []
    pending = []
    cur_week = current_week_number()
    for p in projects:
        snaps = _snapshots(db, p.id)
        latest = snaps[-1] if snaps else None
        if p.health in {"at_risk", "off_track"}:
            at_risk.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "prefix": p.prefix,
                    "health": p.health,
                    "pass_rate": _pass_rate(latest),
                }
            )
        latest_week = _week_number_of(latest.week_label) if latest else None
        if latest_week != cur_week:
            pending.append(
                {
                    "id": p.id,
                    "name": p.name,
                    "prefix": p.prefix,
                    "latest_week": latest.week_label if latest else None,
                }
            )

    top_project, top_snap = _worst_active_with_snapshot(db)

    return {
        "overdue_count": overdue,
        "blocked_count": blocked,
        "active_tasks_count": active,
        "open_bugs_count": open_bugs,
        "done_today_count": done_today,
        "projects_at_risk": at_risk,
        "pending_snapshot_projects": pending,
        "top_pass_rate": _pass_rate(top_snap),
        "top_project_id": top_project.id if top_project else None,
        "top_project_name": (
            (top_project.prefix or top_project.name) if top_project else None
        ),
    }


# ---------------------------------------------------------------------------
# Today's Focus
# ---------------------------------------------------------------------------
def get_today_focus(db: Session) -> dict:
    tasks = _all_tasks(db)
    now = _now()
    today = _today()
    end_today = datetime.combine(today, datetime.max.time())
    week_end = now + timedelta(days=7)

    urgent, blocked, due_week, done_today = [], [], [], []
    for t in tasks:
        if t.status == "done":
            if t.updated_at and t.updated_at.date() == today:
                done_today.append(t)
            continue
        if t.status == "cancelled":
            continue
        if t.status == "blocked":
            blocked.append(t)
            continue
        if (
            t.priority == "critical"
            and t.due_date is not None
            and t.due_date <= end_today
        ):
            urgent.append(t)
        elif t.due_date is not None and now <= t.due_date <= week_end:
            due_week.append(t)

    urgent.sort(key=lambda t: t.due_date or datetime.max)
    due_week.sort(key=lambda t: t.due_date or datetime.max)

    return {
        "urgent": [_enrich(db, t) for t in urgent],
        "blocked": [_enrich(db, t, with_note=True) for t in blocked],
        "due_this_week": [_enrich(db, t) for t in due_week],
        "done_today": [_enrich(db, t) for t in done_today],
    }


# ---------------------------------------------------------------------------
# Projects Health
# ---------------------------------------------------------------------------
def get_projects_health(db: Session) -> list[dict]:
    rows = []
    for p in _active_projects(db):
        snaps = _snapshots(db, p.id)
        latest = snaps[-1] if snaps else None
        prev = snaps[-2] if len(snaps) >= 2 else None
        latest_pr = _pass_rate(latest)
        prev_pr = _pass_rate(prev)
        trend = (
            round(latest_pr - prev_pr, 1)
            if latest_pr is not None and prev_pr is not None
            else None
        )
        stats = project_service.compute_stats(db, p.id)
        rows.append(
            {
                "id": p.id,
                "name": p.name,
                "prefix": p.prefix,
                "status": p.status,
                "health": p.health,
                "next_milestone": _next_milestone(db, p.id),
                "pass_rate": latest_pr,
                "pass_rate_trend": trend,
                "testplan_pct": _testplan_pct(latest),
                "open_bugs": _open_bugs_count(db, p.id),
                "latest_snapshot": latest,
                "prev_snapshot": prev,
                "tasks_total": stats.total,
                "tasks_done": stats.done,
                "tasks_blocked": stats.blocked,
                "tasks_overdue": stats.overdue,
            }
        )
    # Sắp health xấu nhất lên đầu.
    rows.sort(key=lambda r: _HEALTH_RANK.get(r["health"], 3))
    return rows


# ---------------------------------------------------------------------------
# Regression Pulse
# ---------------------------------------------------------------------------
def get_regression_pulse(db: Session, project_id: int) -> list[ProjectCoverageSnapshot]:
    project_service.get_project(db, project_id)  # 404 nếu không tồn tại
    snaps = _snapshots(db, project_id)
    return snaps[-5:]


# ---------------------------------------------------------------------------
# Recovery — Tab 8 (Project Detail) + Recovery Radar (Dashboard, Vùng D)
# ---------------------------------------------------------------------------
def compute_outcome_status(actual_items: int | None, estimate_items: int | None) -> str:
    if actual_items is None:
        return "planned"
    if not estimate_items:
        return "done" if actual_items > 0 else "planned"
    if actual_items >= estimate_items:
        return "done"
    if actual_items >= estimate_items * 0.8:
        return "partial"
    return "missed"


def _recovery_plans(db: Session, project_id: int) -> list[ProjectRecoveryPlan]:
    """Plans của 1 project, mới → cũ (sort theo week_date/created_at desc)."""
    stmt = (
        select(ProjectRecoveryPlan)
        .where(ProjectRecoveryPlan.project_id == project_id)
        .order_by(
            ProjectRecoveryPlan.week_date.desc().nullslast(),
            ProjectRecoveryPlan.created_at.desc(),
            ProjectRecoveryPlan.id.desc(),
        )
    )
    return list(db.execute(stmt).scalars().all())


def list_recovery_plans(db: Session, project_id: int) -> list[ProjectRecoveryPlan]:
    project_service.get_project(db, project_id)
    return _recovery_plans(db, project_id)


def latest_recovery(db: Session, project_id: int) -> ProjectRecoveryPlan | None:
    project_service.get_project(db, project_id)
    plans = _recovery_plans(db, project_id)
    return plans[0] if plans else None


def get_recovery_plan(db: Session, project_id: int, plan_id: int) -> ProjectRecoveryPlan:
    plan = db.get(ProjectRecoveryPlan, plan_id)
    if plan is None or plan.project_id != project_id:
        raise RecoveryPlanNotFoundError(plan_id)
    return plan


def _dump_plan(payload) -> dict:
    data = payload.model_dump(exclude_unset=True)
    if "acceleration_items" in data and data["acceleration_items"] is not None:
        data["acceleration_items"] = [
            item if isinstance(item, dict) else item.model_dump()
            for item in data["acceleration_items"]
        ]
    return data


def create_recovery(
    db: Session, project_id: int, payload: RecoveryPlanCreate
) -> ProjectRecoveryPlan:
    project_service.get_project(db, project_id)
    plan = ProjectRecoveryPlan(project_id=project_id, **_dump_plan(payload))
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_recovery(
    db: Session, project_id: int, plan_id: int, payload: RecoveryPlanUpdate
) -> ProjectRecoveryPlan:
    plan = get_recovery_plan(db, project_id, plan_id)
    data = _dump_plan(payload)
    for field, value in data.items():
        setattr(plan, field, value)
    if "actual_items" in data:
        plan.outcome_status = compute_outcome_status(
            plan.actual_items, plan.estimate_items
        )
    db.commit()
    db.refresh(plan)
    return plan


def delete_recovery(db: Session, project_id: int, plan_id: int) -> None:
    plan = get_recovery_plan(db, project_id, plan_id)
    db.delete(plan)
    db.commit()


def get_recovery_plans_summary(db: Session, project_id: int) -> dict:
    plans = list_recovery_plans(db, project_id)
    counts = {"done": 0, "partial": 0, "missed": 0, "planned": 0}
    ratios = []
    for p in plans:
        counts[p.outcome_status] = counts.get(p.outcome_status, 0) + 1
        if p.actual_items is not None and p.estimate_items:
            ratios.append(p.actual_items / p.estimate_items * 100)
    return {
        "total": len(plans),
        "done": counts["done"],
        "partial": counts["partial"],
        "missed": counts["missed"],
        "planned": counts["planned"],
        "avg_actual_vs_estimate_pct": (
            round(sum(ratios) / len(ratios), 0) if ratios else None
        ),
    }


# --- Gap analysis -----------------------------------------------------------
def _trend_of(cur: float | None, prev: float | None) -> str:
    if cur is None or prev is None:
        return "flat"
    if cur > prev:
        return "up"
    if cur < prev:
        return "down"
    return "flat"


def _metric_status(gap: float | None, is_percent: bool, plan: float | None) -> str:
    if gap is None:
        return "no_data"
    if is_percent:
        if gap >= -5:
            return "on_track"
        if gap >= -15:
            return "close"
        return "behind"
    # Count-based metric (ex: Tests total): so gap với % của plan.
    if not plan:
        return "on_track" if gap >= 0 else "behind"
    pct = gap / plan * 100
    if pct >= 0:
        return "on_track"
    if pct >= -10:
        return "close"
    return "behind"


def _next_milestone_brief(db: Session, project_id: int) -> NextMilestoneBrief | None:
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order.asc(), ProjectMilestone.id.asc())
    )
    for ms in db.execute(stmt).scalars().all():
        if ms.status != "done":
            weeks = None
            if ms.due_date:
                weeks = max(
                    0,
                    round((ms.due_date - _today()).days / 7),
                )
            return NextMilestoneBrief(
                name=ms.title, due_date=ms.due_date, weeks_remaining=weeks
            )
    return None


def compute_gap(db: Session, project_id: int) -> dict:
    project_service.get_project(db, project_id)
    snaps = _snapshots(db, project_id)
    latest = snaps[-1] if snaps else None
    prev = snaps[-2] if len(snaps) >= 2 else None
    plan = latest_recovery(db, project_id)

    def m(name, plan_val, cur_val, prev_val, is_percent):
        gap = (
            round(cur_val - plan_val, 1)
            if cur_val is not None and plan_val is not None
            else None
        )
        gap_pct = gap if is_percent else None
        return {
            "name": name,
            "plan": plan_val,
            "current": cur_val,
            "gap": gap,
            "gap_pct": gap_pct,
            "trend": _trend_of(cur_val, prev_val),
            "status": _metric_status(gap, is_percent, plan_val),
        }

    metrics = [
        m(
            "Tests total",
            plan.plan_tests if plan else None,
            latest.total_tests if latest else None,
            prev.total_tests if prev else None,
            False,
        ),
        m(
            "Testplan items",
            plan.plan_testplan if plan else None,
            latest.testplan_total if latest else None,
            prev.testplan_total if prev else None,
            False,
        ),
        m(
            "Pass Rate",
            plan.plan_pass_rate if plan else None,
            _pass_rate(latest),
            _pass_rate(prev),
            True,
        ),
        m(
            "Statement cov",
            plan.plan_statement if plan else None,
            latest.cov_statement if latest else None,
            prev.cov_statement if prev else None,
            True,
        ),
        m(
            "Branch cov",
            plan.plan_branch if plan else None,
            latest.cov_branch if latest else None,
            prev.cov_branch if prev else None,
            True,
        ),
        m(
            "Toggle cov",
            plan.plan_toggle if plan else None,
            latest.cov_toggle if latest else None,
            prev.cov_toggle if prev else None,
            True,
        ),
        m(
            "Expression cov",
            plan.plan_expression if plan else None,
            latest.cov_expression if latest else None,
            prev.cov_expression if prev else None,
            True,
        ),
        m(
            "ACOV",
            plan.plan_acov if plan else None,
            latest.cov_acov if latest else None,
            prev.cov_acov if prev else None,
            True,
        ),
    ]

    behind_count = sum(1 for x in metrics if x["status"] == "behind")
    if behind_count == 0:
        overall = "on_track"
    elif behind_count == 1:
        overall = "close"
    elif behind_count == 2:
        overall = "at_risk"
    else:
        overall = "critical"

    return {
        "week_label": latest.week_label if latest else None,
        "snapshot_date": latest.snapshot_date if latest else None,
        "metrics": metrics,
        "overall_status": overall,
        "next_milestone": _next_milestone_brief(db, project_id),
        "current_plan": plan,
    }


# --- Trend + projection ------------------------------------------------------
_PROJECTION_METRICS = [
    ("Pass Rate", _pass_rate, "plan_pass_rate"),
    ("Statement cov", lambda s: s.cov_statement, "plan_statement"),
    ("Branch cov", lambda s: s.cov_branch, "plan_branch"),
    ("Toggle cov", lambda s: s.cov_toggle, "plan_toggle"),
    ("Expression cov", lambda s: s.cov_expression, "plan_expression"),
    ("ACOV", lambda s: s.cov_acov, "plan_acov"),
]


def compute_projection(db: Session, project_id: int) -> list[dict]:
    snaps = _snapshots(db, project_id)
    plan = latest_recovery(db, project_id)
    milestone = _next_milestone_brief(db, project_id)
    rows = []
    recent = snaps[-5:] if len(snaps) >= 2 else []
    for name, getter, plan_field in _PROJECTION_METRICS:
        values = [getter(s) for s in recent if getter(s) is not None]
        current = getter(snaps[-1]) if snaps else None
        target = getattr(plan, plan_field, None) if plan else None
        target = target if target is not None else 100.0
        weekly_rate = None
        weeks_to_target = None
        target_week_label = None
        vs_milestone = None
        if len(values) >= 2:
            deltas = [values[i] - values[i - 1] for i in range(1, len(values))]
            weekly_rate = round(sum(deltas) / len(deltas), 2)
        if current is not None and weekly_rate is not None and weekly_rate > 0 and current < target:
            weeks_to_target = max(0, round((target - current) / weekly_rate))
            target_week_num = current_week_number() + weeks_to_target
            target_week_label = f"W{target_week_num:02d}"
            if milestone and milestone.weeks_remaining is not None:
                vs_milestone = (
                    "before" if weeks_to_target <= milestone.weeks_remaining else "after"
                )
            else:
                vs_milestone = "unknown"
        elif current is not None and current >= target:
            weeks_to_target = 0
            target_week_label = current_week_label()
            vs_milestone = "before"
        rows.append(
            {
                "metric": name,
                "current": current,
                "target": target,
                "weekly_rate": weekly_rate,
                "target_week_label": target_week_label,
                "weeks_to_target": weeks_to_target,
                "vs_milestone": vs_milestone,
            }
        )
    return rows


def get_recovery_trend(db: Session, project_id: int) -> dict:
    project_service.get_project(db, project_id)
    snaps = _snapshots(db, project_id)
    plans = _recovery_plans(db, project_id)
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order.asc(), ProjectMilestone.id.asc())
    )
    milestones = [
        {"name": ms.title, "date": ms.due_date, "type": ms.milestone_type}
        for ms in db.execute(stmt).scalars().all()
    ]
    return {
        "snapshots": snaps,
        "plans": plans,
        "milestones": milestones,
        "projections": compute_projection(db, project_id),
    }

"""Business logic for project milestones."""
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectMilestone
from modules.projects.schemas import MilestoneCreate, MilestoneUpdate
from modules.projects.service import get_project


# Marvell standard milestone flow (POR -> iRTL -> CC -> FPF -> RTLF -> FDR -> Tapeout).
# Moi entry: (milestone_type, title, exit_criteria goi y tu dong).
STANDARD_MILESTONES: list[tuple[str, str, str]] = [
    ("por", "POR", "Verif Strategy reviewed, Test plan initial, Schedule committed"),
    ("irtl", "iRTL", "TB bring-up done, basic tests pass, Verif Strategy reviewed"),
    ("cc", "Code Complete (CC)", "Full TB done, 80%+ pass rate, coverage coded, DFT verified"),
    ("fpf", "FP Freeze (FPF)", "Interface coverage done, major stress tests done"),
    ("rtlf", "RTL Freeze (RTLF)", "100% code/func coverage (w/ waivers), 2 weeks bug-free, ECO mode"),
    ("fdr", "FDR", "All verification complete, final netlist verified"),
    ("tapeout", "Tapeout", "Archive complete, GDS delivered"),
]


class MilestoneNotFoundError(Exception):
    def __init__(self, milestone_id: int) -> None:
        super().__init__(f"Milestone {milestone_id} not found")
        self.milestone_id = milestone_id


def list_milestones(db: Session, project_id: int) -> list[ProjectMilestone]:
    get_project(db, project_id)
    stmt = (
        select(ProjectMilestone)
        .where(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.order.asc(), ProjectMilestone.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_milestone(
    db: Session, project_id: int, payload: MilestoneCreate
) -> ProjectMilestone:
    get_project(db, project_id)

    order = payload.order
    if order is None:
        max_order = db.execute(
            select(func.coalesce(func.max(ProjectMilestone.order), -1)).where(
                ProjectMilestone.project_id == project_id
            )
        ).scalar_one()
        order = max_order + 1

    milestone = ProjectMilestone(
        project_id=project_id,
        title=payload.title,
        due_date=payload.due_date,
        status=payload.status.value,
        order=order,
        milestone_type=payload.milestone_type.value,
        exit_criteria=payload.exit_criteria,
        vp_checklist_url=payload.vp_checklist_url,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "milestone_added", None, milestone.title)
    return milestone


def populate_standard_milestones(
    db: Session, project_id: int
) -> list[ProjectMilestone]:
    """Tao 7 milestone chuan Marvell. Bo qua neu da ton tai milestone cung type
    de tranh nhan doi khi goi lai."""
    get_project(db, project_id)
    existing = list_milestones(db, project_id)
    existing_types = {m.milestone_type for m in existing}

    max_order = db.execute(
        select(func.coalesce(func.max(ProjectMilestone.order), -1)).where(
            ProjectMilestone.project_id == project_id
        )
    ).scalar_one()

    order = max_order + 1
    created = False
    for mtype, title, exit_criteria in STANDARD_MILESTONES:
        if mtype in existing_types:
            continue
        db.add(
            ProjectMilestone(
                project_id=project_id,
                title=title,
                status="not_started",
                order=order,
                milestone_type=mtype,
                exit_criteria=exit_criteria,
            )
        )
        order += 1
        created = True

    if created:
        db.commit()
        from modules.projects.activity_service import log_activity

        log_activity(
            db, project_id, "milestone_added", None, "Marvell Standard Milestones"
        )
    return list_milestones(db, project_id)


def _get_milestone(
    db: Session, project_id: int, milestone_id: int
) -> ProjectMilestone:
    milestone = db.get(ProjectMilestone, milestone_id)
    if milestone is None or milestone.project_id != project_id:
        raise MilestoneNotFoundError(milestone_id)
    return milestone


def update_milestone(
    db: Session, project_id: int, milestone_id: int, payload: MilestoneUpdate
) -> ProjectMilestone:
    milestone = _get_milestone(db, project_id, milestone_id)
    data = payload.model_dump(exclude_unset=True)
    before_status = milestone.status

    for field, value in data.items():
        if field in {"status", "milestone_type"} and value is not None:
            setattr(milestone, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(milestone, field, value)

    db.commit()
    db.refresh(milestone)

    if "status" in data and milestone.status != before_status:
        from modules.projects.activity_service import log_activity

        log_activity(
            db,
            project_id,
            "milestone_status_changed",
            f"{milestone.title}: {before_status}",
            milestone.status,
        )
    return milestone


def delete_milestone(db: Session, project_id: int, milestone_id: int) -> None:
    milestone = _get_milestone(db, project_id, milestone_id)
    db.delete(milestone)
    db.commit()


def reorder_milestones(
    db: Session, project_id: int, ordered_ids: list[int]
) -> list[ProjectMilestone]:
    get_project(db, project_id)
    items = {m.id: m for m in list_milestones(db, project_id)}
    for index, mid in enumerate(ordered_ids):
        if mid in items:
            items[mid].order = index
    db.commit()
    return list_milestones(db, project_id)

"""Business logic for project signoff checklist."""
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectSignoffItem
from modules.projects.schemas import (
    SignoffCategoryProgress,
    SignoffCreate,
    SignoffProgress,
    SignoffUpdate,
)
from modules.projects.service import get_project

# Checklist chuẩn theo milestone. Mỗi entry: (category, item).
SIGNOFF_TEMPLATES: dict[str, list[tuple[str, str]]] = {
    "irtl": [
        ("Testbench", "TB bring-up done, basic tests pass"),
        ("Testbench", "Register access tests pass"),
        ("Documentation", "Verification Strategy reviewed"),
        ("Documentation", "Test plan initial version ready"),
        ("Coverage", "Coverage environment setup done"),
    ],
    "cc": [
        ("Testbench", "Full TB development done, ready for massive runs"),
        ("Testbench", "80%+ test pass rate"),
        ("Coverage", "Coverage fully coded"),
        ("Coverage", "DFT verification coded"),
        ("Documentation", "Final test plan reviewed"),
    ],
    "fpf": [
        ("Coverage", "Interface coverage done"),
        ("Regression", "Major stress tests done"),
        ("Regression", "Regression pass rate stable"),
        ("Documentation", "Coverage plan reviewed"),
    ],
    "rtlf": [
        # Coverage
        ("Coverage", "Code coverage 100% (with reviewed waivers)"),
        ("Coverage", "Functional coverage 100% (with reviewed waivers)"),
        ("Coverage", "Toggle coverage 100% at all interfaces"),
        ("Coverage", "All waivers reviewed and documented by design owner"),
        # Regression
        ("Regression", "Regression pass rate >= 95%"),
        ("Regression", "No open Critical/High bugs"),
        ("Regression", "At least 2 weeks bug-free before RTLF"),
        # RTL Quality
        ("RTL Quality", "No forces in simulation (or all reviewed)"),
        ("RTL Quality", "CDC/RDC checks clean"),
        ("RTL Quality", "Lint clean"),
        ("RTL Quality", "No FIXMEs in verif code"),
        # Documentation
        ("Documentation", "Verification Strategy reviewed and final"),
        ("Documentation", "Test plan final and reviewed"),
        ("Documentation", "Coverage plan reviewed"),
        # Gate Sim
        ("Gate Sim", "Unit delay simulation pass"),
        ("Gate Sim", "SDF annotation ready"),
        # Low Power
        ("Low Power", "LP simulation complete"),
        ("Low Power", "UPF reviewed and final"),
    ],
    "fdr": [
        ("Verification", "All verification complete"),
        ("Netlist", "Final netlist verified"),
        ("Gate Sim", "Full gate simulation pass"),
        ("Documentation", "Final signoff report reviewed"),
    ],
    "to": [
        ("Archive", "Verification archive complete"),
        ("Signoff", "All milestones signed off"),
        ("Signoff", "GDS delivered"),
    ],
}


class SignoffItemNotFoundError(Exception):
    def __init__(self, item_id: int) -> None:
        super().__init__(f"Signoff item {item_id} not found")
        self.item_id = item_id


def list_signoff(
    db: Session, project_id: int, milestone: str | None = None
) -> list[ProjectSignoffItem]:
    get_project(db, project_id)
    stmt = select(ProjectSignoffItem).where(
        ProjectSignoffItem.project_id == project_id
    )
    if milestone is not None:
        stmt = stmt.where(ProjectSignoffItem.milestone == milestone)
    stmt = stmt.order_by(
        ProjectSignoffItem.order.asc(), ProjectSignoffItem.id.asc()
    )
    return list(db.execute(stmt).scalars().all())


def init_signoff(
    db: Session, project_id: int, milestone: str
) -> list[ProjectSignoffItem]:
    """Auto-populate checklist chuẩn cho 1 milestone (idempotent theo item)."""
    get_project(db, project_id)
    template = SIGNOFF_TEMPLATES.get(milestone, [])
    existing = list_signoff(db, project_id, milestone)
    existing_items = {i.item for i in existing}

    max_order = db.execute(
        select(func.coalesce(func.max(ProjectSignoffItem.order), -1)).where(
            ProjectSignoffItem.project_id == project_id,
            ProjectSignoffItem.milestone == milestone,
        )
    ).scalar_one()

    order = max_order + 1
    created = False
    for category, item in template:
        if item in existing_items:
            continue
        db.add(
            ProjectSignoffItem(
                project_id=project_id,
                category=category,
                item=item,
                milestone=milestone,
                status="not_started",
                order=order,
            )
        )
        order += 1
        created = True

    if created:
        db.commit()
        from modules.projects.activity_service import log_activity

        log_activity(
            db,
            project_id,
            "signoff_initialized",
            None,
            f"{milestone.upper()} checklist",
        )
    return list_signoff(db, project_id, milestone)


def create_signoff(
    db: Session, project_id: int, payload: SignoffCreate
) -> ProjectSignoffItem:
    get_project(db, project_id)
    order = payload.order
    if order is None:
        max_order = db.execute(
            select(func.coalesce(func.max(ProjectSignoffItem.order), -1)).where(
                ProjectSignoffItem.project_id == project_id,
                ProjectSignoffItem.milestone == payload.milestone.value,
            )
        ).scalar_one()
        order = max_order + 1

    item = ProjectSignoffItem(
        project_id=project_id,
        category=payload.category,
        item=payload.item,
        milestone=payload.milestone.value,
        status=payload.status.value,
        notes=payload.notes,
        completed_date=payload.completed_date,
        order=order,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _get_item(
    db: Session, project_id: int, item_id: int
) -> ProjectSignoffItem:
    item = db.get(ProjectSignoffItem, item_id)
    if item is None or item.project_id != project_id:
        raise SignoffItemNotFoundError(item_id)
    return item


def update_signoff(
    db: Session, project_id: int, item_id: int, payload: SignoffUpdate
) -> ProjectSignoffItem:
    item = _get_item(db, project_id, item_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field in {"milestone", "status"} and value is not None:
            setattr(item, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(item, field, value)

    # Tự set completed_date khi chuyển sang done nếu chưa có.
    if data.get("status") is not None:
        new_status = item.status
        if new_status == "done" and item.completed_date is None:
            item.completed_date = date.today()

    db.commit()
    db.refresh(item)
    return item


def delete_signoff(db: Session, project_id: int, item_id: int) -> None:
    item = _get_item(db, project_id, item_id)
    db.delete(item)
    db.commit()


def signoff_progress(
    db: Session, project_id: int, milestone: str
) -> SignoffProgress:
    items = list_signoff(db, project_id, milestone)
    done_statuses = {"done", "waived", "na"}

    by_cat: dict[str, list[int]] = {}
    for item in items:
        bucket = by_cat.setdefault(item.category, [0, 0])
        bucket[1] += 1
        if item.status in done_statuses:
            bucket[0] += 1

    categories = [
        SignoffCategoryProgress(category=cat, done=vals[0], total=vals[1])
        for cat, vals in by_cat.items()
    ]
    total = len(items)
    done = sum(1 for i in items if i.status in done_statuses)
    percent = round(done / total * 100) if total else 0
    return SignoffProgress(
        milestone=milestone,
        done=done,
        total=total,
        percent=percent,
        by_category=categories,
    )

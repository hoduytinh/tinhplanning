"""Service layer for meeting templates (CRUD + idempotent system seed)."""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.meetings.models import MeetingTemplate
from modules.meetings.schemas import TemplateCreate, TemplateUpdate
from modules.meetings.system_templates import SYSTEM_TEMPLATES

logger = logging.getLogger("leadboard.meetings")


class TemplateNotFoundError(Exception):
    def __init__(self, template_id: int) -> None:
        super().__init__(f"Meeting template {template_id} not found")
        self.template_id = template_id


class SystemTemplateError(Exception):
    """Raised when trying to modify/delete a system template."""


def seed_system_templates(db: Session) -> int:
    """Create the 5 system templates if they don't already exist.

    Idempotent: matches on (is_system=True, type). Returns how many created.
    """
    existing_types = {
        t.type
        for t in db.execute(
            select(MeetingTemplate).where(MeetingTemplate.is_system.is_(True))
        )
        .scalars()
        .all()
    }
    created = 0
    for tpl in SYSTEM_TEMPLATES:
        if tpl["type"] in existing_types:
            continue
        db.add(
            MeetingTemplate(
                name=tpl["name"],
                type=tpl["type"],
                icon=tpl["icon"],
                color=tpl["color"],
                is_system=True,
                config=tpl["config"],
            )
        )
        created += 1
    if created:
        db.commit()
        logger.info("Seeded %s system meeting templates.", created)
    return created


def list_templates(db: Session) -> list[MeetingTemplate]:
    return list(
        db.execute(
            select(MeetingTemplate).order_by(
                MeetingTemplate.is_system.desc(), MeetingTemplate.id
            )
        )
        .scalars()
        .all()
    )


def get_template(db: Session, template_id: int) -> MeetingTemplate:
    tpl = db.get(MeetingTemplate, template_id)
    if tpl is None:
        raise TemplateNotFoundError(template_id)
    return tpl


def create_template(db: Session, payload: TemplateCreate) -> MeetingTemplate:
    tpl = MeetingTemplate(
        name=payload.name,
        type=payload.type.value,
        icon=payload.icon or "📅",
        color=payload.color or "#6366f1",
        is_system=False,
        config=payload.config or {},
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)
    return tpl


def update_template(
    db: Session, template_id: int, payload: TemplateUpdate
) -> MeetingTemplate:
    tpl = get_template(db, template_id)
    if tpl.is_system:
        raise SystemTemplateError("Cannot edit a system template.")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "type" and value is not None:
            setattr(tpl, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(tpl, field, value)
    db.commit()
    db.refresh(tpl)
    return tpl


def delete_template(db: Session, template_id: int) -> None:
    tpl = get_template(db, template_id)
    if tpl.is_system:
        raise SystemTemplateError("Cannot delete a system template.")
    db.delete(tpl)
    db.commit()

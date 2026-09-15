"""Service layer for meetings and their sub-resources."""
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.meetings.models import (
    Meeting,
    MeetingActionItem,
    MeetingAgendaItem,
    MeetingAttendee,
    MeetingCloseChecklistItem,
    MeetingSection,
)
from modules.meetings.schemas import (
    ActionItemCreate,
    ActionItemUpdate,
    AgendaItemCreate,
    AgendaItemUpdate,
    AttendeeCreate,
    MeetingCreate,
    MeetingUpdate,
    SectionCreate,
    SectionUpdate,
)
from modules.meetings.template_service import get_template

RECURRING_DAYS = {"weekly": 7, "biweekly": 14, "monthly": 30}


# --- Exceptions ------------------------------------------------------------
class MeetingNotFoundError(Exception):
    def __init__(self, meeting_id: int) -> None:
        super().__init__(f"Meeting {meeting_id} not found")
        self.meeting_id = meeting_id


class AttendeeNotFoundError(Exception):
    pass


class AgendaItemNotFoundError(Exception):
    pass


class SectionNotFoundError(Exception):
    pass


class ActionItemNotFoundError(Exception):
    pass


class ChecklistItemNotFoundError(Exception):
    pass


class MeetingValidationError(Exception):
    pass


# --- Helpers ---------------------------------------------------------------
def _enum_value(v):
    return v.value if hasattr(v, "value") else v


def open_action_count(meeting: Meeting) -> int:
    return sum(1 for a in meeting.action_items if a.status == "open")


def _materialize_from_template(db: Session, meeting: Meeting, config: dict) -> None:
    """Create default sections/agenda/attendees/checklist from template config."""
    if not config:
        return

    for idx, sec in enumerate(config.get("sections", []), start=1):
        db.add(
            MeetingSection(
                meeting_id=meeting.id,
                section_type=sec.get("type", "notes"),
                title=sec.get("title", "Section"),
                order=sec.get("order", idx),
                is_required=bool(sec.get("is_required", False)),
                content={"config": sec.get("config", {})},
            )
        )

    defaults = config.get("defaults", {})
    for idx, title in enumerate(defaults.get("agenda_items", []), start=1):
        db.add(
            MeetingAgendaItem(meeting_id=meeting.id, title=title, order=idx)
        )
    for att in defaults.get("attendees", []):
        db.add(
            MeetingAttendee(
                meeting_id=meeting.id,
                name=att.get("name", ""),
                role=att.get("role"),
                is_host=bool(att.get("is_host", False)),
                is_external=bool(att.get("is_external", False)),
            )
        )

    for idx, item in enumerate(config.get("close_checklist", []), start=1):
        db.add(
            MeetingCloseChecklistItem(
                meeting_id=meeting.id, item=item, order=idx
            )
        )


# --- Meeting CRUD ----------------------------------------------------------
def get_meeting(db: Session, meeting_id: int) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise MeetingNotFoundError(meeting_id)
    return meeting


def list_meetings(
    db: Session,
    *,
    project_id: int | None = None,
    template_id: int | None = None,
    status: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[Meeting]:
    stmt = select(Meeting)
    if project_id is not None:
        stmt = stmt.where(Meeting.project_id == project_id)
    if template_id is not None:
        stmt = stmt.where(Meeting.template_id == template_id)
    if status is not None:
        stmt = stmt.where(Meeting.status == status)
    if date_from is not None:
        stmt = stmt.where(Meeting.date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Meeting.date <= date_to)
    stmt = stmt.order_by(Meeting.date.desc().nullslast(), Meeting.id.desc())
    return list(db.execute(stmt).scalars().all())


def create_meeting(db: Session, payload: MeetingCreate) -> Meeting:
    meeting = Meeting(
        title=payload.title,
        template_id=payload.template_id,
        project_id=payload.project_id,
        subblock_id=payload.subblock_id,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        recurring=_enum_value(payload.recurring) or "none",
        recurring_interval_days=payload.recurring_interval_days,
        notes=payload.notes,
        runtime_config=payload.runtime_config,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    # Materialize default content from the template, if any.
    if payload.template_id is not None:
        tpl = get_template(db, payload.template_id)
        _materialize_from_template(db, meeting, tpl.config or {})
        db.commit()
        db.refresh(meeting)

    return meeting


def update_meeting(db: Session, meeting_id: int, payload: MeetingUpdate) -> Meeting:
    meeting = get_meeting(db, meeting_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(meeting, field, _enum_value(value))
    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, meeting_id: int) -> None:
    meeting = get_meeting(db, meeting_id)
    db.delete(meeting)
    db.commit()


# --- Attendees -------------------------------------------------------------
def list_attendees(db: Session, meeting_id: int) -> list[MeetingAttendee]:
    get_meeting(db, meeting_id)
    return list(
        db.execute(
            select(MeetingAttendee)
            .where(MeetingAttendee.meeting_id == meeting_id)
            .order_by(MeetingAttendee.id)
        )
        .scalars()
        .all()
    )


def create_attendee(
    db: Session, meeting_id: int, payload: AttendeeCreate
) -> MeetingAttendee:
    get_meeting(db, meeting_id)
    att = MeetingAttendee(
        meeting_id=meeting_id,
        name=payload.name,
        role=payload.role,
        is_host=payload.is_host,
        is_external=payload.is_external,
    )
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


def delete_attendee(db: Session, meeting_id: int, attendee_id: int) -> None:
    att = db.get(MeetingAttendee, attendee_id)
    if att is None or att.meeting_id != meeting_id:
        raise AttendeeNotFoundError()
    db.delete(att)
    db.commit()


# --- Agenda ----------------------------------------------------------------
def _next_order(db: Session, model, meeting_id: int) -> int:
    rows = db.execute(
        select(model.order).where(model.meeting_id == meeting_id)
    ).scalars().all()
    return (max(rows) + 1) if rows else 1


def list_agenda(db: Session, meeting_id: int) -> list[MeetingAgendaItem]:
    get_meeting(db, meeting_id)
    return list(
        db.execute(
            select(MeetingAgendaItem)
            .where(MeetingAgendaItem.meeting_id == meeting_id)
            .order_by(MeetingAgendaItem.order)
        )
        .scalars()
        .all()
    )


def create_agenda_item(
    db: Session, meeting_id: int, payload: AgendaItemCreate
) -> MeetingAgendaItem:
    get_meeting(db, meeting_id)
    order = payload.order if payload.order is not None else _next_order(
        db, MeetingAgendaItem, meeting_id
    )
    item = MeetingAgendaItem(meeting_id=meeting_id, title=payload.title, order=order)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_agenda_item(
    db: Session, meeting_id: int, item_id: int, payload: AgendaItemUpdate
) -> MeetingAgendaItem:
    item = db.get(MeetingAgendaItem, item_id)
    if item is None or item.meeting_id != meeting_id:
        raise AgendaItemNotFoundError()
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_agenda_item(db: Session, meeting_id: int, item_id: int) -> None:
    item = db.get(MeetingAgendaItem, item_id)
    if item is None or item.meeting_id != meeting_id:
        raise AgendaItemNotFoundError()
    db.delete(item)
    db.commit()


# --- Sections --------------------------------------------------------------
def list_sections(db: Session, meeting_id: int) -> list[MeetingSection]:
    get_meeting(db, meeting_id)
    return list(
        db.execute(
            select(MeetingSection)
            .where(MeetingSection.meeting_id == meeting_id)
            .order_by(MeetingSection.order)
        )
        .scalars()
        .all()
    )


def create_section(
    db: Session, meeting_id: int, payload: SectionCreate
) -> MeetingSection:
    get_meeting(db, meeting_id)
    order = payload.order if payload.order is not None else _next_order(
        db, MeetingSection, meeting_id
    )
    section = MeetingSection(
        meeting_id=meeting_id,
        section_type=_enum_value(payload.section_type),
        title=payload.title,
        order=order,
        is_required=payload.is_required,
        color=payload.color,
        content=payload.content or {},
    )
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def update_section(
    db: Session, meeting_id: int, section_id: int, payload: SectionUpdate
) -> MeetingSection:
    section = db.get(MeetingSection, section_id)
    if section is None or section.meeting_id != meeting_id:
        raise SectionNotFoundError()
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(section, field, value)
    db.commit()
    db.refresh(section)
    return section


def delete_section(db: Session, meeting_id: int, section_id: int) -> None:
    section = db.get(MeetingSection, section_id)
    if section is None or section.meeting_id != meeting_id:
        raise SectionNotFoundError()
    db.delete(section)
    db.commit()


# --- Action items ----------------------------------------------------------
def list_action_items(db: Session, meeting_id: int) -> list[MeetingActionItem]:
    get_meeting(db, meeting_id)
    return list(
        db.execute(
            select(MeetingActionItem)
            .where(MeetingActionItem.meeting_id == meeting_id)
            .order_by(MeetingActionItem.id)
        )
        .scalars()
        .all()
    )


def create_action_item(
    db: Session, meeting_id: int, payload: ActionItemCreate
) -> MeetingActionItem:
    get_meeting(db, meeting_id)
    ai = MeetingActionItem(
        meeting_id=meeting_id,
        content=payload.content,
        assignee=payload.assignee,
        due_date=payload.due_date,
        priority=_enum_value(payload.priority),
        category=payload.category,
        status=_enum_value(payload.status) or "open",
    )
    db.add(ai)
    db.commit()
    db.refresh(ai)
    return ai


def update_action_item(
    db: Session, meeting_id: int, ai_id: int, payload: ActionItemUpdate
) -> MeetingActionItem:
    ai = db.get(MeetingActionItem, ai_id)
    if ai is None or ai.meeting_id != meeting_id:
        raise ActionItemNotFoundError()
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(ai, field, _enum_value(value))
    db.commit()
    db.refresh(ai)
    return ai


def delete_action_item(db: Session, meeting_id: int, ai_id: int) -> None:
    ai = db.get(MeetingActionItem, ai_id)
    if ai is None or ai.meeting_id != meeting_id:
        raise ActionItemNotFoundError()
    db.delete(ai)
    db.commit()


def create_task_from_action(
    db: Session, meeting_id: int, ai_id: int
) -> tuple[int, MeetingActionItem]:
    """Spawn a Task from an action item and link it back."""
    from modules.tasks.models import Task

    ai = db.get(MeetingActionItem, ai_id)
    if ai is None or ai.meeting_id != meeting_id:
        raise ActionItemNotFoundError()
    meeting = get_meeting(db, meeting_id)

    due = None
    if ai.due_date is not None:
        due = datetime(ai.due_date.year, ai.due_date.month, ai.due_date.day)

    task = Task(
        title=ai.content[:255],
        priority=ai.priority or "normal",
        status="not_started",
        type="my_task",
        due_date=due,
        project_id=meeting.project_id,
        subblock_id=meeting.subblock_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    ai.task_id = task.id
    db.commit()
    db.refresh(ai)
    return task.id, ai


# --- Close checklist -------------------------------------------------------
def list_close_checklist(
    db: Session, meeting_id: int
) -> list[MeetingCloseChecklistItem]:
    get_meeting(db, meeting_id)
    return list(
        db.execute(
            select(MeetingCloseChecklistItem)
            .where(MeetingCloseChecklistItem.meeting_id == meeting_id)
            .order_by(MeetingCloseChecklistItem.order)
        )
        .scalars()
        .all()
    )


def update_checklist_item(
    db: Session, meeting_id: int, item_id: int, is_checked: bool
) -> MeetingCloseChecklistItem:
    item = db.get(MeetingCloseChecklistItem, item_id)
    if item is None or item.meeting_id != meeting_id:
        raise ChecklistItemNotFoundError()
    item.is_checked = is_checked
    db.commit()
    db.refresh(item)
    return item


# --- Lifecycle -------------------------------------------------------------
def _next_date(base: date | None, recurring: str, interval_days: int | None) -> date:
    start = base or date.today()
    if recurring == "custom" and interval_days:
        return start + timedelta(days=interval_days)
    return start + timedelta(days=RECURRING_DAYS.get(recurring, 7))


def _copy_attendees(db: Session, src_id: int, dst_id: int) -> None:
    for att in list_attendees(db, src_id):
        db.add(
            MeetingAttendee(
                meeting_id=dst_id,
                name=att.name,
                role=att.role,
                is_host=att.is_host,
                is_external=att.is_external,
            )
        )


def _copy_agenda(db: Session, src_id: int, dst_id: int) -> None:
    for item in list_agenda(db, src_id):
        db.add(
            MeetingAgendaItem(meeting_id=dst_id, title=item.title, order=item.order)
        )


def _copy_sections(db: Session, src_id: int, dst_id: int) -> None:
    for sec in list_sections(db, src_id):
        db.add(
            MeetingSection(
                meeting_id=dst_id,
                section_type=sec.section_type,
                title=sec.title,
                order=sec.order,
                is_required=sec.is_required,
                content={"config": (sec.content or {}).get("config", {})},
            )
        )


def _copy_checklist(db: Session, src_id: int, dst_id: int) -> None:
    for item in list_close_checklist(db, src_id):
        db.add(
            MeetingCloseChecklistItem(
                meeting_id=dst_id, item=item.item, order=item.order
            )
        )


def close_meeting(db: Session, meeting_id: int) -> dict:
    """Close a meeting: mark done, carry over open AIs, create next if recurring."""
    meeting = get_meeting(db, meeting_id)
    meeting.status = "done"

    open_ais = [a for a in meeting.action_items if a.status == "open"]

    # Best-effort "sync" marker: report which data widgets would sync to project.
    synced: list[str] = []
    if meeting.project_id is not None:
        for section in meeting.sections:
            if section.section_type in {
                "coverage_widget",
                "bug_widget",
                "milestone_widget",
            }:
                synced.append(section.title)

    next_meeting_id: int | None = None
    if meeting.recurring and meeting.recurring != "none":
        next_date = _next_date(
            meeting.date, meeting.recurring, meeting.recurring_interval_days
        )
        next_meeting = Meeting(
            title=meeting.title,
            template_id=meeting.template_id,
            project_id=meeting.project_id,
            subblock_id=meeting.subblock_id,
            date=next_date,
            start_time=meeting.start_time,
            end_time=meeting.end_time,
            location=meeting.location,
            recurring=meeting.recurring,
            recurring_interval_days=meeting.recurring_interval_days,
            parent_meeting_id=meeting.id,
            status="upcoming",
        )
        db.add(next_meeting)
        db.commit()
        db.refresh(next_meeting)
        next_meeting_id = next_meeting.id

        _copy_attendees(db, meeting.id, next_meeting.id)
        _copy_agenda(db, meeting.id, next_meeting.id)
        _copy_sections(db, meeting.id, next_meeting.id)
        _copy_checklist(db, meeting.id, next_meeting.id)

        for ai in open_ais:
            db.add(
                MeetingActionItem(
                    meeting_id=next_meeting.id,
                    content=ai.content,
                    assignee=ai.assignee,
                    due_date=ai.due_date,
                    priority=ai.priority,
                    category=ai.category,
                    status="open",
                    carried_over_from=ai.id,
                )
            )

    db.commit()
    return {
        "next_meeting_id": next_meeting_id,
        "carried_over_count": len(open_ais) if next_meeting_id else 0,
        "synced_sections": synced,
    }


def duplicate_meeting(db: Session, meeting_id: int) -> Meeting:
    src = get_meeting(db, meeting_id)
    copy = Meeting(
        title=f"{src.title} (copy)",
        template_id=src.template_id,
        project_id=src.project_id,
        subblock_id=src.subblock_id,
        date=src.date,
        start_time=src.start_time,
        end_time=src.end_time,
        location=src.location,
        recurring=src.recurring,
        recurring_interval_days=src.recurring_interval_days,
        status="upcoming",
        notes=src.notes,
        runtime_config=src.runtime_config,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)

    _copy_attendees(db, src.id, copy.id)
    _copy_agenda(db, src.id, copy.id)
    _copy_sections(db, src.id, copy.id)
    _copy_checklist(db, src.id, copy.id)
    db.commit()
    db.refresh(copy)
    return copy


def generate_summary(db: Session, meeting_id: int) -> str:
    """Build a plain-text summary suitable for Slack/email."""
    meeting = get_meeting(db, meeting_id)
    date_str = meeting.date.strftime("%d/%m/%Y") if meeting.date else "N/A"
    lines = [f"{meeting.title} - {date_str}"]

    # Attendees
    attendees = [a.name for a in meeting.attendees]
    if attendees:
        lines.append(f"Attendees: {', '.join(attendees)}")

    # Coverage widget line
    for section in meeting.sections:
        if section.section_type == "coverage_widget":
            rows = (section.content or {}).get("rows", [])
            parts = []
            for r in rows:
                name = r.get("Block") or r.get("block") or "?"
                passv = r.get("Pass%") or r.get("pass") or ""
                if name:
                    parts.append(f"{name} {passv}".strip())
            if parts:
                lines.append(f"Coverage: {' | '.join(parts)}")

    # Blockers
    blocker_count = 0
    for section in meeting.sections:
        if section.section_type == "blocker_table":
            blocker_count += len((section.content or {}).get("rows", []))
    if blocker_count:
        lines.append(f"Blockers: {blocker_count} open")

    # Action items
    new_ais = sum(
        1 for a in meeting.action_items if a.carried_over_from is None
    )
    carried = sum(
        1 for a in meeting.action_items if a.carried_over_from is not None
    )
    lines.append(f"Action Items: {new_ais} new, {carried} carried over")

    # Next meeting
    if meeting.recurring and meeting.recurring != "none":
        nd = _next_date(
            meeting.date, meeting.recurring, meeting.recurring_interval_days
        )
        lines.append(f"Next meeting: {nd.strftime('%d/%m/%Y')}")

    return "\n".join(lines)

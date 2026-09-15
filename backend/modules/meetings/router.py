"""API endpoints for meetings and their sub-resources."""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.meetings import service
from modules.meetings.models import Meeting, MeetingTemplate
from modules.meetings.schemas import (
    ActionItemCreate,
    ActionItemRead,
    ActionItemUpdate,
    AgendaItemCreate,
    AgendaItemRead,
    AgendaItemUpdate,
    AttendeeCreate,
    AttendeeRead,
    CloseChecklistItemRead,
    CloseChecklistItemUpdate,
    CloseMeetingResult,
    CreateTaskResult,
    MeetingCreate,
    MeetingDetail,
    MeetingRead,
    MeetingStatus,
    MeetingSummary,
    MeetingUpdate,
    SectionCreate,
    SectionRead,
    SectionUpdate,
    SummaryText,
)
from modules.meetings.service import (
    ActionItemNotFoundError,
    AgendaItemNotFoundError,
    AttendeeNotFoundError,
    ChecklistItemNotFoundError,
    MeetingNotFoundError,
    SectionNotFoundError,
)

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _detail(db: Session, meeting: Meeting) -> MeetingDetail:
    base = MeetingRead.model_validate(meeting).model_dump()
    return MeetingDetail(
        **base,
        attendees=[AttendeeRead.model_validate(a) for a in meeting.attendees],
        agenda_items=[
            AgendaItemRead.model_validate(a)
            for a in sorted(meeting.agenda_items, key=lambda x: x.order)
        ],
        sections=[
            SectionRead.model_validate(s)
            for s in sorted(meeting.sections, key=lambda x: x.order)
        ],
        action_items=[
            ActionItemRead.model_validate(a) for a in meeting.action_items
        ],
        close_checklist=[
            CloseChecklistItemRead.model_validate(c)
            for c in sorted(meeting.close_checklist, key=lambda x: x.order)
        ],
        open_action_count=service.open_action_count(meeting),
    )


def _summary(meeting: Meeting, tpl: MeetingTemplate | None) -> MeetingSummary:
    return MeetingSummary(
        id=meeting.id,
        title=meeting.title,
        template_id=meeting.template_id,
        project_id=meeting.project_id,
        date=meeting.date,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        status=meeting.status,
        recurring=meeting.recurring,
        attendee_count=len(meeting.attendees),
        action_count=len(meeting.action_items),
        open_action_count=service.open_action_count(meeting),
        attendee_names=[a.name for a in meeting.attendees],
        template_icon=tpl.icon if tpl else None,
        template_type=tpl.type if tpl else None,
    )


# ---------------------------------------------------------------------------
# Meetings CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=list[MeetingSummary])
def list_meetings(
    db: Session = Depends(get_db),
    project_id: int | None = None,
    template_id: int | None = None,
    meeting_status: MeetingStatus | None = Query(default=None, alias="status"),
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[MeetingSummary]:
    meetings = service.list_meetings(
        db,
        project_id=project_id,
        template_id=template_id,
        status=meeting_status.value if meeting_status else None,
        date_from=date_from,
        date_to=date_to,
    )
    templates = {t.id: t for t in db.query(MeetingTemplate).all()}
    return [_summary(m, templates.get(m.template_id)) for m in meetings]


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)) -> MeetingDetail:
    return _detail(db, service.create_meeting(db, payload))


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> MeetingDetail:
    try:
        return _detail(db, service.get_meeting(db, meeting_id))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(
    meeting_id: int, payload: MeetingUpdate, db: Session = Depends(get_db)
) -> MeetingDetail:
    try:
        return _detail(db, service.update_meeting(db, meeting_id, payload))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_meeting(db, meeting_id)
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Attendees
# ---------------------------------------------------------------------------
@router.post(
    "/{meeting_id}/attendees",
    response_model=AttendeeRead,
    status_code=status.HTTP_201_CREATED,
)
def add_attendee(
    meeting_id: int, payload: AttendeeCreate, db: Session = Depends(get_db)
) -> AttendeeRead:
    try:
        return AttendeeRead.model_validate(
            service.create_attendee(db, meeting_id, payload)
        )
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{meeting_id}/attendees/{attendee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_attendee(
    meeting_id: int, attendee_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        service.delete_attendee(db, meeting_id, attendee_id)
    except AttendeeNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


# ---------------------------------------------------------------------------
# Agenda
# ---------------------------------------------------------------------------
@router.post(
    "/{meeting_id}/agenda",
    response_model=AgendaItemRead,
    status_code=status.HTTP_201_CREATED,
)
def add_agenda_item(
    meeting_id: int, payload: AgendaItemCreate, db: Session = Depends(get_db)
) -> AgendaItemRead:
    try:
        return AgendaItemRead.model_validate(
            service.create_agenda_item(db, meeting_id, payload)
        )
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{meeting_id}/agenda/{item_id}", response_model=AgendaItemRead)
def edit_agenda_item(
    meeting_id: int,
    item_id: int,
    payload: AgendaItemUpdate,
    db: Session = Depends(get_db),
) -> AgendaItemRead:
    try:
        return AgendaItemRead.model_validate(
            service.update_agenda_item(db, meeting_id, item_id, payload)
        )
    except AgendaItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete(
    "/{meeting_id}/agenda/{item_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_agenda_item(
    meeting_id: int, item_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        service.delete_agenda_item(db, meeting_id, item_id)
    except AgendaItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------
@router.post(
    "/{meeting_id}/sections",
    response_model=SectionRead,
    status_code=status.HTTP_201_CREATED,
)
def add_section(
    meeting_id: int, payload: SectionCreate, db: Session = Depends(get_db)
) -> SectionRead:
    try:
        return SectionRead.model_validate(
            service.create_section(db, meeting_id, payload)
        )
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{meeting_id}/sections/{section_id}", response_model=SectionRead)
def edit_section(
    meeting_id: int,
    section_id: int,
    payload: SectionUpdate,
    db: Session = Depends(get_db),
) -> SectionRead:
    try:
        return SectionRead.model_validate(
            service.update_section(db, meeting_id, section_id, payload)
        )
    except SectionNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete(
    "/{meeting_id}/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_section(
    meeting_id: int, section_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        service.delete_section(db, meeting_id, section_id)
    except SectionNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


# ---------------------------------------------------------------------------
# Action items
# ---------------------------------------------------------------------------
@router.post(
    "/{meeting_id}/action-items",
    response_model=ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def add_action_item(
    meeting_id: int, payload: ActionItemCreate, db: Session = Depends(get_db)
) -> ActionItemRead:
    try:
        return ActionItemRead.model_validate(
            service.create_action_item(db, meeting_id, payload)
        )
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch(
    "/{meeting_id}/action-items/{ai_id}", response_model=ActionItemRead
)
def edit_action_item(
    meeting_id: int,
    ai_id: int,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
) -> ActionItemRead:
    try:
        return ActionItemRead.model_validate(
            service.update_action_item(db, meeting_id, ai_id, payload)
        )
    except ActionItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.delete(
    "/{meeting_id}/action-items/{ai_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_action_item(
    meeting_id: int, ai_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        service.delete_action_item(db, meeting_id, ai_id)
    except ActionItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


@router.post(
    "/{meeting_id}/action-items/{ai_id}/create-task",
    response_model=CreateTaskResult,
)
def create_task_from_action(
    meeting_id: int, ai_id: int, db: Session = Depends(get_db)
) -> CreateTaskResult:
    try:
        task_id, ai = service.create_task_from_action(db, meeting_id, ai_id)
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ActionItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return CreateTaskResult(task_id=task_id, action_item_id=ai.id)


# ---------------------------------------------------------------------------
# Close checklist
# ---------------------------------------------------------------------------
@router.patch(
    "/{meeting_id}/checklist/{item_id}", response_model=CloseChecklistItemRead
)
def toggle_checklist_item(
    meeting_id: int,
    item_id: int,
    payload: CloseChecklistItemUpdate,
    db: Session = Depends(get_db),
) -> CloseChecklistItemRead:
    try:
        return CloseChecklistItemRead.model_validate(
            service.update_checklist_item(
                db, meeting_id, item_id, payload.is_checked
            )
        )
    except ChecklistItemNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
@router.post("/{meeting_id}/close", response_model=CloseMeetingResult)
def close_meeting(meeting_id: int, db: Session = Depends(get_db)) -> CloseMeetingResult:
    try:
        result = service.close_meeting(db, meeting_id)
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return CloseMeetingResult(**result)


@router.post(
    "/{meeting_id}/duplicate",
    response_model=MeetingDetail,
    status_code=status.HTTP_201_CREATED,
)
def duplicate_meeting(meeting_id: int, db: Session = Depends(get_db)) -> MeetingDetail:
    try:
        return _detail(db, service.duplicate_meeting(db, meeting_id))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{meeting_id}/summary", response_model=SummaryText)
def get_summary(meeting_id: int, db: Session = Depends(get_db)) -> SummaryText:
    try:
        return SummaryText(text=service.generate_summary(db, meeting_id))
    except MeetingNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

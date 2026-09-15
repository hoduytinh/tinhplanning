"""Pydantic v2 schemas for the Meetings module."""
from datetime import date as DateT
from datetime import datetime, time
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


# --- Enums -----------------------------------------------------------------
class MeetingTemplateType(str, Enum):
    dv_internal = "dv_internal"
    dne = "dne"
    project_cft = "project_cft"
    bug_review = "bug_review"
    design_review = "design_review"
    one_on_one = "one_on_one"
    custom = "custom"


class MeetingRecurring(str, Enum):
    none = "none"
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"
    custom = "custom"


class MeetingStatus(str, Enum):
    upcoming = "upcoming"
    in_progress = "in_progress"
    done = "done"
    cancelled = "cancelled"


class SectionType(str, Enum):
    coverage_widget = "coverage_widget"
    bug_widget = "bug_widget"
    blocker_table = "blocker_table"
    milestone_widget = "milestone_widget"
    workload_widget = "workload_widget"
    decision_log = "decision_log"
    risk_widget = "risk_widget"
    notes = "notes"
    action_items = "action_items"
    custom = "custom"


class ActionItemPriority(str, Enum):
    critical = "critical"
    important = "important"
    normal = "normal"


class ActionItemStatus(str, Enum):
    open = "open"
    done = "done"
    cancelled = "cancelled"


# --- Templates -------------------------------------------------------------
class TemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: MeetingTemplateType = MeetingTemplateType.custom
    icon: str = Field(default="📅", max_length=16)
    color: str = Field(default="#6366f1", max_length=16)
    config: dict = Field(default_factory=dict)


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    type: MeetingTemplateType | None = None
    icon: str | None = Field(default=None, max_length=16)
    color: str | None = Field(default=None, max_length=16)
    config: dict | None = None


class TemplateRead(TemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_system: bool
    created_at: datetime
    updated_at: datetime


# --- Attendees -------------------------------------------------------------
class AttendeeCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    role: str | None = Field(default=None, max_length=128)
    is_host: bool = False
    is_external: bool = False


class AttendeeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    name: str
    role: str | None
    is_host: bool
    is_external: bool


# --- Agenda ----------------------------------------------------------------
class AgendaItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    order: int | None = None


class AgendaItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    order: int | None = None


class AgendaItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    title: str
    order: int


# --- Sections --------------------------------------------------------------
class SectionCreate(BaseModel):
    section_type: SectionType
    title: str = Field(..., min_length=1, max_length=255)
    order: int | None = None
    is_required: bool = False
    color: str = Field(default="#f8fafc", max_length=16)
    content: dict = Field(default_factory=dict)


class SectionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    order: int | None = None
    is_required: bool | None = None
    color: str | None = Field(default=None, max_length=16)
    content: dict | None = None


class SectionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    section_type: str
    title: str
    order: int
    is_required: bool
    color: str
    content: dict | None


# --- Action Items ----------------------------------------------------------
class ActionItemCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)
    assignee: str | None = Field(default=None, max_length=255)
    due_date: DateT | None = None
    priority: ActionItemPriority | None = None
    category: str | None = Field(default=None, max_length=64)
    status: ActionItemStatus = ActionItemStatus.open


class ActionItemUpdate(BaseModel):
    content: str | None = Field(default=None, min_length=1, max_length=500)
    assignee: str | None = Field(default=None, max_length=255)
    due_date: DateT | None = None
    priority: ActionItemPriority | None = None
    category: str | None = Field(default=None, max_length=64)
    status: ActionItemStatus | None = None


class ActionItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    task_id: int | None
    content: str
    assignee: str | None
    due_date: DateT | None
    priority: str | None
    category: str | None
    status: str
    carried_over_from: int | None


# --- Close checklist -------------------------------------------------------
class CloseChecklistItemUpdate(BaseModel):
    is_checked: bool


class CloseChecklistItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    meeting_id: int
    item: str
    is_checked: bool
    order: int


# --- Meetings --------------------------------------------------------------
class MeetingBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    template_id: int | None = None
    project_id: int | None = None
    subblock_id: int | None = None
    date: DateT | None = None
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = Field(default=None, max_length=255)
    recurring: MeetingRecurring = MeetingRecurring.none
    recurring_interval_days: int | None = None
    notes: str | None = None
    runtime_config: dict | None = None


class MeetingCreate(MeetingBase):
    pass


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    template_id: int | None = None
    project_id: int | None = None
    subblock_id: int | None = None
    date: DateT | None = None
    start_time: time | None = None
    end_time: time | None = None
    location: str | None = Field(default=None, max_length=255)
    recurring: MeetingRecurring | None = None
    recurring_interval_days: int | None = None
    status: MeetingStatus | None = None
    notes: str | None = None
    runtime_config: dict | None = None


class MeetingRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    template_id: int | None
    project_id: int | None
    subblock_id: int | None
    date: DateT | None
    start_time: time | None
    end_time: time | None
    location: str | None
    recurring: str
    recurring_interval_days: int | None
    parent_meeting_id: int | None
    status: str
    notes: str | None
    runtime_config: dict | None
    created_at: datetime
    updated_at: datetime


class MeetingDetail(MeetingRead):
    attendees: list[AttendeeRead] = []
    agenda_items: list[AgendaItemRead] = []
    sections: list[SectionRead] = []
    action_items: list[ActionItemRead] = []
    close_checklist: list[CloseChecklistItemRead] = []
    open_action_count: int = 0


class MeetingSummary(BaseModel):
    """Lightweight meeting representation for list views."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    template_id: int | None
    project_id: int | None
    date: DateT | None
    start_time: time | None
    end_time: time | None
    status: str
    recurring: str
    attendee_count: int = 0
    action_count: int = 0
    open_action_count: int = 0
    attendee_names: list[str] = []
    template_icon: str | None = None
    template_type: str | None = None


# --- Lifecycle responses ---------------------------------------------------
class CloseMeetingResult(BaseModel):
    next_meeting_id: int | None = None
    carried_over_count: int = 0
    synced_sections: list[str] = []


class SummaryText(BaseModel):
    text: str


class CreateTaskResult(BaseModel):
    task_id: int
    action_item_id: int

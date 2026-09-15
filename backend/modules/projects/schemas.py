"""Pydantic schemas for the Projects module."""
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class ProjectStatus(str, Enum):
    planning = "planning"
    in_progress = "in_progress"
    review = "review"
    done = "done"


class ProjectPriority(str, Enum):
    critical = "critical"
    important = "important"
    normal = "normal"
    backlog = "backlog"


class ProjectHealth(str, Enum):
    on_track = "on_track"
    at_risk = "at_risk"
    off_track = "off_track"
    no_data = "no_data"


class MilestoneStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    done = "done"


class MilestoneType(str, Enum):
    por = "por"
    irtl = "irtl"
    cc = "cc"
    fpf = "fpf"
    rtlf = "rtlf"
    fdr = "fdr"
    tapeout = "tapeout"
    custom = "custom"


class RiskSeverity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    prefix: str | None = Field(default=None, max_length=64)
    prefix_color: str = Field(default="#3b82f6", max_length=16)
    description: str | None = None
    status: ProjectStatus = ProjectStatus.planning
    priority: ProjectPriority = ProjectPriority.normal
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] = Field(default_factory=list)
    # Tab/tính năng tùy chọn được bật (ngoài overview/tasks/activity mặc định):
    # "coverage", "documents", "bugs", "signoff", "subblocks".
    enabled_modules: list[str] = Field(default_factory=list)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    prefix: str | None = Field(default=None, max_length=64)
    prefix_color: str | None = Field(default=None, max_length=16)
    description: str | None = None
    status: ProjectStatus | None = None
    priority: ProjectPriority | None = None
    start_date: date | None = None
    end_date: date | None = None
    tags: list[str] | None = None
    enabled_modules: list[str] | None = None


class ProjectStats(BaseModel):
    total: int
    done: int
    blocked: int
    overdue: int


class ProjectTimeline(BaseModel):
    """% thời gian đã trôi qua và % tiến độ hoàn thành task."""

    time_elapsed_pct: int
    progress_pct: int


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    health: ProjectHealth
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectRead):
    """Detail có kèm computed fields (stats + timeline)."""

    stats: ProjectStats
    timeline: ProjectTimeline


# ---------------------------------------------------------------------------
# Milestone
# ---------------------------------------------------------------------------
class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    due_date: date | None = None
    status: MilestoneStatus = MilestoneStatus.not_started
    order: int | None = None
    milestone_type: MilestoneType = MilestoneType.custom
    exit_criteria: str | None = None
    vp_checklist_url: str | None = None


class MilestoneUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    due_date: date | None = None
    status: MilestoneStatus | None = None
    order: int | None = None
    milestone_type: MilestoneType | None = None
    exit_criteria: str | None = None
    vp_checklist_url: str | None = None


class MilestoneRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    title: str
    due_date: date | None
    status: MilestoneStatus
    order: int
    milestone_type: MilestoneType
    exit_criteria: str | None
    vp_checklist_url: str | None
    created_at: datetime


class MilestoneReorder(BaseModel):
    ordered_ids: list[int]


# ---------------------------------------------------------------------------
# Risk
# ---------------------------------------------------------------------------
class RiskCreate(BaseModel):
    description: str = Field(..., min_length=1)
    severity: RiskSeverity = RiskSeverity.medium
    mitigation: str | None = None


class RiskUpdate(BaseModel):
    description: str | None = Field(default=None, min_length=1)
    severity: RiskSeverity | None = None
    mitigation: str | None = None


class RiskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    description: str
    severity: RiskSeverity
    mitigation: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Activity + Comment
# ---------------------------------------------------------------------------
class ProjectActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    action: str
    old_value: str | None
    new_value: str | None
    created_at: datetime


class ProjectCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class ProjectCommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    content: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Health (standalone endpoint)
# ---------------------------------------------------------------------------
class ProjectHealthResult(BaseModel):
    health: ProjectHealth
    stats: ProjectStats
    timeline: ProjectTimeline
    reason: str


# ---------------------------------------------------------------------------
# Coverage snapshots
# ---------------------------------------------------------------------------
class CoverageBase(BaseModel):
    week_label: str = Field(..., min_length=1, max_length=32)
    snapshot_date: date | None = None
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    testplan_total: int = 0
    testplan_passed: int = 0
    cov_statement: float = 0.0
    cov_branch: float = 0.0
    cov_toggle: float = 0.0
    cov_fsm: float = 0.0
    cov_expression: float = 0.0
    cov_acov: float = 0.0
    cov_fcov: float = 0.0
    regression_path: str | None = None
    notes: str | None = None


class CoverageCreate(CoverageBase):
    pass


class CoverageUpdate(BaseModel):
    week_label: str | None = Field(default=None, min_length=1, max_length=32)
    snapshot_date: date | None = None
    total_tests: int | None = None
    passed_tests: int | None = None
    failed_tests: int | None = None
    testplan_total: int | None = None
    testplan_passed: int | None = None
    cov_statement: float | None = None
    cov_branch: float | None = None
    cov_toggle: float | None = None
    cov_fsm: float | None = None
    cov_expression: float | None = None
    cov_acov: float | None = None
    cov_fcov: float | None = None
    regression_path: str | None = None
    notes: str | None = None


class CoverageRead(CoverageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
class DocumentCategory(str, Enum):
    spec = "spec"
    verif_doc = "verif_doc"
    status = "status"
    tool = "tool"
    other = "other"


class DocumentType(str, Enum):
    mas = "mas"
    testplan = "testplan"
    verif_strategy = "verif_strategy"
    tb_env = "tb_env"
    dashboard = "dashboard"
    tracker = "tracker"
    jira = "jira"
    ewiki = "ewiki"
    confluence = "confluence"
    sharepoint = "sharepoint"
    other = "other"


class DocumentBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., min_length=1, max_length=1024)
    category: DocumentCategory = DocumentCategory.other
    doc_type: DocumentType = DocumentType.other
    notes: str | None = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    url: str | None = Field(default=None, min_length=1, max_length=1024)
    category: DocumentCategory | None = None
    doc_type: DocumentType | None = None
    notes: str | None = None


class DocumentRead(DocumentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Bugs
# ---------------------------------------------------------------------------
class BugSeverity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"


class BugStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    cancelled = "cancelled"
    waived = "waived"


class BugBase(BaseModel):
    bug_id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=512)
    description: str | None = None
    severity: BugSeverity = BugSeverity.medium
    status: BugStatus = BugStatus.open
    jira_url: str | None = None
    found_by: str | None = None
    fixed_by: str | None = None
    found_date: date | None = None
    closed_date: date | None = None
    root_cause: str | None = None
    notes: str | None = None


class BugCreate(BugBase):
    pass


class BugUpdate(BaseModel):
    bug_id: str | None = Field(default=None, min_length=1, max_length=64)
    title: str | None = Field(default=None, min_length=1, max_length=512)
    description: str | None = None
    severity: BugSeverity | None = None
    status: BugStatus | None = None
    jira_url: str | None = None
    found_by: str | None = None
    fixed_by: str | None = None
    found_date: date | None = None
    closed_date: date | None = None
    root_cause: str | None = None
    notes: str | None = None


class BugRead(BugBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    created_at: datetime


class BugStats(BaseModel):
    by_severity: dict[str, int]
    by_status: dict[str, int]
    total: int


# ---------------------------------------------------------------------------
# Signoff checklist
# ---------------------------------------------------------------------------
class SignoffMilestone(str, Enum):
    irtl = "irtl"
    cc = "cc"
    fpf = "fpf"
    rtlf = "rtlf"
    fdr = "fdr"
    to = "to"


class SignoffStatus(str, Enum):
    not_started = "not_started"
    in_progress = "in_progress"
    done = "done"
    waived = "waived"
    na = "na"


class SignoffCreate(BaseModel):
    category: str = Field(..., min_length=1, max_length=64)
    item: str = Field(..., min_length=1, max_length=512)
    milestone: SignoffMilestone
    status: SignoffStatus = SignoffStatus.not_started
    notes: str | None = None
    completed_date: date | None = None
    order: int | None = None


class SignoffUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=64)
    item: str | None = Field(default=None, min_length=1, max_length=512)
    milestone: SignoffMilestone | None = None
    status: SignoffStatus | None = None
    notes: str | None = None
    completed_date: date | None = None
    order: int | None = None


class SignoffRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    category: str
    item: str
    milestone: SignoffMilestone
    status: SignoffStatus
    notes: str | None
    completed_date: date | None
    order: int
    created_at: datetime


class SignoffCategoryProgress(BaseModel):
    category: str
    done: int
    total: int


class SignoffProgress(BaseModel):
    milestone: SignoffMilestone
    done: int
    total: int
    percent: int
    by_category: list[SignoffCategoryProgress]


# ---------------------------------------------------------------------------
# Sub-blocks (tree)
# ---------------------------------------------------------------------------
class SubblockCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    parent_id: int | None = None


class SubblockUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)


class SubblockMove(BaseModel):
    parent_id: int | None = None
    order: int | None = None


class SubblockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    parent_id: int | None
    name: str
    slug: str
    depth: int
    order: int
    created_at: datetime


class SubblockNode(SubblockRead):
    """Node có kèm children để trả về tree."""

    children: list["SubblockNode"] = Field(default_factory=list)


SubblockNode.model_rebuild()

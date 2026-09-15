"""API endpoints for the Projects module."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.projects import (
    activity_service,
    bug_service,
    coverage_service,
    document_service,
    milestone_service,
    risk_service,
    service,
    signoff_service,
    subblock_service,
)
from modules.projects.milestone_service import MilestoneNotFoundError
from modules.projects.risk_service import RiskNotFoundError
from modules.projects.activity_service import ProjectCommentNotFoundError
from modules.projects.coverage_service import CoverageSnapshotNotFoundError
from modules.projects.document_service import DocumentNotFoundError
from modules.projects.bug_service import BugNotFoundError
from modules.projects.signoff_service import SignoffItemNotFoundError
from modules.projects.subblock_service import (
    SubblockNotFoundError,
    SubblockValidationError,
)
from modules.projects.schemas import (
    BugCreate,
    BugRead,
    BugStats,
    BugUpdate,
    CoverageCreate,
    CoverageRead,
    CoverageUpdate,
    DocumentCreate,
    DocumentRead,
    DocumentUpdate,
    MilestoneCreate,
    MilestoneRead,
    MilestoneReorder,
    MilestoneStatus,
    MilestoneUpdate,
    ProjectActivityRead,
    ProjectCommentCreate,
    ProjectCommentRead,
    ProjectCreate,
    ProjectDetail,
    ProjectHealth,
    ProjectHealthResult,
    ProjectPriority,
    ProjectRead,
    ProjectStats,
    ProjectStatus,
    ProjectUpdate,
    RiskCreate,
    RiskRead,
    RiskUpdate,
    SignoffCreate,
    SignoffMilestone,
    SignoffProgress,
    SignoffRead,
    SignoffUpdate,
    SubblockCreate,
    SubblockMove,
    SubblockNode,
    SubblockRead,
    SubblockUpdate,
)
from modules.projects.service import ProjectNotFoundError
from modules.tasks.schemas import TaskRead

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _detail(db: Session, project) -> ProjectDetail:
    """Ghép project + computed fields (stats + timeline)."""
    stats = service.compute_stats(db, project.id)
    timeline = service.compute_timeline(project, stats)
    base = ProjectRead.model_validate(project).model_dump()
    return ProjectDetail(**base, stats=stats, timeline=timeline)


# ---------------------------------------------------------------------------
# Projects CRUD
# ---------------------------------------------------------------------------
@router.get("", response_model=list[ProjectRead])
def list_projects(
    db: Session = Depends(get_db),
    project_status: ProjectStatus | None = Query(default=None, alias="status"),
    priority: ProjectPriority | None = None,
    health: ProjectHealth | None = None,
) -> list[ProjectRead]:
    projects = service.list_projects(
        db,
        status=project_status.value if project_status else None,
        priority=priority.value if priority else None,
        health=health.value if health else None,
    )
    return [ProjectRead.model_validate(p) for p in projects]


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> ProjectRead:
    return ProjectRead.model_validate(service.create_project(db, payload))


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(project_id: int, db: Session = Depends(get_db)) -> ProjectDetail:
    try:
        project = service.get_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _detail(db, project)


@router.patch("/{project_id}", response_model=ProjectDetail)
def update_project(
    project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)
) -> ProjectDetail:
    try:
        project = service.update_project(db, project_id, payload)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return _detail(db, project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: int, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Tasks / Stats / Health
# ---------------------------------------------------------------------------
@router.get("/{project_id}/tasks", response_model=list[TaskRead])
def list_project_tasks(project_id: int, db: Session = Depends(get_db)) -> list[TaskRead]:
    try:
        tasks = service.list_project_tasks(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [TaskRead.model_validate(t) for t in tasks]


@router.get("/{project_id}/stats", response_model=ProjectStats)
def get_project_stats(project_id: int, db: Session = Depends(get_db)) -> ProjectStats:
    try:
        return service.compute_stats(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.get("/{project_id}/health", response_model=ProjectHealthResult)
def get_project_health(
    project_id: int, db: Session = Depends(get_db)
) -> ProjectHealthResult:
    try:
        project = service.get_project(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    stats = service.compute_stats(db, project_id)
    timeline = service.compute_timeline(project, stats)
    health, reason = service.compute_health(project, stats)
    # Đồng bộ lại cột health nếu lệch.
    if project.health != health:
        project.health = health
        db.commit()
    return ProjectHealthResult(
        health=health, stats=stats, timeline=timeline, reason=reason
    )


# ---------------------------------------------------------------------------
# Milestones
# ---------------------------------------------------------------------------
@router.get("/{project_id}/milestones", response_model=list[MilestoneRead])
def list_milestones(project_id: int, db: Session = Depends(get_db)) -> list[MilestoneRead]:
    try:
        items = milestone_service.list_milestones(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [MilestoneRead.model_validate(m) for m in items]


@router.post(
    "/{project_id}/milestones",
    response_model=MilestoneRead,
    status_code=status.HTTP_201_CREATED,
)
def create_milestone(
    project_id: int, payload: MilestoneCreate, db: Session = Depends(get_db)
) -> MilestoneRead:
    try:
        return MilestoneRead.model_validate(
            milestone_service.create_milestone(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.put("/{project_id}/milestones/reorder", response_model=list[MilestoneRead])
def reorder_milestones(
    project_id: int, payload: MilestoneReorder, db: Session = Depends(get_db)
) -> list[MilestoneRead]:
    try:
        items = milestone_service.reorder_milestones(
            db, project_id, payload.ordered_ids
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [MilestoneRead.model_validate(m) for m in items]


@router.post(
    "/{project_id}/milestones/standard",
    response_model=list[MilestoneRead],
    status_code=status.HTTP_201_CREATED,
)
def populate_standard_milestones(
    project_id: int, db: Session = Depends(get_db)
) -> list[MilestoneRead]:
    """Tao 7 milestone chuan Marvell cho project (idempotent theo type)."""
    try:
        items = milestone_service.populate_standard_milestones(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [MilestoneRead.model_validate(m) for m in items]


@router.patch(
    "/{project_id}/milestones/{milestone_id}", response_model=MilestoneRead
)
def update_milestone(
    project_id: int,
    milestone_id: int,
    payload: MilestoneUpdate,
    db: Session = Depends(get_db),
) -> MilestoneRead:
    try:
        return MilestoneRead.model_validate(
            milestone_service.update_milestone(db, project_id, milestone_id, payload)
        )
    except (ProjectNotFoundError, MilestoneNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_milestone(
    project_id: int, milestone_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        milestone_service.delete_milestone(db, project_id, milestone_id)
    except (ProjectNotFoundError, MilestoneNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Risks
# ---------------------------------------------------------------------------
@router.get("/{project_id}/risks", response_model=list[RiskRead])
def list_risks(project_id: int, db: Session = Depends(get_db)) -> list[RiskRead]:
    try:
        items = risk_service.list_risks(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [RiskRead.model_validate(r) for r in items]


@router.post(
    "/{project_id}/risks", response_model=RiskRead, status_code=status.HTTP_201_CREATED
)
def create_risk(
    project_id: int, payload: RiskCreate, db: Session = Depends(get_db)
) -> RiskRead:
    try:
        return RiskRead.model_validate(
            risk_service.create_risk(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}/risks/{risk_id}", response_model=RiskRead)
def update_risk(
    project_id: int,
    risk_id: int,
    payload: RiskUpdate,
    db: Session = Depends(get_db),
) -> RiskRead:
    try:
        return RiskRead.model_validate(
            risk_service.update_risk(db, project_id, risk_id, payload)
        )
    except (ProjectNotFoundError, RiskNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/risks/{risk_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_risk(
    project_id: int, risk_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        risk_service.delete_risk(db, project_id, risk_id)
    except (ProjectNotFoundError, RiskNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Activity + Comments
# ---------------------------------------------------------------------------
@router.get("/{project_id}/activities", response_model=list[ProjectActivityRead])
def list_activities(
    project_id: int, db: Session = Depends(get_db)
) -> list[ProjectActivityRead]:
    try:
        items = activity_service.list_activities(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [ProjectActivityRead.model_validate(a) for a in items]


@router.get("/{project_id}/comments", response_model=list[ProjectCommentRead])
def list_comments(
    project_id: int, db: Session = Depends(get_db)
) -> list[ProjectCommentRead]:
    try:
        items = activity_service.list_comments(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [ProjectCommentRead.model_validate(c) for c in items]


@router.post(
    "/{project_id}/comments",
    response_model=ProjectCommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    project_id: int, payload: ProjectCommentCreate, db: Session = Depends(get_db)
) -> ProjectCommentRead:
    try:
        return ProjectCommentRead.model_validate(
            activity_service.create_comment(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/comments/{comment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_comment(
    project_id: int, comment_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        activity_service.delete_comment(db, project_id, comment_id)
    except (ProjectNotFoundError, ProjectCommentNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Coverage snapshots
# ---------------------------------------------------------------------------
@router.get("/{project_id}/coverage", response_model=list[CoverageRead])
def list_coverage(project_id: int, db: Session = Depends(get_db)) -> list[CoverageRead]:
    try:
        items = coverage_service.list_snapshots(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [CoverageRead.model_validate(c) for c in items]


@router.get("/{project_id}/coverage/latest", response_model=CoverageRead | None)
def latest_coverage(
    project_id: int, db: Session = Depends(get_db)
) -> CoverageRead | None:
    try:
        snapshot = coverage_service.latest_snapshot(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return CoverageRead.model_validate(snapshot) if snapshot else None


@router.post(
    "/{project_id}/coverage",
    response_model=CoverageRead,
    status_code=status.HTTP_201_CREATED,
)
def create_coverage(
    project_id: int, payload: CoverageCreate, db: Session = Depends(get_db)
) -> CoverageRead:
    try:
        return CoverageRead.model_validate(
            coverage_service.create_snapshot(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}/coverage/{snap_id}", response_model=CoverageRead)
def update_coverage(
    project_id: int,
    snap_id: int,
    payload: CoverageUpdate,
    db: Session = Depends(get_db),
) -> CoverageRead:
    try:
        return CoverageRead.model_validate(
            coverage_service.update_snapshot(db, project_id, snap_id, payload)
        )
    except (ProjectNotFoundError, CoverageSnapshotNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/coverage/{snap_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_coverage(
    project_id: int, snap_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        coverage_service.delete_snapshot(db, project_id, snap_id)
    except (ProjectNotFoundError, CoverageSnapshotNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------
@router.get("/{project_id}/documents", response_model=list[DocumentRead])
def list_documents(project_id: int, db: Session = Depends(get_db)) -> list[DocumentRead]:
    try:
        items = document_service.list_documents(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [DocumentRead.model_validate(d) for d in items]


@router.post(
    "/{project_id}/documents",
    response_model=DocumentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_document(
    project_id: int, payload: DocumentCreate, db: Session = Depends(get_db)
) -> DocumentRead:
    try:
        return DocumentRead.model_validate(
            document_service.create_document(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}/documents/{doc_id}", response_model=DocumentRead)
def update_document(
    project_id: int,
    doc_id: int,
    payload: DocumentUpdate,
    db: Session = Depends(get_db),
) -> DocumentRead:
    try:
        return DocumentRead.model_validate(
            document_service.update_document(db, project_id, doc_id, payload)
        )
    except (ProjectNotFoundError, DocumentNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_document(
    project_id: int, doc_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        document_service.delete_document(db, project_id, doc_id)
    except (ProjectNotFoundError, DocumentNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Bugs
# ---------------------------------------------------------------------------
@router.get("/{project_id}/bugs", response_model=list[BugRead])
def list_bugs(project_id: int, db: Session = Depends(get_db)) -> list[BugRead]:
    try:
        items = bug_service.list_bugs(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [BugRead.model_validate(b) for b in items]


@router.get("/{project_id}/bugs/stats", response_model=BugStats)
def get_bug_stats(project_id: int, db: Session = Depends(get_db)) -> BugStats:
    try:
        return bug_service.bug_stats(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/{project_id}/bugs", response_model=BugRead, status_code=status.HTTP_201_CREATED
)
def create_bug(
    project_id: int, payload: BugCreate, db: Session = Depends(get_db)
) -> BugRead:
    try:
        return BugRead.model_validate(bug_service.create_bug(db, project_id, payload))
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}/bugs/{bug_pk}", response_model=BugRead)
def update_bug(
    project_id: int,
    bug_pk: int,
    payload: BugUpdate,
    db: Session = Depends(get_db),
) -> BugRead:
    try:
        return BugRead.model_validate(
            bug_service.update_bug(db, project_id, bug_pk, payload)
        )
    except (ProjectNotFoundError, BugNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/bugs/{bug_pk}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_bug(project_id: int, bug_pk: int, db: Session = Depends(get_db)) -> None:
    try:
        bug_service.delete_bug(db, project_id, bug_pk)
    except (ProjectNotFoundError, BugNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Signoff checklist
# ---------------------------------------------------------------------------
@router.get("/{project_id}/signoff", response_model=list[SignoffRead])
def list_signoff(
    project_id: int,
    milestone: SignoffMilestone | None = None,
    db: Session = Depends(get_db),
) -> list[SignoffRead]:
    try:
        items = signoff_service.list_signoff(
            db, project_id, milestone.value if milestone else None
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [SignoffRead.model_validate(i) for i in items]


@router.get("/{project_id}/signoff/progress", response_model=SignoffProgress)
def get_signoff_progress(
    project_id: int,
    milestone: SignoffMilestone,
    db: Session = Depends(get_db),
) -> SignoffProgress:
    try:
        return signoff_service.signoff_progress(db, project_id, milestone.value)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post(
    "/{project_id}/signoff/init/{milestone}",
    response_model=list[SignoffRead],
    status_code=status.HTTP_201_CREATED,
)
def init_signoff(
    project_id: int,
    milestone: SignoffMilestone,
    db: Session = Depends(get_db),
) -> list[SignoffRead]:
    try:
        items = signoff_service.init_signoff(db, project_id, milestone.value)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return [SignoffRead.model_validate(i) for i in items]


@router.post(
    "/{project_id}/signoff",
    response_model=SignoffRead,
    status_code=status.HTTP_201_CREATED,
)
def create_signoff(
    project_id: int, payload: SignoffCreate, db: Session = Depends(get_db)
) -> SignoffRead:
    try:
        return SignoffRead.model_validate(
            signoff_service.create_signoff(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{project_id}/signoff/{item_id}", response_model=SignoffRead)
def update_signoff(
    project_id: int,
    item_id: int,
    payload: SignoffUpdate,
    db: Session = Depends(get_db),
) -> SignoffRead:
    try:
        return SignoffRead.model_validate(
            signoff_service.update_signoff(db, project_id, item_id, payload)
        )
    except (ProjectNotFoundError, SignoffItemNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.delete(
    "/{project_id}/signoff/{item_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_signoff(
    project_id: int, item_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        signoff_service.delete_signoff(db, project_id, item_id)
    except (ProjectNotFoundError, SignoffItemNotFoundError) as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# ---------------------------------------------------------------------------
# Sub-blocks (tree)
# ---------------------------------------------------------------------------
@router.get("/{project_id}/subblocks", response_model=list[SubblockNode])
def list_subblocks(project_id: int, db: Session = Depends(get_db)):
    try:
        rows = subblock_service.list_subblocks(db, project_id)
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    return subblock_service.build_tree(rows)


@router.post(
    "/{project_id}/subblocks",
    response_model=SubblockRead,
    status_code=status.HTTP_201_CREATED,
)
def create_subblock(
    project_id: int, payload: SubblockCreate, db: Session = Depends(get_db)
) -> SubblockRead:
    try:
        return SubblockRead.model_validate(
            subblock_service.create_subblock(db, project_id, payload)
        )
    except ProjectNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except SubblockValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.patch("/{project_id}/subblocks/{sb_id}", response_model=SubblockRead)
def update_subblock(
    project_id: int,
    sb_id: int,
    payload: SubblockUpdate,
    db: Session = Depends(get_db),
) -> SubblockRead:
    try:
        return SubblockRead.model_validate(
            subblock_service.update_subblock(db, sb_id, payload)
        )
    except SubblockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/{project_id}/subblocks/{sb_id}/move", response_model=SubblockRead)
def move_subblock(
    project_id: int,
    sb_id: int,
    payload: SubblockMove,
    db: Session = Depends(get_db),
) -> SubblockRead:
    try:
        return SubblockRead.model_validate(
            subblock_service.move_subblock(db, sb_id, payload)
        )
    except SubblockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except SubblockValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete(
    "/{project_id}/subblocks/{sb_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_subblock(
    project_id: int, sb_id: int, db: Session = Depends(get_db)
) -> None:
    try:
        subblock_service.delete_subblock(db, sb_id)
    except SubblockNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

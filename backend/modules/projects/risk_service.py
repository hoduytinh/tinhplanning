"""Business logic for project risks."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectRisk
from modules.projects.schemas import RiskCreate, RiskUpdate
from modules.projects.service import get_project


class RiskNotFoundError(Exception):
    def __init__(self, risk_id: int) -> None:
        super().__init__(f"Risk {risk_id} not found")
        self.risk_id = risk_id


# Thứ tự nghiêm trọng để sắp xếp: high trước, low sau.
_SEVERITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def list_risks(db: Session, project_id: int) -> list[ProjectRisk]:
    get_project(db, project_id)
    stmt = select(ProjectRisk).where(ProjectRisk.project_id == project_id)
    risks = list(db.execute(stmt).scalars().all())
    risks.sort(
        key=lambda r: (_SEVERITY_ORDER.get(r.severity, 99), -r.id)
    )
    return risks


def create_risk(db: Session, project_id: int, payload: RiskCreate) -> ProjectRisk:
    get_project(db, project_id)
    risk = ProjectRisk(
        project_id=project_id,
        description=payload.description,
        severity=payload.severity.value,
        mitigation=payload.mitigation,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "risk_added", None, risk.description[:120])
    return risk


def _get_risk(db: Session, project_id: int, risk_id: int) -> ProjectRisk:
    risk = db.get(ProjectRisk, risk_id)
    if risk is None or risk.project_id != project_id:
        raise RiskNotFoundError(risk_id)
    return risk


def update_risk(
    db: Session, project_id: int, risk_id: int, payload: RiskUpdate
) -> ProjectRisk:
    risk = _get_risk(db, project_id, risk_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field == "severity" and value is not None:
            risk.severity = value.value if hasattr(value, "value") else value
        else:
            setattr(risk, field, value)
    db.commit()
    db.refresh(risk)
    return risk


def delete_risk(db: Session, project_id: int, risk_id: int) -> None:
    risk = _get_risk(db, project_id, risk_id)
    db.delete(risk)
    db.commit()

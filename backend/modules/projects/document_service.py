"""Business logic for project documents (document hub)."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from modules.projects.models import ProjectDocument
from modules.projects.schemas import DocumentCreate, DocumentUpdate
from modules.projects.service import get_project


class DocumentNotFoundError(Exception):
    def __init__(self, document_id: int) -> None:
        super().__init__(f"Document {document_id} not found")
        self.document_id = document_id


def list_documents(db: Session, project_id: int) -> list[ProjectDocument]:
    get_project(db, project_id)
    stmt = (
        select(ProjectDocument)
        .where(ProjectDocument.project_id == project_id)
        .order_by(ProjectDocument.created_at.asc(), ProjectDocument.id.asc())
    )
    return list(db.execute(stmt).scalars().all())


def create_document(
    db: Session, project_id: int, payload: DocumentCreate
) -> ProjectDocument:
    get_project(db, project_id)
    document = ProjectDocument(
        project_id=project_id,
        title=payload.title,
        url=payload.url,
        category=payload.category.value,
        doc_type=payload.doc_type.value,
        notes=payload.notes,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "document_added", None, document.title)
    return document


def _get_document(
    db: Session, project_id: int, document_id: int
) -> ProjectDocument:
    document = db.get(ProjectDocument, document_id)
    if document is None or document.project_id != project_id:
        raise DocumentNotFoundError(document_id)
    return document


def update_document(
    db: Session, project_id: int, document_id: int, payload: DocumentUpdate
) -> ProjectDocument:
    document = _get_document(db, project_id, document_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if field in {"category", "doc_type"} and value is not None:
            setattr(document, field, value.value if hasattr(value, "value") else value)
        else:
            setattr(document, field, value)
    db.commit()
    db.refresh(document)
    return document


def delete_document(db: Session, project_id: int, document_id: int) -> None:
    document = _get_document(db, project_id, document_id)
    db.delete(document)
    db.commit()

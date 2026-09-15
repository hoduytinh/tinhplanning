"""API endpoints for meeting templates."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.meetings import template_service
from modules.meetings.schemas import TemplateCreate, TemplateRead, TemplateUpdate
from modules.meetings.template_service import (
    SystemTemplateError,
    TemplateNotFoundError,
)

router = APIRouter(prefix="/api/meeting-templates", tags=["meeting-templates"])


@router.get("", response_model=list[TemplateRead])
def list_templates(db: Session = Depends(get_db)) -> list[TemplateRead]:
    return [
        TemplateRead.model_validate(t) for t in template_service.list_templates(db)
    ]


@router.post("", response_model=TemplateRead, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: TemplateCreate, db: Session = Depends(get_db)
) -> TemplateRead:
    return TemplateRead.model_validate(template_service.create_template(db, payload))


@router.get("/{template_id}", response_model=TemplateRead)
def get_template(template_id: int, db: Session = Depends(get_db)) -> TemplateRead:
    try:
        return TemplateRead.model_validate(
            template_service.get_template(db, template_id)
        )
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.patch("/{template_id}", response_model=TemplateRead)
def update_template(
    template_id: int, payload: TemplateUpdate, db: Session = Depends(get_db)
) -> TemplateRead:
    try:
        return TemplateRead.model_validate(
            template_service.update_template(db, template_id, payload)
        )
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except SystemTemplateError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(template_id: int, db: Session = Depends(get_db)) -> None:
    try:
        template_service.delete_template(db, template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except SystemTemplateError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

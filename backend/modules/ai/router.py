"""API endpoints for the AI Assistant module."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.database import get_db
from modules.ai.schemas import ChatRequest, ChatResponse
from modules.ai.service import AINotConfiguredError, chat_with_ai

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    try:
        result = await chat_with_ai(
            message=request.message,
            history=[m.model_dump() for m in request.history],
            db=db,
        )
    except AINotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return ChatResponse(**result)

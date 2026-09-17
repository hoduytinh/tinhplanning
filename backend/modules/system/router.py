"""System info endpoints: app version + changelog.

The version number is public info (shown to every logged-in user in the
sidebar). The full changelog content is restricted to the actual admin
ACCOUNT (username == settings.ADMIN_USERNAME) — not merely anyone with the
"admin" role — since it may contain internal notes about what changed.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status

from core.auth import get_current_user
from core.config import settings

router = APIRouter(prefix="/api/system", tags=["system"])

# CHANGELOG.md lives at the repo root: backend/modules/system/router.py ->
# parents[0]=system, [1]=modules, [2]=backend, [3]=repo root.
_CHANGELOG_PATH = Path(__file__).resolve().parents[3] / "CHANGELOG.md"


@router.get("/version")
def get_version() -> dict[str, str]:
    return {"version": settings.APP_VERSION}


@router.get("/changelog")
def get_changelog(current_user=Depends(get_current_user)) -> dict[str, str]:
    if current_user.username != settings.ADMIN_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the admin account can view the changelog.",
        )
    if not _CHANGELOG_PATH.exists():
        content = "No changelog available yet."
    else:
        content = _CHANGELOG_PATH.read_text(encoding="utf-8")
    return {"version": settings.APP_VERSION, "content": content}

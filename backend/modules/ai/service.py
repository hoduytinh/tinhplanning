"""Gemini chat logic + context builder for the AI Assistant module."""
from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timedelta

import google.generativeai as genai
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.config import settings
from modules.ai.prompts import SYSTEM_PROMPT, build_context_prompt

logger = logging.getLogger("leadboard.ai")

genai.configure(api_key=settings.GEMINI_API_KEY)

_model = genai.GenerativeModel(
    model_name=settings.GEMINI_MODEL,
    system_instruction=SYSTEM_PROMPT,
)


class AINotConfiguredError(Exception):
    """Raised when GEMINI_API_KEY is missing/empty."""


def _project_prefix(projects_by_id: dict, project_id: int | None) -> str:
    if project_id and project_id in projects_by_id:
        prefix = projects_by_id[project_id].prefix
        if prefix:
            return f"[{prefix}]"
    return "[Non-Proj]"


def get_context_data(db: Session, current_user=None) -> dict:
    """Lấy data thực tế từ DB để inject vào context prompt."""
    from modules.projects.models import Project, ProjectCoverageSnapshot, ProjectMilestone
    from modules.tasks.models import Task

    today = date.today()
    today_start = datetime(today.year, today.month, today.day)
    today_end = today_start + timedelta(days=1)

    active_tasks = list(
        db.execute(
            select(Task).where(Task.status.not_in(["done", "cancelled"]))
        )
        .scalars()
        .all()
    )
    overdue = [t for t in active_tasks if t.due_date and t.due_date < today_start]
    blocked = [t for t in active_tasks if t.status == "blocked"]
    done_today = db.execute(
        select(Task).where(
            Task.status == "done",
            Task.updated_at >= today_start,
            Task.updated_at < today_end,
        )
    ).scalars().all()

    recent = list(
        db.execute(select(Task).order_by(Task.updated_at.desc()).limit(5))
        .scalars()
        .all()
    )

    projects = list(
        db.execute(select(Project).where(Project.status != "done", Project.is_deleted.is_(False)))
        .scalars()
        .all()
    )
    projects_by_id = {p.id: p for p in projects}

    # Coverage snapshot mới nhất cho mỗi project.
    coverage: list[dict] = []
    for p in projects:
        snap = db.execute(
            select(ProjectCoverageSnapshot)
            .where(ProjectCoverageSnapshot.project_id == p.id)
            .order_by(
                ProjectCoverageSnapshot.snapshot_date.desc(),
                ProjectCoverageSnapshot.id.desc(),
            )
        ).scalars().first()
        if snap:
            coverage.append(
                {
                    "project": p.name,
                    "pass_rate": round(snap.passed_tests / snap.total_tests * 100, 1)
                    if snap.total_tests
                    else 0,
                    "testplan": round(snap.testplan_passed / snap.testplan_total * 100, 1)
                    if snap.testplan_total
                    else 0,
                }
            )
    coverage_by_project = {c["project"]: c for c in coverage}

    # Milestone gần nhất chưa done cho mỗi project.
    next_milestones: dict[int, str] = {}
    for p in projects:
        m = db.execute(
            select(ProjectMilestone)
            .where(ProjectMilestone.project_id == p.id, ProjectMilestone.status != "done")
            .order_by(ProjectMilestone.due_date.asc().nullslast())
        ).scalars().first()
        if m:
            next_milestones[p.id] = f"{m.title}" + (f" ({m.due_date.isoformat()})" if m.due_date else "")

    # --- Ownership context (theo current_user) ---
    ownership_summary: dict | None = None
    if current_user is not None:
        from core.visibility import get_watching_ids

        my_tasks = [t for t in active_tasks if t.created_by == current_user.id]
        assigned = [t for t in active_tasks if t.assigned_to == current_user.id]
        watching_ids = get_watching_ids(db, current_user.id, "task")
        watching = [t for t in active_tasks if t.id in watching_ids]
        ownership_summary = {
            "user": current_user.full_name or current_user.username,
            "my_tasks": len(my_tasks),
            "assigned_to_me": len(assigned),
            "watching": len(watching),
        }

    result = {
        "tasks_summary": {
            "total": len(active_tasks),
            "overdue": len(overdue),
            "blocked": len(blocked),
            "done_today": len(done_today),
        },
        "recent_tasks": [
            {
                "title": t.title,
                "priority": t.priority,
                "status": t.status,
                "prefix": _project_prefix(projects_by_id, t.project_id),
            }
            for t in recent
        ],
        "blocked_tasks": [
            {
                "title": t.title,
                "prefix": _project_prefix(projects_by_id, t.project_id),
            }
            for t in blocked[:5]
        ],
        "projects": [
            {
                "name": p.name,
                "health": p.health,
                "pass_rate": coverage_by_project.get(p.name, {}).get("pass_rate"),
                "next_milestone": next_milestones.get(p.id),
            }
            for p in projects
        ],
        "coverage": coverage,
    }
    if ownership_summary is not None:
        result["ownership_summary"] = ownership_summary
    return result


_ACTION_RE = re.compile(r'\{[^{}]*"action"[^{}]*"data"\s*:\s*\{.*?\}[^{}]*\}', re.DOTALL)


def _extract_action(text: str) -> tuple[str, dict | None]:
    """Tách JSON action (nếu có) ra khỏi text hiển thị cho user."""
    if '"action"' not in text:
        return text, None
    match = _ACTION_RE.search(text)
    if not match:
        return text, None
    try:
        action_data = json.loads(match.group())
    except json.JSONDecodeError:
        logger.warning("AI action JSON không parse được: %s", match.group())
        return text, None
    clean_text = (text[: match.start()] + text[match.end() :]).strip()
    return clean_text, action_data


async def chat_with_ai(message: str, history: list[dict], db: Session, current_user=None) -> dict:
    """Gửi message đến Gemini kèm context data thực tế.

    Returns: { "text": "...", "action": None | {...} }
    """
    if not settings.GEMINI_API_KEY:
        raise AINotConfiguredError(
            "GEMINI_API_KEY is not configured. Add it to backend/.env and restart the backend."
        )

    context_data = get_context_data(db, current_user=current_user)
    context_prompt = build_context_prompt(context_data)

    gemini_history = [
        {"role": msg["role"], "parts": [msg["content"]]} for msg in history[-10:]
    ]

    chat = _model.start_chat(history=gemini_history)
    full_message = f"{context_prompt}\n\nUSER: {message}"
    response = chat.send_message(full_message)
    response_text = response.text

    clean_text, action = _extract_action(response_text)

    return {"text": clean_text, "action": action}

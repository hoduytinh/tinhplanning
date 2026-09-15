"""Seed sample data for local development / first run.

Idempotent: only inserts sample tasks when the table is empty.
Run with:  python -m seed

On production (APP_ENV=production) sample data is skipped — the admin account
is seeded separately and idempotently at application startup (see main.py).
"""
import logging
import os
from datetime import date, datetime, timedelta

from core.database import SessionLocal, engine
from core.database import Base  # noqa: F401  (ensures metadata is available)
from modules.tasks.models import Task
from modules.projects.models import (
    Project,
    ProjectMilestone,
    ProjectRisk,
)
from modules.projects import service as project_service

logging.basicConfig(level="INFO")
logger = logging.getLogger("leadboard.seed")


def _dt(days: int) -> datetime:
    return datetime.utcnow() + timedelta(days=days)


SAMPLE_TASKS: list[dict] = [
    {
        "title": "Chuẩn bị slide review kiến trúc Q3",
        "description": "Tổng hợp trade-off giữa monolith và microservices.",
        "priority": "critical",
        "status": "in_progress",
        "type": "my_task",
        "due_date": _dt(1),
        "tags": "architecture,review",
    },
    {
        "title": "Duyệt PR migration DB service auth",
        "description": "Kiểm tra kỹ phần rollback của Alembic.",
        "priority": "critical",
        "status": "not_started",
        "type": "my_task",
        "due_date": _dt(0),
        "tags": "code-review,backend",
    },
    {
        "title": "1:1 với thành viên mới trong team",
        "description": "Onboarding tuần 2, thu thập feedback.",
        "priority": "important",
        "status": "not_started",
        "type": "my_task",
        "due_date": _dt(2),
        "tags": "people,1on1",
    },
    {
        "title": "Giao task viết tài liệu API cho Nam",
        "description": "Tài liệu OpenAPI cho service billing.",
        "priority": "important",
        "status": "in_progress",
        "type": "delegated",
        "due_date": _dt(4),
        "tags": "docs,delegated",
    },
    {
        "title": "Chờ team Infra cấp quyền staging",
        "description": "Blocker cho việc test load balancer.",
        "priority": "important",
        "status": "blocked",
        "type": "waiting_for",
        "due_date": _dt(-1),
        "tags": "infra,blocked",
    },
    {
        "title": "Refactor module logging dùng chung",
        "description": "Thêm request ID vào toàn bộ service.",
        "priority": "normal",
        "status": "not_started",
        "type": "my_task",
        "due_date": _dt(7),
        "tags": "tech-debt",
    },
    {
        "title": "Cập nhật roadmap kỹ thuật cho quản lý",
        "description": None,
        "priority": "normal",
        "status": "done",
        "type": "my_task",
        "due_date": _dt(-3),
        "tags": "planning",
    },
    {
        "title": "Review đề xuất tối ưu chi phí cloud",
        "description": "So sánh reserved vs spot instances.",
        "priority": "normal",
        "status": "not_started",
        "type": "my_task",
        "due_date": _dt(10),
        "tags": "cost,cloud",
    },
]


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Task).count()
        if existing > 0:
            logger.info("Tasks already present (%s). Skipping seed.", existing)
            return

        db.add_all([Task(**data) for data in SAMPLE_TASKS])
        db.commit()
        logger.info("Seeded %s sample tasks.", len(SAMPLE_TASKS))
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Projects sample data (Module 2)
# ---------------------------------------------------------------------------
def _d(iso: str) -> date:
    return date.fromisoformat(iso)


# Mỗi project: metadata + milestones + risks + danh sách task (để health có
# dữ liệu tính). `tasks` là list dict tối giản (status + due_offset ngày).
SAMPLE_PROJECTS: list[dict] = [
    {
        "name": "IP Verification Q3",
        "description": "Kiểm chứng IP khối compute cho tapeout Q3.",
        "status": "in_progress",
        "priority": "critical",
        "start_date": _d("2026-09-01"),
        "end_date": _d("2026-09-30"),
        "tags": ["rtl", "verification"],
        "milestones": [
            {"title": "RTL Freeze", "due": "2026-09-10", "status": "done"},
            {"title": "Testbench Ready", "due": "2026-09-15", "status": "in_progress"},
            {"title": "Regression Pass", "due": "2026-09-25", "status": "not_started"},
            {"title": "Signoff", "due": "2026-09-30", "status": "not_started"},
        ],
        "risks": [
            {
                "description": "Tool license hết hạn 20/09",
                "severity": "high",
                "mitigation": "Xin gia hạn license trước 15/09",
            },
            {
                "description": "RTL team delay 2 ngày",
                "severity": "medium",
                "mitigation": "Buffer trong schedule",
            },
        ],
        # 12 task: 5 done, 1 blocked, 1 overdue, còn lại in_progress/not_started
        "tasks": (
            [{"status": "done", "due": -5}] * 5
            + [{"status": "blocked", "due": 3}]
            + [{"status": "in_progress", "due": -2}]  # overdue (chưa done)
            + [{"status": "in_progress", "due": 5}] * 2
            + [{"status": "not_started", "due": 8}] * 3
        ),
    },
    {
        "name": "DV Infra Upgrade",
        "description": "Nâng cấp hạ tầng DV + tooling regression.",
        "status": "planning",
        "priority": "important",
        "start_date": _d("2026-10-01"),
        "end_date": _d("2026-10-31"),
        "tags": ["infra", "tooling"],
        "milestones": [
            {"title": "Setup", "due": "2026-10-07", "status": "not_started"},
            {"title": "Migration", "due": "2026-10-20", "status": "not_started"},
            {"title": "Validation", "due": "2026-10-30", "status": "not_started"},
        ],
        "risks": [
            {
                "description": "Thiếu người review migration",
                "severity": "low",
                "mitigation": "Nhờ team platform hỗ trợ",
            },
        ],
        # 5 task, chưa tới hạn timeline (tháng 10) → on_track
        "tasks": (
            [{"status": "not_started", "due": 30}] * 4
            + [{"status": "in_progress", "due": 25}]
        ),
    },
    {
        "name": "Onboarding New Members",
        "description": "Onboarding 3 thành viên mới vào team DV.",
        "status": "done",
        "priority": "normal",
        "start_date": _d("2026-08-01"),
        "end_date": _d("2026-08-31"),
        "tags": ["people"],
        "milestones": [
            {"title": "Tài khoản & quyền truy cập", "due": "2026-08-05", "status": "done"},
            {"title": "Training cơ bản", "due": "2026-08-20", "status": "done"},
        ],
        "risks": [],
        # 8 task, tất cả done → on_track
        "tasks": [{"status": "done", "due": -20}] * 8,
    },
]


def seed_projects() -> None:
    db = SessionLocal()
    try:
        existing = db.query(Project).count()
        if existing > 0:
            logger.info("Projects already present (%s). Skipping seed.", existing)
            return

        for pdata in SAMPLE_PROJECTS:
            project = Project(
                name=pdata["name"],
                description=pdata["description"],
                status=pdata["status"],
                priority=pdata["priority"],
                start_date=pdata["start_date"],
                end_date=pdata["end_date"],
                tags=pdata["tags"],
            )
            db.add(project)
            db.flush()  # có project.id

            for order, m in enumerate(pdata["milestones"]):
                db.add(
                    ProjectMilestone(
                        project_id=project.id,
                        title=m["title"],
                        due_date=_d(m["due"]) if m.get("due") else None,
                        status=m["status"],
                        order=order,
                    )
                )

            for r in pdata["risks"]:
                db.add(
                    ProjectRisk(
                        project_id=project.id,
                        description=r["description"],
                        severity=r["severity"],
                        mitigation=r.get("mitigation"),
                    )
                )

            for i, t in enumerate(pdata["tasks"]):
                db.add(
                    Task(
                        title=f"[{project.name}] Task {i + 1}",
                        priority="normal",
                        status=t["status"],
                        type="my_task",
                        due_date=_dt(t["due"]),
                        project_id=project.id,
                    )
                )

            db.commit()
            # Tính health sau khi đã có task.
            project_service._apply_health(db, project)

        logger.info("Seeded %s sample projects.", len(SAMPLE_PROJECTS))
    finally:
        db.close()


if __name__ == "__main__":
    if os.getenv("APP_ENV", "development").lower() == "production":
        logger.info("APP_ENV=production — skipping sample data seed.")
    else:
        seed()
        seed_projects()

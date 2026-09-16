"""Seed a rich LOCAL test dataset covering every module of the app.

Creates:
- Users: 1 leader (role=moderator) + 5 members (role=user). The admin account
  (role=admin) is seeded separately at startup from ADMIN_USERNAME/ADMIN_PASSWORD
  (see core/config.py + modules/users/service.py:seed_admin) — not duplicated here.
- 3 projects, each with milestones + risks + tasks spread across 3 weeks:
  "sắp finish" (near end_date), "đang going" (mid-progress), "sắp start" (planning).
- 6 one-off meetings + 1 weekly recurring meeting (3 chained instances) using the
  real system meeting templates, attendees, agenda, action items, close checklist.
- 3 weekly reviews (one per week), the 2 past ones completed with a real computed
  snapshot, the current one left as draft (as a user would leave it mid-week).

LOCAL DEV ONLY — uses the SQLite DB configured by DATABASE_URL/.env. Do not run
against production. Safe to re-run: every entity is looked up by a natural key
(username / project name / meeting title+date / week_start) and skipped if it
already exists, so re-running just fills in whatever is still missing.

Run from backend/ with the venv active:
    python -m seed_full_test_data
"""
import logging
from datetime import date, datetime, timedelta

from core.database import SessionLocal
from core.security import hash_password
from modules.meetings import service as meeting_service
from modules.meetings import template_service
from modules.meetings.models import Meeting, MeetingTemplate
from modules.meetings.schemas import (
    ActionItemCreate,
    ActionItemPriority,
    ActionItemStatus,
    AgendaItemCreate,
    AttendeeCreate,
    MeetingCreate,
    MeetingRecurring,
    MeetingUpdate,
    SectionCreate,
    SectionType,
)
from modules.projects import service as project_service
from modules.projects.models import Project, ProjectMilestone, ProjectRisk
from modules.projects.schemas import ProjectCreate
from modules.tasks.models import Task
from modules.users.models import User
from modules.weekly_review import service as review_service
from modules.weekly_review.schemas import ShoutoutCreate, WeeklyReviewCreate, WeeklyReviewUpdate, Workload
from modules.weekly_review.summary_service import week_bounds

logging.basicConfig(level="INFO")
logger = logging.getLogger("leadboard.seed_full")

TODAY = date.today()
DEFAULT_PASSWORD = "Test@12345"

# (username, full_name, role)
TEAM = [
    ("leader1", "Đặng Thu Trưởng", "moderator"),
    ("member1", "Nguyễn Văn Một", "user"),
    ("member2", "Trần Thị Hai", "user"),
    ("member3", "Phạm Văn Ba", "user"),
    ("member4", "Lý Thị Tư", "user"),
    ("member5", "Hoàng Văn Năm", "user"),
]
LEADER_NAME = TEAM[0][1]
MEMBER_NAMES = [full_name for _, full_name, role in TEAM if role == "user"]


def _dt(d: date) -> datetime:
    return datetime(d.year, d.month, d.day, 9, 0)


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
def seed_users(db) -> None:
    created = 0
    for username, full_name, role in TEAM:
        if db.query(User).filter(User.username == username).first():
            continue
        db.add(
            User(
                username=username,
                password_hash=hash_password(DEFAULT_PASSWORD),
                full_name=full_name,
                role=role,
                is_active=True,
                status="active",
            )
        )
        created += 1
    db.commit()
    logger.info("Users: created %s (mật khẩu chung: %s)", created, DEFAULT_PASSWORD)


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
def _project_specs(w2s, w2e, w1s, w1e, w0s, w0e):
    return [
        {
            "name": "Chip Bring-up Alpha",
            "prefix": "CBA",
            "prefix_color": "#ef4444",
            "description": "Bring-up lab cho chip Alpha — sắp hoàn tất, chuẩn bị sign-off.",
            "status": "in_progress",
            "priority": "critical",
            "start_date": w2s - timedelta(days=21),
            "end_date": w0e + timedelta(days=4),
            "tags": ["bringup", "lab"],
            "milestones": [
                {"title": "RTL Freeze", "due": w2s - timedelta(days=10), "status": "done"},
                {"title": "Bring-up Lab Ready", "due": w1s + timedelta(days=2), "status": "done"},
                {"title": "Validation Sign-off", "due": w0s + timedelta(days=3), "status": "in_progress"},
                {"title": "Final Release", "due": w0e + timedelta(days=4), "status": "not_started"},
            ],
            "risks": [
                {"description": "Lịch phòng lab bị trùng với team khác", "severity": "high", "mitigation": "Đặt lịch ưu tiên trước 1 tuần"},
                {"description": "Team firmware trễ tiến độ handshake", "severity": "medium", "mitigation": "Daily sync với firmware lead"},
            ],
            "tasks": [
                {"title": "RTL freeze checklist review", "status": "done", "due": w2s + timedelta(days=1)},
                {"title": "Lab bring-up prep", "status": "done", "due": w2s + timedelta(days=2)},
                {"title": "Power-on test plan", "status": "done", "due": w2s + timedelta(days=4)},
                {"title": "Bring-up smoke test", "status": "done", "due": w2e},
                {"title": "Validate boot sequence", "status": "done", "due": w1s + timedelta(days=1)},
                {"title": "Debug USB controller issue", "status": "blocked", "due": w1s + timedelta(days=3), "priority": "critical"},
                {"title": "Update bring-up report", "status": "done", "due": w1s + timedelta(days=5)},
                {"title": "Firmware handshake test", "status": "in_progress", "due": w1e},
                {"title": "Validation sign-off checklist", "status": "in_progress", "due": w0s + timedelta(days=2)},
                {"title": "Final regression run", "status": "not_started", "due": w0s + timedelta(days=4)},
                {"title": "Customer demo prep", "status": "in_progress", "due": w0e},
                {"title": "Close out lab equipment", "status": "not_started", "due": w0e + timedelta(days=2)},
            ],
        },
        {
            "name": "RTL Refactor Platform",
            "prefix": "RRP",
            "prefix_color": "#3b82f6",
            "description": "Tái cấu trúc RTL dùng chung cho các block DV — đang triển khai giữa chừng.",
            "status": "in_progress",
            "priority": "important",
            "start_date": w2s - timedelta(days=7),
            "end_date": w0e + timedelta(days=35),
            "tags": ["rtl", "refactor"],
            "milestones": [
                {"title": "Architecture Design", "due": w2s + timedelta(days=2), "status": "done"},
                {"title": "Module A Refactor", "due": w1e, "status": "in_progress"},
                {"title": "Module B Refactor", "due": w0e + timedelta(days=14), "status": "not_started"},
                {"title": "Regression Pass", "due": w0e + timedelta(days=30), "status": "not_started"},
            ],
            "risks": [
                {"description": "Thiếu người review code song song 2 module", "severity": "medium", "mitigation": "Xin hỗ trợ thêm 1 reviewer part-time"},
            ],
            "tasks": [
                {"title": "Define refactor scope", "status": "done", "due": w2s + timedelta(days=1)},
                {"title": "Architecture design doc", "status": "done", "due": w2s + timedelta(days=3)},
                {"title": "Setup CI pipeline for module A", "status": "in_progress", "due": w2e},
                {"title": "Code review guideline draft", "status": "done", "due": w2e},
                {"title": "Refactor Module A - core logic", "status": "in_progress", "due": w1s + timedelta(days=2)},
                {"title": "Unit tests Module A", "status": "not_started", "due": w1s + timedelta(days=4)},
                {"title": "Dependency upgrade eval", "status": "blocked", "due": w1s + timedelta(days=5)},
                {"title": "Refactor Module A - utils", "status": "in_progress", "due": w1e},
                {"title": "Refactor Module B - kickoff", "status": "not_started", "due": w0s + timedelta(days=1)},
                {"title": "Regression baseline capture", "status": "in_progress", "due": w0s + timedelta(days=3)},
                {"title": "Code review Module A PR", "status": "in_progress", "due": w0e - timedelta(days=1)},
                {"title": "Sync with QA team on plan", "status": "not_started", "due": w0e},
            ],
        },
        {
            "name": "Next-Gen DV Automation",
            "prefix": "NDA",
            "prefix_color": "#10b981",
            "description": "Nền tảng tự động hóa DV thế hệ mới — đang lên kế hoạch, sắp khởi động.",
            "status": "planning",
            "priority": "normal",
            "start_date": w0e + timedelta(days=3),
            "end_date": w0e + timedelta(days=63),
            "tags": ["automation", "planning"],
            "milestones": [
                {"title": "Kickoff", "due": w0e + timedelta(days=3), "status": "not_started"},
                {"title": "Requirement Gathering", "due": w0e + timedelta(days=14), "status": "not_started"},
                {"title": "Tool Selection", "due": w0e + timedelta(days=28), "status": "not_started"},
            ],
            "risks": [
                {"description": "Chưa chốt nhân sự phụ trách chính", "severity": "low", "mitigation": "Đề xuất lên quản lý trong tuần này"},
            ],
            "tasks": [
                {"title": "Draft kickoff deck", "status": "in_progress", "due": w0s + timedelta(days=2)},
                {"title": "List requirement stakeholders", "status": "not_started", "due": w0s + timedelta(days=4)},
                {"title": "Evaluate DV automation tools shortlist", "status": "in_progress", "due": w0e},
            ],
        },
    ]


def seed_projects(db, weeks) -> dict[str, Project]:
    (w2s, w2e), (w1s, w1e), (w0s, w0e) = weeks
    result: dict[str, Project] = {}
    for spec in _project_specs(w2s, w2e, w1s, w1e, w0s, w0e):
        existing = db.query(Project).filter(Project.name == spec["name"]).first()
        if existing:
            result[spec["name"]] = existing
            continue

        project = project_service.create_project(
            db,
            ProjectCreate(
                name=spec["name"],
                prefix=spec["prefix"],
                prefix_color=spec["prefix_color"],
                description=spec["description"],
                status=spec["status"],
                priority=spec["priority"],
                start_date=spec["start_date"],
                end_date=spec["end_date"],
                tags=spec["tags"],
            ),
        )

        for order, m in enumerate(spec["milestones"]):
            db.add(
                ProjectMilestone(
                    project_id=project.id,
                    title=m["title"],
                    due_date=m["due"],
                    status=m["status"],
                    order=order,
                )
            )
        for r in spec["risks"]:
            db.add(
                ProjectRisk(
                    project_id=project.id,
                    description=r["description"],
                    severity=r["severity"],
                    mitigation=r.get("mitigation"),
                )
            )
        db.commit()

        for t in spec["tasks"]:
            db.add(
                Task(
                    title=f"[{spec['prefix']}] {t['title']}",
                    priority=t.get("priority", "normal"),
                    status=t["status"],
                    type="my_task",
                    due_date=_dt(t["due"]),
                    project_id=project.id,
                    tags=",".join(spec["tags"]),
                )
            )
        db.commit()
        project_service._apply_health(db, project)
        result[spec["name"]] = project
        logger.info("Project '%s': seeded %s tasks.", spec["name"], len(spec["tasks"]))
    return result


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------
def _template_id(db, tpl_type: str) -> int | None:
    tpl = db.query(MeetingTemplate).filter(MeetingTemplate.type == tpl_type, MeetingTemplate.is_system.is_(True)).first()
    return tpl.id if tpl else None


def _create_meeting(
    db,
    *,
    title: str,
    m_date: date,
    project_id: int | None,
    template_id: int | None,
    recurring: str = "none",
    parent_id: int | None = None,
    attendees: list[tuple[str, str, bool]],
    agenda: list[str] | None = None,
    section_notes: str | None = None,
    action_items: list[dict],
    close_all_checklist: bool = False,
) -> Meeting:
    existing = (
        db.query(Meeting)
        .filter(Meeting.title == title, Meeting.date == m_date)
        .first()
    )
    if existing:
        return existing

    meeting = meeting_service.create_meeting(
        db,
        MeetingCreate(
            title=title,
            template_id=template_id,
            project_id=project_id,
            date=m_date,
            recurring=MeetingRecurring(recurring),
        ),
    )
    if parent_id is not None:
        meeting.parent_meeting_id = parent_id
        db.commit()
        db.refresh(meeting)

    for name, role, is_host in attendees:
        meeting_service.create_attendee(
            db, meeting.id, AttendeeCreate(name=name, role=role, is_host=is_host)
        )

    if agenda:
        for title_item in agenda:
            meeting_service.create_agenda_item(db, meeting.id, AgendaItemCreate(title=title_item))

    if section_notes:
        meeting_service.create_section(
            db,
            meeting.id,
            SectionCreate(section_type=SectionType.notes, title="Notes", content={"text": section_notes}),
        )

    for ai in action_items:
        meeting_service.create_action_item(
            db,
            meeting.id,
            ActionItemCreate(
                content=ai["content"],
                assignee=ai.get("assignee"),
                due_date=ai.get("due"),
                priority=ActionItemPriority(ai["priority"]) if ai.get("priority") else None,
                status=ActionItemStatus(ai.get("status", "open")),
            ),
        )

    status_val = "done" if m_date < TODAY else "upcoming"
    meeting_service.update_meeting(db, meeting.id, MeetingUpdate(status=status_val))

    if close_all_checklist and status_val == "done":
        for item in meeting_service.list_close_checklist(db, meeting.id):
            meeting_service.update_checklist_item(db, meeting.id, item.id, True)

    return meeting


def seed_meetings(db, weeks, projects: dict[str, Project]) -> None:
    (w2s, w2e), (w1s, w1e), (w0s, w0e) = weeks
    template_service.seed_system_templates(db)

    dv_internal = _template_id(db, "dv_internal")
    design_review = _template_id(db, "design_review")
    bug_review = _template_id(db, "bug_review")
    project_cft = _template_id(db, "project_cft")

    cba = projects["Chip Bring-up Alpha"].id
    rrp = projects["RTL Refactor Platform"].id
    nda = projects["Next-Gen DV Automation"].id

    full_team = [(LEADER_NAME, "Trưởng nhóm", True)] + [
        (n, "Thành viên", False) for n in MEMBER_NAMES
    ]

    # --- Weekly Sync (recurring, 3 chained instances) -----------------
    w_sync_1 = _create_meeting(
        db,
        title="Weekly Sync",
        m_date=w2s,
        project_id=None,
        template_id=dv_internal,
        recurring="weekly",
        attendees=full_team,
        action_items=[
            {"content": "Chốt lịch lab tuần sau", "assignee": LEADER_NAME, "due": w2e, "status": "done"},
            {"content": "Cập nhật coverage dashboard", "assignee": MEMBER_NAMES[0], "due": w2e, "status": "done"},
        ],
        close_all_checklist=True,
    )
    w_sync_2 = _create_meeting(
        db,
        title="Weekly Sync",
        m_date=w1s,
        project_id=None,
        template_id=dv_internal,
        recurring="weekly",
        parent_id=w_sync_1.id,
        attendees=full_team,
        action_items=[
            {"content": "Follow up debug USB controller", "assignee": MEMBER_NAMES[1], "due": w1e, "status": "done"},
            {"content": "Review dependency upgrade risk", "assignee": MEMBER_NAMES[2], "due": w1e, "status": "open"},
        ],
        close_all_checklist=True,
    )
    _create_meeting(
        db,
        title="Weekly Sync",
        m_date=w0s,
        project_id=None,
        template_id=dv_internal,
        recurring="weekly",
        parent_id=w_sync_2.id,
        attendees=full_team,
        action_items=[
            {"content": "Chuẩn bị demo khách hàng", "assignee": MEMBER_NAMES[3], "due": w0e, "status": "open"},
            {"content": "Cập nhật kế hoạch Module B", "assignee": MEMBER_NAMES[4], "due": w0e, "status": "open"},
        ],
        close_all_checklist=True,
    )

    # --- Standalone meetings -------------------------------------------
    _create_meeting(
        db,
        title="Design Review - CBA RTL Freeze",
        m_date=w2s + timedelta(days=1),
        project_id=cba,
        template_id=design_review,
        attendees=[(LEADER_NAME, "Trưởng nhóm", True), (MEMBER_NAMES[0], "RTL Owner", False), (MEMBER_NAMES[1], "Reviewer", False)],
        action_items=[
            {"content": "Fix minor lint warning trước freeze", "assignee": MEMBER_NAMES[0], "due": w2e, "status": "done"},
        ],
        close_all_checklist=True,
    )
    _create_meeting(
        db,
        title="Bug Triage - RRP Sprint 1",
        m_date=w2s + timedelta(days=3),
        project_id=rrp,
        template_id=bug_review,
        attendees=[(LEADER_NAME, "Trưởng nhóm", True), (MEMBER_NAMES[2], "DV Owner", False), (MEMBER_NAMES[3], "DE Owner", False)],
        action_items=[
            {"content": "Triage bug backlog Module A", "assignee": MEMBER_NAMES[2], "due": w2e, "status": "done"},
        ],
        close_all_checklist=True,
    )
    _create_meeting(
        db,
        title="1:1 với Trần Thị Hai",
        m_date=w1s + timedelta(days=2),
        project_id=None,
        template_id=None,
        attendees=[(LEADER_NAME, "Trưởng nhóm", True), (MEMBER_NAMES[1], "Thành viên", False)],
        agenda=["Cập nhật tiến độ cá nhân", "Khó khăn/hỗ trợ cần thiết"],
        section_notes="Trao đổi định hướng phát triển, tiến độ ổn định.",
        action_items=[
            {"content": "Đăng ký khóa training RTL nâng cao", "assignee": MEMBER_NAMES[1], "due": w1e, "status": "open"},
        ],
    )
    _create_meeting(
        db,
        title="CFT Sync - Chip Bring-up Alpha",
        m_date=w1s + timedelta(days=4),
        project_id=cba,
        template_id=project_cft,
        attendees=[(LEADER_NAME, "Trưởng nhóm", True), (MEMBER_NAMES[0], "DV", False), (MEMBER_NAMES[4], "DE", False)],
        action_items=[
            {"content": "Chia sẻ báo cáo bring-up cho CFT", "assignee": LEADER_NAME, "due": w1e, "status": "done"},
            {"content": "Theo dõi dependency firmware", "assignee": MEMBER_NAMES[4], "due": w1e, "status": "open"},
        ],
        close_all_checklist=True,
    )
    _create_meeting(
        db,
        title="Kickoff Planning - Next-Gen DV Automation",
        m_date=w0s + timedelta(days=2),
        project_id=nda,
        template_id=dv_internal,
        attendees=full_team,
        action_items=[
            {"content": "Gửi shortlist công cụ automation", "assignee": LEADER_NAME, "due": w0e, "status": "open"},
            {"content": "Tổng hợp yêu cầu từ các block owner", "assignee": MEMBER_NAMES[0], "due": w0e, "status": "open"},
        ],
        close_all_checklist=True,
    )
    _create_meeting(
        db,
        title="Design Review - RRP Milestone Check",
        m_date=w0e - timedelta(days=1),
        project_id=rrp,
        template_id=design_review,
        attendees=[(LEADER_NAME, "Trưởng nhóm", True), (MEMBER_NAMES[2], "RTL Owner", False), (MEMBER_NAMES[3], "Reviewer", False)],
        action_items=[
            {"content": "Chuẩn bị slide review Module A", "assignee": MEMBER_NAMES[2], "due": w0e, "status": "open"},
        ],
    )
    logger.info("Meetings seeded (weekly sync x3 + 6 standalone).")


# ---------------------------------------------------------------------------
# Weekly Reviews
# ---------------------------------------------------------------------------
def seed_weekly_reviews(db, weeks) -> None:
    (w2s, _), (w1s, _), (w0s, _) = weeks

    specs = [
        {
            "week_start": w2s,
            "complete": True,
            "highlights": "Hoàn thành RTL Freeze và bring-up smoke test đúng hạn.",
            "challenges": "Thiếu phòng lab vào giữa tuần, phải điều chỉnh lịch.",
            "lessons": "Nên đặt lịch phòng lab sớm hơn 1 tuần cho các đợt bring-up.",
            "team_notes": "Team phối hợp tốt giữa DV và bring-up.",
            "focus_next_week": "Debug USB controller issue, tiếp tục refactor Module A.",
            "risks_next_week": "Dependency upgrade có thể ảnh hưởng lịch Module A.",
            "dependencies_next_week": "Cần input từ team firmware cho handshake test.",
            "mood": 4,
            "workload": Workload.normal,
            "shoutouts": [
                (MEMBER_NAMES[0], "Chủ động chuẩn bị lab bring-up rất tốt."),
            ],
        },
        {
            "week_start": w1s,
            "complete": True,
            "highlights": "Refactor Module A tiến triển tốt, CFT sync suôn sẻ.",
            "challenges": "Bug USB controller mất nhiều thời gian debug hơn dự kiến.",
            "lessons": "Cần unit test sớm hơn để bắt lỗi tích hợp.",
            "team_notes": "1:1 với các thành viên giúp nắm bắt khó khăn sớm.",
            "focus_next_week": "Sign-off validation cho Chip Bring-up Alpha, kickoff Module B.",
            "risks_next_week": "Lịch demo khách hàng gấp, cần chuẩn bị kỹ.",
            "dependencies_next_week": "Cần QA team xác nhận kế hoạch regression.",
            "mood": 3,
            "workload": Workload.heavy,
            "shoutouts": [
                (MEMBER_NAMES[1], "Kiên trì debug USB controller issue đến cùng."),
            ],
        },
        {
            "week_start": w0s,
            "complete": False,
            "highlights": "Đang hoàn tất validation sign-off checklist.",
            "challenges": "",
            "lessons": "",
            "team_notes": "",
            "focus_next_week": "",
            "risks_next_week": "",
            "dependencies_next_week": "",
            "mood": None,
            "workload": None,
            "shoutouts": [],
        },
    ]

    for spec in specs:
        review = review_service.create_review(db, WeeklyReviewCreate(week_start=spec["week_start"]))
        review_service.update_review(
            db,
            review.id,
            WeeklyReviewUpdate(
                highlights=spec["highlights"],
                challenges=spec["challenges"],
                lessons=spec["lessons"],
                team_notes=spec["team_notes"],
                focus_next_week=spec["focus_next_week"],
                risks_next_week=spec["risks_next_week"],
                dependencies_next_week=spec["dependencies_next_week"],
                mood=spec["mood"],
                workload=spec["workload"],
            ),
        )
        for person, reason in spec["shoutouts"]:
            review_service.add_shoutout(db, review.id, ShoutoutCreate(person_name=person, reason=reason))
        if spec["complete"]:
            review_service.complete_review(db, review.id)

    logger.info("Weekly reviews seeded (2 completed + 1 draft, tuần hiện tại).")


def main() -> None:
    w0 = week_bounds(TODAY)
    w1 = (w0[0] - timedelta(days=7), w0[1] - timedelta(days=7))
    w2 = (w0[0] - timedelta(days=14), w0[1] - timedelta(days=14))
    weeks = (w2, w1, w0)

    db = SessionLocal()
    try:
        seed_users(db)
        projects = seed_projects(db, weeks)
        seed_meetings(db, weeks, projects)
        seed_weekly_reviews(db, weeks)
        logger.info("Hoàn tất seed full test data.")
    finally:
        db.close()


if __name__ == "__main__":
    main()

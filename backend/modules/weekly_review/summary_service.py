"""Realtime aggregation for Weekly Review.

Module này CHỈ ĐỌC dữ liệu từ Tasks / Projects / Meetings để tính số liệu
tổng hợp cho một tuần. Không ghi ngược vào các module đó.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from modules.meetings.models import Meeting, MeetingActionItem
from modules.projects.models import Project, ProjectBug, ProjectCoverageSnapshot
from modules.tasks.models import Task

_DONE = "done"
_CANCELLED = "cancelled"
_BLOCKED = "blocked"


def week_bounds(reference: date | None = None) -> tuple[date, date]:
    """Trả về (thứ 2, chủ nhật) của tuần chứa `reference` (mặc định hôm nay)."""
    ref = reference or date.today()
    monday = ref - timedelta(days=ref.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def week_label(week_start: date) -> str:
    """Nhãn tuần dạng ISO, vd 'W38/2026'."""
    iso = week_start.isocalendar()
    return f"W{iso.week:02d}/{iso.year}"


def _in_range(value: date | datetime | None, start: date, end: date) -> bool:
    if value is None:
        return False
    d = value.date() if isinstance(value, datetime) else value
    return start <= d <= end


def _pass_rate(snap: ProjectCoverageSnapshot) -> float:
    if not snap.total_tests:
        return 0.0
    return round(snap.passed_tests / snap.total_tests * 100, 1)


def compute_auto_summary(db: Session, week_start: date, week_end: date) -> dict:
    """Tính số liệu realtime cho khoảng tuần [week_start, week_end]."""
    now = datetime.now()

    # --- Projects & prefix map ---------------------------------------- #
    projects = (
        db.execute(select(Project).where(Project.is_deleted.is_(False)))
        .scalars()
        .all()
    )
    prefix_by_pid = {p.id: (p.prefix or p.name) for p in projects}

    # --- Tasks -------------------------------------------------------- #
    tasks = db.execute(select(Task)).scalars().all()
    completed, created = [], 0
    blocked = 0
    overdue = 0
    for t in tasks:
        if t.status == _DONE and _in_range(t.updated_at, week_start, week_end):
            prefix = prefix_by_pid.get(t.project_id)
            label = f"[{prefix}] {t.title}" if prefix else t.title
            completed.append(
                {"id": t.id, "title": t.title, "label": label, "priority": t.priority}
            )
        if _in_range(t.created_at, week_start, week_end):
            created += 1
        if t.status == _BLOCKED:
            blocked += 1
        if (
            t.due_date is not None
            and t.due_date < now
            and t.status not in (_DONE, _CANCELLED)
        ):
            overdue += 1

    # --- Meetings ----------------------------------------------------- #
    meetings = db.execute(select(Meeting)).scalars().all()
    week_meetings = [m for m in meetings if _in_range(m.date, week_start, week_end)]
    meeting_ids = [m.id for m in week_meetings]
    ai_total = 0
    ai_open = 0
    if meeting_ids:
        action_items = (
            db.execute(
                select(MeetingActionItem).where(
                    MeetingActionItem.meeting_id.in_(meeting_ids)
                )
            )
            .scalars()
            .all()
        )
        ai_total = len(action_items)
        ai_open = sum(1 for a in action_items if a.status == "open")

    # --- Bugs --------------------------------------------------------- #
    bugs = db.execute(select(ProjectBug)).scalars().all()
    bugs_closed = 0
    bugs_new = 0
    bugs_open = 0
    for b in bugs:
        if b.status == "closed" and _in_range(b.closed_date, week_start, week_end):
            bugs_closed += 1
        found = b.found_date or b.created_at
        if _in_range(found, week_start, week_end):
            bugs_new += 1
        if b.status in ("open", "in_progress"):
            bugs_open += 1

    # --- Coverage deltas ---------------------------------------------- #
    coverage_deltas: list[dict] = []
    for p in projects:
        snaps = (
            db.execute(
                select(ProjectCoverageSnapshot)
                .where(ProjectCoverageSnapshot.project_id == p.id)
                .order_by(ProjectCoverageSnapshot.snapshot_date)
            )
            .scalars()
            .all()
        )
        if not snaps:
            continue
        in_week = [s for s in snaps if _in_range(s.snapshot_date, week_start, week_end)]
        if len(in_week) >= 2:
            before, after = in_week[0], in_week[-1]
        elif len(in_week) == 1 and len(snaps) >= 2:
            after = in_week[-1]
            before = snaps[snaps.index(after) - 1]
        elif len(in_week) == 1:
            before = after = in_week[0]
        else:
            continue
        pr_before = _pass_rate(before)
        pr_after = _pass_rate(after)
        coverage_deltas.append(
            {
                "project_id": p.id,
                "project": p.prefix or p.name,
                "pass_rate_before": pr_before,
                "pass_rate_after": pr_after,
                "pass_rate_delta": round(pr_after - pr_before, 1),
                "cov_statement_before": round(before.cov_statement, 1),
                "cov_statement_after": round(after.cov_statement, 1),
                "cov_statement_delta": round(after.cov_statement - before.cov_statement, 1),
            }
        )

    # --- Recovery plans (đọc trực tiếp bảng, chưa có model) ----------- #
    recovery = _recovery_for_week(db, week_start, week_end)

    return {
        "week_start": week_start.isoformat(),
        "week_end": week_end.isoformat(),
        "tasks": {
            "completed_count": len(completed),
            "completed": completed,
            "completed_ids": [c["id"] for c in completed],
            "created_count": created,
            "blocked_count": blocked,
            "overdue_count": overdue,
        },
        "meetings": {
            "count": len(week_meetings),
            "action_items_total": ai_total,
            "action_items_open": ai_open,
        },
        "bugs": {
            "closed_count": bugs_closed,
            "new_count": bugs_new,
            "open_count": bugs_open,
        },
        "coverage_deltas": coverage_deltas,
        "recovery": recovery,
    }


def _recovery_for_week(db: Session, week_start: date, week_end: date) -> list[dict]:
    """Đọc project_recovery_plans có week_date trong tuần (nếu bảng tồn tại)."""
    try:
        rows = db.execute(
            text(
                "SELECT id, project_id, week_label, week_date, estimate_items, "
                "actual_items, outcome_status, outcome_note "
                "FROM project_recovery_plans "
                "WHERE week_date BETWEEN :start AND :end"
            ),
            {"start": week_start.isoformat(), "end": week_end.isoformat()},
        ).mappings().all()
    except Exception:
        return []
    return [dict(r) for r in rows]


# ------------------------------------------------------------------------- #
#  CFT report generation
# ------------------------------------------------------------------------- #
def _strip_html(html: str | None) -> str:
    if not html:
        return ""
    import re

    text_only = re.sub(r"<[^>]+>", " ", html)
    text_only = text_only.replace("&nbsp;", " ")
    return " ".join(text_only.split()).strip()


def generate_cft_report(db: Session, review) -> str:
    """Tạo báo cáo CFT (plain text) từ số liệu tuần + phần reflection/plan."""
    summary = compute_auto_summary(db, review.week_start, review.week_end)
    t = summary["tasks"]
    m = summary["meetings"]
    b = summary["bugs"]

    lines: list[str] = []
    lines.append(f"WEEKLY REPORT — {review.week_label}")
    lines.append(f"({review.week_start} → {review.week_end})")
    lines.append("")

    lines.append("1. TÓM TẮT SỐ LIỆU")
    lines.append(f"   - Task hoàn thành: {t['completed_count']}")
    lines.append(f"   - Task tạo mới: {t['created_count']}")
    lines.append(f"   - Task blocked: {t['blocked_count']} | quá hạn: {t['overdue_count']}")
    lines.append(
        f"   - Cuộc họp: {m['count']} | action items: "
        f"{m['action_items_total']} (còn mở {m['action_items_open']})"
    )
    lines.append(
        f"   - Bug: đóng {b['closed_count']} | mới {b['new_count']} | đang mở {b['open_count']}"
    )
    if summary["coverage_deltas"]:
        lines.append("   - Coverage / pass-rate:")
        for c in summary["coverage_deltas"]:
            sign = "+" if c["pass_rate_delta"] >= 0 else ""
            lines.append(
                f"       {c['project']}: pass-rate {c['pass_rate_after']}% "
                f"({sign}{c['pass_rate_delta']}%)"
            )
    lines.append("")

    highlights = _strip_html(review.highlights)
    if highlights:
        lines.append("2. ĐIỂM NỔI BẬT")
        lines.append(f"   {highlights}")
        lines.append("")

    challenges = _strip_html(review.challenges)
    if challenges:
        lines.append("3. KHÓ KHĂN")
        lines.append(f"   {challenges}")
        lines.append("")

    focus = _strip_html(review.focus_next_week)
    top_focus = review.top_focus or []
    if focus or top_focus:
        lines.append("4. KẾ HOẠCH TUẦN TỚI")
        for item in top_focus:
            if isinstance(item, dict) and item.get("text"):
                prio = f" ({item['priority']})" if item.get("priority") else ""
                lines.append(f"   - {item['text']}{prio}")
        if focus:
            lines.append(f"   {focus}")
        lines.append("")

    risks = _strip_html(review.risks_next_week)
    if risks:
        lines.append("5. RỦI RO / PHỤ THUỘC")
        lines.append(f"   {risks}")
        deps = _strip_html(review.dependencies_next_week)
        if deps:
            lines.append(f"   Phụ thuộc: {deps}")
        lines.append("")

    return "\n".join(lines).strip()

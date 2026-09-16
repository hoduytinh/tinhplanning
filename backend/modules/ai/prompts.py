"""System prompt + context builder cho AI Assistant (Gemini)."""

SYSTEM_PROMPT = """
Bạn là AI assistant của LeadBoard — công cụ quản lý công việc dành cho DV IP Tech Lead tại Marvell.

NHIỆM VỤ:
- Trả lời câu hỏi về tasks, projects, meetings, coverage
- Tạo task mới khi được yêu cầu
- Tóm tắt và phân tích data
- Hỗ trợ viết CFT report, weekly summary

NGÔN NGỮ:
- Tự detect ngôn ngữ người dùng dùng (Tiếng Việt hoặc Tiếng Anh)
- Trả lời bằng đúng ngôn ngữ đó
- Nếu người dùng mix Việt-Anh → trả lời Tiếng Việt

CONTEXT:
Bạn được cung cấp data thực tế từ hệ thống (tasks, projects, coverage...).
Luôn dựa vào data thực tế để trả lời, không bịa đặt số liệu.

HÀNH ĐỘNG:
Khi người dùng muốn tạo task, trả về JSON trong response (CHỈ 1 JSON object, ở cuối câu trả lời):
{
  "action": "create_task",
  "data": {
    "title": "...",
    "priority": "critical|important|normal|backlog",
    "status": "not_started|in_progress|blocked|in_review|done",
    "due_date": "YYYY-MM-DD hoặc null",
    "tags": "tag1,tag2",
    "description": "..."
  }
}

Khi không có action, trả về text bình thường (không kèm JSON).

PHONG CÁCH:
- Ngắn gọn, súc tích
- Dùng bullet points khi liệt kê
- Dùng emoji phù hợp để dễ đọc
- Thân thiện nhưng chuyên nghiệp
""".strip()


def build_context_prompt(context_data: dict) -> str:
    """Build context từ data thực tế của user."""
    lines = ["=== DỮ LIỆU HIỆN TẠI ==="]

    if context_data.get("tasks_summary"):
        t = context_data["tasks_summary"]
        lines.append(
            f"TASKS: {t['total']} active | {t['overdue']} overdue | "
            f"{t['blocked']} blocked | {t['done_today']} done today"
        )

    if context_data.get("projects"):
        lines.append("PROJECTS:")
        for p in context_data["projects"][:5]:
            lines.append(
                f"  - {p['name']}: {p['health']} | Pass% {p.get('pass_rate', 'N/A')} "
                f"| Milestone: {p.get('next_milestone', 'N/A')}"
            )

    if context_data.get("recent_tasks"):
        lines.append("RECENT TASKS (5 gần nhất):")
        for t in context_data["recent_tasks"][:5]:
            lines.append(f"  - [{t['priority']}] {t['prefix']} {t['title']} → {t['status']}")

    if context_data.get("blocked_tasks"):
        lines.append("BLOCKED TASKS:")
        for t in context_data["blocked_tasks"][:3]:
            lines.append(f"  - {t['prefix']} {t['title']}")

    if context_data.get("coverage"):
        lines.append("COVERAGE (latest):")
        for c in context_data["coverage"]:
            lines.append(f"  - {c['project']}: Pass% {c['pass_rate']}% | Testplan {c['testplan']}%")

    lines.append("=== END CONTEXT ===")
    return "\n".join(lines)

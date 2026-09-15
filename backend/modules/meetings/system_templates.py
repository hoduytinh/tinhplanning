"""System meeting template definitions (seeded idempotently on startup).

These 5 templates are created with is_system=True and cannot be deleted.
Their config JSON drives which features/sections/action-item fields appear
when a meeting is created from the template.
"""

SYSTEM_TEMPLATES: list[dict] = [
    {
        "name": "DV Internal",
        "type": "dv_internal",
        "icon": "🔵",
        "color": "#6366f1",
        "config": {
            "features": {
                "attendees": True,
                "agenda": True,
                "recurring": True,
                "carry_over_actions": True,
                "create_task_from_action": True,
                "export_cft": False,
                "share_summary": True,
                "close_checklist": True,
            },
            "action_items": {
                "enabled": True,
                "has_assignee": True,
                "has_due_date": True,
                "has_priority": False,
                "has_category": True,
                "categories": ["DV", "DE", "All"],
                "default_due_offset_days": 7,
            },
            "sections": [
                {
                    "type": "coverage_widget",
                    "title": "Coverage Status",
                    "order": 1,
                    "is_required": True,
                    "config": {
                        "columns": [
                            "Block",
                            "Pass%",
                            "Testplan%",
                            "Statement",
                            "Toggle",
                            "Issues",
                        ]
                    },
                },
                {
                    "type": "blocker_table",
                    "title": "Blocker List",
                    "order": 2,
                    "is_required": False,
                    "config": {
                        "columns": ["#", "Block", "Issue", "Owner", "ETA", "Status"]
                    },
                },
                {
                    "type": "notes",
                    "title": "Notes",
                    "order": 3,
                    "is_required": False,
                },
            ],
            "defaults": {
                "agenda_items": [
                    "Coverage status update",
                    "Blocker review",
                    "Action items review",
                ]
            },
            "close_checklist": [
                "Đã update CFT Tracker?",
                "Đã share coverage số liệu?",
            ],
            "recurring_default": "weekly",
        },
    },
    {
        "name": "DnE Meeting",
        "type": "dne",
        "icon": "🟠",
        "color": "#f59e0b",
        "config": {
            "features": {
                "attendees": True,
                "agenda": True,
                "recurring": True,
                "carry_over_actions": True,
                "create_task_from_action": True,
                "export_cft": False,
                "share_summary": True,
                "close_checklist": False,
            },
            "action_items": {
                "enabled": True,
                "has_assignee": True,
                "has_due_date": True,
                "has_priority": True,
                "has_category": True,
                "categories": ["DV", "DE"],
                "default_due_offset_days": 3,
            },
            "sections": [
                {
                    "type": "blocker_table",
                    "title": "DV Blocking Issues (cần DE support)",
                    "order": 1,
                    "is_required": True,
                    "config": {
                        "columns": ["Issue", "Block", "JIRA", "DE Owner", "ETA"]
                    },
                },
                {
                    "type": "notes",
                    "title": "RTL Updates từ DE",
                    "order": 2,
                    "is_required": False,
                },
                {
                    "type": "notes",
                    "title": "DV Progress Update",
                    "order": 3,
                    "is_required": False,
                },
                {
                    "type": "decision_log",
                    "title": "Agreements & Decisions",
                    "order": 4,
                    "is_required": False,
                },
            ],
            "defaults": {
                "agenda_items": [
                    "RTL updates impact",
                    "DV blockers",
                    "Progress update",
                    "Decisions",
                ]
            },
            "recurring_default": "biweekly",
        },
    },
    {
        "name": "Project CFT",
        "type": "project_cft",
        "icon": "🟣",
        "color": "#8b5cf6",
        "config": {
            "features": {
                "attendees": True,
                "agenda": False,
                "recurring": True,
                "carry_over_actions": True,
                "create_task_from_action": True,
                "export_cft": True,
                "share_summary": True,
                "close_checklist": True,
            },
            "action_items": {
                "enabled": True,
                "has_assignee": True,
                "has_due_date": True,
                "has_priority": True,
                "has_category": False,
                "default_due_offset_days": 7,
            },
            "sections": [
                {
                    "type": "notes",
                    "title": "Achievements",
                    "order": 1,
                    "is_required": True,
                },
                {
                    "type": "notes",
                    "title": "Next Steps",
                    "order": 2,
                    "is_required": True,
                },
                {
                    "type": "milestone_widget",
                    "title": "Milestones",
                    "order": 3,
                    "is_required": True,
                },
                {
                    "type": "coverage_widget",
                    "title": "DV Metrics",
                    "order": 4,
                    "is_required": False,
                    "config": {
                        "columns": [
                            "Block",
                            "Total",
                            "Created",
                            "Ready",
                            "Pass%",
                            "Notes",
                        ]
                    },
                },
                {
                    "type": "bug_widget",
                    "title": "Open Critical Bugs",
                    "order": 5,
                    "is_required": False,
                },
                {
                    "type": "risk_widget",
                    "title": "Issues / Risks",
                    "order": 6,
                    "is_required": False,
                },
            ],
            "close_checklist": [
                "Đã update slide CFT?",
                "Đã share với Kalyan/Akhilesh?",
                "Đã update TIGER_CFT_Tracker?",
            ],
            "recurring_default": "weekly",
        },
    },
    {
        "name": "Bug Review",
        "type": "bug_review",
        "icon": "🔴",
        "color": "#ef4444",
        "config": {
            "features": {
                "attendees": True,
                "agenda": False,
                "recurring": True,
                "carry_over_actions": True,
                "create_task_from_action": True,
                "export_cft": False,
                "share_summary": False,
                "close_checklist": False,
            },
            "action_items": {
                "enabled": True,
                "has_assignee": True,
                "has_due_date": True,
                "has_priority": True,
                "has_category": False,
                "default_due_offset_days": 5,
            },
            "sections": [
                {
                    "type": "bug_widget",
                    "title": "Bug Summary",
                    "order": 1,
                    "is_required": True,
                },
                {
                    "type": "blocker_table",
                    "title": "Critical/High Bugs Review",
                    "order": 2,
                    "is_required": True,
                    "config": {
                        "columns": [
                            "Bug#",
                            "JIRA",
                            "Title",
                            "Root Cause",
                            "Fix Plan",
                            "Owner",
                            "ETA",
                        ]
                    },
                },
                {
                    "type": "notes",
                    "title": "Closed This Week",
                    "order": 3,
                    "is_required": False,
                },
                {
                    "type": "notes",
                    "title": "New Bugs This Week",
                    "order": 4,
                    "is_required": False,
                },
            ],
            "recurring_default": "biweekly",
        },
    },
    {
        "name": "Design Review",
        "type": "design_review",
        "icon": "🟡",
        "color": "#f59e0b",
        "config": {
            "features": {
                "attendees": True,
                "agenda": True,
                "recurring": False,
                "carry_over_actions": True,
                "create_task_from_action": True,
                "export_cft": False,
                "share_summary": False,
                "close_checklist": True,
            },
            "action_items": {
                "enabled": True,
                "has_assignee": True,
                "has_due_date": True,
                "has_priority": True,
                "has_category": False,
                "default_due_offset_days": 7,
            },
            "sections": [
                {
                    "type": "notes",
                    "title": "Document Info",
                    "order": 1,
                    "is_required": True,
                },
                {
                    "type": "blocker_table",
                    "title": "Questions / Clarifications",
                    "order": 2,
                    "is_required": True,
                    "config": {
                        "columns": ["#", "Section", "Question", "Answer", "Status"]
                    },
                },
                {
                    "type": "decision_log",
                    "title": "Decisions Made",
                    "order": 3,
                    "is_required": False,
                },
                {
                    "type": "notes",
                    "title": "DV Impact Assessment",
                    "order": 4,
                    "is_required": True,
                },
            ],
            "close_checklist": [
                "Đã ghi lại tất cả decisions?",
                "Đã update testplan theo spec mới?",
                "Đã assign action items cho DE?",
            ],
            "recurring_default": "none",
        },
    },
]

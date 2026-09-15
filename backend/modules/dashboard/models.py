"""SQLAlchemy model cho Dashboard module.

Chỉ 1 bảng: `project_recovery_plans` — lưu kế hoạch phục hồi (Plan) theo tuần
cho mỗi project. Dùng cho Tab Recovery (Project Detail) — nơi quản lý đầy đủ
— và widget Recovery Radar (Dashboard, Vùng D) — nơi xem nhanh + cập nhật
tuần này. Cả 2 nơi đọc/ghi cùng bảng này qua cùng service layer.
"""
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class ProjectRecoveryPlan(Base):
    __tablename__ = "project_recovery_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_label: Mapped[str] = mapped_column(String(32), nullable=False)
    week_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Plan targets (set 1 lần, có thể edit).
    plan_tests: Mapped[int | None] = mapped_column(Integer, nullable=True)
    plan_testplan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    plan_pass_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_statement: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_branch: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_toggle: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_expression: Mapped[float | None] = mapped_column(Float, nullable=True)
    plan_acov: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Issues & blockers tuần này — bullet list dạng markdown.
    issues: Mapped[str | None] = mapped_column(Text, nullable=True)

    # JSON array các dòng: [{ "name": "Tinh", "task": "IOD cmpl path ..." }]
    acceleration_items: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Estimate cho tuần này.
    estimate_items: Mapped[int | None] = mapped_column(Integer, nullable=True)
    estimate_cumulative_from: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )
    estimate_cumulative_to: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )

    # Outcome — fill cuối tuần.
    actual_items: Mapped[int | None] = mapped_column(Integer, nullable=True)
    outcome_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # planned / done / partial / missed
    outcome_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="planned"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


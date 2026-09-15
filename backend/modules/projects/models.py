"""SQLAlchemy models for the Projects module.

Chỉ THÊM MỚI — không đụng tới model của Module Tasks. Tất cả model liên quan
tới project gom chung 1 file cho gọn (project + milestone + risk + activity +
comment).
"""
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Prefix hiển thị trên task badge (vd "TigerA0"). Bắt buộc khi tạo mới
    # ở frontend; nullable để tương thích project cũ (fallback về name).
    prefix: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # Màu hiển thị cho prefix trong tiêu đề task (hex, vd "#3b82f6" = xanh
    # dương mặc định). Chọn được trong ProjectForm.
    prefix_color: Mapped[str] = mapped_column(
        String(16), nullable=False, default="#3b82f6"
    )

    # planning / in_progress / review / done
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="planning")
    # critical / important / normal / backlog
    priority: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")

    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # tags lưu dạng JSON array (khác Task dùng chuỗi CSV).
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # Danh sách tab/tính năng tùy chọn được bật cho project này (ngoài 3 tab
    # mặc định Tổng quan/Công việc/Hoạt động): "coverage", "documents",
    # "bugs", "signoff", "subblocks". JSON array, None/[] = tắt hết.
    enabled_modules: Mapped[list | None] = mapped_column(JSON, nullable=True)

    # health tự tính: on_track / at_risk / off_track / no_data
    health: Mapped[str] = mapped_column(String(16), nullable=False, default="no_data")

    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # not_started / in_progress / done
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="not_started")
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Marvell standard milestone type: por/irtl/cc/fpf/rtlf/fdr/tapeout/custom
    milestone_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="custom"
    )
    # DV exit criteria (gợi ý tự động, lưu chuỗi phân cách bằng dấu phẩy).
    exit_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Link ViewPoint+ checklist.
    vp_checklist_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Timeline (Tab 3): milestone thuộc track nào (null = track hệ thống
    # "MARVELL MILESTONES"). Marvell standard milestone không xóa được.
    track_id: Mapped[int | None] = mapped_column(
        ForeignKey("timeline_tracks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    is_marvell_standard: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class TimelineTrack(Base):
    __tablename__ = "timeline_tracks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # null = root track; trỏ tới track cha để tạo tree (không giới hạn depth).
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("timeline_tracks.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    color: Mapped[str] = mapped_column(String(16), nullable=False, default="#6366f1")
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_collapsed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class TimelineBar(Base):
    __tablename__ = "timeline_bars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    track_id: Mapped[int] = mapped_column(
        ForeignKey("timeline_tracks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    progress: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # override màu track nếu set (hex), null = kế thừa màu track.
    color: Mapped[str | None] = mapped_column(String(16), nullable=True)
    # not_started / in_progress / done / blocked
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="not_started"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Milestone markers bên trong bar (Tab 3). Xóa bar -> xóa theo.
    bar_milestones: Mapped[list["BarMilestone"]] = relationship(
        "BarMilestone",
        cascade="all, delete-orphan",
        order_by="BarMilestone.date",
    )


class BarMilestone(Base):
    __tablename__ = "bar_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bar_id: Mapped[int] = mapped_column(
        ForeignKey("timeline_bars.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # not_started / done / missed
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="not_started"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectRisk(Base):
    __tablename__ = "project_risks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    # low / medium / high
    severity: Mapped[str] = mapped_column(String(8), nullable=False, default="medium")
    mitigation: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectActivity(Base):
    __tablename__ = "project_activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # ex: "project_created", "status_changed", "priority_changed",
    #     "milestone_added", "milestone_status_changed", "risk_added", ...
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    old_value: Mapped[str | None] = mapped_column(String(512), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectCoverageSnapshot(Base):
    __tablename__ = "project_coverage_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    week_label: Mapped[str] = mapped_column(String(32), nullable=False)
    snapshot_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    total_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    passed_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    failed_tests: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    testplan_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    testplan_passed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    cov_statement: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_branch: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_toggle: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_fsm: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_expression: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_acov: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    cov_fcov: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    regression_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectDocument(Base):
    __tablename__ = "project_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    # spec / verif_doc / status / tool / other
    category: Mapped[str] = mapped_column(String(16), nullable=False, default="other")
    # mas/testplan/verif_strategy/tb_env/dashboard/tracker/jira/ewiki/
    # confluence/sharepoint/other
    doc_type: Mapped[str] = mapped_column(String(24), nullable=False, default="other")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectBug(Base):
    __tablename__ = "project_bugs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # ID hiển thị (vd "B175" hoặc "TIGERSOC-1104").
    bug_id: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # critical / high / medium / low
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    # open / in_progress / closed / cancelled / waived
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="open")
    jira_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    found_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    fixed_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    found_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    closed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    root_cause: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectSubblock(Base):
    __tablename__ = "project_subblocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # null = root level; trỏ tới subblock cha để tạo tree đệ quy.
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_subblocks.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    # auto-generate từ name: lowercase, no space.
    slug: Mapped[str] = mapped_column(String(160), nullable=False)
    # 1 = sub1, 2 = sub2, ... auto-compute từ parent.
    depth: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )


class ProjectSignoffItem(Base):
    __tablename__ = "project_signoff_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    item: Mapped[str] = mapped_column(String(512), nullable=False)
    # irtl / cc / fpf / rtlf / fdr / to
    milestone: Mapped[str] = mapped_column(String(16), nullable=False)
    # not_started / in_progress / done / waived / na
    status: Mapped[str] = mapped_column(
        String(16), nullable=False, default="not_started"
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False
    )

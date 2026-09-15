"""Sub-block tree service — quản lý cây sub-block của project.

Cây đệ quy: mỗi node có parent_id (null = root). `slug` sinh tự động từ name.
`depth` = số cấp (root = 1). Auto-tag của task được tính từ prefix project +
đường dẫn slug của sub-block (xem modules.tasks.service.compute_task_prefix).
"""
from __future__ import annotations

import re

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from modules.projects.models import ProjectSubblock
from modules.projects.schemas import SubblockCreate, SubblockMove, SubblockUpdate
from modules.projects.service import get_project


class SubblockNotFoundError(Exception):
    """Raised khi không tìm thấy sub-block."""


class SubblockValidationError(Exception):
    """Raised khi thao tác move/parent không hợp lệ (vd tạo vòng lặp)."""


def generate_slug(name: str) -> str:
    """Chuẩn hoá name → slug: lowercase, ký tự lạ → '-', gọn gàng."""
    slug = re.sub(r"[^a-z0-9]+", "-", (name or "").lower()).strip("-")
    return slug or "node"


def _get(db: Session, subblock_id: int) -> ProjectSubblock:
    sb = db.get(ProjectSubblock, subblock_id)
    if sb is None:
        raise SubblockNotFoundError(f"Sub-block {subblock_id} không tồn tại.")
    return sb


def list_subblocks(db: Session, project_id: int) -> list[ProjectSubblock]:
    """Trả về flat list (đã sort theo depth/order/id) — router sẽ build tree."""
    get_project(db, project_id)  # đảm bảo project tồn tại
    stmt = (
        select(ProjectSubblock)
        .where(ProjectSubblock.project_id == project_id)
        .order_by(
            ProjectSubblock.depth,
            ProjectSubblock.order,
            ProjectSubblock.id,
        )
    )
    return list(db.execute(stmt).scalars().all())


def build_tree(rows: list[ProjectSubblock]) -> list[dict]:
    """Chuyển flat list → cây lồng nhau (list các root node có `children`)."""
    nodes: dict[int, dict] = {}
    for r in rows:
        nodes[r.id] = {
            "id": r.id,
            "project_id": r.project_id,
            "parent_id": r.parent_id,
            "name": r.name,
            "slug": r.slug,
            "depth": r.depth,
            "order": r.order,
            "created_at": r.created_at,
            "children": [],
        }
    roots: list[dict] = []
    for r in rows:
        node = nodes[r.id]
        if r.parent_id and r.parent_id in nodes:
            nodes[r.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots


def get_subblock_path(db: Session, subblock_id: int) -> list[ProjectSubblock]:
    """Đường dẫn root→leaf (list các sub-block) tới subblock_id."""
    path: list[ProjectSubblock] = []
    current = db.get(ProjectSubblock, subblock_id)
    guard = 0
    while current is not None and guard < 50:
        path.append(current)
        if current.parent_id is None:
            break
        current = db.get(ProjectSubblock, current.parent_id)
        guard += 1
    path.reverse()
    return path


def _next_order(db: Session, project_id: int, parent_id: int | None) -> int:
    stmt = select(ProjectSubblock).where(
        ProjectSubblock.project_id == project_id,
        ProjectSubblock.parent_id.is_(parent_id)
        if parent_id is None
        else ProjectSubblock.parent_id == parent_id,
    )
    siblings = list(db.execute(stmt).scalars().all())
    return (max((s.order for s in siblings), default=-1)) + 1


def create_subblock(
    db: Session, project_id: int, payload: SubblockCreate
) -> ProjectSubblock:
    get_project(db, project_id)

    depth = 1
    if payload.parent_id is not None:
        parent = _get(db, payload.parent_id)
        if parent.project_id != project_id:
            raise SubblockValidationError("Parent thuộc project khác.")
        depth = parent.depth + 1

    sb = ProjectSubblock(
        project_id=project_id,
        parent_id=payload.parent_id,
        name=payload.name.strip(),
        slug=generate_slug(payload.name),
        depth=depth,
        order=_next_order(db, project_id, payload.parent_id),
    )
    db.add(sb)
    db.commit()
    db.refresh(sb)

    from modules.projects.activity_service import log_activity

    log_activity(db, project_id, "subblock_added", None, sb.name)
    return sb


def update_subblock(
    db: Session, subblock_id: int, payload: SubblockUpdate
) -> ProjectSubblock:
    sb = _get(db, subblock_id)
    if payload.name is not None:
        sb.name = payload.name.strip()
        sb.slug = generate_slug(payload.name)
    db.commit()
    db.refresh(sb)
    return sb


def _descendant_ids(db: Session, root_id: int) -> set[int]:
    """Tất cả id con-cháu của root_id (bao gồm chính nó)."""
    result: set[int] = {root_id}
    frontier = [root_id]
    guard = 0
    while frontier and guard < 500:
        guard += 1
        current = frontier.pop()
        stmt = select(ProjectSubblock.id).where(
            ProjectSubblock.parent_id == current
        )
        for (cid,) in db.execute(stmt).all():
            if cid not in result:
                result.add(cid)
                frontier.append(cid)
    return result


def _recompute_depth(db: Session, subblock_id: int) -> None:
    """Cập nhật depth cho subtree gốc subblock_id sau khi đổi parent."""
    sb = db.get(ProjectSubblock, subblock_id)
    if sb is None:
        return
    stack = [sb]
    guard = 0
    while stack and guard < 1000:
        guard += 1
        node = stack.pop()
        stmt = select(ProjectSubblock).where(
            ProjectSubblock.parent_id == node.id
        )
        for child in db.execute(stmt).scalars().all():
            child.depth = node.depth + 1
            stack.append(child)


def move_subblock(
    db: Session, subblock_id: int, payload: SubblockMove
) -> ProjectSubblock:
    sb = _get(db, subblock_id)

    if payload.parent_id is not None:
        if payload.parent_id == subblock_id:
            raise SubblockValidationError("Không thể đặt node làm cha của chính nó.")
        if payload.parent_id in _descendant_ids(db, subblock_id):
            raise SubblockValidationError("Không thể di chuyển vào node con của nó.")
        parent = _get(db, payload.parent_id)
        if parent.project_id != sb.project_id:
            raise SubblockValidationError("Parent thuộc project khác.")
        sb.parent_id = parent.id
        sb.depth = parent.depth + 1
    else:
        sb.parent_id = None
        sb.depth = 1

    if payload.order is not None:
        sb.order = payload.order

    _recompute_depth(db, subblock_id)
    db.commit()
    db.refresh(sb)
    return sb


def delete_subblock(db: Session, subblock_id: int) -> None:
    sb = _get(db, subblock_id)
    ids = _descendant_ids(db, subblock_id)

    # Gỡ liên kết subblock_id ở các task bị ảnh hưởng (tránh tham chiếu treo).
    from modules.tasks.models import Task

    db.execute(
        update(Task)
        .where(Task.subblock_id.in_(ids))
        .values(subblock_id=None)
    )

    for sid in ids:
        node = db.get(ProjectSubblock, sid)
        if node is not None:
            db.delete(node)
    db.commit()

    from modules.projects.activity_service import log_activity

    log_activity(db, sb.project_id, "subblock_removed", sb.name, None)

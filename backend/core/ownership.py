"""Shared SQLAlchemy mixin for the Ownership & Visibility layer.

Cung cấp 2 cột dùng chung cho mọi object table:
- created_by : id user đã tạo object (nullable — dữ liệu cũ chưa có chủ)
- is_shared  : True => object công khai, mọi user đều xem được (override
               toàn bộ visibility rules)

Cột được thêm vào DB qua Alembic migration 0020_ownership_fields, mixin này
chỉ khai báo phía ORM để code đọc/ghi được thuộc tính.
"""
from sqlalchemy import Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column


class OwnershipMixin:
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_shared: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )

"""Shared SQLAlchemy mixin for the Ownership & Visibility layer.

Cung cấp các cột dùng chung cho mọi object table:
- created_by : id user đã tạo object (nullable — dữ liệu cũ chưa có chủ)
- visibility : chế độ hiển thị — nguồn chân lý của Ownership layer:
    * "normal"  (mặc định) : theo visibility rules chuẩn (owner/assigned/
                             project-member/watcher xem được; admin/mod full).
    * "private" : chỉ owner + người được assign + viewer (watcher) xem được;
                  admin là role DUY NHẤT vẫn xem được (mod KHÔNG).
    * "shared"  : mọi user đều xem được (override toàn bộ rules).
- is_shared  : cột cũ, GIỮ để tương thích ngược — luôn được đồng bộ bằng
               (visibility == "shared"). Không dùng làm nguồn chân lý nữa.

Cột created_by/is_shared thêm ở migration 0020_ownership_fields; visibility
thêm ở 0023_visibility_modes. Mixin chỉ khai báo phía ORM.
"""
from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class OwnershipMixin:
    created_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_shared: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="0"
    )
    visibility: Mapped[str] = mapped_column(
        String(16), nullable=False, default="normal", server_default="normal"
    )

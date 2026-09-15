"""JWT auth: token creation/verification + FastAPI dependencies."""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db
from modules.users.models import User

# auto_error=False để một số endpoint có thể cho phép ẩn danh nếu cần.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

_CRED_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Không xác thực được. Vui lòng đăng nhập lại.",
    headers={"WWW-Authenticate": "Bearer"},
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(data: dict) -> str:
    expire = _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {**data, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    expire = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    # jti giúp mỗi refresh token là duy nhất (có thể revoke riêng lẻ).
    payload = {**data, "exp": expire, "type": "refresh", "jti": secrets.token_hex(8)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def hash_token(token: str) -> str:
    """Hash (SHA-256) refresh token trước khi lưu DB — không lưu token thô."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise _CRED_EXC
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise _CRED_EXC
        user_id = payload.get("sub")
        if user_id is None:
            raise _CRED_EXC
    except JWTError:
        raise _CRED_EXC

    user = db.get(User, int(user_id))
    if user is None or not user.is_active or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.",
        )
    return user


def require_role(*roles: str):
    """Trả về dependency đảm bảo current_user thuộc một trong các role."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền thực hiện thao tác này.",
            )
        return current_user

    return role_checker


def require_can_approve(current_user: User = Depends(get_current_user)) -> User:
    """Admin luôn được duyệt; moderator cần can_approve = True."""
    if current_user.role == "admin":
        return current_user
    if current_user.role == "moderator" and current_user.can_approve:
        return current_user
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Bạn không có quyền duyệt tài khoản.",
    )

"""Auth endpoints: login, logout, refresh, register, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
    hash_token,
)
from core.config import settings
from core.database import get_db
from core.security import verify_password
from modules.auth.schemas import (
    AccessTokenResponse,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    PasswordChange,
    ProfileUpdate,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    TokenUser,
)
from modules.users import service as user_service
from modules.users.models import RefreshToken, User
from modules.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _issue_tokens(db: Session, user: User) -> TokenResponse:
    claims = {"sub": str(user.id), "username": user.username, "role": user.role}
    access = create_access_token(claims)
    refresh = create_refresh_token({"sub": str(user.id)})

    payload = decode_token(refresh)
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh),
            expires_at=datetime.fromtimestamp(payload["exp"], tz=timezone.utc).replace(
                tzinfo=None
            ),
            is_revoked=False,
        )
    )
    user_service.touch_last_login(db, user)

    return TokenResponse(
        access_token=access,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        refresh_token=refresh,
        user=TokenUser(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            avatar_url=user.avatar_url,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = user_service.get_user_by_username(db, payload.username)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if user.status == "pending":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="PENDING")
    if user.status == "rejected":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="REJECTED")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="INACTIVE")

    return _issue_tokens(db, user)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if user_service.get_user_by_username(db, payload.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists"
        )
    if payload.email and user_service.get_user_by_email(db, payload.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
        )
    user_service.register_user(
        db,
        username=payload.username,
        password=payload.password,
        full_name=payload.full_name,
        email=payload.email,
        reason=payload.reason,
    )
    return MessageResponse(message="Registration successful. Please wait for admin approval.")


@router.post("/refresh", response_model=AccessTokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    token = payload.refresh_token
    try:
        claims = decode_token(token)
        if claims.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        user_id = claims.get("sub")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
        )

    stored = db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == hash_token(token))
    ).scalar_one_or_none()
    if stored is None or stored.is_revoked or stored.expires_at < _now().replace(tzinfo=None):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired or been revoked",
        )

    user = db.get(User, int(user_id))
    if user is None or not user.is_active or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid account",
        )

    access = create_access_token(
        {"sub": str(user.id), "username": user.username, "role": user.role}
    )
    return AccessTokenResponse(
        access_token=access,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.refresh_token:
        stored = db.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(payload.refresh_token)
            )
        ).scalar_one_or_none()
        if stored is not None:
            stored.is_revoked = True
            db.commit()
    else:
        # No specific refresh token -> revoke all tokens for this user.
        for tok in current_user.refresh_tokens:
            tok.is_revoked = True
        db.commit()
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude_unset=True)
    if data.get("email"):
        existing = user_service.get_user_by_email(db, data["email"])
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists"
            )
    for field, value in data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/password", response_model=MessageResponse)
def change_my_password(
    payload: PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user_service.change_password(db, current_user, payload.new_password)
    return MessageResponse(message="Password changed")

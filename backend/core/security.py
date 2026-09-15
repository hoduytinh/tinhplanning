"""Password hashing helpers (bcrypt via passlib)."""
from passlib.context import CryptContext

# bcrypt giới hạn 72 bytes; passlib xử lý cắt/scheme tự động.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_password, password_hash)
    except ValueError:
        return False

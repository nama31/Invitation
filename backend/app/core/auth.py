from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings

ALGORITHM = "HS256"

# TokenUrl points to the login route
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def verify_access_token(token: str) -> dict[str, Any]:
    """Verify and decode a JWT access token. Raises JWTError on failure."""
    try:
        payload: dict[str, Any] = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[ALGORITHM]
        )
        return payload
    except JWTError as exc:
        raise exc


def get_current_admin(token: str = Depends(oauth2_scheme)) -> str:
    """
    Dependency to verify JWT token and ensure it belongs to the admin.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = verify_access_token(token)
        email: str | None = payload.get("sub")
        if email is None or email != settings.ADMIN_EMAIL:
            raise credentials_exception
        return email
    except JWTError:
        raise credentials_exception

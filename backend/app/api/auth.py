from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.auth import create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


@router.post("/login", response_model=TokenResponse, tags=["auth"])
async def login(payload: LoginRequest) -> dict[str, str]:
    """
    Authenticate admin credentials and return a signed JWT.
    """
    if payload.email != settings.ADMIN_EMAIL or payload.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    access_token = create_access_token(data={"sub": payload.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }

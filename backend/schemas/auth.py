"""Pydantic models for authentication."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class SendOTPRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")


class VerifyOTPRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    code: str = Field(..., min_length=4, max_length=4, description="4-digit OTP code")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: "UserResponse" = Field(..., description="Authenticated user")


class UserResponse(BaseModel):
    id: str = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email")
    created_at: datetime = Field(..., description="Account creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")


class OTPEntry(BaseModel):
    email: EmailStr
    code: str
    expires_at: datetime
    attempts: int = 0


class LogoutRequest(BaseModel):
    pass

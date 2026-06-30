"""Authentication router for OTP-based email login."""
import random
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import EmailStr

import db as database
from schemas.auth import SendOTPRequest, VerifyOTPRequest, TokenResponse, UserResponse
from services.email_service import send_otp_email
from utils.auth import create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


# Constants
OTP_EXPIRE_MINUTES = 5
MAX_OTP_ATTEMPTS = 3
MAX_OTP_REQUESTS_PER_HOUR = 3  # Per IP or per email


def _generate_otp() -> str:
    """Generate a random 4-digit OTP code."""
    return str(random.randint(1000, 9999))


def _get_otp_key(email: str) -> str:
    """Generate a unique key for OTP storage per email."""
    return f"otp_{email.lower().strip()}"


def _get_user_by_email(email: str) -> dict:
    """Find a user by email address."""
    email_lower = email.lower().strip()
    for user_id, user_data in database._users_db.items():
        if user_data.get("email", "").lower() == email_lower:
            return {**user_data, "uid": user_id}
    return None


@router.post("/send-otp", status_code=status.HTTP_200_OK)
async def send_otp(request: SendOTPRequest):
    """Send a 4-digit OTP to the user's email address."""
    email = request.email.lower().strip()
    otp_key = _get_otp_key(email)
    
    # Check existing OTP requests
    existing_otp = database._otps_db.get(otp_key)
    if existing_otp:
        # Check if we've exceeded rate limit
        request_count = existing_otp.get("request_count", 0)
        last_request = existing_otp.get("last_request")
        if last_request and isinstance(last_request, datetime):
            # If more than an hour has passed, reset counter
            if datetime.now(timezone.utc) - last_request > timedelta(hours=1):
                request_count = 0
        if request_count >= MAX_OTP_REQUESTS_PER_HOUR:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests for this email. Please try again later.",
            )
    
    # Generate new OTP
    code = _generate_otp()
    
    # Store OTP
    now = datetime.now(timezone.utc)
    database._otps_db[otp_key] = {
        "email": email,
        "code": code,
        "expires_at": now + timedelta(minutes=OTP_EXPIRE_MINUTES),
        "attempts": 0,
        "created_at": now,
        "request_count": (existing_otp.get("request_count", 0) + 1) if existing_otp else 1,
        "last_request": now,
    }
    
    # Send email
    email_sent = await send_otp_email(request.email, code)
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP email. Server SMTP is not configured with valid Gmail credentials. Contact the administrator or check backend logs.",
        )
    
    return {
        "message": "OTP sent successfully",
        "expires_in": OTP_EXPIRE_MINUTES * 60,  # seconds
        "email": request.email,
    }


@router.post("/verify-otp", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def verify_otp(request: VerifyOTPRequest):
    """Verify the OTP code and return a JWT token."""
    email = request.email.lower().strip()
    otp_key = _get_otp_key(email)
    
    # Get stored OTP
    otp_data = database._otps_db.get(otp_key)
    if not otp_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP not found. Please request a new OTP.",
        )
    
    # Check expiry
    if datetime.now(timezone.utc) > otp_data["expires_at"]:
        # Clean up expired OTP
        if otp_key in database._otps_db:
            del database._otps_db[otp_key]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new one.",
        )
    
    # Check max attempts
    if otp_data["attempts"] >= MAX_OTP_ATTEMPTS:
        if otp_key in database._otps_db:
            del database._otps_db[otp_key]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum attempts exceeded. Please request a new OTP.",
        )
    
    # Verify code
    otp_data["attempts"] += 1
    if otp_data["code"] != request.code:
        still_has_attempts = otp_data["attempts"] < MAX_OTP_ATTEMPTS
        remaining = MAX_OTP_ATTEMPTS - otp_data["attempts"]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP code. {remaining} attempts remaining." if still_has_attempts else "Maximum attempts exceeded.",
        )
    
    # OTP verified - clean up
    if otp_key in database._otps_db:
        del database._otps_db[otp_key]
    
    # Find or create user
    user = _get_user_by_email(email)
    if not user:
        # Auto-create new user
        user_id = secrets.token_urlsafe(16)
        now = datetime.now(timezone.utc)
        database._users_db[user_id] = {
            "id": user_id,
            "email": email,
            "created_at": now,
            "last_login": now,
        }
        user_data = database._users_db[user_id]
    else:
        # Update last login
        user_data = database._users_db[user["uid"]]
        user_data["last_login"] = datetime.now(timezone.utc)
    
    # Generate JWT
    token = create_access_token(user_data["id"], email)
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user_data["id"],
            email=user_data["email"],
            created_at=user_data["created_at"],
            last_login=user_data.get("last_login"),
        ),
    )


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the current authenticated user's information."""
    user_data = database._users_db.get(current_user["user_id"])
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse(
        id=user_data["id"],
        email=user_data["email"],
        created_at=user_data["created_at"],
        last_login=user_data.get("last_login"),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(current_user: dict = Depends(get_current_user)):
    """Logout the current user (client-side token removal)."""
    return {"message": "Logged out successfully"}

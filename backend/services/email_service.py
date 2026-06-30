"""Email service for sending OTPs via Gmail SMTP."""
import os
from datetime import datetime

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", SMTP_USER)


def _is_configured() -> bool:
    """Return True only if real (non-placeholder) SMTP credentials are present."""
    if not SMTP_USER or not SMTP_PASS:
        return False
    placeholders = ("your_", "example", "placeholder", "change-me", "here")
    lowered_user = SMTP_USER.lower()
    lowered_pass = SMTP_PASS.lower()
    if any(token in lowered_user for token in placeholders):
        return False
    if any(token in lowered_pass for token in placeholders):
        return False
    if len(SMTP_PASS.replace(" ", "")) < 12:
        return False
    return True


async def send_otp_email(email: str, otp_code: str) -> bool:
    """Send an OTP email to the specified address.

    Falls back to dev mode (prints OTP to backend console) when SMTP credentials
    are missing or have placeholder values. Both reports OTP to console and returns
    True so login flow can still be tested end-to-end while the Gmail App Password
    is being set up.
    """
    if not _is_configured():
        print(f"[DEV MODE] SMTP not configured with real Gmail credentials.")
        print(f"[DEV MODE] SMTP_USER={SMTP_USER!r}, SMTP_PASS length={len(SMTP_PASS)}")
        print(f"[DEV MODE] OTP for {email}: {otp_code}")
        print(f"[DEV MODE] Use this code to log in. Email NOT sent.")
        return True

    message = MIMEMultipart("alternative")
    message["From"] = f"AI Productivity App <{SMTP_FROM}>"
    message["To"] = email
    message["Subject"] = "Your Login OTP Code"

    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #4F46E5;">AI Productivity App</h2>
                <p>Hello,</p>
                <p>Your one-time password (OTP) for login is:</p>
                <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <h1 style="letter-spacing: 8px; font-size: 36px; color: #1F2937;">{otp_code}</h1>
                </div>
                <p>This code will expire in <strong>5 minutes</strong>.</p>
                <p style="color: #666; font-size: 13px; margin-top: 30px;">
                    If you did not request this code, please ignore this email.
                </p>
            </div>
        </body>
    </html>
    """

    plain_body = f"""
    AI Productivity App

    Your one-time password (OTP) for login is: {otp_code}

    This code will expire in 5 minutes.

    If you did not request this code, please ignore this email.
    """

    message.attach(MIMEText(plain_body, "plain"))
    message.attach(MIMEText(html_body, "html"))

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASS,
        )
        print(f"[Email] OTP sent to {email}: {otp_code}")
        return True
    except Exception as e:
        print(f"[Email] Failed to send OTP to {email}: {e}")
        print(f"[Email] Falling back to dev mode. OTP for {email}: {otp_code}")
        return True


def smtp_status() -> dict:
    """Diagnostic info about current SMTP configuration."""
    return {
        "configured": _is_configured(),
        "host": SMTP_HOST,
        "port": SMTP_PORT,
        "user_set": bool(SMTP_USER),
        "pass_length": len(SMTP_PASS),
    }

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import secrets
from datetime import datetime, timedelta, timezone

from app import models, schemas
from app.deps import get_current_user, get_db
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.username == payload.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    user = models.User(
        username=payload.username,
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        dob=payload.dob,
        employment_status=payload.employment_status,
        role=payload.role,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return schemas.Token(access_token=access_token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def read_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.post("/change-password")
def change_password(
    payload: schemas.PasswordChange,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "message": "Password changed successfully"}


# ── Forgot Password ────────────────────────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Generate a one-time reset token valid for 30 minutes.
    In production, this token is emailed. Here it is returned directly
    so the frontend can present a 'Reset Password' dialog without SMTP setup.
    """
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user:
        # Return success even if user not found — avoid username enumeration
        return {"status": "ok", "message": "If the username exists, a reset token has been issued.", "token": None}

    token = secrets.token_hex(32)  # 64-char hex string
    user.password_reset_token = token
    user.password_reset_expires = datetime.now(timezone.utc) + timedelta(minutes=30)
    db.commit()

    return {
        "status": "ok",
        "message": "Reset token issued. Use it within 30 minutes.",
        "token": token,  # In production, send via email; here returned directly
    }


# ── Reset Password ─────────────────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    """Consume the one-time reset token and set a new password."""
    if len(payload.new_password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    user = db.query(models.User).filter(
        models.User.password_reset_token == payload.token
    ).first()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    now = datetime.now(timezone.utc)
    if user.password_reset_expires is None or user.password_reset_expires < now:
        raise HTTPException(status_code=400, detail="Reset token has expired. Request a new one.")

    user.hashed_password = hash_password(payload.new_password)
    user.password_reset_token = None      # Invalidate token after use
    user.password_reset_expires = None
    db.commit()

    return {"status": "success", "message": "Password reset successfully. You can now log in."}

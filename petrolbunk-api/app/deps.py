from typing import Generator

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal
from app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner privileges required for this action",
        )
    return current_user


def get_current_branch(
    x_branch_id: str = Header(default=None, alias="X-Branch-ID"),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> str:
    """
    Reads X-Branch-ID header, validates the user has access to that branch,
    and returns the branch_id string.
    Falls back to the user's first assigned branch if no header is sent.
    Owners can access ALL branches. Managers/Operators only their assigned ones.
    """
    # If no branch header, pick the first assigned branch (or default)
    if not x_branch_id:
        ub = db.query(models.UserBranch).filter(
            models.UserBranch.user_id == current_user.id
        ).first()
        return ub.branch_id if ub else "B-01"

    # Owners can access any branch
    if current_user.role == 1:
        branch = db.query(models.Branch).filter(models.Branch.id == x_branch_id).first()
        if not branch:
            raise HTTPException(status_code=404, detail="Branch not found")
        return x_branch_id

    # Non-owners must be explicitly assigned
    ub = db.query(models.UserBranch).filter(
        models.UserBranch.user_id == current_user.id,
        models.UserBranch.branch_id == x_branch_id,
    ).first()
    if not ub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this branch",
        )
    return x_branch_id

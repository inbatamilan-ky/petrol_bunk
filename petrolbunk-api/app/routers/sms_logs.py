from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/sms-logs", tags=["SMS Rate Logs"])


@router.get("", response_model=List[schemas.SmsRateLogOut])
def list_sms_logs(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    return db.query(models.SmsRateLog).order_by(models.SmsRateLog.received_at.desc()).limit(limit).all()


@router.post("", response_model=schemas.SmsRateLogOut, status_code=status.HTTP_201_CREATED)
def create_sms_log(
    payload: schemas.SmsRateLogCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    log_id = f"sms-{int(datetime.now().timestamp()*1000)}"
    log = models.SmsRateLog(
        id=log_id,
        sender=payload.sender,
        raw_text=payload.raw_text,
        omc=payload.omc,
        effective_datetime=payload.effective_datetime,
        parsed_rates=payload.parsed_rates,
        status=payload.status or "PENDING_REVIEW",
        applied_by=payload.applied_by,
        applied_at=datetime.now() if payload.status == "APPLIED" else None,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.put("/{log_id}/status", response_model=schemas.SmsRateLogOut)
def update_sms_log_status(
    log_id: str,
    payload: schemas.SmsRateLogStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    log = db.query(models.SmsRateLog).filter(models.SmsRateLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="SMS log not found")

    log.status = payload.status
    if payload.status == "APPLIED":
        log.applied_at = datetime.now()
        log.applied_by = payload.applied_by or current_user.username

    db.commit()
    db.refresh(log)
    return log


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def clear_sms_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    db.query(models.SmsRateLog).delete()
    db.commit()
    return None

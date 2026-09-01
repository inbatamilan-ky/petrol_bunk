"""Fuel rate history router — read-only audit trail."""

from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/rate-history", tags=["Rate History"])


@router.get("", response_model=List[schemas.FuelRateHistoryOut])
def list_rate_history(
    product_id: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.FuelRateHistory).filter(
        models.FuelRateHistory.branch_id == branch_id
    )
    if product_id:
        q = q.filter(models.FuelRateHistory.product_id == product_id)
    return q.order_by(models.FuelRateHistory.effective_date.desc()).all()

from typing import List, Optional
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/rate-history", tags=["Fuel Rate History"])


@router.get("", response_model=List[schemas.FuelRateHistoryOut])
def get_rate_history(
    product_id: Optional[str] = Query(None, description="Filter by product ID"),
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter"),
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    """Return fuel rate change audit trail, newest first."""
    q = db.query(models.FuelRateHistory).filter(models.FuelRateHistory.branch_id == branch_id)
    if product_id:
        q = q.filter(models.FuelRateHistory.product_id == product_id)
    if from_date:
        q = q.filter(models.FuelRateHistory.effective_date >= from_date)
    if to_date:
        q = q.filter(models.FuelRateHistory.effective_date <= to_date)
    return q.order_by(models.FuelRateHistory.created_at.desc()).limit(limit).all()

"""
Settlements router — Block F (bank × channel matrix).
One row per bank + channel combination per day.
"""

from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/settlements", tags=["Settlements"])


@router.get("", response_model=List[schemas.SettlementOut])
def list_settlements(
    settlement_date: Optional[date_cls] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.Settlement).filter(models.Settlement.branch_id == branch_id)
    if settlement_date:
        q = q.filter(models.Settlement.settlement_date == settlement_date)
    return q.order_by(models.Settlement.settlement_date.desc()).all()


@router.post("/batch", response_model=List[schemas.SettlementOut], status_code=status.HTTP_201_CREATED)
def batch_save_settlements(
    payload: schemas.BatchSettlementCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Upsert all bank×channel entries for a day (replaces the entire day's matrix)."""
    # Validate bank + channel codes
    valid_banks = {b.code for b in db.query(models.MasterBank).filter(models.MasterBank.is_active == True).all()}
    valid_channels = {c.code for c in db.query(models.MasterChannel).filter(models.MasterChannel.is_active == True).all()}

    saved = []
    for item in payload.items:
        if item.bank_code not in valid_banks:
            raise HTTPException(status_code=400, detail=f"Invalid bank_code: {item.bank_code}")
        if item.channel_code not in valid_channels:
            raise HTTPException(status_code=400, detail=f"Invalid channel_code: {item.channel_code}")

        existing = db.query(models.Settlement).filter(
            models.Settlement.branch_id == branch_id,
            models.Settlement.settlement_date == payload.settlement_date,
            models.Settlement.bank_code == item.bank_code,
            models.Settlement.channel_code == item.channel_code,
        ).first()

        if existing:
            existing.amount = item.amount
            saved.append(existing)
        else:
            new_settlement = models.Settlement(
                id=generate_id("stl"),
                branch_id=branch_id,
                settlement_date=payload.settlement_date,
                bank_code=item.bank_code,
                channel_code=item.channel_code,
                amount=item.amount,
            )
            db.add(new_settlement)
            saved.append(new_settlement)

    db.commit()
    for s in saved:
        db.refresh(s)
    return saved


@router.delete("/{settlement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_settlement(
    settlement_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    s = db.query(models.Settlement).filter(
        models.Settlement.branch_id == branch_id,
        models.Settlement.id == settlement_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Settlement not found")
    db.delete(s)
    db.commit()
    return None

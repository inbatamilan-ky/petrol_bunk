"""Daily Cash Reconciliation router — Block I (10 fields from the Excel)."""

from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/cash-reconciliation", tags=["Cash Reconciliation"])


@router.get("", response_model=List[schemas.DailyCashReconciliationOut])
def list_reconciliations(
    date_from: Optional[date_cls] = None,
    date_to: Optional[date_cls] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.DailyCashReconciliation).filter(
        models.DailyCashReconciliation.branch_id == branch_id
    )
    if date_from:
        q = q.filter(models.DailyCashReconciliation.recon_date >= date_from)
    if date_to:
        q = q.filter(models.DailyCashReconciliation.recon_date <= date_to)
    return q.order_by(models.DailyCashReconciliation.recon_date.desc()).all()


@router.get("/{recon_date}", response_model=schemas.DailyCashReconciliationOut)
def get_reconciliation(
    recon_date: date_cls,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    rec = db.query(models.DailyCashReconciliation).filter(
        models.DailyCashReconciliation.branch_id == branch_id,
        models.DailyCashReconciliation.recon_date == recon_date,
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="No reconciliation found for this date")
    return _serialize(rec)


@router.post("", response_model=schemas.DailyCashReconciliationOut, status_code=status.HTTP_201_CREATED)
def save_reconciliation(
    payload: schemas.DailyCashReconciliationCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Upsert: one reconciliation per day per branch."""
    existing = db.query(models.DailyCashReconciliation).filter(
        models.DailyCashReconciliation.branch_id == branch_id,
        models.DailyCashReconciliation.recon_date == payload.recon_date,
    ).first()

    fields = payload.model_dump()
    if existing:
        for key, val in fields.items():
            if key != "recon_date":
                setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return _serialize(existing)
    else:
        rec = models.DailyCashReconciliation(
            id=generate_id("dcr"),
            branch_id=branch_id,
            **fields,
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)
        return _serialize(rec)


def _serialize(rec: models.DailyCashReconciliation) -> dict:
    """Compute the derived 'difference' field before returning."""
    difference = float(rec.system_total_in_sheet) - float(rec.physically_counted_note)
    out = schemas.DailyCashReconciliationOut.model_validate(rec)
    out.difference = difference
    return out

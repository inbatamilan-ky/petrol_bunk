from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/cash-ledger", tags=["Cash Safe Ledger"])


@router.get("", response_model=List[schemas.CashSafeLedgerOut])
def get_cash_safe_ledgers(
    ledger_date: Optional[date] = None,
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    query = db.query(models.CashSafeLedger).filter(models.CashSafeLedger.branch_id == branch_id)
    if ledger_date:
        query = query.filter(models.CashSafeLedger.ledger_date == ledger_date)
    return query.order_by(models.CashSafeLedger.ledger_date.desc()).limit(limit).all()


@router.post("", response_model=schemas.CashSafeLedgerOut, status_code=status.HTTP_201_CREATED)
def save_cash_safe_ledger(
    payload: schemas.CashSafeLedgerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    ledger_id = f"csl-{payload.ledger_date.strftime('%Y%m%d')}"
    existing = db.query(models.CashSafeLedger).filter(models.CashSafeLedger.branch_id == branch_id).filter(models.CashSafeLedger.ledger_date == payload.ledger_date).first()

    if existing:
        existing.opening_safe_cash = payload.opening_safe_cash
        existing.shift_cash_inflow = payload.shift_cash_inflow
        existing.credit_cash_recovered = payload.credit_cash_recovered
        existing.petty_cash_expenses = payload.petty_cash_expenses
        existing.bank_deposits_dropped = payload.bank_deposits_dropped
        existing.expected_safe_cash = payload.expected_safe_cash
        existing.physical_counted_cash = payload.physical_counted_cash
        existing.cash_variance = payload.cash_variance
        existing.denominations = payload.denominations
        existing.audited_by = payload.audited_by or current_user.username
        existing.notes = payload.notes
        db.commit()
        db.refresh(existing)
        return existing
    else:
        new_entry = models.CashSafeLedger(
            id=ledger_id,
            branch_id=branch_id,
            ledger_date=payload.ledger_date,
            opening_safe_cash=payload.opening_safe_cash,
            shift_cash_inflow=payload.shift_cash_inflow,
            credit_cash_recovered=payload.credit_cash_recovered,
            petty_cash_expenses=payload.petty_cash_expenses,
            bank_deposits_dropped=payload.bank_deposits_dropped,
            expected_safe_cash=payload.expected_safe_cash,
            physical_counted_cash=payload.physical_counted_cash,
            cash_variance=payload.cash_variance,
            denominations=payload.denominations,
            audited_by=payload.audited_by or current_user.username,
            notes=payload.notes,
        )
        db.add(new_entry)
        db.commit()
        db.refresh(new_entry)
        return new_entry

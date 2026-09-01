"""Bank deposits router — date + amount only (no denomination breakdown)."""

from datetime import date as date_cls
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/bank-deposits", tags=["Cash & Bank"])


@router.get("", response_model=List[schemas.BankDepositOut])
def list_bank_deposits(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    return (
        db.query(models.BankDeposit)
        .filter(models.BankDeposit.branch_id == branch_id)
        .order_by(models.BankDeposit.deposit_date.desc())
        .all()
    )


@router.post("", response_model=schemas.BankDepositOut, status_code=status.HTTP_201_CREATED)
def create_bank_deposit(
    payload: schemas.BankDepositCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than zero")
    deposit = models.BankDeposit(
        id=generate_id("dep"),
        branch_id=branch_id,
        deposit_date=payload.deposit_date or date_cls.today(),
        amount=payload.amount,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_deposit(
    deposit_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    deposit = db.query(models.BankDeposit).filter(
        models.BankDeposit.branch_id == branch_id, models.BankDeposit.id == deposit_id
    ).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Bank deposit not found")
    db.delete(deposit)
    db.commit()
    return None

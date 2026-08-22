from datetime import date as date_cls
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/bank-deposits", tags=["Cash & Bank"])


@router.get("", response_model=List[schemas.BankDepositOut])
def list_bank_deposits(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.BankDeposit).order_by(models.BankDeposit.deposit_date.desc()).all()


@router.post("", response_model=schemas.BankDepositOut, status_code=status.HTTP_201_CREATED)
def create_bank_deposit(
    payload: schemas.BankDepositCreate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    computed_amount = (
        payload.note_2000 * 2000
        + payload.note_500 * 500
        + payload.note_200 * 200
        + payload.note_100 * 100
        + payload.note_50 * 50
        + payload.note_20 * 20
        + payload.note_10 * 10
        + payload.coins
    )
    amount = payload.amount if payload.amount is not None else computed_amount
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deposit amount must be greater than zero")

    deposit = models.BankDeposit(
        id=generate_id("dep"),
        deposit_date=payload.deposit_date or date_cls.today(),
        bank_name=payload.bank_name,
        account_no=payload.account_no,
        amount=amount,
        note_2000=payload.note_2000,
        note_500=payload.note_500,
        note_200=payload.note_200,
        note_100=payload.note_100,
        note_50=payload.note_50,
        note_20=payload.note_20,
        note_10=payload.note_10,
        coins=payload.coins,
        deposited_by=payload.deposited_by or "Manager",
        reference_no=payload.reference_no,
        notes=payload.notes,
    )
    db.add(deposit)
    db.commit()
    db.refresh(deposit)
    return deposit


@router.delete("/{deposit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_deposit(deposit_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    deposit = db.query(models.BankDeposit).get(deposit_id)
    if not deposit:
        raise HTTPException(status_code=404, detail="Bank deposit not found")
    db.delete(deposit)
    db.commit()
    return None

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/api/bank-accounts", tags=["Bank Accounts"])


@router.get("", response_model=List[schemas.BankAccountOut])
def list_bank_accounts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    accounts = db.query(models.BankAccount).order_by(models.BankAccount.is_primary.desc(), models.BankAccount.bank_name).all()
    # If table is empty, seed default bunk bank accounts automatically
    if not accounts:
        default_accounts = [
            models.BankAccount(
                id="bank-sbi-1",
                bank_name="State Bank of India (Main Current A/c)",
                account_number="38491029481",
                account_type="Current",
                branch_name="Indiranagar Branch",
                ifsc_code="SBIN0004123",
                opening_balance=450000.0,
                current_balance=450000.0,
                is_primary=True,
                is_active=True,
            ),
            models.BankAccount(
                id="bank-hdfc-2",
                bank_name="HDFC Bank (UPI / POS Collection A/c)",
                account_number="50200039281744",
                account_type="Current",
                branch_name="Koramangala Branch",
                ifsc_code="HDFC0001248",
                opening_balance=280000.0,
                current_balance=280000.0,
                is_primary=False,
                is_active=True,
            ),
            models.BankAccount(
                id="bank-icici-3",
                bank_name="ICICI Bank (OMC Decantation & OD Limit)",
                account_number="004705009823",
                account_type="CC/OD",
                branch_name="MG Road Branch",
                ifsc_code="ICIC0000047",
                opening_balance=1200000.0,
                current_balance=1200000.0,
                is_primary=False,
                is_active=True,
            ),
        ]
        for acc in default_accounts:
            db.add(acc)
        db.commit()
        accounts = db.query(models.BankAccount).order_by(models.BankAccount.is_primary.desc(), models.BankAccount.bank_name).all()
    return accounts


@router.post("", response_model=schemas.BankAccountOut, status_code=status.HTTP_201_CREATED)
def create_bank_account(
    payload: schemas.BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc_id = f"bank-{payload.bank_name[:3].lower()}-{payload.account_number[-4:]}"
    acc = models.BankAccount(
        id=acc_id,
        bank_name=payload.bank_name,
        account_number=payload.account_number,
        account_type=payload.account_type,
        branch_name=payload.branch_name,
        ifsc_code=payload.ifsc_code,
        opening_balance=payload.opening_balance,
        current_balance=payload.current_balance or payload.opening_balance,
        is_primary=payload.is_primary,
        is_active=payload.is_active,
    )
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.put("/{account_id}", response_model=schemas.BankAccountOut)
def update_bank_account(
    account_id: str,
    payload: schemas.BankAccountUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc = db.query(models.BankAccount).filter(models.BankAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(acc, field, value)

    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_bank_account(
    account_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    acc = db.query(models.BankAccount).filter(models.BankAccount.id == account_id).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Bank account not found")
    db.delete(acc)
    db.commit()
    return None

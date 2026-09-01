"""Expenses router — date | head | amount | remarks only."""

from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


@router.get("", response_model=List[schemas.ExpenseOut])
def list_expenses(
    date_from: Optional[date_cls] = None,
    date_to: Optional[date_cls] = None,
    expense_type_id: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.Expense).filter(models.Expense.branch_id == branch_id)
    if date_from:
        q = q.filter(models.Expense.date >= date_from)
    if date_to:
        q = q.filter(models.Expense.date <= date_to)
    if expense_type_id:
        q = q.filter(models.Expense.expense_type_id == expense_type_id)
    return q.order_by(models.Expense.date.desc()).all()


@router.post("", response_model=schemas.ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: schemas.ExpenseCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    # Accept both branch-specific and global (branch_id=NULL) expense types
    expense_type = db.query(models.ExpenseType).filter(
        models.ExpenseType.id == payload.expense_type_id
    ).filter(
        (models.ExpenseType.branch_id == branch_id) | (models.ExpenseType.branch_id == None)
    ).first()
    if not expense_type:
        raise HTTPException(status_code=400, detail="Invalid expense_type_id")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    expense = models.Expense(
        id=generate_id("exp"),
        branch_id=branch_id,
        date=payload.date or date_cls.today(),
        expense_type_id=payload.expense_type_id,
        expense_type_name=expense_type.name,
        amount=payload.amount,
        remarks=payload.remarks,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    expense = db.query(models.Expense).filter(
        models.Expense.branch_id == branch_id, models.Expense.id == expense_id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()
    return None

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/expense-types", tags=["Expense Types"])


@router.get("", response_model=List[schemas.ExpenseTypeOut])
def list_expense_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.ExpenseType).order_by(models.ExpenseType.name).all()


@router.post("", response_model=schemas.ExpenseTypeOut, status_code=status.HTTP_201_CREATED)
def create_expense_type(
    payload: schemas.ExpenseTypeCreate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    et = models.ExpenseType(id=generate_id("et"), **payload.model_dump())
    db.add(et)
    db.commit()
    db.refresh(et)
    return et


@router.put("/{expense_type_id}", response_model=schemas.ExpenseTypeOut)
def update_expense_type(
    expense_type_id: str,
    payload: schemas.ExpenseTypeUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    et = db.query(models.ExpenseType).get(expense_type_id)
    if not et:
        raise HTTPException(status_code=404, detail="Expense type not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(et, key, value)
    db.commit()
    db.refresh(et)
    return et


@router.delete("/{expense_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_type(expense_type_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    et = db.query(models.ExpenseType).get(expense_type_id)
    if not et:
        raise HTTPException(status_code=404, detail="Expense type not found")
    db.delete(et)
    db.commit()
    return None

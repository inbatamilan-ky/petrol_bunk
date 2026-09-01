"""Expense types router (kept for backwards compatibility, delegates to masters)."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/expense-types", tags=["Expense Types"])


@router.get("", response_model=List[schemas.ExpenseTypeOut])
def list_expense_types(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Returns global heads (branch_id=NULL) + branch-specific heads."""
    return (
        db.query(models.ExpenseType)
        .filter(
            (models.ExpenseType.branch_id == None) | (models.ExpenseType.branch_id == branch_id)
        )
        .order_by(models.ExpenseType.name)
        .all()
    )

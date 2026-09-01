"""Operators router — name + phone only, no daily_bata."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/operators", tags=["Operators"])


@router.get("", response_model=List[schemas.OperatorOut])
def list_operators(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.Operator).filter(
        models.Operator.branch_id == branch_id
    )
    if not include_inactive:
        q = q.filter(models.Operator.active == True)
    return q.order_by(models.Operator.name).all()


@router.post("", response_model=schemas.OperatorOut, status_code=status.HTTP_201_CREATED)
def create_operator(
    payload: schemas.OperatorCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    op = models.Operator(
        id=generate_id("op"),
        branch_id=branch_id,
        **payload.model_dump(),
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    return op


@router.put("/{operator_id}", response_model=schemas.OperatorOut)
def update_operator(
    operator_id: str,
    payload: schemas.OperatorUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    op = db.query(models.Operator).filter(
        models.Operator.branch_id == branch_id, models.Operator.id == operator_id
    ).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(op, key, val)
    db.commit()
    db.refresh(op)
    return op


@router.delete("/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operator(
    operator_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    op = db.query(models.Operator).filter(
        models.Operator.branch_id == branch_id, models.Operator.id == operator_id
    ).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")
    
    # Check if used in pump_day_attribution
    has_attributions = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id,
        models.PumpDayAttribution.operator_id == operator_id
    ).first()

    if has_attributions:
        op.active = False
        db.commit()
    else:
        db.delete(op)
        db.commit()
    return None


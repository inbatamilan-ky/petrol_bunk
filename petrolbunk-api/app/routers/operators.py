from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/operators", tags=["Operators"])


@router.get("", response_model=List[schemas.OperatorOut])
def list_operators(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Operator).order_by(models.Operator.name).all()


@router.get("/{operator_id}", response_model=schemas.OperatorOut)
def get_operator(operator_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    operator = db.query(models.Operator).get(operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")
    return operator


@router.post("", response_model=schemas.OperatorOut, status_code=status.HTTP_201_CREATED)
def create_operator(
    payload: schemas.OperatorCreate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    operator = models.Operator(id=generate_id("op"), **payload.model_dump())
    db.add(operator)
    db.commit()
    db.refresh(operator)
    return operator


@router.put("/{operator_id}", response_model=schemas.OperatorOut)
def update_operator(
    operator_id: str,
    payload: schemas.OperatorUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    operator = db.query(models.Operator).get(operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(operator, key, value)
    db.commit()
    db.refresh(operator)
    return operator


@router.delete("/{operator_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_operator(operator_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    operator = db.query(models.Operator).get(operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")
    db.delete(operator)
    db.commit()
    return None

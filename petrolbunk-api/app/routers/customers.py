"""Customers router — name + phone + outstanding_balance only."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=List[schemas.CustomerOut])
def list_customers(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    return (
        db.query(models.Customer)
        .filter(models.Customer.branch_id == branch_id)
        .order_by(models.Customer.name)
        .all()
    )


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    cust = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == customer_id
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    return cust


@router.post("", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: schemas.CustomerCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    cust = models.Customer(
        id=generate_id("cust"),
        branch_id=branch_id,
        **payload.model_dump(),
    )
    db.add(cust)
    db.commit()
    db.refresh(cust)
    return cust


@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: str,
    payload: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    cust = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == customer_id
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, val in payload.model_dump(exclude_unset=True).items():
        setattr(cust, key, val)
    db.commit()
    db.refresh(cust)
    return cust


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    cust = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == customer_id
    ).first()
    if not cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(cust)
    db.commit()
    return None

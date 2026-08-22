from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=List[schemas.CustomerOut])
def list_customers(
    search: Optional[str] = Query(default=None, description="Search by name, code, or vehicle no"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(models.Customer)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (models.Customer.name.ilike(like)) | (models.Customer.code.ilike(like))
        )
    return query.order_by(models.Customer.name).all()


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    customer = db.query(models.Customer).get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


@router.post("", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    payload: schemas.CustomerCreate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    if db.query(models.Customer).filter(models.Customer.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Customer code already exists")
    data = payload.model_dump()
    customer = models.Customer(
        id=generate_id("cust"), outstanding_balance=data["opening_balance"], **data
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=schemas.CustomerOut)
def update_customer(
    customer_id: str,
    payload: schemas.CustomerUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    customer = db.query(models.Customer).get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    customer = db.query(models.Customer).get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(customer)
    db.commit()
    return None


@router.get("/{customer_id}/ledger")
def customer_ledger(customer_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Combined statement of credit sales (debits) and payments (credits)."""
    customer = db.query(models.Customer).get(customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    sales = (
        db.query(models.CreditTransaction)
        .filter(models.CreditTransaction.customer_id == customer_id)
        .all()
    )
    payments = (
        db.query(models.CreditPayment)
        .filter(models.CreditPayment.customer_id == customer_id)
        .all()
    )

    entries = [
        {
            "id": s.id,
            "date": s.date,
            "type": "DEBIT_SALE",
            "ref_no": s.slip_no,
            "particulars": f"Fuel Sale - Veh: {s.vehicle_no}",
            "debit_amount": float(s.amount),
            "credit_amount": 0.0,
        }
        for s in sales
    ] + [
        {
            "id": p.id,
            "date": p.date,
            "type": "CREDIT_PAYMENT",
            "ref_no": p.receipt_no,
            "particulars": f"Payment Received ({p.payment_mode})",
            "debit_amount": 0.0,
            "credit_amount": float(p.amount),
        }
        for p in payments
    ]
    entries.sort(key=lambda e: e["date"], reverse=True)

    return {
        "customer": schemas.CustomerOut.model_validate(customer),
        "entries": entries,
    }

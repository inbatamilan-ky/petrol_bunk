from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/credit", tags=["Credit Ledger"])


# ---------------------------------------------------------------------
# CREDIT SALES (transactions)
# ---------------------------------------------------------------------
@router.get("/transactions", response_model=List[schemas.CreditTransactionOut])
def list_credit_transactions(
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    query = db.query(models.CreditTransaction).filter(models.CreditTransaction.branch_id == branch_id)
    if customer_id:
        query = query.filter(models.CreditTransaction.customer_id == customer_id)
    return query.order_by(models.CreditTransaction.date.desc()).all()


@router.post(
    "/transactions",
    response_model=schemas.CreditTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_credit_sale(
    payload: schemas.CreditTransactionCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    customer = db.query(models.Customer).filter(models.Customer.branch_id == branch_id, models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer_id")
    product = db.query(models.Product).filter(models.Product.branch_id == branch_id, models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=400, detail="Invalid product_id")

    rate = payload.rate if payload.rate is not None else float(product.current_rate)
    amount = payload.amount if payload.amount is not None else round(payload.litres * rate, 2)

    sale_date = payload.date or date_cls.today()
    day_count = db.query(models.CreditTransaction).filter(models.CreditTransaction.branch_id == branch_id).filter(models.CreditTransaction.date == sale_date).count() + 1
    slip_no = f"SLIP-{sale_date.strftime('%Y%m%d')}-{day_count:03d}"

    tx = models.CreditTransaction(
        id=generate_id("ctx"),
        branch_id=branch_id,
        slip_no=slip_no,
        customer_id=payload.customer_id,
        date=sale_date,
        time=payload.time,
        pump_id=payload.pump_id,
        pump_no=payload.pump_no,
        product_id=payload.product_id,
        vehicle_no=payload.vehicle_no or "",
        driver_name=payload.driver_name,
        litres=payload.litres,
        rate=rate,
        amount=amount,
        remarks=payload.remarks or "Credit sale",
    )
    db.add(tx)

    customer.outstanding_balance = float(customer.outstanding_balance) + amount

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credit_sale(
    tx_id: str,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    branch_id: str = Depends(get_current_branch),
):
    tx = db.query(models.CreditTransaction).filter(models.CreditTransaction.branch_id == branch_id).filter(models.CreditTransaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Credit transaction not found")
    customer = db.query(models.Customer).filter(models.Customer.branch_id == branch_id, models.Customer.id == tx.customer_id).first()
    if customer:
        customer.outstanding_balance = max(0.0, float(customer.outstanding_balance) - float(tx.amount))
    db.delete(tx)
    db.commit()
    return None


# ---------------------------------------------------------------------
# CREDIT PAYMENTS (repayments)
# ---------------------------------------------------------------------
@router.get("/payments", response_model=List[schemas.CreditPaymentOut])
def list_credit_payments(
    customer_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    query = db.query(models.CreditPayment).filter(models.CreditPayment.branch_id == branch_id)
    if customer_id:
        query = query.filter(models.CreditPayment.customer_id == customer_id)
    return query.order_by(models.CreditPayment.date.desc()).all()


@router.post(
    "/payments", response_model=schemas.CreditPaymentOut, status_code=status.HTTP_201_CREATED
)
def create_credit_payment(
    payload: schemas.CreditPaymentCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
    branch_id: str = Depends(get_current_branch),
):
    customer = db.query(models.Customer).filter(models.Customer.branch_id == branch_id, models.Customer.id == payload.customer_id).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer_id")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    pay_date = payload.date or date_cls.today()
    day_count = db.query(models.CreditPayment).filter(models.CreditPayment.branch_id == branch_id).filter(models.CreditPayment.date == pay_date).count() + 1
    receipt_no = f"RCPT-{pay_date.strftime('%Y%m%d')}-{day_count:03d}"

    payment = models.CreditPayment(
        id=generate_id("pay"),
        branch_id=branch_id,
        receipt_no=receipt_no,
        customer_id=payload.customer_id,
        date=pay_date,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
        reference_no=payload.reference_no,
        notes=payload.notes,
        received_by=payload.received_by or "Manager",
    )
    db.add(payment)

    customer.outstanding_balance = max(0.0, float(customer.outstanding_balance) - payload.amount)

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credit_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
    branch_id: str = Depends(get_current_branch),
):
    payment = db.query(models.CreditPayment).filter(models.CreditPayment.branch_id == branch_id).filter(models.CreditPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    customer = db.query(models.Customer).filter(models.Customer.branch_id == branch_id, models.Customer.id == payment.customer_id).first()
    if customer:
        customer.outstanding_balance = float(customer.outstanding_balance) + float(payment.amount)
    db.delete(payment)
    db.commit()
    return None

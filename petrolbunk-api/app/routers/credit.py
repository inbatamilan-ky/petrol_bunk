"""Credit router — Block C (sales) + Block E (collections). Stripped to Excel scope."""

from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/credit", tags=["Credit Ledger"])


# ── Credit Sales (Block C) ────────────────────────────────────────────

@router.get("/transactions", response_model=List[schemas.CreditTransactionOut])
def list_credit_transactions(
    customer_id: Optional[str] = None,
    date_from: Optional[date_cls] = None,
    date_to: Optional[date_cls] = None,
    pump_id: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.CreditTransaction).filter(
        models.CreditTransaction.branch_id == branch_id
    )
    if customer_id:
        q = q.filter(models.CreditTransaction.customer_id == customer_id)
    if pump_id:
        q = q.filter(models.CreditTransaction.pump_id == pump_id)
    if date_from:
        q = q.filter(models.CreditTransaction.date >= date_from)
    if date_to:
        q = q.filter(models.CreditTransaction.date <= date_to)
    return q.order_by(models.CreditTransaction.date.desc()).all()


@router.post(
    "/transactions",
    response_model=schemas.CreditTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_credit_sale(
    payload: schemas.CreditTransactionCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    customer = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == payload.customer_id
    ).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer_id")

    product = db.query(models.Product).filter(
        models.Product.branch_id == branch_id, models.Product.id == payload.product_id
    ).first()
    if not product:
        raise HTTPException(status_code=400, detail="Invalid product_id")

    rate = payload.rate if payload.rate is not None else float(product.current_rate)
    amount = round(payload.litres * rate, 2)
    sale_date = payload.date or date_cls.today()

    tx = models.CreditTransaction(
        id=generate_id("ctx"),
        branch_id=branch_id,
        date=sale_date,
        pump_id=payload.pump_id,
        customer_id=payload.customer_id,
        product_id=payload.product_id,
        litres=payload.litres,
        rate=rate,
        amount=amount,
        remarks=payload.remarks,
        attribution_id=payload.attribution_id,
        shift_type=payload.shift_type,
        vehicle_number=payload.vehicle_number,
    )
    db.add(tx)

    # Update running balance
    customer.outstanding_balance = float(customer.outstanding_balance) + amount

    # If linked to an operator session, update that session's credit_sales total
    if payload.attribution_id:
        from sqlalchemy import func as sql_func
        from app.routers.pump_attribution import _recalculate_session
        session_obj = db.query(models.PumpDayAttribution).filter(
            models.PumpDayAttribution.branch_id == branch_id,
            models.PumpDayAttribution.id == payload.attribution_id,
        ).first()
        if session_obj:
            # Sum all credit transactions linked to this session (excluding current unsaved tx)
            existing_credit = (
                db.query(sql_func.coalesce(sql_func.sum(models.CreditTransaction.amount), 0))
                .filter(
                    models.CreditTransaction.branch_id == branch_id,
                    models.CreditTransaction.attribution_id == payload.attribution_id,
                )
                .scalar()
            )
            session_obj.credit_sales = round(float(existing_credit) + amount, 2)
            _recalculate_session(session_obj, db, branch_id)

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_credit_sale(
    tx_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    tx = db.query(models.CreditTransaction).filter(
        models.CreditTransaction.branch_id == branch_id, models.CreditTransaction.id == tx_id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Credit transaction not found")
    customer = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == tx.customer_id
    ).first()
    if customer:
        customer.outstanding_balance = max(0.0, float(customer.outstanding_balance) - float(tx.amount))
    db.delete(tx)
    db.commit()
    return None


# ── Credit Payments / Collections (Block E) ───────────────────────────

@router.get("/payments", response_model=List[schemas.CreditPaymentOut])
def list_credit_payments(
    customer_id: Optional[str] = None,
    date_from: Optional[date_cls] = None,
    date_to: Optional[date_cls] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.CreditPayment).filter(
        models.CreditPayment.branch_id == branch_id
    )
    if customer_id:
        q = q.filter(models.CreditPayment.customer_id == customer_id)
    if date_from:
        q = q.filter(models.CreditPayment.date >= date_from)
    if date_to:
        q = q.filter(models.CreditPayment.date <= date_to)
    return q.order_by(models.CreditPayment.date.desc()).all()


@router.post(
    "/payments",
    response_model=schemas.CreditPaymentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_credit_payment(
    payload: schemas.CreditPaymentCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    customer = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == payload.customer_id
    ).first()
    if not customer:
        raise HTTPException(status_code=400, detail="Invalid customer_id")
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    pay_date = payload.date or date_cls.today()
    payment = models.CreditPayment(
        id=generate_id("pay"),
        branch_id=branch_id,
        date=pay_date,
        customer_id=payload.customer_id,
        amount=payload.amount,
        payment_mode=payload.payment_mode,
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
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    payment = db.query(models.CreditPayment).filter(
        models.CreditPayment.branch_id == branch_id, models.CreditPayment.id == payment_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    customer = db.query(models.Customer).filter(
        models.Customer.branch_id == branch_id, models.Customer.id == payment.customer_id
    ).first()
    if customer:
        customer.outstanding_balance = float(customer.outstanding_balance) + float(payment.amount)
    db.delete(payment)
    db.commit()
    return None


# ── Daily Credit Summary (for tally) ──────────────────────────────────

@router.get("/daily-summary", response_model=schemas.CreditDailySummary)
def credit_daily_summary(
    date: date_cls = Query(...),
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Returns new credit sales and payment totals for a given date."""
    from sqlalchemy import func as sql_func

    new_credit = float(
        db.query(sql_func.coalesce(sql_func.sum(models.CreditTransaction.amount), 0))
        .filter(
            models.CreditTransaction.branch_id == branch_id,
            models.CreditTransaction.date == date,
        )
        .scalar()
    )
    payments = float(
        db.query(sql_func.coalesce(sql_func.sum(models.CreditPayment.amount), 0))
        .filter(
            models.CreditPayment.branch_id == branch_id,
            models.CreditPayment.date == date,
        )
        .scalar()
    )
    return schemas.CreditDailySummary(
        business_date=date,
        new_credit_sales=new_credit,
        credit_payments=payments,
        net_change=round(new_credit - payments, 2),
    )

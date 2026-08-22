from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    total_sales_amount = db.query(func.coalesce(func.sum(models.Shift.total_sales_amount), 0)).scalar()
    total_litres_sold = db.query(func.coalesce(func.sum(models.Shift.total_litres_sold), 0)).scalar()
    total_cash_collected = db.query(func.coalesce(func.sum(models.Shift.cash_collected), 0)).scalar()

    expense_rows = db.query(models.Expense.amount, models.Expense.is_credit_note).all()
    total_expenses = sum((-a if credit else a) for a, credit in expense_rows) if expense_rows else 0

    total_bank_deposited = db.query(func.coalesce(func.sum(models.BankDeposit.amount), 0)).scalar()
    total_credit_outstanding = db.query(
        func.coalesce(func.sum(models.Customer.outstanding_balance), 0)
    ).scalar()

    active_customers = db.query(models.Customer).filter(models.Customer.status == "ACTIVE").count()
    customers_near_limit = (
        db.query(models.Customer)
        .filter(models.Customer.outstanding_balance > models.Customer.credit_limit * 0.8)
        .count()
    )

    open_shifts = db.query(models.Shift).filter(models.Shift.status == "IN_PROGRESS").count()
    closed_shifts = db.query(models.Shift).filter(models.Shift.status == "CLOSED").count()

    net_cash_on_hand = max(0.0, float(total_cash_collected) - float(total_expenses) - float(total_bank_deposited))

    return schemas.DashboardSummary(
        total_sales_amount=float(total_sales_amount),
        total_litres_sold=float(total_litres_sold),
        total_cash_collected=float(total_cash_collected),
        total_expenses=float(total_expenses),
        net_cash_on_hand=net_cash_on_hand,
        total_credit_outstanding=float(total_credit_outstanding),
        total_bank_deposited=float(total_bank_deposited),
        active_customers=active_customers,
        customers_near_limit=customers_near_limit,
        open_shifts=open_shifts,
        closed_shifts=closed_shifts,
    )

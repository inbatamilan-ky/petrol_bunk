"""Dashboard summary router — calculated from nozzle meters, attribution, credit, expenses."""

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    # Total sales and litres from daily nozzle readings
    total_sales_amount = (
        db.query(func.coalesce(func.sum(models.DailyNozzleMeter.gross_amount), 0))
        .filter(models.DailyNozzleMeter.branch_id == branch_id)
        .scalar()
    )
    total_litres_sold = (
        db.query(func.coalesce(func.sum(models.DailyNozzleMeter.litres_sold), 0))
        .filter(models.DailyNozzleMeter.branch_id == branch_id)
        .scalar()
    )

    # Cash collected from pump attributions
    total_cash_collected = (
        db.query(func.coalesce(func.sum(models.PumpDayAttribution.cash_collected), 0))
        .filter(models.PumpDayAttribution.branch_id == branch_id)
        .scalar()
    )

    # Expenses
    total_expenses = (
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(models.Expense.branch_id == branch_id)
        .scalar()
    )

    # Bank deposits
    total_bank_deposited = (
        db.query(func.coalesce(func.sum(models.BankDeposit.amount), 0))
        .filter(models.BankDeposit.branch_id == branch_id)
        .scalar()
    )

    # Credit outstanding
    total_credit_outstanding = (
        db.query(func.coalesce(func.sum(models.Customer.outstanding_balance), 0))
        .filter(models.Customer.branch_id == branch_id)
        .scalar()
    )

    active_customers = (
        db.query(models.Customer)
        .filter(models.Customer.branch_id == branch_id)
        .count()
    )
    total_pumps = (
        db.query(models.Pump)
        .filter(models.Pump.branch_id == branch_id)
        .count()
    )
    total_operators = (
        db.query(models.Operator)
        .filter(models.Operator.branch_id == branch_id, models.Operator.active == True)
        .count()
    )

    net_cash_on_hand = max(
        0.0,
        float(total_cash_collected) - float(total_expenses) - float(total_bank_deposited),
    )

    return schemas.DashboardSummary(
        total_sales_amount=float(total_sales_amount),
        total_litres_sold=float(total_litres_sold),
        total_cash_collected=float(total_cash_collected),
        total_expenses=float(total_expenses),
        net_cash_on_hand=net_cash_on_hand,
        total_credit_outstanding=float(total_credit_outstanding),
        total_bank_deposited=float(total_bank_deposited),
        active_customers=active_customers,
        total_pumps=total_pumps,
        total_operators=total_operators,
    )

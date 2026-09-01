"""
Tally router — live aggregations from operator sessions.
All numbers are calculated on-the-fly from pump_day_attribution.
Nothing is stored in a separate tally table — this is pure aggregation.
"""

from collections import defaultdict
from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/tally", tags=["Tally"])


def _session_to_row(s: models.PumpDayAttribution, pump_name: str = "") -> schemas.OperatorSessionRow:
    """Map a PumpDayAttribution ORM object to a tally OperatorSessionRow."""
    time_in = str(s.time_in)[:5] if s.time_in else None
    time_out = str(s.time_out)[:5] if s.time_out else None
    total_sales = (
        float(s.cash_collected or 0)
        + float(s.card_collected or 0)
        + float(s.gpay_collected or 0)
        + float(s.phone_pay_collected or 0)
        + float(s.paytm_collected or 0)
        + float(s.fleet_card_collected or 0)
        + float(s.credit_sales or 0)
    )
    return schemas.OperatorSessionRow(
        session_id=s.id,
        operator_name=s.operator_name,
        pump_no=s.pump_no,
        pump_name=pump_name or f"Pump {s.pump_no}",
        shift_type=s.shift_type,
        time_in=time_in,
        time_out=time_out,
        cash=float(s.cash_collected or 0),
        card=float(s.card_collected or 0),
        gpay=float(s.gpay_collected or 0),
        phonepe=float(s.phone_pay_collected or 0),
        paytm=float(s.paytm_collected or 0),
        fleet=float(s.fleet_card_collected or 0),
        credit=float(s.credit_sales or 0),
        total_sales=round(total_sales, 2),
        meter_sales=float(s.meter_sales_amount) if s.meter_sales_amount is not None else None,
        meter_variance=float(s.meter_variance) if s.meter_variance is not None else None,
        advance_amount=float(s.advance_amount or 0),
        expected_cash=float(s.expected_cash_handover) if s.expected_cash_handover is not None else None,
        actual_cash=float(s.actual_cash_handover) if s.actual_cash_handover is not None else None,
        cash_variance=float(s.cash_variance) if s.cash_variance is not None else None,
        status=s.status or "DRAFT",
    )


def _sum_rows(rows: List[schemas.OperatorSessionRow]) -> schemas.TallyTotals:
    """Aggregate a list of session rows into TallyTotals."""
    totals = schemas.TallyTotals()
    for r in rows:
        totals.cash += r.cash
        totals.card += r.card
        totals.gpay += r.gpay
        totals.phonepe += r.phonepe
        totals.paytm += r.paytm
        totals.fleet += r.fleet
        totals.credit += r.credit
        totals.grand_total += r.total_sales
        totals.meter_total += (r.meter_sales or 0)
        totals.expected_cash += (r.expected_cash or 0)
        totals.actual_cash += (r.actual_cash or 0)
    totals.meter_variance = round(totals.grand_total - totals.meter_total, 2)
    totals.cash_variance = round(totals.actual_cash - totals.expected_cash, 2)
    # Round all fields
    totals.cash = round(totals.cash, 2)
    totals.card = round(totals.card, 2)
    totals.gpay = round(totals.gpay, 2)
    totals.phonepe = round(totals.phonepe, 2)
    totals.paytm = round(totals.paytm, 2)
    totals.fleet = round(totals.fleet, 2)
    totals.credit = round(totals.credit, 2)
    totals.grand_total = round(totals.grand_total, 2)
    totals.meter_total = round(totals.meter_total, 2)
    totals.expected_cash = round(totals.expected_cash, 2)
    totals.actual_cash = round(totals.actual_cash, 2)
    return totals


def _reconciliation_status(variances: list) -> str:
    """Compute overall status from a list of variance values."""
    if not variances:
        return "RECONCILED"
    max_var = max(abs(v) for v in variances if v is not None)
    if max_var == 0:
        return "RECONCILED"
    if max_var <= 100:
        return "NEEDS_REVIEW"
    return "MISMATCH"


# ── GET /daily ────────────────────────────────────────────────────────────

@router.get("/daily", response_model=schemas.DailyTallyOut)
def get_daily_tally(
    date: date_cls = Query(...),
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Full daily tally for a given date — all sessions with shift and pump breakdowns."""
    sessions = (
        db.query(models.PumpDayAttribution)
        .filter(
            models.PumpDayAttribution.branch_id == branch_id,
            models.PumpDayAttribution.attribution_date == date,
        )
        .order_by(
            models.PumpDayAttribution.shift_type,
            models.PumpDayAttribution.pump_no,
            models.PumpDayAttribution.time_in,
        )
        .all()
    )

    # Pump name lookup
    pumps = {
        p.id: p.name or f"Pump {p.pump_no}"
        for p in db.query(models.Pump).filter(models.Pump.branch_id == branch_id).all()
    }

    rows = [_session_to_row(s, pumps.get(s.pump_id, f"Pump {s.pump_no}")) for s in sessions]
    totals = _sum_rows(rows)

    # Group by shift
    shift_map = defaultdict(list)
    for row in rows:
        shift_map[row.shift_type or "UNASSIGNED"].append(row)
    by_shift = [
        schemas.ShiftTally(shift_type=k, sessions=v, subtotals=_sum_rows(v))
        for k, v in shift_map.items()
    ]

    # Group by pump
    pump_map = defaultdict(list)
    pump_meta = {}
    for row, s in zip(rows, sessions):
        key = s.pump_id
        pump_map[key].append(row)
        pump_meta[key] = (s.pump_no, pumps.get(s.pump_id, f"Pump {s.pump_no}"))
    by_pump = [
        schemas.PumpTally(
            pump_id=pid,
            pump_no=pump_meta[pid][0],
            pump_name=pump_meta[pid][1],
            sessions=pump_rows,
            subtotals=_sum_rows(pump_rows),
        )
        for pid, pump_rows in pump_map.items()
    ]

    return schemas.DailyTallyOut(
        business_date=date,
        totals=totals,
        by_shift=by_shift,
        by_pump=by_pump,
        sessions=rows,
    )


# ── GET /credit-ledger ────────────────────────────────────────────────────

@router.get("/credit-ledger", response_model=schemas.CreditLedgerDayOut)
def get_credit_ledger_day(
    date: date_cls = Query(...),
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Credit ledger for a specific date: opening outstanding, new sales, payments, closing."""
    # Current total outstanding (running balance kept on Customer records)
    total_outstanding = float(
        db.query(func.coalesce(func.sum(models.Customer.outstanding_balance), 0))
        .filter(models.Customer.branch_id == branch_id)
        .scalar()
    )

    # New credit sales on this date
    new_credit = float(
        db.query(func.coalesce(func.sum(models.CreditTransaction.amount), 0))
        .filter(
            models.CreditTransaction.branch_id == branch_id,
            models.CreditTransaction.date == date,
        )
        .scalar()
    )

    # Credit payments received on this date
    payments = float(
        db.query(func.coalesce(func.sum(models.CreditPayment.amount), 0))
        .filter(
            models.CreditPayment.branch_id == branch_id,
            models.CreditPayment.date == date,
        )
        .scalar()
    )

    # Derive opening = closing - new + payments (closing = current total after today's activity)
    closing = round(total_outstanding, 2)
    opening = round(total_outstanding - new_credit + payments, 2)

    # Customer-wise breakdown for today
    credit_by_cust = dict(
        db.query(models.CreditTransaction.customer_id, func.sum(models.CreditTransaction.amount))
        .filter(models.CreditTransaction.branch_id == branch_id, models.CreditTransaction.date == date)
        .group_by(models.CreditTransaction.customer_id)
        .all()
    )
    payment_by_cust = dict(
        db.query(models.CreditPayment.customer_id, func.sum(models.CreditPayment.amount))
        .filter(models.CreditPayment.branch_id == branch_id, models.CreditPayment.date == date)
        .group_by(models.CreditPayment.customer_id)
        .all()
    )
    all_cids = set(credit_by_cust) | set(payment_by_cust)

    customers = {}
    if all_cids:
        for cust in db.query(models.Customer).filter(models.Customer.id.in_(all_cids)).all():
            customers[cust.id] = cust

    breakdown = sorted(
        [
            schemas.CustomerCreditRow(
                customer_id=cid,
                customer_name=customers[cid].name if cid in customers else "Unknown",
                new_credit=round(float(credit_by_cust.get(cid, 0)), 2),
                payments=round(float(payment_by_cust.get(cid, 0)), 2),
                closing_balance=round(float(customers[cid].outstanding_balance), 2) if cid in customers else 0,
            )
            for cid in all_cids
        ],
        key=lambda x: x.customer_name,
    )

    return schemas.CreditLedgerDayOut(
        business_date=date,
        opening_outstanding=opening,
        new_credit_sales=round(new_credit, 2),
        credit_payments=round(payments, 2),
        closing_outstanding=closing,
        customer_breakdown=breakdown,
    )


# ── GET /reconciliation ───────────────────────────────────────────────────

@router.get("/reconciliation", response_model=schemas.ReconciliationOut)
def get_reconciliation(
    date: date_cls = Query(...),
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Full 6-section daily reconciliation — the master view."""
    # Section 1: Sales (from sessions)
    daily = get_daily_tally(date=date, db=db, branch_id=branch_id, _=None)
    sales = daily.totals

    # Section 2: Meter
    meter_total = float(
        db.query(func.coalesce(func.sum(models.DailyNozzleMeter.gross_amount), 0))
        .filter(
            models.DailyNozzleMeter.branch_id == branch_id,
            models.DailyNozzleMeter.reading_date == date,
        )
        .scalar()
    )
    meter_variance = round(sales.grand_total - meter_total, 2)

    # Section 3: Cash
    expected_cash = sales.expected_cash
    actual_cash = sales.actual_cash
    cash_variance = sales.cash_variance

    # Section 4: Bank settlement
    expected_bank = round(sales.card + sales.gpay + sales.phonepe + sales.paytm + sales.fleet, 2)
    actual_bank = float(
        db.query(func.coalesce(func.sum(models.Settlement.amount), 0))
        .filter(
            models.Settlement.branch_id == branch_id,
            models.Settlement.settlement_date == date,
        )
        .scalar()
    )
    bank_variance = round(actual_bank - expected_bank, 2)

    # Section 5: Credit outstanding
    credit_ledger = get_credit_ledger_day(date=date, db=db, branch_id=branch_id, _=None)

    # Section 6: Expenses
    total_expenses = float(
        db.query(func.coalesce(func.sum(models.Expense.amount), 0))
        .filter(
            models.Expense.branch_id == branch_id,
            models.Expense.date == date,
        )
        .scalar()
    )

    overall_status = _reconciliation_status([meter_variance, cash_variance, bank_variance])

    return schemas.ReconciliationOut(
        business_date=date,
        sales=sales,
        meter=schemas.MeterSectionOut(total_sales=round(meter_total, 2), variance=meter_variance),
        cash=schemas.CashSectionOut(expected=expected_cash, actual=actual_cash, variance=cash_variance),
        bank=schemas.BankSectionOut(expected=expected_bank, actual=round(actual_bank, 2), variance=bank_variance),
        credit=credit_ledger,
        expenses=schemas.ExpensesSectionOut(total=round(total_expenses, 2)),
        overall_status=overall_status,
    )


# ── PUT /sessions/{id}/handover ───────────────────────────────────────────

@router.put("/sessions/{session_id}/handover", response_model=schemas.PumpDayAttributionOut)
def record_handover(
    session_id: str,
    payload: schemas.SessionHandoverIn,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Record the actual cash handed over for a session — triggers cash_variance calculation."""
    from app.routers.pump_attribution import _recalculate_session

    session = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id,
        models.PumpDayAttribution.id == session_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.actual_cash_handover = payload.actual_cash_handover
    _recalculate_session(session, db, branch_id)
    db.commit()
    db.refresh(session)
    return session

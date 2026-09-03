"""
Pump Day Attribution router — the Operator Session center of the tally system.
One row = one person working one pump during one shift on one date.
All Type-C fields (total_amount, expected_cash_handover, etc.) are auto-computed on every save.
"""

from datetime import date as date_cls, time as time_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/pump-attribution", tags=["Pump Attribution"])


def _recalculate_session(session: models.PumpDayAttribution, db: Session, branch_id: str) -> None:
    """
    Recompute all Type-C (auto-calculated) fields for a session in place.
    Called on every create and update.
    """
    cash    = float(session.cash_collected or 0)
    card    = float(session.card_collected or 0)
    gpay    = float(session.gpay_collected or 0)
    phonepe = float(session.phone_pay_collected or 0)
    paytm   = float(session.paytm_collected or 0)
    fleet   = float(session.fleet_card_collected or 0)
    credit  = float(session.credit_sales or 0)
    advance = float(session.advance_amount or 0)
    actual  = session.actual_cash_handover

    # UPI combined
    session.upi_gpay_collected = round(gpay + phonepe + paytm, 2)
    # Total sales = all payment modes
    session.total_amount = round(cash + card + gpay + phonepe + paytm + fleet + credit, 2)
    # Keep legacy advance_payment in sync
    session.advance_payment = advance
    # Expected cash handover
    session.expected_cash_handover = round(cash - advance, 2)
    # Cash variance (only if actual entered)
    if actual is not None:
        session.cash_variance = round(float(actual) - float(session.expected_cash_handover), 2)
        if session.status == "DRAFT":
            session.status = "SUBMITTED"

    # Auto-fetch meter sales from DailyNozzleMeter for this pump + date
    meter = (
        db.query(func.sum(models.DailyNozzleMeter.gross_amount))
        .filter(
            models.DailyNozzleMeter.branch_id == branch_id,
            models.DailyNozzleMeter.pump_id == session.pump_id,
            models.DailyNozzleMeter.reading_date == session.attribution_date,
        )
        .scalar()
    )
    if meter is not None:
        session.meter_sales_amount = round(float(meter), 2)
        session.meter_variance = round(float(session.total_amount) - float(meter), 2)


def _parse_time(t: Optional[str]) -> Optional[time_cls]:
    if not t:
        return None
    try:
        h, m = map(int, t.strip().split(":"))
        return time_cls(h, m)
    except Exception:
        return None


@router.get("", response_model=List[schemas.PumpDayAttributionOut])
def list_attributions(
    attribution_date: Optional[date_cls] = None,
    pump_id: Optional[str] = None,
    operator_id: Optional[str] = None,
    shift_type: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id
    )
    if attribution_date:
        q = q.filter(models.PumpDayAttribution.attribution_date == attribution_date)
    if pump_id:
        q = q.filter(models.PumpDayAttribution.pump_id == pump_id)
    if operator_id:
        q = q.filter(models.PumpDayAttribution.operator_id == operator_id)
    if shift_type:
        q = q.filter(models.PumpDayAttribution.shift_type == shift_type)
    return q.order_by(
        models.PumpDayAttribution.attribution_date.desc(),
        models.PumpDayAttribution.pump_no,
        models.PumpDayAttribution.time_in,
    ).all()


@router.post("", response_model=schemas.PumpDayAttributionOut, status_code=status.HTTP_201_CREATED)
def create_attribution(
    payload: schemas.PumpDayAttributionCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    pump = db.query(models.Pump).filter(
        models.Pump.branch_id == branch_id, models.Pump.id == payload.pump_id
    ).first()
    if not pump:
        raise HTTPException(status_code=400, detail="Invalid pump_id for this branch")

    operator = db.query(models.Operator).filter(
        models.Operator.branch_id == branch_id, models.Operator.id == payload.operator_id
    ).first()
    if not operator:
        raise HTTPException(status_code=400, detail="Invalid operator_id for this branch")

    session = models.PumpDayAttribution(
        id=generate_id("pda"),
        branch_id=branch_id,
        attribution_date=payload.attribution_date,
        pump_id=payload.pump_id,
        pump_no=pump.pump_no,
        operator_id=payload.operator_id,
        operator_name=operator.name,
        shift_type=payload.shift_type,
        time_in=_parse_time(payload.time_in),
        time_out=_parse_time(payload.time_out),
        cash_collected=payload.cash_collected,
        card_collected=payload.card_collected,
        gpay_collected=payload.gpay_collected,
        phone_pay_collected=payload.phone_pay_collected,
        paytm_collected=payload.paytm_collected,
        fleet_card_collected=payload.fleet_card_collected,
        advance_amount=payload.advance_amount,
        actual_cash_handover=payload.actual_cash_handover,
        credit_sales=payload.credit_sales,
        credit_acc=payload.credit_acc,
        notes=payload.notes,
        status="DRAFT",
    )
    _recalculate_session(session, db, branch_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("/{attribution_id}", response_model=schemas.PumpDayAttributionOut)
def get_attribution(
    attribution_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    attr = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id,
        models.PumpDayAttribution.id == attribution_id,
    ).first()
    if not attr:
        raise HTTPException(status_code=404, detail="Attribution not found")
    return attr


@router.patch("/{attribution_id}", response_model=schemas.PumpDayAttributionOut)
def update_attribution(
    attribution_id: str,
    payload: schemas.PumpDayAttributionUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    attr = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id,
        models.PumpDayAttribution.id == attribution_id,
    ).first()
    if not attr:
        raise HTTPException(status_code=404, detail="Attribution not found")

    data = payload.model_dump(exclude_unset=True)
    if "time_in" in data:
        attr.time_in = _parse_time(data.pop("time_in"))
    if "time_out" in data:
        attr.time_out = _parse_time(data.pop("time_out"))
    explicit_status = data.pop("status", None)
    for key, val in data.items():
        setattr(attr, key, val)

    _recalculate_session(attr, db, branch_id)
    if explicit_status:
        attr.status = explicit_status
    db.commit()
    db.refresh(attr)
    return attr



@router.delete("/{attribution_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attribution(
    attribution_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    attr = db.query(models.PumpDayAttribution).filter(
        models.PumpDayAttribution.branch_id == branch_id,
        models.PumpDayAttribution.id == attribution_id,
    ).first()
    if not attr:
        raise HTTPException(status_code=404, detail="Attribution not found")
    db.delete(attr)
    db.commit()
    return None

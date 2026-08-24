from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/shifts", tags=["Shifts"])


@router.get("", response_model=List[schemas.ShiftOut])
def list_shifts(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    pump_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(models.Shift).options(joinedload(models.Shift.meter_readings))
    if status_filter:
        query = query.filter(models.Shift.status == status_filter)
    if pump_id:
        query = query.filter(models.Shift.pump_id == pump_id)
    return query.order_by(models.Shift.opened_at.desc()).all()


@router.get("/{shift_id}", response_model=schemas.ShiftOut)
def get_shift(shift_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    shift = (
        db.query(models.Shift)
        .options(joinedload(models.Shift.meter_readings))
        .filter(models.Shift.id == shift_id)
        .first()
    )
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift

@router.post("", response_model=schemas.ShiftOut, status_code=status.HTTP_201_CREATED)
def open_shift(payload: schemas.ShiftOpen, db: Session = Depends(get_db), _=Depends(get_current_user)):
    pump = db.query(models.Pump).get(payload.pump_id)
    if not pump:
        raise HTTPException(status_code=400, detail="Invalid pump_id")
    operator = db.query(models.Operator).get(payload.operator_id)
    if not operator:
        raise HTTPException(status_code=400, detail="Invalid operator_id")

    existing_open = (
        db.query(models.Shift)
        .filter(models.Shift.pump_id == payload.pump_id, models.Shift.status == "IN_PROGRESS")
        .first()
    )
    if existing_open:
        raise HTTPException(status_code=400, detail="This pump already has an open shift")

    day_count = (
        db.query(models.Shift).filter(models.Shift.shift_date == payload.shift_date).count() + 1
    )
    shift_no = f"SHT-{payload.shift_date.strftime('%Y%m%d')}-{day_count:02d}"

    shift = models.Shift(
        id=generate_id("shift"),
        shift_no=shift_no,
        shift_date=payload.shift_date,
        shift_type=payload.shift_type,
        pump_id=payload.pump_id,
        pump_no=pump.pump_no,
        operator_id=payload.operator_id,
        operator_name=operator.name,
        opened_at=datetime.now(timezone.utc),
        status="IN_PROGRESS",
        notes=payload.notes,
    )
    db.add(shift)
    db.flush()  # ensure shift.id is available for the meter reading rows below

    # Seed one meter reading row per nozzle on this pump so the UI has
    # editable opening/closing fields as soon as the shift opens.
    nozzles = db.query(models.Nozzle).filter(models.Nozzle.pump_id == payload.pump_id).all()
    if not nozzles:
        raise HTTPException(status_code=400, detail="Selected pump has no nozzles configured")

    for nozzle in nozzles:
        product = db.query(models.Product).get(nozzle.product_id)
        opening_reading = float(nozzle.current_meter_reading)

        reading_row = models.MeterReading(
            shift_id=shift.id,
            nozzle_id=nozzle.id,
            nozzle_no=nozzle.nozzle_no,
            product_name=product.name if product else "",
            fuel_code=product.code if product else "",
            rate=product.current_rate if product else 0,
            opening_reading=opening_reading,
            closing_reading=opening_reading,  # starts equal to opening; operator edits later
            testing_litres=0,
            litres_sold=0,
            gross_amount=0,
        )
        db.add(reading_row)

    db.commit()
    db.refresh(shift)
    return shift


@router.post("/{shift_id}/close", response_model=schemas.ShiftOut)
def close_shift(
    shift_id: str, payload: schemas.ShiftClose, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    shift = db.query(models.Shift).get(shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Shift already closed")
    if not payload.meter_readings:
        raise HTTPException(status_code=400, detail="At least one meter reading is required")

    total_litres = 0.0
    total_amount = 0.0

    for mr in payload.meter_readings:
        nozzle = db.query(models.Nozzle).get(mr.nozzle_id)
        if not nozzle or nozzle.pump_id != shift.pump_id:
            raise HTTPException(
                status_code=400, detail=f"Nozzle {mr.nozzle_id} does not belong to this pump"
            )
        product = db.query(models.Product).get(nozzle.product_id)
        rate = float(product.current_rate) if product else 0.0

        reading_row = (
            db.query(models.MeterReading)
            .filter(models.MeterReading.shift_id == shift.id, models.MeterReading.nozzle_id == mr.nozzle_id)
            .first()
        )
        opening_reading = float(reading_row.opening_reading) if reading_row else float(nozzle.current_meter_reading)
        closing_reading = float(mr.closing_reading)
        testing_litres = float(mr.testing_litres or 0)

        if closing_reading < opening_reading:
            raise HTTPException(
                status_code=400,
                detail=f"Closing reading ({closing_reading}) for nozzle #{nozzle.nozzle_no} cannot be less than opening reading ({opening_reading})",
            )
        litres_sold = max(0.0, round(closing_reading - opening_reading - testing_litres, 2))
        gross_amount = round(litres_sold * rate, 2)

        if reading_row:
            reading_row.closing_reading = closing_reading
            reading_row.testing_litres = testing_litres
            reading_row.litres_sold = litres_sold
            reading_row.gross_amount = gross_amount
            if product:
                reading_row.rate = product.current_rate
        else:
            reading_row = models.MeterReading(
                shift_id=shift.id,
                nozzle_id=nozzle.id,
                nozzle_no=nozzle.nozzle_no,
                product_name=product.name if product else "",
                fuel_code=product.code if product else "",
                rate=product.current_rate if product else 0,
                opening_reading=opening_reading,
                closing_reading=closing_reading,
                testing_litres=testing_litres,
                litres_sold=litres_sold,
                gross_amount=gross_amount,
            )
            db.add(reading_row)

        # Update live pump nozzle current meter reading
        nozzle.current_meter_reading = closing_reading

        # Interconnect with Daily Nozzle Meters
        daily_meter = (
            db.query(models.DailyNozzleMeter)
            .filter(
                models.DailyNozzleMeter.reading_date == shift.shift_date,
                models.DailyNozzleMeter.nozzle_id == nozzle.id,
            )
            .first()
        )
        if daily_meter:
            daily_meter.closing_meter = closing_reading
            daily_meter.testing_litres = testing_litres
            daily_meter.litres_sold = litres_sold
            daily_meter.selling_rate = rate
            daily_meter.gross_amount = gross_amount
            daily_meter.recorded_by = shift.operator_name or "Manager"
        else:
            daily_meter = models.DailyNozzleMeter(
                id=f"dnm-{shift.shift_date.strftime('%Y%m%d')}-{nozzle.id}",
                reading_date=shift.shift_date,
                pump_id=shift.pump_id,
                nozzle_id=nozzle.id,
                product_id=nozzle.product_id,
                opening_meter=opening_reading,
                closing_meter=closing_reading,
                testing_litres=testing_litres,
                litres_sold=litres_sold,
                selling_rate=rate,
                gross_amount=gross_amount,
                recorded_by=shift.operator_name or "Manager",
            )
            db.add(daily_meter)

        total_litres += litres_sold
        total_amount += gross_amount

    total_collected = (
        payload.cash_collected
        + payload.upi_gpay_collected
        + payload.card_collected
        + payload.fleet_card_collected
        + payload.credit_sales
        + payload.cheque_collected
    )
    shortage_or_excess = round(total_collected - (total_amount - payload.expenses_deducted), 2)

    shift.total_litres_sold = round(total_litres, 2)
    shift.total_sales_amount = round(total_amount, 2)
    shift.expenses_deducted = payload.expenses_deducted
    shift.cash_collected = payload.cash_collected
    shift.upi_gpay_collected = payload.upi_gpay_collected
    shift.card_collected = payload.card_collected
    shift.fleet_card_collected = payload.fleet_card_collected
    shift.credit_sales = payload.credit_sales
    shift.cheque_collected = payload.cheque_collected
    shift.total_collected = round(total_collected, 2)
    shift.shortage_or_excess = shortage_or_excess
    shift.status = "CLOSED"
    shift.closed_at = datetime.now(timezone.utc)
    if payload.notes:
        shift.notes = payload.notes

    db.commit()
    db.refresh(shift)
    return shift


@router.put("/{shift_id}/draft", response_model=schemas.ShiftOut)
def save_shift_draft(
    shift_id: str, payload: schemas.ShiftDraft, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """Save partial meter readings and collections for an open shift without closing it."""
    shift = db.query(models.Shift).get(shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Cannot update a closed shift")

    # Update collection fields if provided
    if payload.cash_collected is not None:
        shift.cash_collected = payload.cash_collected
    if payload.upi_gpay_collected is not None:
        shift.upi_gpay_collected = payload.upi_gpay_collected
    if payload.card_collected is not None:
        shift.card_collected = payload.card_collected
    if payload.fleet_card_collected is not None:
        shift.fleet_card_collected = payload.fleet_card_collected
    if payload.credit_sales is not None:
        shift.credit_sales = payload.credit_sales
    if payload.cheque_collected is not None:
        shift.cheque_collected = payload.cheque_collected
    if payload.expenses_deducted is not None:
        shift.expenses_deducted = payload.expenses_deducted
    if payload.notes is not None:
        shift.notes = payload.notes

    # Recalculate totals from collection fields
    total_collected = (
        float(shift.cash_collected or 0)
        + float(shift.upi_gpay_collected or 0)
        + float(shift.card_collected or 0)
        + float(shift.fleet_card_collected or 0)
        + float(shift.credit_sales or 0)
        + float(shift.cheque_collected or 0)
    )
    shift.total_collected = round(total_collected, 2)

    # If meter readings provided, update individual rows and recalculate totals
    if payload.meter_readings:
        total_litres = 0.0
        total_amount = 0.0
        for mr in payload.meter_readings:
            nozzle = db.query(models.Nozzle).get(mr.nozzle_id)
            if not nozzle:
                continue
            product = db.query(models.Product).get(nozzle.product_id)
            rate = float(product.current_rate) if product else 0.0

            reading_row = (
                db.query(models.MeterReading)
                .filter(models.MeterReading.shift_id == shift.id, models.MeterReading.nozzle_id == mr.nozzle_id)
                .first()
            )
            opening = float(reading_row.opening_reading) if reading_row else float(nozzle.current_meter_reading)
            closing = float(mr.closing_reading)
            testing = float(mr.testing_litres or 0)
            litres = max(0.0, round(closing - opening - testing, 2)) if closing >= opening else 0.0
            amount = round(litres * rate, 2)

            if reading_row:
                reading_row.closing_reading = closing
                reading_row.testing_litres = testing
                reading_row.litres_sold = litres
                reading_row.gross_amount = amount
                if product:
                    reading_row.rate = product.current_rate
            else:
                reading_row = models.MeterReading(
                    shift_id=shift.id,
                    nozzle_id=nozzle.id,
                    nozzle_no=nozzle.nozzle_no,
                    product_name=product.name if product else "",
                    fuel_code=product.code if product else "",
                    rate=product.current_rate if product else 0,
                    opening_reading=opening,
                    closing_reading=closing,
                    testing_litres=testing,
                    litres_sold=litres,
                    gross_amount=amount,
                )
                db.add(reading_row)

            total_litres += litres
            total_amount += amount

        shift.total_litres_sold = round(total_litres, 2)
        shift.total_sales_amount = round(total_amount, 2)

    net_expected = float(shift.total_sales_amount or 0) - float(shift.expenses_deducted or 0)
    shift.shortage_or_excess = round(shift.total_collected - net_expected, 2)

    db.commit()
    db.refresh(shift)
    return shift

@router.put("/{shift_id}", response_model=schemas.ShiftOut)
def update_shift(
    shift_id: str, payload: schemas.ShiftUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    """Edit shift metadata (operator, shift type, date, notes). Does not touch
    meter readings or collections — use the draft/close endpoints for those."""
    shift = db.query(models.Shift).get(shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")

    if payload.operator_id is not None:
        operator = db.query(models.Operator).get(payload.operator_id)
        if not operator:
            raise HTTPException(status_code=400, detail="Invalid operator_id")
        shift.operator_id = operator.id
        shift.operator_name = operator.name

    if payload.shift_type is not None:
        shift.shift_type = payload.shift_type

    if payload.shift_date is not None:
        shift.shift_date = payload.shift_date

    if payload.notes is not None:
        shift.notes = payload.notes

    db.commit()
    db.refresh(shift)
    return shift

@router.delete("/{shift_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_shift(shift_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    shift = db.query(models.Shift).get(shift_id)
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return None


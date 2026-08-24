from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db

router = APIRouter(prefix="/api/nozzle-meters", tags=["Nozzle Meters"])


@router.get("", response_model=List[schemas.DailyNozzleMeterOut])
def get_daily_nozzle_meters(
    reading_date: Optional[date] = None,
    pump_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.DailyNozzleMeter)
    if reading_date:
        query = query.filter(models.DailyNozzleMeter.reading_date == reading_date)
    if pump_id:
        query = query.filter(models.DailyNozzleMeter.pump_id == pump_id)
    return query.order_by(models.DailyNozzleMeter.reading_date.desc()).all()


@router.post("/batch", response_model=List[schemas.DailyNozzleMeterOut], status_code=status.HTTP_201_CREATED)
def batch_save_daily_nozzle_meters(
    payload: schemas.BatchDailyNozzleMeterCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    saved_records = []
    r_date = payload.reading_date

    for item in payload.readings:
        litres = max(0.0, item.closing_meter - item.opening_meter - item.testing_litres)
        gross = litres * item.selling_rate
        record_id = f"dnm-{r_date.strftime('%Y%m%d')}-{item.nozzle_id}"

        existing = (
            db.query(models.DailyNozzleMeter)
            .filter(
                models.DailyNozzleMeter.reading_date == r_date,
                models.DailyNozzleMeter.nozzle_id == item.nozzle_id,
            )
            .first()
        )

        if existing:
            existing.opening_meter = item.opening_meter
            existing.closing_meter = item.closing_meter
            existing.testing_litres = item.testing_litres
            existing.litres_sold = litres
            existing.selling_rate = item.selling_rate
            existing.gross_amount = gross
            existing.recorded_by = item.recorded_by or payload.recorded_by or "Manager"
            saved_records.append(existing)
        else:
            new_record = models.DailyNozzleMeter(
                id=record_id,
                reading_date=r_date,
                pump_id=item.pump_id,
                nozzle_id=item.nozzle_id,
                product_id=item.product_id,
                opening_meter=item.opening_meter,
                closing_meter=item.closing_meter,
                testing_litres=item.testing_litres,
                litres_sold=litres,
                selling_rate=item.selling_rate,
                gross_amount=gross,
                recorded_by=item.recorded_by or payload.recorded_by or "Manager",
            )
            db.add(new_record)
            saved_records.append(new_record)

        # Synchronize pump nozzle current meter reading
        nozzle = db.query(models.Nozzle).get(item.nozzle_id)
        if nozzle and item.closing_meter > 0:
            nozzle.current_meter_reading = item.closing_meter

    db.commit()
    for rec in saved_records:
        db.refresh(rec)

    return saved_records

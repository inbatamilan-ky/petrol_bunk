"""Nozzle meters router — litres_sold = closing - opening (no testing_litres)."""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch

router = APIRouter(prefix="/api/nozzle-meters", tags=["Nozzle Meters"])


@router.get("", response_model=List[schemas.DailyNozzleMeterOut])
def list_nozzle_meters(
    reading_date: Optional[date] = None,
    pump_id: Optional[str] = None,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    q = db.query(models.DailyNozzleMeter).filter(
        models.DailyNozzleMeter.branch_id == branch_id
    )
    if reading_date:
        q = q.filter(models.DailyNozzleMeter.reading_date == reading_date)
    if pump_id:
        q = q.filter(models.DailyNozzleMeter.pump_id == pump_id)
    return q.order_by(
        models.DailyNozzleMeter.reading_date.desc(),
        models.DailyNozzleMeter.pump_id,
    ).all()


@router.post("/batch", response_model=List[schemas.DailyNozzleMeterOut], status_code=status.HTTP_201_CREATED)
def batch_save_nozzle_meters(
    payload: schemas.BatchDailyNozzleMeterCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """
    Upsert daily nozzle readings.
    litres_sold = closing_meter - opening_meter
    gross_amount = litres_sold * selling_rate
    """
    saved = []
    r_date = payload.reading_date

    for item in payload.readings:
        litres_sold = max(0.0, item.closing_meter - item.opening_meter)
        gross_amount = round(litres_sold * item.selling_rate, 2)
        record_id = f"dnm-{r_date.strftime('%Y%m%d')}-{item.nozzle_id}"

        existing = db.query(models.DailyNozzleMeter).filter(
            models.DailyNozzleMeter.branch_id == branch_id,
            models.DailyNozzleMeter.reading_date == r_date,
            models.DailyNozzleMeter.nozzle_id == item.nozzle_id,
        ).first()

        if existing:
            existing.opening_meter = item.opening_meter
            existing.closing_meter = item.closing_meter
            existing.litres_sold = litres_sold
            existing.selling_rate = item.selling_rate
            existing.gross_amount = gross_amount
            saved.append(existing)
        else:
            new_rec = models.DailyNozzleMeter(
                id=record_id,
                branch_id=branch_id,
                reading_date=r_date,
                pump_id=item.pump_id,
                nozzle_id=item.nozzle_id,
                product_id=item.product_id,
                opening_meter=item.opening_meter,
                closing_meter=item.closing_meter,
                litres_sold=litres_sold,
                selling_rate=item.selling_rate,
                gross_amount=gross_amount,
            )
            db.add(new_rec)
            saved.append(new_rec)

        # Sync current meter reading on nozzle
        nozzle = db.query(models.Nozzle).filter(
            models.Nozzle.branch_id == branch_id, models.Nozzle.id == item.nozzle_id
        ).first()
        if nozzle and item.closing_meter > 0:
            nozzle.current_meter_reading = item.closing_meter

    db.commit()
    for r in saved:
        db.refresh(r)
    return saved

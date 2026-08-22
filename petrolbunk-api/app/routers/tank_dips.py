from datetime import date as date_cls
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/tank-dips", tags=["Tank Dips"])


@router.get("", response_model=List[schemas.TankDipOut])
def list_tank_dips(
    tank_id: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    query = db.query(models.TankDip)
    if tank_id:
        query = query.filter(models.TankDip.tank_id == tank_id)
    return query.order_by(models.TankDip.dip_date.desc(), models.TankDip.created_at.desc()).all()


@router.post("", response_model=schemas.TankDipOut, status_code=status.HTTP_201_CREATED)
def create_tank_dip(
    payload: schemas.TankDipCreate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    tank = db.query(models.Tank).get(payload.tank_id)
    if not tank:
        raise HTTPException(status_code=400, detail="Invalid tank_id")

    dip_date = payload.dip_date or date_cls.today()

    dip = models.TankDip(
        id=generate_id("dip"),
        tank_id=payload.tank_id,
        tank_name=payload.tank_name,
        product_name=payload.product_name,
        dip_date=dip_date,
        dip_type=payload.dip_type,
        fuel_dip_cm=payload.fuel_dip_cm,
        fuel_dip_litres=payload.fuel_dip_litres,
        water_dip_cm=payload.water_dip_cm,
        observed_density=payload.observed_density,
        observed_temp=payload.observed_temp,
        converted_density=payload.converted_density,
        book_stock_litres=payload.book_stock_litres,
        variance=payload.variance,
        tested_by=payload.tested_by,
        remarks=payload.remarks,
    )
    db.add(dip)

    # Update tank's current stock to the latest dip reading
    stock = float(payload.fuel_dip_litres)
    capacity = float(tank.capacity_litres)
    if stock < capacity * 0.1:
        new_status = "CRITICAL"
    elif stock < capacity * 0.2:
        new_status = "LOW"
    elif stock > capacity * 0.95:
        new_status = "OVERFILL"
    else:
        new_status = "NORMAL"

    tank.current_stock_litres = stock
    tank.status = new_status

    db.commit()
    db.refresh(dip)
    return dip


@router.get("/{dip_id}", response_model=schemas.TankDipOut)
def get_tank_dip(dip_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    dip = db.query(models.TankDip).get(dip_id)
    if not dip:
        raise HTTPException(status_code=404, detail="Tank dip not found")
    return dip


@router.delete("/{dip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tank_dip(dip_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    dip = db.query(models.TankDip).get(dip_id)
    if not dip:
        raise HTTPException(status_code=404, detail="Tank dip not found")
    db.delete(dip)
    db.commit()
    return None

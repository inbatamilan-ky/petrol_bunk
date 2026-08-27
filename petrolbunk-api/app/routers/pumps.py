from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/pumps", tags=["Pumps & Nozzles"])


@router.get("", response_model=List[schemas.PumpOut])
def list_pumps(db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    return db.query(models.Pump).filter(models.Pump.branch_id == branch_id).order_by(models.Pump.pump_no).all()


@router.get("/{pump_id}", response_model=schemas.PumpOut)
def get_pump(pump_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    pump = db.query(models.Pump).filter(models.Pump.branch_id == branch_id, models.Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pump not found")
    return pump


@router.post("", response_model=schemas.PumpOut, status_code=status.HTTP_201_CREATED)
def create_pump(payload: schemas.PumpCreate, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    if db.query(models.Pump).filter(models.Pump.branch_id == branch_id).filter(models.Pump.pump_no == payload.pump_no).first():
        raise HTTPException(status_code=400, detail="pump_no already exists")
    pump = models.Pump(branch_id=branch_id, id=generate_id("pump"), **payload.model_dump())
    db.add(pump)
    db.commit()
    db.refresh(pump)
    return pump


@router.put("/{pump_id}", response_model=schemas.PumpOut)
def update_pump(
    pump_id: str, payload: schemas.PumpUpdate, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)
):
    pump = db.query(models.Pump).filter(models.Pump.branch_id == branch_id, models.Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pump not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(pump, key, value)
    db.commit()
    db.refresh(pump)
    return pump


@router.delete("/{pump_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pump(pump_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(require_admin)):
    pump = db.query(models.Pump).filter(models.Pump.branch_id == branch_id, models.Pump.id == pump_id).first()
    if not pump:
        raise HTTPException(status_code=404, detail="Pump not found")
    db.delete(pump)
    db.commit()
    return None


# ---------------------------------------------------------------------
# NOZZLES (nested under a pump)
# ---------------------------------------------------------------------
@router.get("/{pump_id}/nozzles", response_model=List[schemas.NozzleOut])
def list_nozzles(pump_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    return db.query(models.Nozzle).filter(models.Nozzle.branch_id == branch_id).filter(models.Nozzle.pump_id == pump_id).all()


@router.post(
    "/{pump_id}/nozzles", response_model=schemas.NozzleOut, status_code=status.HTTP_201_CREATED
)
def create_nozzle(
    pump_id: str, payload: schemas.NozzleCreate, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)
):
    if not db.query(models.Pump).filter(models.Pump.branch_id == branch_id, models.Pump.id == pump_id).first():
        raise HTTPException(status_code=404, detail="Pump not found")
    if not db.query(models.Product).filter(models.Product.branch_id == branch_id, models.Product.id == payload.product_id).first():
        raise HTTPException(status_code=400, detail="Invalid product_id")
    existing = (
        db.query(models.Nozzle).filter(models.Nozzle.branch_id == branch_id)
        .filter(models.Nozzle.pump_id == pump_id, models.Nozzle.nozzle_no == payload.nozzle_no)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Nozzle number already exists on this pump")

    data = payload.model_dump()
    data["pump_id"] = pump_id
    nozzle = models.Nozzle(branch_id=branch_id, id=generate_id("noz"), **data)
    db.add(nozzle)
    db.commit()
    db.refresh(nozzle)
    return nozzle


@router.put("/nozzles/{nozzle_id}", response_model=schemas.NozzleOut)
def update_nozzle(
    nozzle_id: str,
    payload: schemas.NozzleUpdate,
    db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    nozzle = db.query(models.Nozzle).filter(models.Nozzle.branch_id == branch_id, models.Nozzle.id == nozzle_id).first()
    if not nozzle:
        raise HTTPException(status_code=404, detail="Nozzle not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(nozzle, key, value)
    db.commit()
    db.refresh(nozzle)
    return nozzle


@router.delete("/nozzles/{nozzle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_nozzle(nozzle_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(require_admin)):
    nozzle = db.query(models.Nozzle).filter(models.Nozzle.branch_id == branch_id, models.Nozzle.id == nozzle_id).first()
    if not nozzle:
        raise HTTPException(status_code=404, detail="Nozzle not found")
    db.delete(nozzle)
    db.commit()
    return None

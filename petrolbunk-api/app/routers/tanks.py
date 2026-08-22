from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin
from app.utils import generate_id

router = APIRouter(prefix="/api/tanks", tags=["Tanks"])


@router.get("", response_model=List[schemas.TankOut])
def list_tanks(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Tank).order_by(models.Tank.name).all()


@router.get("/{tank_id}", response_model=schemas.TankOut)
def get_tank(tank_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    tank = db.query(models.Tank).get(tank_id)
    if not tank:
        raise HTTPException(status_code=404, detail="Tank not found")
    return tank


@router.post("", response_model=schemas.TankOut, status_code=status.HTTP_201_CREATED)
def create_tank(payload: schemas.TankCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if not db.query(models.Product).get(payload.product_id):
        raise HTTPException(status_code=400, detail="Invalid product_id")
    tank = models.Tank(id=generate_id("tank"), **payload.model_dump())
    db.add(tank)
    db.commit()
    db.refresh(tank)
    return tank


@router.put("/{tank_id}", response_model=schemas.TankOut)
def update_tank(
    tank_id: str, payload: schemas.TankUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    tank = db.query(models.Tank).get(tank_id)
    if not tank:
        raise HTTPException(status_code=404, detail="Tank not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(tank, key, value)
    db.commit()
    db.refresh(tank)
    return tank


@router.delete("/{tank_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tank(tank_id: str, db: Session = Depends(get_db), _=Depends(require_admin)):
    tank = db.query(models.Tank).get(tank_id)
    if not tank:
        raise HTTPException(status_code=404, detail="Tank not found")
    db.delete(tank)
    db.commit()
    return None

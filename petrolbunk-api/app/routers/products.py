"""Products router — FUEL-only, no density fields."""

from datetime import date as date_type, datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    return (
        db.query(models.Product)
        .filter(models.Product.branch_id == branch_id)
        .order_by(models.Product.code)
        .all()
    )


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    product = (
        db.query(models.Product)
        .filter(models.Product.branch_id == branch_id, models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    if db.query(models.Product).filter(
        models.Product.branch_id == branch_id, models.Product.code == payload.code
    ).first():
        raise HTTPException(status_code=400, detail="Product code already exists")
    product = models.Product(
        id=generate_id("prod"),
        branch_id=branch_id,
        code=payload.code,
        name=payload.name,
        category="FUEL",
        current_rate=payload.current_rate,
        active=payload.active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: str,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    product = (
        db.query(models.Product)
        .filter(models.Product.branch_id == branch_id, models.Product.id == product_id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product


@router.post("/batch-rates", response_model=List[schemas.ProductOut])
def batch_update_rates(
    payload: schemas.BatchRateUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Update rates for multiple products; write audit row to fuel_rate_history."""
    updated = []
    today = date_type.today()
    for item in payload.rates:
        product = db.query(models.Product).filter(
            models.Product.branch_id == branch_id, models.Product.id == item.product_id
        ).first()
        if product:
            if float(product.current_rate or 0) != float(item.current_rate):
                history = models.FuelRateHistory(
                    id=generate_id("frh"),
                    branch_id=branch_id,
                    product_id=product.id,
                    effective_date=today,
                    rate=item.current_rate,
                    remarks=payload.remarks,
                )
                db.add(history)
            product.current_rate = item.current_rate
            updated.append(product)
    db.commit()
    for p in updated:
        db.refresh(p)
    return updated


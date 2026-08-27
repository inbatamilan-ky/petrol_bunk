from typing import List
from datetime import datetime, date as date_type
import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, require_admin, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=List[schemas.ProductOut])
def list_products(db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    return db.query(models.Product).filter(models.Product.branch_id == branch_id).order_by(models.Product.name).all()


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)):
    product = db.query(models.Product).filter(models.Product.branch_id == branch_id).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: schemas.ProductCreate, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(get_current_user)
):
    if db.query(models.Product).filter(models.Product.branch_id == branch_id).filter(models.Product.code == payload.code).first():
        raise HTTPException(status_code=400, detail="Product code already exists")
    product = models.Product(branch_id=branch_id, id=generate_id("prod"), **payload.model_dump())
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
    product = db.query(models.Product).filter(models.Product.branch_id == branch_id).filter(models.Product.id == product_id).first()
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
    updated_products = []
    today = date_type.today()

    for item in payload.rates:
        product = db.query(models.Product).filter(models.Product.branch_id == branch_id, models.Product.id == item.product_id).first()
        if product:
            old_rate = float(product.current_rate or 0)
            new_rate = float(item.current_rate)

            if old_rate != new_rate:
                # Write audit history record
                history = models.FuelRateHistory(
                    branch_id=branch_id,
                    id=f"frh-{product.id}-{int(datetime.now().timestamp()*1000)}",
                    product_id=product.id,
                    product_code=product.code,
                    product_name=product.name,
                    effective_date=today,
                    old_rate=old_rate,
                    new_rate=new_rate,
                    change_source=payload.change_source or "MANUAL_ENTRY",
                    changed_by=payload.changed_by or "Manager",
                    remarks=payload.remarks,
                )
                db.add(history)

            product.current_rate = new_rate
            updated_products.append(product)

    db.commit()
    for p in updated_products:
        db.refresh(p)
    return updated_products


@router.post("/sms-webhook")
def sms_webhook(
    payload: schemas.SmsWebhookPayload,
    db: Session = Depends(get_db),
):
    """
    Inbound Webhook for Android SMS Forwarders, Tasker, GSM Controller, or SMS Gateway.
    Parses OMC morning rates from SMS and updates matching products.
    """
    text = payload.sms_text or ""
    # Regex extract MS, HSD, XP95, SPEED, POWER, CNG, AUTOLPG
    pattern = re.compile(r'(?:^|[\s,;|/])(MS|PETROL|HSD|DIESEL|XP95|XP|SPEED|POWER|CNG|AUTOLPG)[\s:=_-]*(?:RS\.?|INR)?\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)', re.IGNORECASE)
    matches = pattern.findall(text)

    parsed_rates = {}
    for fuel_code, rate_str in matches:
        code_upper = fuel_code.upper()
        norm_key = "MS" if code_upper in ["MS", "PETROL"] else \
                   "HSD" if code_upper in ["HSD", "DIESEL"] else \
                   "XP95" if code_upper in ["XP95", "XP"] else code_upper
        try:
            val = float(rate_str)
            if 10 < val < 300 and norm_key not in parsed_rates:
                parsed_rates[norm_key] = val
        except ValueError:
            pass

    all_products = db.query(models.Product).all()
    updated_products = []
    today = date_type.today()

    if payload.auto_apply and parsed_rates:
        for p in all_products:
            p_code_upper = p.code.upper()
            p_name_upper = p.name.upper()
            new_rate = None
            if p_code_upper in parsed_rates:
                new_rate = parsed_rates[p_code_upper]
            elif "SPEED" in p_code_upper or "MS2" in p_code_upper or "POWER" in p_code_upper or "XP" in p_code_upper or "SPEED" in p_name_upper or "POWER" in p_name_upper or "PREMIUM" in p_name_upper:
                new_rate = parsed_rates.get("SPEED", parsed_rates.get("XP95", parsed_rates.get("POWER", parsed_rates.get("MS2"))))
            elif "MS" in p_code_upper and "MS" in parsed_rates:
                new_rate = parsed_rates["MS"]
            elif "HSD" in p_code_upper and "HSD" in parsed_rates:
                new_rate = parsed_rates["HSD"]

            if new_rate is not None:
                old_rate = float(p.current_rate or 0)
                if old_rate != new_rate:
                    # Write audit history record
                    history = models.FuelRateHistory(
                        branch_id=p.branch_id,
                        id=f"frh-{p.id}-sms-{int(datetime.now().timestamp()*1000)}",
                        product_id=p.id,
                        product_code=p.code,
                        product_name=p.name,
                        effective_date=today,
                        old_rate=old_rate,
                        new_rate=new_rate,
                        change_source="SMS_AUTO",
                        changed_by="SMS Webhook",
                        remarks=f"Auto-applied from SMS: {payload.sender}",
                    )
                    db.add(history)
                p.current_rate = new_rate
                updated_products.append(p)
        db.commit()
        for p in updated_products:
            db.refresh(p)

    # Persist SMS Log to Database
    omc_tag = "IOCL" if "IOC" in (payload.sender or "").upper() else \
              "BPCL" if "BPCL" in (payload.sender or "").upper() else \
              "HPCL" if "HPCL" in (payload.sender or "").upper() else "OMC"

    parsed_rates_list = [{"fuelKey": k, "rate": v} for k, v in parsed_rates.items()]
    sms_log = models.SmsRateLog(
        branch_id="B-01",
        id=f"sms-{int(datetime.now().timestamp()*1000)}",
        sender=payload.sender or "UNKNOWN",
        raw_text=payload.sms_text or "",
        omc=omc_tag,
        parsed_rates=parsed_rates_list,
        status="APPLIED" if payload.auto_apply and updated_products else "PENDING_REVIEW",
        applied_at=datetime.now() if payload.auto_apply and updated_products else None,
        applied_by="SMS Webhook" if payload.auto_apply and updated_products else None,
    )
    db.add(sms_log)
    db.commit()

    return {
        "status": "SUCCESS",
        "sender": payload.sender,
        "parsed_rates": parsed_rates,
        "auto_applied": payload.auto_apply,
        "updated_product_count": len(updated_products),
        "updated_products": [schemas.ProductOut.model_validate(p) for p in updated_products],
    }


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: str, db: Session = Depends(get_db), branch_id: str = Depends(get_current_branch), _=Depends(require_admin)):
    product = db.query(models.Product).filter(models.Product.branch_id == branch_id).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return None



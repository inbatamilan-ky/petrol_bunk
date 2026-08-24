"""
/api/masters — unified read/write endpoint for all 10 master/lookup tables.

GET  /api/masters/{table}          — list active items (any authenticated user)
POST /api/masters/{table}          — create new item  (owner only)
PUT  /api/masters/{table}/{id}     — update item      (owner only)
DELETE /api/masters/{table}/{id}   — soft-delete      (owner only)

Supported {table} values:
  shift-types | payment-modes | product-categories | expense-categories
  pump-statuses | customer-statuses | omc-brands | states
  bank-account-types | dip-types
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import models
from app.deps import get_current_user, get_db, require_admin

router = APIRouter(prefix="/api/masters", tags=["Master Tables"])

# ──────────────────────────────────────────────────────────────────────
# Pydantic schemas (inline — thin, generic)
# ──────────────────────────────────────────────────────────────────────

class MasterItemOut(BaseModel):
    id: int
    code: str
    label: str
    subtitle: Optional[str] = None       # shift_types only
    description: Optional[str] = None    # categories + statuses
    color: Optional[str] = None          # categories + statuses
    icon: Optional[str] = None           # payment_modes
    sms_number: Optional[str] = None     # omc_brands
    type: Optional[str] = None           # states (STATE | UT)
    sort_order: int
    is_active: bool

    class Config:
        from_attributes = True


class MasterItemCreate(BaseModel):
    code: str
    label: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sms_number: Optional[str] = None
    type: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class MasterItemUpdate(BaseModel):
    label: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sms_number: Optional[str] = None
    type: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ──────────────────────────────────────────────────────────────────────
# Table registry — maps URL slug → SQLAlchemy model class
# ──────────────────────────────────────────────────────────────────────
TABLE_MAP: Dict[str, Any] = {
    "shift-types":        models.MasterShiftType,
    "payment-modes":      models.MasterPaymentMode,
    "product-categories": models.MasterProductCategory,
    "expense-categories": models.MasterExpenseCategory,
    "pump-statuses":      models.MasterPumpStatus,
    "customer-statuses":  models.MasterCustomerStatus,
    "omc-brands":         models.MasterOmcBrand,
    "bank-account-types": models.MasterBankAccountType,
    "dip-types":          models.MasterDipType,
}

# Tables whose seed data must NOT be deleted by non-super admins
PROTECTED_TABLES = {"omc-brands"}


def _get_model(table: str):
    model = TABLE_MAP.get(table)
    if not model:
        raise HTTPException(
            status_code=404,
            detail=f"Master table '{table}' not found. Valid tables: {', '.join(TABLE_MAP.keys())}",
        )
    return model


# ──────────────────────────────────────────────────────────────────────
# GET  /api/masters/{table}   — list all active items
# ──────────────────────────────────────────────────────────────────────
@router.get("/{table}", response_model=List[MasterItemOut])
def list_master(
    table: str,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    model = _get_model(table)
    q = db.query(model)
    if not include_inactive:
        q = q.filter(model.is_active == True)  # noqa: E712
    q = q.order_by(model.sort_order, model.id)
    rows = q.all()

    # Normalise to MasterItemOut — not all models have every optional field
    result = []
    for row in rows:
        result.append(MasterItemOut(
            id=row.id,
            code=row.code,
            label=row.label,
            subtitle=getattr(row, "subtitle", None),
            description=getattr(row, "description", None),
            color=getattr(row, "color", None),
            icon=getattr(row, "icon", None),
            sms_number=getattr(row, "sms_number", None),
            type=getattr(row, "type", None),
            sort_order=row.sort_order,
            is_active=row.is_active,
        ))
    return result


# ──────────────────────────────────────────────────────────────────────
# POST /api/masters/{table}   — create a new item (owner only)
# ──────────────────────────────────────────────────────────────────────
@router.post("/{table}", response_model=MasterItemOut, status_code=status.HTTP_201_CREATED)
def create_master(
    table: str,
    payload: MasterItemCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    model = _get_model(table)

    # Check duplicate code
    existing = db.query(model).filter(model.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Item with code '{payload.code}' already exists in {table}.",
        )

    data = payload.model_dump(exclude_none=True)
    # Only pass kwargs that the model column actually accepts
    valid_cols = {c.key for c in model.__table__.columns}
    filtered = {k: v for k, v in data.items() if k in valid_cols}
    obj = model(**filtered)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return MasterItemOut(
        id=obj.id,
        code=obj.code,
        label=obj.label,
        subtitle=getattr(obj, "subtitle", None),
        description=getattr(obj, "description", None),
        color=getattr(obj, "color", None),
        icon=getattr(obj, "icon", None),
        sms_number=getattr(obj, "sms_number", None),
        type=getattr(obj, "type", None),
        sort_order=obj.sort_order,
        is_active=obj.is_active,
    )


# ──────────────────────────────────────────────────────────────────────
# PUT  /api/masters/{table}/{item_id}   — update (owner only)
# ──────────────────────────────────────────────────────────────────────
@router.put("/{table}/{item_id}", response_model=MasterItemOut)
def update_master(
    table: str,
    item_id: int,
    payload: MasterItemUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    model = _get_model(table)
    obj = db.query(model).filter(model.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found in {table}.")

    data = payload.model_dump(exclude_unset=True)
    valid_cols = {c.key for c in model.__table__.columns}
    for key, val in data.items():
        if key in valid_cols:
            setattr(obj, key, val)

    db.commit()
    db.refresh(obj)
    return MasterItemOut(
        id=obj.id,
        code=obj.code,
        label=obj.label,
        subtitle=getattr(obj, "subtitle", None),
        description=getattr(obj, "description", None),
        color=getattr(obj, "color", None),
        icon=getattr(obj, "icon", None),
        sms_number=getattr(obj, "sms_number", None),
        type=getattr(obj, "type", None),
        sort_order=obj.sort_order,
        is_active=obj.is_active,
    )


# ──────────────────────────────────────────────────────────────────────
# DELETE /api/masters/{table}/{item_id}  — soft-delete (owner only)
# ──────────────────────────────────────────────────────────────────────
@router.delete("/{table}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master(
    table: str,
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    model = _get_model(table)
    obj = db.query(model).filter(model.id == item_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail=f"Item {item_id} not found in {table}.")

    # Soft-delete: mark inactive instead of hard delete
    obj.is_active = False
    db.commit()
    return None


# ──────────────────────────────────────────────────────────────────────
# Convenience: GET /api/masters/{table}/all — include inactive rows
# Used by admin management UI
# ──────────────────────────────────────────────────────────────────────
@router.get("/{table}/all", response_model=List[MasterItemOut])
def list_master_all(
    table: str,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    return list_master(table=table, include_inactive=True, db=db, _=_)

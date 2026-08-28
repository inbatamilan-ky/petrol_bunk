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
    "shift-types":              models.MasterShiftType,
    "payment-modes":            models.MasterPaymentMode,
    "product-categories":       models.MasterProductCategory,
    "expense-categories":       models.MasterExpenseCategory,
    "pump-statuses":            models.MasterPumpStatus,
    "customer-statuses":        models.MasterCustomerStatus,
    "omc-brands":               models.MasterOmcBrand,
    "bank-account-types":       models.MasterBankAccountType,
    "dip-types":                models.MasterDipType,
    "shift-statuses":           models.MasterShiftStatus,
    "staff-statuses":           models.MasterStaffStatus,
    "staff-roles":              models.MasterStaffRole,
    "expense-payment-methods":  models.MasterExpensePaymentMethod,
    "credit-payment-modes":     models.MasterCreditPaymentMode,
    "rate-change-sources":      models.MasterRateChangeSource,
    "tank-statuses":            models.MasterTankStatus,
    "settlement-channels":      models.MasterSettlementChannel,
    "settlement-statuses":      models.MasterSettlementStatus,
    "bank-deposit-statuses":    models.MasterBankDepositStatus,
    "units-of-measure":         models.MasterUnitOfMeasure,
    "branch-statuses":          models.MasterBranchStatus,
    "report-types":             models.MasterReportType,
    "product-statuses":         models.MasterProductStatus,
    "expense-statuses":         models.MasterExpenseStatus,
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


DEFAULT_SEEDS = {
    "shift-types": [
        {"code": "MORNING", "label": "Morning", "subtitle": "06:00 AM – 02:00 PM", "sort_order": 1},
        {"code": "EVENING", "label": "Evening", "subtitle": "02:00 PM – 10:00 PM", "sort_order": 2},
        {"code": "NIGHT",   "label": "Night",   "subtitle": "10:00 PM – 06:00 AM", "sort_order": 3},
        {"code": "FULL_DAY","label": "Full Day","subtitle": "24 Hours",           "sort_order": 4},
    ],
    "payment-modes": [
        {"code": "CASH",       "label": "Cash",          "icon": "Banknote", "sort_order": 1},
        {"code": "UPI",        "label": "UPI / QR",      "icon": "QrCode",   "sort_order": 2},
        {"code": "POS_CARD",   "label": "Card (POS)",    "icon": "CreditCard","sort_order": 3},
        {"code": "FLEET_CARD", "label": "Fleet Card",    "icon": "Fuel",     "sort_order": 4},
        {"code": "CHEQUE",     "label": "Cheque",        "icon": "FileText", "sort_order": 5},
        {"code": "BANK_NEFT",  "label": "Bank / NEFT",   "icon": "Building", "sort_order": 6},
    ],
    "product-categories": [
        {"code": "FUEL",      "label": "Fuel",      "color": "#3B82F6", "sort_order": 1},
        {"code": "LUBRICANT", "label": "Lubricant", "color": "#EC4899", "sort_order": 2},
        {"code": "CNG",       "label": "CNG Gas",   "color": "#F59E0B", "sort_order": 3},
        {"code": "LPG",       "label": "Auto LPG",  "color": "#8B5CF6", "sort_order": 4},
    ],
    "expense-categories": [
        {"code": "OPERATIONAL", "label": "Operational", "color": "#0284C7", "sort_order": 1},
        {"code": "STAFF",       "label": "Staff",       "color": "#3B82F6", "sort_order": 2},
        {"code": "FINANCIAL",   "label": "Financial",   "color": "#16A34A", "sort_order": 3},
        {"code": "MAINTENANCE", "label": "Maintenance", "color": "#F59E0B", "sort_order": 4},
        {"code": "MISC",        "label": "Miscellaneous","color": "#64748B","sort_order": 5},
    ],
    "pump-statuses": [
        {"code": "ACTIVE",      "label": "Active",      "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE",    "label": "Inactive",    "color": "#64748B", "sort_order": 2},
        {"code": "IDLE",        "label": "Idle",        "color": "#F59E0B", "sort_order": 3},
        {"code": "MAINTENANCE", "label": "Maintenance", "color": "#EF4444", "sort_order": 4},
    ],
    "customer-statuses": [
        {"code": "ACTIVE",   "label": "Active",   "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE", "label": "Inactive", "color": "#64748B", "sort_order": 2},
        {"code": "HOLD",     "label": "Hold",     "color": "#F59E0B", "sort_order": 3},
        {"code": "BLOCKED",  "label": "Blocked",  "color": "#EF4444", "sort_order": 4},
    ],
    "omc-brands": [
        {"code": "BPCL",     "label": "Bharat Petroleum (BPCL)", "color": "#3B82F6", "sort_order": 1},
        {"code": "IOCL",     "label": "Indian Oil (IOCL)",       "color": "#F97316", "sort_order": 2},
        {"code": "HPCL",     "label": "Hindustan Petroleum (HPCL)","color": "#EF4444","sort_order": 3},
        {"code": "NAYARA",   "label": "Nayara Energy",           "color": "#10B981", "sort_order": 4},
        {"code": "RELIANCE", "label": "Jio-bp / Reliance",       "color": "#06B6D4", "sort_order": 5},
        {"code": "SHELL",    "label": "Shell India",             "color": "#EAB308", "sort_order": 6},
    ],
    "bank-account-types": [
        {"code": "CURRENT", "label": "Current Account", "sort_order": 1},
        {"code": "SAVINGS", "label": "Savings Account", "sort_order": 2},
        {"code": "CC_OD",   "label": "Cash Credit (CC/OD)", "sort_order": 3},
        {"code": "FCNR",    "label": "FCNR Account",    "sort_order": 4},
    ],
    "dip-types": [
        {"code": "MORNING",     "label": "Morning Opening Dip", "sort_order": 1},
        {"code": "EVENING",     "label": "Evening Shift Dip",   "sort_order": 2},
        {"code": "DECANTATION", "label": "After Tanker Unload", "sort_order": 3},
        {"code": "CLOSING",     "label": "Midnight Closing Dip","sort_order": 4},
    ],
    "shift-statuses": [
        {"code": "OPEN",          "label": "In Progress (Open)", "color": "#3B82F6", "sort_order": 1},
        {"code": "COMPLETED",     "label": "Closed & Audited",  "color": "#10B981", "sort_order": 2},
        {"code": "PENDING_AUDIT", "label": "Pending Audit",     "color": "#F59E0B", "sort_order": 3},
        {"code": "CANCELLED",     "label": "Cancelled",         "color": "#EF4444", "sort_order": 4},
    ],
    "staff-statuses": [
        {"code": "ACTIVE",    "label": "Active",    "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE",  "label": "Inactive",  "color": "#64748B", "sort_order": 2},
        {"code": "ON_LEAVE",  "label": "On Leave",  "color": "#F59E0B", "sort_order": 3},
        {"code": "SUSPENDED", "label": "Suspended", "color": "#EF4444", "sort_order": 4},
    ],
    "staff-roles": [
        {"code": "OPERATOR",   "label": "Pump Attendant / Operator", "sort_order": 1},
        {"code": "CASHIER",    "label": "Cashier",                   "sort_order": 2},
        {"code": "SUPERVISOR", "label": "Shift Supervisor",          "sort_order": 3},
        {"code": "MANAGER",    "label": "Station Manager",           "sort_order": 4},
        {"code": "ACCOUNTANT", "label": "Accountant",                "sort_order": 5},
    ],
    "expense-payment-methods": [
        {"code": "PETTY_CASH",     "label": "Petty Cash Drawer", "icon": "Banknote", "sort_order": 1},
        {"code": "BANK_TRANSFER",  "label": "Bank NEFT / RTGS",  "icon": "Building", "sort_order": 2},
        {"code": "UPI_QR",         "label": "UPI QR Direct",     "icon": "QrCode",   "sort_order": 3},
        {"code": "CHEQUE",         "label": "Bank Cheque",       "icon": "FileText", "sort_order": 4},
    ],
    "credit-payment-modes": [
        {"code": "CASH",      "label": "Physical Cash", "icon": "Banknote", "sort_order": 1},
        {"code": "NEFT",      "label": "Bank NEFT / RTGS", "icon": "Building", "sort_order": 2},
        {"code": "CHEQUE",    "label": "Cheque Payment", "icon": "FileText", "sort_order": 3},
        {"code": "UPI",       "label": "UPI Transfer",   "icon": "QrCode",   "sort_order": 4},
    ],
    "rate-change-sources": [
        {"code": "MANUAL_ENTRY", "label": "Manual Portal Entry", "sort_order": 1},
        {"code": "SMS_AUTO",     "label": "OMC Daily SMS Auto Apply", "sort_order": 2},
        {"code": "BATCH_IMPORT", "label": "Batch CSV / Excel Import", "sort_order": 3},
        {"code": "HO_PUSH",      "label": "OMC Head Office Push", "sort_order": 4},
    ],
    "tank-statuses": [
        {"code": "NORMAL",      "label": "Normal Level", "color": "#10B981", "sort_order": 1},
        {"code": "LOW_STOCK",   "label": "Low Stock",    "color": "#F59E0B", "sort_order": 2},
        {"code": "CRITICAL",    "label": "Critical Low", "color": "#EF4444", "sort_order": 3},
        {"code": "MAINTENANCE", "label": "Maintenance",  "color": "#64748B", "sort_order": 4},
    ],
    "settlement-channels": [
        {"code": "UPI",        "label": "UPI Dynamic / Static QR", "icon": "QrCode", "color": "#8B5CF6", "sort_order": 1},
        {"code": "POS_CARD",   "label": "EDC / Card Swipes",      "icon": "CreditCard", "color": "#3B82F6", "sort_order": 2},
        {"code": "FLEET_CARD", "label": "OMC Fleet Card (e-Purse)", "icon": "Fuel", "color": "#0284C7", "sort_order": 3},
        {"code": "FASTAG",     "label": "Fuel Fastag",            "icon": "Zap", "color": "#10B981", "sort_order": 4},
    ],
    "settlement-statuses": [
        {"code": "SETTLED",  "label": "Settled in Bank", "color": "#10B981", "sort_order": 1},
        {"code": "PENDING",  "label": "Batch Pending",   "color": "#F59E0B", "sort_order": 2},
        {"code": "FAILED",   "label": "Disputed / Failed", "color": "#EF4444", "sort_order": 3},
        {"code": "REFUNDED", "label": "Refunded",        "color": "#64748B", "sort_order": 4},
    ],
    "bank-deposit-statuses": [
        {"code": "CONFIRMED",  "label": "Credited in Bank", "color": "#10B981", "sort_order": 1},
        {"code": "IN_TRANSIT", "label": "Cash in Transit",  "color": "#F59E0B", "sort_order": 2},
        {"code": "REJECTED",   "label": "Slip Rejected",    "color": "#EF4444", "sort_order": 3},
    ],
    "units-of-measure": [
        {"code": "LITRE",  "label": "Litre (L)",   "sort_order": 1},
        {"code": "CAN",    "label": "Can / Pack",  "sort_order": 2},
        {"code": "KG",     "label": "Kilogram (Kg)","sort_order": 3},
        {"code": "PIECE",  "label": "Piece",       "sort_order": 4},
        {"code": "BARREL", "label": "Barrel (210L)", "sort_order": 5},
    ],
    "branch-statuses": [
        {"code": "ACTIVE",      "label": "Active",   "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE",    "label": "Inactive", "color": "#64748B", "sort_order": 2},
        {"code": "MAINTENANCE", "label": "Maintenance", "color": "#F59E0B", "sort_order": 3},
    ],
    "report-types": [
        {"code": "SALES_SUMMARY",     "label": "Daily Sales Summary", "category": "Sales", "sort_order": 1},
        {"code": "SHIFT_REGISTER",    "label": "Shift Settlement Register", "category": "Operations", "sort_order": 2},
        {"code": "DENSITY_REGISTER",  "label": "15°C Density Audit Register", "category": "Compliance", "sort_order": 3},
        {"code": "CREDIT_LEDGER",     "label": "Credit Outstanding Ledger", "category": "Credit", "sort_order": 4},
        {"code": "EXPENSE_STATEMENT", "label": "Expense Voucher Statement", "category": "Finance", "sort_order": 5},
        {"code": "CASH_DAY_BOOK",     "label": "Cash Safe Day Book", "category": "Finance", "sort_order": 6},
        {"code": "TANK_STOCK_MOVEMENT","label": "Tank Dip & Stock Movement", "category": "Inventory", "sort_order": 7},
    ],
    "product-statuses": [
        {"code": "ACTIVE",       "label": "Active",       "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE",     "label": "Inactive",     "color": "#64748B", "sort_order": 2},
        {"code": "OUT_OF_STOCK", "label": "Out of Stock", "color": "#F59E0B", "sort_order": 3},
    ],
    "expense-statuses": [
        {"code": "ACTIVE",   "label": "Active",   "color": "#10B981", "sort_order": 1},
        {"code": "INACTIVE", "label": "Inactive", "color": "#64748B", "sort_order": 2},
        {"code": "ARCHIVED", "label": "Archived", "color": "#EF4444", "sort_order": 3},
    ],
}

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

    # If empty, seed default items automatically
    if not rows and table in DEFAULT_SEEDS:
        for item_data in DEFAULT_SEEDS[table]:
            obj = model(**item_data, is_active=True)
            db.add(obj)
        db.commit()
        rows = db.query(model).order_by(model.sort_order, model.id).all()

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

"""Masters lookup router — serves all master tables for dropdowns & configurations."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.deps import get_current_user, get_db, get_current_branch
from app.utils import generate_id

router = APIRouter(prefix="/api/masters", tags=["Masters"])

# ─── Static Master Table Registry ─────────────────────────────────────────────

STATIC_MASTERS: Dict[str, List[Dict[str, Any]]] = {
    "shift-types": [
        {"id": 1, "code": "MORNING", "label": "Morning", "name": "Morning", "subtitle": "06:00 - 14:00", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "EVENING", "label": "Evening", "name": "Evening", "subtitle": "14:00 - 22:00", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "NIGHT", "label": "Night", "name": "Night", "subtitle": "22:00 - 06:00", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "FULL_DAY", "label": "Full Day", "name": "Full Day", "subtitle": "06:00 - 22:00", "sort_order": 4, "is_active": True},
    ],
    "product-categories": [
        {"id": 1, "code": "FUEL", "label": "Fuel", "name": "Fuel", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "LUBRICANT", "label": "Lubricant / Oil", "name": "Lubricant / Oil", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "OTHER", "label": "Other", "name": "Other", "sort_order": 3, "is_active": True},
    ],
    "expense-categories": [
        {"id": 1, "code": "OPERATIONAL", "label": "Operational", "name": "Operational", "color": "#3B82F6", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "STAFF", "label": "Staff & Welfare", "name": "Staff & Welfare", "color": "#10B981", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "MAINTENANCE", "label": "Maintenance & Repairs", "name": "Maintenance & Repairs", "color": "#F59E0B", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "FINANCIAL", "label": "Financial & Banking", "name": "Financial & Banking", "color": "#8B5CF6", "sort_order": 4, "is_active": True},
        {"id": 5, "code": "UTILITY", "label": "Electricity & Utilities", "name": "Electricity & Utilities", "color": "#EC4899", "sort_order": 5, "is_active": True},
        {"id": 6, "code": "GENERAL", "label": "General / Miscellaneous", "name": "General / Miscellaneous", "color": "#64748B", "sort_order": 6, "is_active": True},
    ],
    "pump-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active", "name": "Active", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive", "name": "Inactive", "color": "#64748B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "IDLE", "label": "Idle", "name": "Idle", "color": "#F59E0B", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "MAINTENANCE", "label": "Maintenance", "name": "Maintenance", "color": "#EF4444", "sort_order": 4, "is_active": True},
    ],
    "customer-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active", "name": "Active", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive", "name": "Inactive", "color": "#64748B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "HOLD", "label": "On Hold", "name": "On Hold", "color": "#F59E0B", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "BLOCKED", "label": "Blocked", "name": "Blocked", "color": "#EF4444", "sort_order": 4, "is_active": True},
    ],
    "omc-brands": [
        {"id": 1, "code": "BPCL", "label": "Bharat Petroleum (BPCL)", "name": "Bharat Petroleum (BPCL)", "sms_number": "9223112222", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "IOCL", "label": "Indian Oil (IOCL)", "name": "Indian Oil (IOCL)", "sms_number": "9224992249", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "HPCL", "label": "Hindustan Petroleum (HPCL)", "name": "Hindustan Petroleum (HPCL)", "sms_number": "9222201122", "sort_order": 3, "is_active": True},
    ],
    "bank-account-types": [
        {"id": 1, "code": "CURRENT", "label": "Current Account", "name": "Current Account", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "SAVINGS", "label": "Savings Account", "name": "Savings Account", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "OD_CC", "label": "Overdraft / Cash Credit", "name": "Overdraft / Cash Credit", "sort_order": 3, "is_active": True},
    ],
    "dip-types": [
        {"id": 1, "code": "MORNING", "label": "Morning Opening Dip", "name": "Morning Opening Dip", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "EVENING", "label": "Evening Closing Dip", "name": "Evening Closing Dip", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "AFTER_DECANTATION", "label": "After Decantation", "name": "After Decantation", "sort_order": 3, "is_active": True},
    ],
    "shift-statuses": [
        {"id": 1, "code": "OPEN", "label": "In Progress (Open)", "name": "In Progress (Open)", "color": "#3B82F6", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "COMPLETED", "label": "Closed & Audited", "name": "Closed & Audited", "color": "#10B981", "sort_order": 2, "is_active": True},
    ],
    "staff-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active on Duty", "name": "Active on Duty", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive", "name": "Inactive", "color": "#64748B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "ON_LEAVE", "label": "On Leave", "name": "On Leave", "color": "#F59E0B", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "SUSPENDED", "label": "Suspended", "name": "Suspended", "color": "#EF4444", "sort_order": 4, "is_active": True},
    ],
    "staff-roles": [
        {"id": 1, "code": "OPERATOR", "label": "Pump Operator / Attendant", "name": "Pump Operator / Attendant", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "CASHIER", "label": "Cashier", "name": "Cashier", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "SUPERVISOR", "label": "Supervisor", "name": "Supervisor", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "MANAGER", "label": "Manager", "name": "Manager", "sort_order": 4, "is_active": True},
        {"id": 5, "code": "ACCOUNTANT", "label": "Accountant", "name": "Accountant", "sort_order": 5, "is_active": True},
    ],
    "expense-payment-methods": [
        {"id": 1, "code": "PETTY_CASH", "label": "Petty Cash", "name": "Petty Cash", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "BANK_TRANSFER", "label": "Bank Transfer / NEFT", "name": "Bank Transfer / NEFT", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "UPI", "label": "UPI / QR", "name": "UPI / QR", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "CHEQUE", "label": "Cheque", "name": "Cheque", "sort_order": 4, "is_active": True},
    ],
    "credit-payment-modes": [
        {"id": 1, "code": "CASH", "label": "Cash", "name": "Cash", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "NEFT_RTGS", "label": "NEFT / RTGS", "name": "NEFT / RTGS", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "CHEQUE", "label": "Cheque", "name": "Cheque", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "UPI", "label": "UPI / QR", "name": "UPI / QR", "sort_order": 4, "is_active": True},
    ],
    "rate-change-sources": [
        {"id": 1, "code": "MANUAL", "label": "Manual Entry", "name": "Manual Entry", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "SMS", "label": "SMS Auto Update", "name": "SMS Auto Update", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "BATCH", "label": "Batch Import", "name": "Batch Import", "sort_order": 3, "is_active": True},
    ],
    "tank-statuses": [
        {"id": 1, "code": "NORMAL", "label": "Normal Level", "name": "Normal Level", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "LOW_STOCK", "label": "Low Stock", "name": "Low Stock", "color": "#F59E0B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "CRITICAL", "label": "Critical Low", "name": "Critical Low", "color": "#EF4444", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "MAINTENANCE", "label": "Maintenance", "name": "Maintenance", "color": "#64748B", "sort_order": 4, "is_active": True},
    ],
    "settlement-channels": [
        {"id": 1, "code": "UPI", "label": "UPI (GPay / PhonePe / Paytm)", "name": "UPI (GPay / PhonePe / Paytm)", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "CARD_POS", "label": "POS Card Swiping", "name": "POS Card Swiping", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "FLEET_CARD", "label": "Fleet Card (FC)", "name": "Fleet Card (FC)", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "FASTAG", "label": "FASTag Fuel", "name": "FASTag Fuel", "sort_order": 4, "is_active": True},
    ],
    "settlement-statuses": [
        {"id": 1, "code": "SETTLED", "label": "Settled", "name": "Settled", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "PENDING", "label": "Batch Pending", "name": "Batch Pending", "color": "#F59E0B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "FAILED", "label": "Failed", "name": "Failed", "color": "#EF4444", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "REFUNDED", "label": "Refunded", "name": "Refunded", "color": "#64748B", "sort_order": 4, "is_active": True},
    ],
    "bank-deposit-statuses": [
        {"id": 1, "code": "CREDITED", "label": "Credited to Bank", "name": "Credited to Bank", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "IN_TRANSIT", "label": "In Transit", "name": "In Transit", "color": "#F59E0B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "REJECTED", "label": "Rejected", "name": "Rejected", "color": "#EF4444", "sort_order": 3, "is_active": True},
    ],
    "units-of-measure": [
        {"id": 1, "code": "LITRE", "label": "Litre (L)", "name": "Litre (L)", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "CAN", "label": "Can", "name": "Can", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "KG", "label": "Kilogram (Kg)", "name": "Kilogram (Kg)", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "PIECE", "label": "Piece (Pcs)", "name": "Piece (Pcs)", "sort_order": 4, "is_active": True},
        {"id": 5, "code": "BARREL", "label": "Barrel", "name": "Barrel", "sort_order": 5, "is_active": True},
    ],
    "branch-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active / Fully Operational", "name": "Active / Fully Operational", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive / Temporarily Closed", "name": "Inactive / Temporarily Closed", "color": "#64748B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "MAINTENANCE", "label": "Under Maintenance", "name": "Under Maintenance", "color": "#F59E0B", "sort_order": 3, "is_active": True},
    ],
    "report-types": [
        {"id": 1, "code": "SALES_SUMMARY", "label": "Daily Sales Summary", "name": "Daily Sales Summary", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "SHIFT_REGISTER", "label": "Shift Register", "name": "Shift Register", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "DENSITY_REGISTER", "label": "Density Register", "name": "Density Register", "sort_order": 3, "is_active": True},
        {"id": 4, "code": "CREDIT_LEDGER", "label": "Customer Credit Ledger", "name": "Customer Credit Ledger", "sort_order": 4, "is_active": True},
    ],
    "product-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active & Selling", "name": "Active & Selling", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive", "name": "Inactive", "color": "#64748B", "sort_order": 2, "is_active": True},
        {"id": 3, "code": "OUT_OF_STOCK", "label": "Out of Stock", "name": "Out of Stock", "color": "#F59E0B", "sort_order": 3, "is_active": True},
    ],
    "expense-statuses": [
        {"id": 1, "code": "ACTIVE", "label": "Active", "name": "Active", "color": "#10B981", "sort_order": 1, "is_active": True},
        {"id": 2, "code": "INACTIVE", "label": "Inactive", "name": "Inactive", "color": "#64748B", "sort_order": 2, "is_active": True},
    ],
}


# ─── Standard Endpoints ───────────────────────────────────────────────────────

@router.get("/banks", response_model=List[schemas.MasterBankOut])
def get_banks(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.MasterBank).filter(models.MasterBank.is_active == True).order_by(models.MasterBank.sort_order).all()


@router.get("/channels", response_model=List[schemas.MasterChannelOut])
def get_channels(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.MasterChannel).filter(models.MasterChannel.is_active == True).order_by(models.MasterChannel.sort_order).all()


@router.get("/payment-modes", response_model=List[schemas.MasterPaymentModeOut])
def get_payment_modes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.MasterPaymentMode).filter(models.MasterPaymentMode.is_active == True).order_by(models.MasterPaymentMode.sort_order).all()


@router.get("/expense-types", response_model=List[schemas.ExpenseTypeOut])
def get_expense_types(
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    """Returns global (branch_id=NULL) + branch-specific expense types."""
    return (
        db.query(models.ExpenseType)
        .filter(
            (models.ExpenseType.branch_id == None) | (models.ExpenseType.branch_id == branch_id)
        )
        .order_by(models.ExpenseType.name)
        .all()
    )


@router.post("/expense-types", response_model=schemas.ExpenseTypeOut, status_code=status.HTTP_201_CREATED)
def create_expense_type(
    payload: schemas.ExpenseTypeCreate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    et = models.ExpenseType(
        id=generate_id("et"),
        branch_id=branch_id,
        **payload.model_dump(),
    )
    db.add(et)
    db.commit()
    db.refresh(et)
    return et


@router.put("/expense-types/{et_id}", response_model=schemas.ExpenseTypeOut)
def update_expense_type(
    et_id: str,
    payload: schemas.ExpenseTypeUpdate,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    et = db.query(models.ExpenseType).filter(
        models.ExpenseType.id == et_id,
        (models.ExpenseType.branch_id == branch_id) | (models.ExpenseType.branch_id == None),
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Expense type not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(et, key, value)
    db.commit()
    db.refresh(et)
    return et


@router.delete("/expense-types/{et_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense_type(
    et_id: str,
    db: Session = Depends(get_db),
    branch_id: str = Depends(get_current_branch),
    _=Depends(get_current_user),
):
    et = db.query(models.ExpenseType).filter(
        models.ExpenseType.id == et_id,
        models.ExpenseType.branch_id == branch_id,
    ).first()
    if not et:
        raise HTTPException(status_code=404, detail="Expense type not found or is a global head")
    db.delete(et)
    db.commit()
    return None


# ─── Dynamic Master Items Endpoint (serves all 24+ lookup tables) ─────────────

@router.get("/{table_name}")
def get_master_table(
    table_name: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Generic master table endpoint that serves lookup tables
    (e.g., product-categories, pump-statuses, expense-categories, staff-roles, etc.)
    """
    if table_name == "banks":
        banks = db.query(models.MasterBank).filter(models.MasterBank.is_active == True).order_by(models.MasterBank.sort_order).all()
        return [
            {"id": b.id, "code": b.code, "label": b.name, "name": b.name, "sort_order": b.sort_order, "is_active": b.is_active}
            for b in banks
        ]

    if table_name == "channels":
        channels = db.query(models.MasterChannel).filter(models.MasterChannel.is_active == True).order_by(models.MasterChannel.sort_order).all()
        return [
            {"id": c.id, "code": c.code, "label": c.name, "name": c.name, "sort_order": c.sort_order, "is_active": c.is_active}
            for c in channels
        ]

    if table_name == "payment-modes":
        pms = db.query(models.MasterPaymentMode).filter(models.MasterPaymentMode.is_active == True).order_by(models.MasterPaymentMode.sort_order).all()
        return [
            {"id": p.id, "code": p.code, "label": p.name, "name": p.name, "sort_order": p.sort_order, "is_active": p.is_active}
            for p in pms
        ]

    if table_name in STATIC_MASTERS:
        return STATIC_MASTERS[table_name]

    # Return empty list rather than 404 for forward-compatibility
    return []

@router.post("/{table_name}")
def create_master_item(
    table_name: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    items = STATIC_MASTERS.setdefault(table_name, [])
    new_id = max([it.get("id", 0) for it in items] or [0]) + 1
    new_item = {
        "id": new_id,
        "code": payload.get("code", str(new_id)),
        "label": payload.get("label") or payload.get("name") or "New Item",
        "name": payload.get("label") or payload.get("name") or "New Item",
        "subtitle": payload.get("subtitle"),
        "description": payload.get("description"),
        "color": payload.get("color"),
        "icon": payload.get("icon"),
        "sort_order": payload.get("sort_order", new_id),
        "is_active": payload.get("is_active", True),
    }
    items.append(new_item)
    return new_item


@router.put("/{table_name}/{item_id}")
def update_master_item(
    table_name: str,
    item_id: int,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    items = STATIC_MASTERS.get(table_name, [])
    for it in items:
        if it.get("id") == item_id:
            it.update({k: v for k, v in payload.items() if v is not None})
            if "label" in payload and "name" not in payload:
                it["name"] = payload["label"]
            return it
    return {"id": item_id, **payload}


@router.delete("/{table_name}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_master_item(
    table_name: str,
    item_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    items = STATIC_MASTERS.get(table_name, [])
    for it in items:
        if it.get("id") == item_id:
            it["is_active"] = False
            return None
    return None

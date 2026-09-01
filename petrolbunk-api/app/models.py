"""
SQLAlchemy ORM models — FuelPulse v2 (strict Excel scope).

Every column here is traceable to a cell in the two Excel files.
Invented features (tanks, dips, SMS, POS settlements, bank accounts,
shift open/close, denomination counting) are removed.
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


# ──────────────────────────────────────────────────────────────────────
# INFRA / AUTH
# ──────────────────────────────────────────────────────────────────────

class Branch(Base):
    __tablename__ = "branches"

    id                 = Column(String(20), primary_key=True)
    name               = Column(String(150), nullable=False)
    location           = Column(String(255))
    dealer_code        = Column(String(50))
    omc_brand          = Column(String(30), nullable=False, default="BPCL")
    is_active          = Column(Boolean, nullable=False, default=True)
    bunk_name          = Column(String(150))
    city               = Column(String(100))
    manager_name       = Column(String(100))
    manager_phone      = Column(String(30))
    manager_email      = Column(String(120))
    manager_access     = Column(String(50), default="ALL")
    auto_fetch_enabled = Column(Boolean, default=False)
    auto_apply_enabled = Column(Boolean, default=False)
    gstin              = Column(String(20))
    operating_hours    = Column(String(50), default="24 Hours")
    created_at         = Column(DateTime(timezone=True), server_default=func.now())
    updated_at         = Column(DateTime(timezone=True), onupdate=func.now())


class User(Base):
    __tablename__ = "users"

    id                     = Column(Integer, primary_key=True, autoincrement=True)
    username               = Column(String(60), unique=True, nullable=False, index=True)
    email                  = Column(String(120), unique=True, nullable=True)
    first_name             = Column(String(80), nullable=True)
    last_name              = Column(String(80), nullable=True)
    hashed_password        = Column(String(255), nullable=False)
    role                   = Column(Integer, nullable=False, default=2)   # 1=Owner 2=Manager 3=Attendant
    is_active              = Column(Boolean, nullable=False, default=True)
    created_at             = Column(DateTime(timezone=True), server_default=func.now())
    updated_at             = Column(DateTime(timezone=True), onupdate=func.now())
    password_reset_token   = Column(String(64), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role IN (1, 2, 3)", name="ck_users_role"),
    )


class UserBranch(Base):
    __tablename__ = "user_branches"

    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    branch_id  = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), primary_key=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ──────────────────────────────────────────────────────────────────────
# MASTER LOOKUP TABLES (normalised, Excel-grounded)
# ──────────────────────────────────────────────────────────────────────

class MasterBank(Base):
    """Banks used in settlement Block F: ICICI | SBI | HDFC | Paytm."""
    __tablename__ = "master_banks"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(20), nullable=False, unique=True)
    name       = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)


class MasterChannel(Base):
    """Settlement channels Block F: Gpay | Paytm | Swiping Machine | Fleet Card | Phone Pay."""
    __tablename__ = "master_channels"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(30), nullable=False, unique=True)
    name       = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)


class MasterPaymentMode(Base):
    """Payment modes for credit collections Block E: Cash|Card|FC|Paytm|Cheque|Bank Transfer|Gpay."""
    __tablename__ = "master_payment_modes"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(30), nullable=False, unique=True)
    name       = Column(String(100), nullable=False)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)


# ──────────────────────────────────────────────────────────────────────
# MASTERS — Rate block (§A) + Meter block (§B)
# ──────────────────────────────────────────────────────────────────────

class Product(Base):
    """Products with fuel details, rates, and tank capacities."""
    __tablename__ = "products"

    id                      = Column(String(20), primary_key=True)
    code                    = Column(String(20), nullable=False)      # HSD | MS | MS2
    name                    = Column(String(100), nullable=False)     # 'HSD(Diesel)' etc.
    category                = Column(String(20), nullable=False, default="FUEL")
    current_rate            = Column(Numeric(10, 2), nullable=False)
    active                  = Column(Boolean, nullable=False, default=True)
    color                   = Column(String(20), default="#3B82F6")
    unit                    = Column(String(20), default="Litre")
    hsn_code                = Column(String(20), default="2710")
    gst_rate                = Column(Numeric(5, 2), default=0)
    tank_capacity           = Column(Numeric(12, 2), default=20000)
    density_standard_at_15c = Column(Numeric(8, 2), default=750)
    density_min             = Column(Numeric(8, 2), default=720)
    density_max             = Column(Numeric(8, 2), default=775)
    short_name              = Column(String(50))
    branch_id               = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("branch_id", "code", name="uq_branch_product_code"),
    )


class FuelRateHistory(Base):
    """Audit trail for rate changes — one row per product per effective date."""
    __tablename__ = "fuel_rate_history"

    id             = Column(String(40), primary_key=True)
    product_id     = Column(String(20), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    effective_date = Column(Date, nullable=False)
    rate           = Column(Numeric(10, 2), nullable=False)
    remarks        = Column(Text, nullable=True)
    branch_id      = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("product_id", "effective_date", "branch_id", name="uq_rate_hist"),
    )


class Pump(Base):
    """Dispenser pump with physical attributes."""
    __tablename__ = "pumps"

    id                = Column(String(20), primary_key=True)
    pump_no           = Column(Integer, nullable=False)
    name              = Column(String(100), nullable=False)
    model             = Column(String(100), default="Midco MPD Duo Plus")
    serial_number     = Column(String(100), default="SN-001")
    make_model        = Column(String(100), default="Midco")
    installation_date = Column(String(30), default="2023-01-15")
    tank_id           = Column(String(50), default="Tank 1")
    side              = Column(String(50), default="Dual Side")
    status            = Column(String(30), default="ACTIVE")
    branch_id         = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    nozzles = relationship("Nozzle", back_populates="pump", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("pump_no", "branch_id", name="uq_branch_pump_no"),
    )


class Nozzle(Base):
    """Nozzles per pump."""
    __tablename__ = "nozzles"

    id                    = Column(String(20), primary_key=True)
    pump_id               = Column(String(20), ForeignKey("pumps.id", ondelete="CASCADE"), nullable=False)
    nozzle_no             = Column(Integer, nullable=False)   # 1 | 2
    product_id            = Column(String(20), ForeignKey("products.id"), nullable=False)
    current_meter_reading = Column(Numeric(14, 2), nullable=False, default=0)
    color                 = Column(String(20), default="#3B82F6")
    fuel_code             = Column(String(20), default="UNK")
    status                = Column(String(30), default="ACTIVE")
    branch_id             = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    pump    = relationship("Pump", back_populates="nozzles")
    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("pump_id", "product_id", "nozzle_no", name="uq_pump_product_nozzle"),
    )


class Operator(Base):
    """Bunk operator and staff master."""
    __tablename__ = "operators"

    id                = Column(String(20), primary_key=True)
    name              = Column(String(100), nullable=False)
    phone             = Column(String(30))
    active            = Column(Boolean, nullable=False, default=True)
    employee_code     = Column(String(50))
    aadhaar_no        = Column(String(30))
    monthly_salary    = Column(Numeric(10, 2), default=18000)
    joining_date      = Column(String(30), default="2023-06-01")
    emergency_contact = Column(String(30))
    assigned_shift    = Column(String(50), default="Morning")
    status            = Column(String(30), default="ACTIVE")
    branch_id         = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)


class Customer(Base):
    """Credit customer and party master."""
    __tablename__ = "customers"

    id                   = Column(String(20), primary_key=True)
    name                 = Column(String(150), nullable=False)
    phone                = Column(String(30))
    outstanding_balance  = Column(Numeric(14, 2), nullable=False, default=0)
    code                 = Column(String(50))
    contact_person       = Column(String(100))
    email                = Column(String(120))
    gstin                = Column(String(20))
    pan_number           = Column(String(20))
    credit_limit         = Column(Numeric(14, 2), default=500000)
    opening_balance      = Column(Numeric(14, 2), default=0)
    credit_period_days   = Column(Integer, default=15)
    discount_per_litre   = Column(Numeric(6, 2), default=0)
    max_vehicles_allowed = Column(Integer, default=10)
    vehicle_numbers      = Column(Text)
    address              = Column(Text)
    billing_address      = Column(Text)
    status               = Column(String(30), default="ACTIVE")
    branch_id            = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at           = Column(DateTime(timezone=True), server_default=func.now())


class ExpenseType(Base):
    """Expense head master."""
    __tablename__ = "expense_types"

    id        = Column(String(20), primary_key=True)
    name      = Column(String(100), nullable=False)
    category  = Column(String(50), default="OPERATIONAL")
    active    = Column(Boolean, default=True)
    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=True)


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Meter block (§B)
# ──────────────────────────────────────────────────────────────────────

class DailyNozzleMeter(Base):
    """One row per nozzle per day: opening → closing → litres_sold (computed)."""
    __tablename__ = "daily_nozzle_meters"

    id            = Column(String(40), primary_key=True)
    reading_date  = Column(Date, nullable=False)
    pump_id       = Column(String(20), ForeignKey("pumps.id", ondelete="CASCADE"), nullable=False)
    nozzle_id     = Column(String(20), ForeignKey("nozzles.id", ondelete="CASCADE"), nullable=False)
    product_id    = Column(String(20), ForeignKey("products.id"), nullable=False)
    opening_meter = Column(Numeric(14, 2), nullable=False)
    closing_meter = Column(Numeric(14, 2), nullable=False)
    # litres_sold and gross_amount are computed in application logic (GENERATED not supported cross-DB in SQLAlchemy easily)
    litres_sold   = Column(Numeric(14, 2), nullable=False, default=0)
    selling_rate  = Column(Numeric(10, 2), nullable=False)
    gross_amount  = Column(Numeric(14, 2), nullable=False, default=0)
    branch_id     = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    pump    = relationship("Pump")
    nozzle  = relationship("Nozzle")
    product = relationship("Product")

    __table_args__ = (
        UniqueConstraint("reading_date", "nozzle_id", name="uq_dnm_date_nozzle"),
    )


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Credit block (§C) and Collections block (§E)
# ──────────────────────────────────────────────────────────────────────

class CreditTransaction(Base):
    """Credit sale per pump per customer — Block C.
    Each row is linked to an operator session (attribution_id) so the tally can
    break down credit sales by shift, pump, and operator.
    """
    __tablename__ = "credit_transactions"

    id             = Column(String(20), primary_key=True)
    date           = Column(Date, nullable=False)
    pump_id        = Column(String(20), ForeignKey("pumps.id"), nullable=False)
    customer_id    = Column(String(20), ForeignKey("customers.id"), nullable=False)
    product_id     = Column(String(20), ForeignKey("products.id"), nullable=False)
    litres         = Column(Numeric(12, 2), nullable=False)
    rate           = Column(Numeric(10, 2), nullable=False)
    amount         = Column(Numeric(14, 2), nullable=False)   # litres * rate
    remarks        = Column(Text)
    # Session linkage — links this credit sale to the operator session it belongs to
    attribution_id = Column(String(20), ForeignKey("pump_day_attribution.id"), nullable=True)
    shift_type     = Column(String(30), nullable=True)   # MORNING | EVENING | NIGHT
    vehicle_number = Column(String(50), nullable=True)
    branch_id      = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    customer    = relationship("Customer")
    product     = relationship("Product")
    pump        = relationship("Pump")
    attribution = relationship("PumpDayAttribution", foreign_keys=[attribution_id])



class CreditPayment(Base):
    """Cash/card/UPI collection from a credit customer — Block E."""
    __tablename__ = "credit_payments"

    id           = Column(String(20), primary_key=True)
    date         = Column(Date, nullable=False)
    customer_id  = Column(String(20), ForeignKey("customers.id"), nullable=False)
    amount       = Column(Numeric(14, 2), nullable=False)
    payment_mode = Column(String(30), nullable=False)  # Cash|Card|FC|Paytm|Cheque|Bank Transfer|Gpay
    branch_id    = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer")

    __table_args__ = (
        CheckConstraint(
            "payment_mode IN ('Cash','Card','FC','Paytm','Cheque','Bank Transfer','Gpay')",
            name="ck_credit_payments_mode",
        ),
    )


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Settlement block (§F)
# ──────────────────────────────────────────────────────────────────────

class Settlement(Base):
    """Bank × Channel settlement entry — Block F."""
    __tablename__ = "settlements"

    id              = Column(String(20), primary_key=True)
    settlement_date = Column(Date, nullable=False)
    bank_code       = Column(String(20), ForeignKey("master_banks.code"), nullable=False)
    channel_code    = Column(String(30), ForeignKey("master_channels.code"), nullable=False)
    amount          = Column(Numeric(14, 2), nullable=False)
    branch_id       = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    bank    = relationship("MasterBank")
    channel = relationship("MasterChannel")

    __table_args__ = (
        UniqueConstraint("settlement_date", "bank_code", "channel_code", "branch_id",
                         name="uq_settlement_date_bank_channel"),
    )


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Expenses (§ Daily_Expenses file + §I sub-list)
# ──────────────────────────────────────────────────────────────────────

class Expense(Base):
    """One expense line: date | head | amount | remarks — from §1.2."""
    __tablename__ = "expenses"

    id                = Column(String(20), primary_key=True)
    date              = Column(Date, nullable=False)
    expense_type_id   = Column(String(20), ForeignKey("expense_types.id"), nullable=False)
    expense_type_name = Column(String(100), nullable=False)   # denormalised snapshot
    amount            = Column(Numeric(14, 2), nullable=False)
    remarks           = Column(Text)
    branch_id         = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    expense_type = relationship("ExpenseType")


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Pump-day attribution (§H)
# ──────────────────────────────────────────────────────────────────────

class PumpDayAttribution(Base):
    """
    One row per operator session per pump per day — the center of the tally system.
    Multiple sessions can exist for the same pump on the same day (morning + evening).
    All higher-level totals (shift, pump, daily) are live aggregations of these rows.
    """
    __tablename__ = "pump_day_attribution"

    id               = Column(String(20), primary_key=True)
    attribution_date = Column(Date, nullable=False)
    pump_id          = Column(String(20), ForeignKey("pumps.id"), nullable=False)
    pump_no          = Column(Integer, nullable=False)
    operator_id      = Column(String(20), ForeignKey("operators.id"), nullable=False)
    operator_name    = Column(String(100), nullable=False)
    shift_type       = Column(String(30), nullable=True)   # MORNING | EVENING | NIGHT
    time_in          = Column(Time, nullable=True)
    time_out         = Column(Time, nullable=True)

    # ── Type A: Manually entered payment breakdown ────────────────────
    cash_collected       = Column(Numeric(14, 2), nullable=False, default=0)
    card_collected       = Column(Numeric(14, 2), nullable=False, default=0)  # Swiping Machine
    gpay_collected       = Column(Numeric(14, 2), nullable=False, default=0)  # GPay
    phone_pay_collected  = Column(Numeric(14, 2), nullable=False, default=0)  # PhonePe
    paytm_collected      = Column(Numeric(14, 2), nullable=False, default=0)  # Paytm
    fleet_card_collected = Column(Numeric(14, 2), nullable=False, default=0)  # Fleet Card
    advance_amount       = Column(Numeric(14, 2), nullable=False, default=0)  # Advance given this session
    actual_cash_handover = Column(Numeric(14, 2), nullable=True)              # Physically counted & entered

    # ── Type B: Auto-fetched from other modules ───────────────────────
    credit_sales         = Column(Numeric(14, 2), nullable=False, default=0)  # From credit_transactions
    meter_sales_amount   = Column(Numeric(14, 2), nullable=True)              # From daily_nozzle_meters

    # ── Type C: Auto-calculated (stored for reporting performance) ────
    upi_gpay_collected     = Column(Numeric(14, 2), nullable=False, default=0)  # gpay + phonepe + paytm
    total_amount           = Column(Numeric(14, 2), nullable=False, default=0)  # All payment modes sum
    expected_cash_handover = Column(Numeric(14, 2), nullable=True)              # cash_collected - advance_amount
    cash_variance          = Column(Numeric(14, 2), nullable=True)              # actual - expected
    meter_variance         = Column(Numeric(14, 2), nullable=True)              # total_amount - meter_sales

    # ── Legacy fields kept for backward compatibility ─────────────────
    advance_payment      = Column(Numeric(14, 2), nullable=False, default=0)  # Alias for advance_amount
    credit_acc           = Column(Numeric(14, 2), nullable=False, default=0)  # Deprecated — use credit_sales
    net_payment          = Column(Numeric(14, 2), nullable=False, default=0)  # Deprecated

    status     = Column(String(30), nullable=False, default="DRAFT")  # DRAFT | SUBMITTED | RECONCILED
    notes      = Column(Text, nullable=True)
    branch_id  = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    pump     = relationship("Pump")
    operator = relationship("Operator")


# ──────────────────────────────────────────────────────────────────────
# TRANSACTIONS — Cash reconciliation (§I)
# ──────────────────────────────────────────────────────────────────────

class DailyCashReconciliation(Base):
    """Block I: Daily cash reconciliation matching the Excel blueprint."""
    __tablename__ = "daily_cash_reconciliation"

    id                      = Column(String(20), primary_key=True)
    recon_date              = Column(Date, nullable=False)
    opening_balance         = Column(Numeric(14, 2), nullable=False, default=0)
    morning_collection      = Column(Numeric(14, 2), nullable=False, default=0)
    oil_dw                  = Column(Numeric(14, 2), nullable=False, default=0)
    total_cash              = Column(Numeric(14, 2), nullable=False, default=0)
    cash_for_card_swipe     = Column(Numeric(14, 2), nullable=False, default=0)
    cash_deposit_in_bank    = Column(Numeric(14, 2), nullable=False, default=0)
    bunk_expenses           = Column(Numeric(14, 2), nullable=False, default=0)
    bata                    = Column(Numeric(14, 2), nullable=False, default=0)
    system_total_in_sheet   = Column(Numeric(14, 2), nullable=False, default=0)   # "In Excel Sheet"
    physically_counted_note = Column(Numeric(14, 2), nullable=False, default=0)   # "In Note"
    net_cash_for_the_day    = Column(Numeric(14, 2), nullable=False, default=0)
    branch_id               = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("recon_date", "branch_id", name="uq_dcr_date_branch"),
    )


class BankDeposit(Base):
    """Simple bank deposit: date + amount (Block I cash_deposit_in_bank detail)."""
    __tablename__ = "bank_deposits"

    id           = Column(String(20), primary_key=True)
    deposit_date = Column(Date, nullable=False)
    amount       = Column(Numeric(14, 2), nullable=False)
    branch_id    = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(60), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=True)
    first_name = Column(String(80), nullable=True)
    last_name = Column(String(80), nullable=True)
    dob = Column(Date, nullable=True)  # Date of birth
    employment_status = Column(Integer, nullable=False, default=1)
    # 0 = Unemployed, 1 = Employed

    hashed_password = Column(String(255), nullable=False)
    role = Column(Integer, nullable=False, default=2)  # 1 = Owner, 2 = Manager
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    # ── Forgot-password reset flow ─────────────────────────────────────
    password_reset_token = Column(String(64), nullable=True, index=True)
    password_reset_expires = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        CheckConstraint("role IN (1, 2)", name="ck_users_role"),
        CheckConstraint("employment_status IN (0, 1)", name="ck_users_employment_status"),
    )


class Product(Base):
    __tablename__ = "products"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    code = Column(String(20), nullable=False)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)
    unit = Column(String(20), nullable=False)
    color = Column(String(10), nullable=False)
    current_rate = Column(Numeric(10, 2), nullable=False)
    density_min = Column(Numeric(6, 2))
    density_max = Column(Numeric(6, 2))
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("category IN ('FUEL','LUBRICANT')", name="ck_products_category"),
        UniqueConstraint("branch_id", "code", name="uq_branch_product_code"),
    )


class Tank(Base):
    __tablename__ = "tanks"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    product_id = Column(String(20), ForeignKey("products.id"), nullable=False)
    capacity_litres = Column(Numeric(12, 2), nullable=False)
    current_stock_litres = Column(Numeric(12, 2), nullable=False, default=0)
    diameter_cm = Column(Numeric(8, 2))
    status = Column(String(20), nullable=False, default="NORMAL")

    product = relationship("Product")


class Pump(Base):
    __tablename__ = "pumps"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    pump_no = Column(Integer, nullable=False)
    name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="ACTIVE")

    nozzles = relationship("Nozzle", back_populates="pump")


class Nozzle(Base):
    __tablename__ = "nozzles"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    pump_id = Column(String(20), ForeignKey("pumps.id", ondelete="CASCADE"), nullable=False)
    nozzle_no = Column(Integer, nullable=False)
    product_id = Column(String(20), ForeignKey("products.id"), nullable=False)
    current_meter_reading = Column(Numeric(14, 2), nullable=False, default=0)

    pump = relationship("Pump", back_populates="nozzles")
    product = relationship("Product")

    __table_args__ = (UniqueConstraint("branch_id", "pump_id", "nozzle_no", name="uq_branch_pump_nozzle"),)


class Operator(Base):
    __tablename__ = "operators"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30))
    daily_bata = Column(Numeric(10, 2), nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)


class Customer(Base):
    __tablename__ = "customers"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    code = Column(String(20), nullable=False)
    name = Column(String(150), nullable=False)
    contact_person = Column(String(150))
    phone = Column(String(30))
    vehicle_numbers = Column(ARRAY(String), nullable=False, default=list)
    credit_limit = Column(Numeric(14, 2), nullable=False, default=500000)
    outstanding_balance = Column(Numeric(14, 2), nullable=False, default=0)
    opening_balance = Column(Numeric(14, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="ACTIVE")
    address = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("branch_id", "code", name="uq_branch_customer_code"),
    )


class ExpenseType(Base):
    __tablename__ = "expense_types"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(30), nullable=False)


class Shift(Base):
    __tablename__ = "shifts"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    shift_no = Column(String(40), nullable=False)
    shift_date = Column(Date, nullable=False)
    shift_type = Column(String(30), nullable=False, default="Full Day")
    pump_id = Column(String(20), ForeignKey("pumps.id"), nullable=False)
    pump_no = Column(Integer, nullable=False)
    operator_id = Column(String(20), ForeignKey("operators.id"), nullable=False)
    operator_name = Column(String(100), nullable=False)
    opened_at = Column(DateTime(timezone=True), nullable=False)
    closed_at = Column(DateTime(timezone=True))
    status = Column(String(20), nullable=False, default="IN_PROGRESS")
    total_litres_sold = Column(Numeric(14, 2), nullable=False, default=0)
    total_sales_amount = Column(Numeric(14, 2), nullable=False, default=0)
    expenses_deducted = Column(Numeric(14, 2), nullable=False, default=0)
    cash_collected = Column(Numeric(14, 2), nullable=False, default=0)
    upi_gpay_collected = Column(Numeric(14, 2), nullable=False, default=0)
    card_collected = Column(Numeric(14, 2), nullable=False, default=0)
    fleet_card_collected = Column(Numeric(14, 2), nullable=False, default=0)
    credit_sales = Column(Numeric(14, 2), nullable=False, default=0)
    cheque_collected = Column(Numeric(14, 2), nullable=False, default=0)
    total_collected = Column(Numeric(14, 2), nullable=False, default=0)
    shortage_or_excess = Column(Numeric(14, 2), nullable=False, default=0)
    notes = Column(Text)

    __table_args__ = (
        CheckConstraint("status IN ('IN_PROGRESS','CLOSED')", name="ck_shifts_status"),
    )

    meter_readings = relationship(
        "MeterReading", back_populates="shift", cascade="all, delete-orphan"
    )


class MeterReading(Base):
    __tablename__ = "meter_readings"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(Integer, primary_key=True, autoincrement=True)
    shift_id = Column(String(20), ForeignKey("shifts.id", ondelete="CASCADE"), nullable=False)
    nozzle_id = Column(String(20), ForeignKey("nozzles.id"), nullable=False)
    nozzle_no = Column(Integer, nullable=False)
    product_name = Column(String(100), nullable=False)
    fuel_code = Column(String(20), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)
    opening_reading = Column(Numeric(14, 2), nullable=False)
    closing_reading = Column(Numeric(14, 2), nullable=False)
    testing_litres = Column(Numeric(10, 2), nullable=False, default=0)
    litres_sold = Column(Numeric(14, 2), nullable=False, default=0)
    gross_amount = Column(Numeric(14, 2), nullable=False, default=0)

    shift = relationship("Shift", back_populates="meter_readings")


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    slip_no = Column(String(40), nullable=False)
    customer_id = Column(String(20), ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    time = Column(String(20))
    pump_id = Column(String(20), ForeignKey("pumps.id"))
    pump_no = Column(Integer)
    product_id = Column(String(20), ForeignKey("products.id"), nullable=False)
    vehicle_no = Column(String(30), default="")
    driver_name = Column(String(100))
    litres = Column(Numeric(12, 2), nullable=False)
    rate = Column(Numeric(10, 2), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class CreditPayment(Base):
    __tablename__ = "credit_payments"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    receipt_no = Column(String(40), nullable=False)
    customer_id = Column(String(20), ForeignKey("customers.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    payment_mode = Column(String(30), nullable=False)
    reference_no = Column(String(60))
    notes = Column(Text)
    received_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "payment_mode IN ('Cash','Cheque','Bank Transfer','NEFT','UPI')",
            name="ck_credit_payments_mode",
        ),
    )


class Expense(Base):
    __tablename__ = "expenses"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    voucher_no = Column(String(40), nullable=False)
    date = Column(Date, nullable=False)
    expense_type_id = Column(String(20), ForeignKey("expense_types.id"), nullable=False)
    expense_type_name = Column(String(100), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    paid_to = Column(String(150))
    paid_by = Column(String(100))
    pump_id = Column(String(20), ForeignKey("pumps.id"))
    is_credit_note = Column(Boolean, nullable=False, default=False)
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BankDeposit(Base):
    __tablename__ = "bank_deposits"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    deposit_date = Column(Date, nullable=False)
    bank_name = Column(String(150), nullable=False)
    account_no = Column(String(60), nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    note_2000 = Column(Integer, nullable=False, default=0)
    note_500 = Column(Integer, nullable=False, default=0)
    note_200 = Column(Integer, nullable=False, default=0)
    note_100 = Column(Integer, nullable=False, default=0)
    note_50 = Column(Integer, nullable=False, default=0)
    note_20 = Column(Integer, nullable=False, default=0)
    note_10 = Column(Integer, nullable=False, default=0)
    coins = Column(Numeric(10, 2), nullable=False, default=0)
    deposited_by = Column(String(100))
    reference_no = Column(String(60))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TankDip(Base):
    __tablename__ = "tank_dips"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(20), primary_key=True)
    tank_id = Column(String(20), ForeignKey("tanks.id"), nullable=False)
    tank_name = Column(String(100), nullable=False)
    product_name = Column(String(100), nullable=False)
    dip_date = Column(Date, nullable=False)
    dip_type = Column(String(60), nullable=False)  # from master_dip_types.code
    fuel_dip_cm = Column(Numeric(8, 2), nullable=False)
    fuel_dip_litres = Column(Numeric(12, 2), nullable=False)
    water_dip_cm = Column(Numeric(8, 2), nullable=False, default=0)
    observed_density = Column(Numeric(8, 4), nullable=False, default=0)
    observed_temp = Column(Numeric(6, 2), nullable=False, default=0)
    converted_density = Column(Numeric(8, 4), nullable=False, default=0)
    book_stock_litres = Column(Numeric(12, 2), nullable=False, default=0)
    variance = Column(Numeric(12, 2), nullable=False, default=0)
    tested_by = Column(String(100), nullable=False)
    remarks = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tank = relationship("Tank")


class Branch(Base):
    __tablename__ = "branches"

    id = Column(String(20), primary_key=True)
    name = Column(String(150), nullable=False)
    location = Column(String(255), nullable=True)
    dealer_code = Column(String(50), nullable=True)
    omc_brand = Column(String(30), nullable=False, default="BPCL")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserBranch(Base):
    __tablename__ = "user_branches"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), primary_key=True)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class DailyNozzleMeter(Base):
    __tablename__ = "daily_nozzle_meters"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(40), primary_key=True)
    reading_date = Column(Date, nullable=False)
    pump_id = Column(String(20), ForeignKey("pumps.id", ondelete="CASCADE"), nullable=False)
    nozzle_id = Column(String(20), ForeignKey("nozzles.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(20), ForeignKey("products.id"), nullable=False)
    opening_meter = Column(Numeric(14, 2), nullable=False, default=0)
    closing_meter = Column(Numeric(14, 2), nullable=False, default=0)
    testing_litres = Column(Numeric(10, 2), nullable=False, default=0)
    litres_sold = Column(Numeric(14, 2), nullable=False, default=0)
    selling_rate = Column(Numeric(10, 2), nullable=False, default=0)
    gross_amount = Column(Numeric(14, 2), nullable=False, default=0)
    recorded_by = Column(String(100), default="Manager")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    pump = relationship("Pump")
    nozzle = relationship("Nozzle")
    product = relationship("Product")

    __table_args__ = (UniqueConstraint("branch_id", "reading_date", "nozzle_id", name="uq_branch_reading_nozzle"),)


class SmsRateLog(Base):
    __tablename__ = "sms_rate_logs"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(40), primary_key=True)
    sender = Column(String(60), nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    raw_text = Column(Text, nullable=False)
    omc = Column(String(30), nullable=False)  # BPCL (locked)
    effective_datetime = Column(String(60), nullable=True)
    parsed_rates = Column(JSON, nullable=False)  # list of dicts: [{"fuelKey": "MS", "rate": 102.86}, ...]
    status = Column(String(20), nullable=False, default="PENDING_REVIEW")  # PENDING_REVIEW, APPLIED, FAILED
    applied_at = Column(DateTime(timezone=True), nullable=True)
    applied_by = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BankAccount(Base):
    __tablename__ = "bank_accounts"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(30), primary_key=True)
    bank_name = Column(String(150), nullable=False)
    account_number = Column(String(60), nullable=False)
    account_type = Column(String(30), nullable=False, default="Current")  # from master_bank_account_types.code
    branch_name = Column(String(100), nullable=True)
    ifsc_code = Column(String(30), nullable=True)
    opening_balance = Column(Numeric(14, 2), nullable=False, default=0)
    current_balance = Column(Numeric(14, 2), nullable=False, default=0)
    is_primary = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PosSettlement(Base):
    __tablename__ = "pos_settlements"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(40), primary_key=True)
    settlement_date = Column(Date, nullable=False)
    channel_type = Column(String(30), nullable=False)  # UPI, POS_CARD, FLEET_CARD, NEFT
    terminal_id = Column(String(50), nullable=True)
    batch_no = Column(String(50), nullable=True)
    gross_amount = Column(Numeric(14, 2), nullable=False, default=0)
    mdr_fee = Column(Numeric(10, 2), nullable=False, default=0)
    net_settled_amount = Column(Numeric(14, 2), nullable=False, default=0)
    bank_account_id = Column(String(30), ForeignKey("bank_accounts.id"), nullable=True)
    status = Column(String(20), nullable=False, default="SETTLED")  # SETTLED, PENDING
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    bank_account = relationship("BankAccount")


class CashSafeLedger(Base):
    __tablename__ = "cash_safe_ledger"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(40), primary_key=True)
    ledger_date = Column(Date, nullable=False)
    opening_safe_cash = Column(Numeric(14, 2), nullable=False, default=0)
    shift_cash_inflow = Column(Numeric(14, 2), nullable=False, default=0)
    credit_cash_recovered = Column(Numeric(14, 2), nullable=False, default=0)
    petty_cash_expenses = Column(Numeric(14, 2), nullable=False, default=0)
    bank_deposits_dropped = Column(Numeric(14, 2), nullable=False, default=0)
    expected_safe_cash = Column(Numeric(14, 2), nullable=False, default=0)
    physical_counted_cash = Column(Numeric(14, 2), nullable=False, default=0)
    cash_variance = Column(Numeric(14, 2), nullable=False, default=0)
    denominations = Column(JSON, nullable=False)  # {"note500": 300, ...}
    audited_by = Column(String(100), nullable=False, default="Manager")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FuelRateHistory(Base):
    """
    Audit trail for every fuel rate change — manual or SMS-sourced.
    Written whenever /api/products/batch-rates is called or an SMS rate is applied.
    """
    __tablename__ = "fuel_rate_history"

    branch_id = Column(String(20), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)

    id = Column(String(40), primary_key=True)
    product_id = Column(String(20), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    product_code = Column(String(20), nullable=False)          # e.g. MS, HSD, XP95
    product_name = Column(String(100), nullable=False)
    effective_date = Column(Date, nullable=False)               # Date the rate is valid from
    old_rate = Column(Numeric(10, 2), nullable=False, default=0)
    new_rate = Column(Numeric(10, 2), nullable=False)
    change_source = Column(String(30), nullable=False, default="MANUAL_ENTRY")
    # MANUAL_ENTRY | SMS_AUTO | SMS_MANUAL_APPLY | BATCH_IMPORT
    changed_by = Column(String(100), nullable=False, default="Manager")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product")

    __table_args__ = (
        CheckConstraint(
            "change_source IN ('MANUAL_ENTRY','SMS_AUTO','SMS_MANUAL_APPLY','BATCH_IMPORT')",
            name="ck_fuel_rate_history_source",
        ),
    )


# ======================================================================
# MASTER / LOOKUP TABLES  (10 tables)
# Each stores enum-style reference values that drive every dropdown in
# the frontend.  Uniform shape: id SERIAL PK | code UNIQUE | label | sort_order | is_active
# ======================================================================

class MasterShiftType(Base):
    """Shift types — Morning, Evening, Night, Full Day."""
    __tablename__ = "master_shift_types"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(40),  nullable=False, unique=True)
    label      = Column(String(100), nullable=False)
    subtitle   = Column(String(150), nullable=True)   # e.g. "06:00 AM – 02:00 PM"
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterPaymentMode(Base):
    """Payment modes — Cash, Cheque, UPI, NEFT, Bank Transfer, Fleet Card, POS Card."""
    __tablename__ = "master_payment_modes"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(40),  nullable=False, unique=True)
    label      = Column(String(100), nullable=False)
    icon       = Column(String(50),  nullable=True)
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterProductCategory(Base):
    """Product categories — FUEL, LUBRICANT."""
    __tablename__ = "master_product_categories"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(40),  nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    color       = Column(String(10),  nullable=True, default="#6366F1")
    sort_order  = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class MasterExpenseCategory(Base):
    """Expense categories — OPERATIONAL, STAFF, FINANCIAL, MAINTENANCE, MISCELLANEOUS."""
    __tablename__ = "master_expense_categories"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(40),  nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    color       = Column(String(10),  nullable=True, default="#6366F1")
    sort_order  = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class MasterPumpStatus(Base):
    """Pump statuses — ACTIVE, IDLE, MAINTENANCE, INACTIVE."""
    __tablename__ = "master_pump_statuses"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(40),  nullable=False, unique=True)
    label      = Column(String(100), nullable=False)
    color      = Column(String(10),  nullable=True, default="#6366F1")
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterCustomerStatus(Base):
    """Customer account statuses — ACTIVE, HOLD, BLOCKED, INACTIVE."""
    __tablename__ = "master_customer_statuses"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(40),  nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    color       = Column(String(10),  nullable=True, default="#6366F1")
    sort_order  = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class MasterOmcBrand(Base):
    """OMC brands — only BPCL (Bharat Petroleum). System is locked to BPCL."""
    __tablename__ = "master_omc_brands"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    code       = Column(String(30),  nullable=False, unique=True)
    label      = Column(String(100), nullable=False)
    sms_number = Column(String(20),  nullable=True)   # Rate SMS sender number
    color      = Column(String(10),  nullable=True, default="#FFD700")
    sort_order = Column(Integer, nullable=False, default=0)
    is_active  = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MasterBankAccountType(Base):
    """Bank account types — Current, Savings, CC/OD, FCNR."""
    __tablename__ = "master_bank_account_types"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(40),  nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    sort_order  = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class MasterDipType(Base):
    """Tank dip reading types — Morning, Evening, After Decantation, Mid-Day, Pre-Decantation."""
    __tablename__ = "master_dip_types"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    code        = Column(String(60),  nullable=False, unique=True)
    label       = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    sort_order  = Column(Integer, nullable=False, default=0)
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

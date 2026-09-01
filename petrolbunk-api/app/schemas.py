"""
Pydantic schemas — FuelPulse v2 (strict Excel scope).
"""

from datetime import date as dt_date, datetime as dt_datetime, time as dt_time
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ──────────────────────────────────────────────────────────────────────
# AUTH / USERS
# ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: int = Field(default=2, ge=1, le=3)


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class ForgotPasswordRequest(BaseModel):
    username: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: int
    is_active: bool
    created_at: Optional[dt_datetime] = None
    updated_at: Optional[dt_datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ──────────────────────────────────────────────────────────────────────
# BRANCHES
# ──────────────────────────────────────────────────────────────────────

class BranchCreate(BaseModel):
    name: str
    location: Optional[str] = None
    dealer_code: Optional[str] = None
    omc_brand: str = "BPCL"
    is_active: bool = True
    bunk_name: Optional[str] = None
    city: Optional[str] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None
    manager_access: Optional[str] = "ALL"
    auto_fetch_enabled: Optional[bool] = False
    auto_apply_enabled: Optional[bool] = False
    gstin: Optional[str] = None
    operating_hours: Optional[str] = "24 Hours"


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    dealer_code: Optional[str] = None
    omc_brand: Optional[str] = None
    is_active: Optional[bool] = None
    bunk_name: Optional[str] = None
    city: Optional[str] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None
    manager_access: Optional[str] = None
    auto_fetch_enabled: Optional[bool] = None
    auto_apply_enabled: Optional[bool] = None
    gstin: Optional[str] = None
    operating_hours: Optional[str] = None


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    location: Optional[str] = None
    dealer_code: Optional[str] = None
    omc_brand: str
    is_active: bool
    bunk_name: Optional[str] = None
    city: Optional[str] = None
    manager_name: Optional[str] = None
    manager_phone: Optional[str] = None
    manager_email: Optional[str] = None
    manager_access: Optional[str] = "ALL"
    auto_fetch_enabled: Optional[bool] = False
    auto_apply_enabled: Optional[bool] = False
    gstin: Optional[str] = None
    operating_hours: Optional[str] = "24 Hours"
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# MASTER LOOKUPS
# ──────────────────────────────────────────────────────────────────────

class MasterBankOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    sort_order: int
    is_active: bool


class MasterChannelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    sort_order: int
    is_active: bool


class MasterPaymentModeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    name: str
    sort_order: int
    is_active: bool


# ──────────────────────────────────────────────────────────────────────
# PRODUCTS
# ──────────────────────────────────────────────────────────────────────

class ProductCreate(BaseModel):
    code: str
    name: str
    current_rate: float
    category: str = "FUEL"
    active: bool = True
    color: Optional[str] = "#3B82F6"
    unit: Optional[str] = "Litre"
    hsn_code: Optional[str] = "2710"
    gst_rate: Optional[float] = 0
    tank_capacity: Optional[float] = 20000
    density_standard_at_15c: Optional[float] = 750
    density_min: Optional[float] = 720
    density_max: Optional[float] = 775
    short_name: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    current_rate: Optional[float] = None
    active: Optional[bool] = None
    color: Optional[str] = None
    unit: Optional[str] = None
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    tank_capacity: Optional[float] = None
    density_standard_at_15c: Optional[float] = None
    density_min: Optional[float] = None
    density_max: Optional[float] = None
    short_name: Optional[str] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    code: str
    name: str
    category: str
    current_rate: float
    active: bool
    color: Optional[str] = "#3B82F6"
    unit: Optional[str] = "Litre"
    hsn_code: Optional[str] = "2710"
    gst_rate: Optional[float] = 0
    tank_capacity: Optional[float] = 20000
    density_standard_at_15c: Optional[float] = 750
    density_min: Optional[float] = 720
    density_max: Optional[float] = 775
    short_name: Optional[str] = None
    created_at: Optional[dt_datetime] = None


class BatchRateItem(BaseModel):
    product_id: str
    current_rate: float


class BatchRateUpdate(BaseModel):
    rates: List[BatchRateItem]
    remarks: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────
# FUEL RATE HISTORY
# ──────────────────────────────────────────────────────────────────────

class FuelRateHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    product_id: str
    effective_date: dt_date
    rate: float
    remarks: Optional[str] = None
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# PUMPS & NOZZLES
# ──────────────────────────────────────────────────────────────────────

class NozzleCreate(BaseModel):
    pump_id: Optional[str] = None
    nozzle_no: int
    product_id: str
    current_meter_reading: float = 0
    color: Optional[str] = "#3B82F6"
    fuel_code: Optional[str] = "UNK"
    status: Optional[str] = "ACTIVE"


class NozzleUpdate(BaseModel):
    nozzle_no: Optional[int] = None
    product_id: Optional[str] = None
    current_meter_reading: Optional[float] = None
    color: Optional[str] = None
    fuel_code: Optional[str] = None
    status: Optional[str] = None


class NozzleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    pump_id: str
    nozzle_no: int
    product_id: str
    current_meter_reading: float
    color: Optional[str] = "#3B82F6"
    fuel_code: Optional[str] = "UNK"
    status: Optional[str] = "ACTIVE"


class PumpCreate(BaseModel):
    pump_no: int
    name: str
    model: Optional[str] = "Midco MPD Duo Plus"
    serial_number: Optional[str] = "SN-001"
    make_model: Optional[str] = "Midco"
    installation_date: Optional[str] = "2023-01-15"
    tank_id: Optional[str] = "Tank 1"
    side: Optional[str] = "Dual Side"
    status: Optional[str] = "ACTIVE"
    nozzles: Optional[List[NozzleCreate]] = []


class PumpUpdate(BaseModel):
    pump_no: Optional[int] = None
    name: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    make_model: Optional[str] = None
    installation_date: Optional[str] = None
    tank_id: Optional[str] = None
    side: Optional[str] = None
    status: Optional[str] = None
    nozzles: Optional[List[NozzleCreate]] = None


class PumpOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    pump_no: int
    name: str
    model: Optional[str] = "Midco MPD Duo Plus"
    serial_number: Optional[str] = "SN-001"
    make_model: Optional[str] = "Midco"
    installation_date: Optional[str] = "2023-01-15"
    tank_id: Optional[str] = "Tank 1"
    side: Optional[str] = "Dual Side"
    status: Optional[str] = "ACTIVE"
    nozzles: List[NozzleOut] = []


# ──────────────────────────────────────────────────────────────────────
# OPERATORS
# ──────────────────────────────────────────────────────────────────────

class OperatorCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    active: bool = True
    employee_code: Optional[str] = None
    aadhaar_no: Optional[str] = None
    monthly_salary: Optional[float] = 18000
    joining_date: Optional[str] = "2023-06-01"
    emergency_contact: Optional[str] = None
    assigned_shift: Optional[str] = "Morning"
    status: Optional[str] = "ACTIVE"


class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
    employee_code: Optional[str] = None
    aadhaar_no: Optional[str] = None
    monthly_salary: Optional[float] = None
    joining_date: Optional[str] = None
    emergency_contact: Optional[str] = None
    assigned_shift: Optional[str] = None
    status: Optional[str] = None


class OperatorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    phone: Optional[str] = None
    active: bool
    employee_code: Optional[str] = None
    aadhaar_no: Optional[str] = None
    monthly_salary: Optional[float] = 18000
    joining_date: Optional[str] = "2023-06-01"
    emergency_contact: Optional[str] = None
    assigned_shift: Optional[str] = "Morning"
    status: Optional[str] = "ACTIVE"


# ──────────────────────────────────────────────────────────────────────
# CUSTOMERS
# ──────────────────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    code: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    credit_limit: Optional[float] = 500000
    opening_balance: Optional[float] = 0
    credit_period_days: Optional[int] = 15
    discount_per_litre: Optional[float] = 0
    max_vehicles_allowed: Optional[int] = 10
    vehicle_numbers: Optional[str] = None
    address: Optional[str] = None
    billing_address: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    code: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    credit_limit: Optional[float] = None
    opening_balance: Optional[float] = None
    credit_period_days: Optional[int] = None
    discount_per_litre: Optional[float] = None
    max_vehicles_allowed: Optional[int] = None
    vehicle_numbers: Optional[str] = None
    address: Optional[str] = None
    billing_address: Optional[str] = None
    status: Optional[str] = None


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    phone: Optional[str] = None
    outstanding_balance: float = 0
    code: Optional[str] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    pan_number: Optional[str] = None
    credit_limit: Optional[float] = 500000
    opening_balance: Optional[float] = 0
    credit_period_days: Optional[int] = 15
    discount_per_litre: Optional[float] = 0
    max_vehicles_allowed: Optional[int] = 10
    vehicle_numbers: Optional[str] = None
    address: Optional[str] = None
    billing_address: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# EXPENSE TYPES
# ──────────────────────────────────────────────────────────────────────

class ExpenseTypeCreate(BaseModel):
    name: str
    category: Optional[str] = "OPERATIONAL"
    active: Optional[bool] = True


class ExpenseTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    active: Optional[bool] = None


class ExpenseTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    category: Optional[str] = "OPERATIONAL"
    active: Optional[bool] = True
    branch_id: Optional[str] = None


# ──────────────────────────────────────────────────────────────────────
# DAILY NOZZLE METERS
# ──────────────────────────────────────────────────────────────────────

class NozzleMeterItem(BaseModel):
    pump_id: str
    nozzle_id: str
    product_id: str
    opening_meter: float
    closing_meter: float
    selling_rate: float


class BatchDailyNozzleMeterCreate(BaseModel):
    reading_date: dt_date
    readings: List[NozzleMeterItem]


class DailyNozzleMeterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    reading_date: dt_date
    pump_id: str
    nozzle_id: str
    product_id: str
    opening_meter: float
    closing_meter: float
    litres_sold: float
    selling_rate: float
    gross_amount: float


# ──────────────────────────────────────────────────────────────────────
# CREDIT TRANSACTIONS
# ──────────────────────────────────────────────────────────────────────

class CreditTransactionCreate(BaseModel):
    date: Optional[dt_date] = None
    pump_id: str
    customer_id: str
    product_id: str
    litres: float
    rate: Optional[float] = None   # defaults to product's current_rate
    remarks: Optional[str] = None
    # Session linkage (optional)
    attribution_id: Optional[str] = None
    shift_type: Optional[str] = None
    vehicle_number: Optional[str] = None


class CreditTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    date: dt_date
    pump_id: str
    customer_id: str
    product_id: str
    litres: float
    rate: float
    amount: float
    remarks: Optional[str] = None
    attribution_id: Optional[str] = None
    shift_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# CREDIT PAYMENTS
# ──────────────────────────────────────────────────────────────────────

CREDIT_PAYMENT_MODES = ['Cash', 'Card', 'FC', 'Paytm', 'Cheque', 'Bank Transfer', 'Gpay']


class CreditPaymentCreate(BaseModel):
    date: Optional[dt_date] = None
    customer_id: str
    amount: float
    payment_mode: str = Field(pattern="^(Cash|Card|FC|Paytm|Cheque|Bank Transfer|Gpay)$")


class CreditPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    date: dt_date
    customer_id: str
    amount: float
    payment_mode: str
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# SETTLEMENTS (Block F)
# ──────────────────────────────────────────────────────────────────────

class SettlementItem(BaseModel):
    bank_code: str    # ICICI | SBI | HDFC | Paytm
    channel_code: str  # Gpay | Paytm | Swiping Machine | Fleet Card | Phone Pay
    amount: float


class BatchSettlementCreate(BaseModel):
    settlement_date: dt_date
    items: List[SettlementItem]


class SettlementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    settlement_date: dt_date
    bank_code: str
    channel_code: str
    amount: float
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# EXPENSES
# ──────────────────────────────────────────────────────────────────────

class ExpenseCreate(BaseModel):
    date: Optional[dt_date] = None
    expense_type_id: str
    amount: float
    remarks: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    date: dt_date
    expense_type_id: str
    expense_type_name: str
    amount: float
    remarks: Optional[str] = None
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# PUMP DAY ATTRIBUTION (Block H)
# ──────────────────────────────────────────────────────────────────────

class PumpDayAttributionCreate(BaseModel):
    attribution_date: dt_date
    pump_id: str
    operator_id: str
    time_in: Optional[str] = None    # "HH:MM" 24h
    time_out: Optional[str] = None   # "HH:MM" 24h
    shift_type: Optional[str] = None          # MORNING | EVENING | NIGHT
    # Type A — manually entered
    cash_collected: float = 0
    card_collected: float = 0        # Swiping Machine
    gpay_collected: float = 0        # GPay
    phone_pay_collected: float = 0   # PhonePe
    paytm_collected: float = 0       # Paytm
    fleet_card_collected: float = 0  # Fleet Card
    advance_amount: float = 0        # Advance given this session
    actual_cash_handover: Optional[float] = None
    # Type B — auto-fetched, but can be overridden
    credit_sales: float = 0
    credit_acc: float = 0            # Legacy
    # Misc
    notes: Optional[str] = None
    # Legacy backward-compat
    upi_gpay_collected: float = 0
    total_amount: float = 0
    net_payment: float = 0


class PumpDayAttributionUpdate(BaseModel):
    time_in: Optional[str] = None
    time_out: Optional[str] = None
    shift_type: Optional[str] = None
    cash_collected: Optional[float] = None
    card_collected: Optional[float] = None
    gpay_collected: Optional[float] = None
    phone_pay_collected: Optional[float] = None
    paytm_collected: Optional[float] = None
    fleet_card_collected: Optional[float] = None
    advance_amount: Optional[float] = None
    actual_cash_handover: Optional[float] = None
    credit_sales: Optional[float] = None
    credit_acc: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    # Legacy
    upi_gpay_collected: Optional[float] = None
    total_amount: Optional[float] = None
    net_payment: Optional[float] = None


class PumpDayAttributionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    attribution_date: dt_date
    pump_id: str
    pump_no: int
    operator_id: str
    operator_name: str
    time_in: Optional[dt_time] = None
    time_out: Optional[dt_time] = None
    shift_type: Optional[str] = None
    # Type A
    cash_collected: float = 0
    card_collected: float = 0
    gpay_collected: float = 0
    phone_pay_collected: float = 0
    paytm_collected: float = 0
    fleet_card_collected: float = 0
    advance_amount: float = 0
    actual_cash_handover: Optional[float] = None
    # Type B
    credit_sales: float = 0
    meter_sales_amount: Optional[float] = None
    # Type C — computed
    upi_gpay_collected: float = 0
    total_amount: float = 0
    expected_cash_handover: Optional[float] = None
    cash_variance: Optional[float] = None
    meter_variance: Optional[float] = None
    # Status
    status: str = 'DRAFT'
    notes: Optional[str] = None
    # Legacy
    credit_acc: float = 0
    advance_payment: float = 0
    net_payment: float = 0
    created_at: Optional[dt_datetime] = None
    updated_at: Optional[dt_datetime] = None




# ──────────────────────────────────────────────────────────────────────
# DAILY CASH RECONCILIATION (Block I)
# ──────────────────────────────────────────────────────────────────────

class DailyCashReconciliationCreate(BaseModel):
    recon_date: dt_date
    opening_balance: float = 0
    morning_collection: float = 0
    oil_dw: float = 0
    total_cash: float = 0
    cash_for_card_swipe: float = 0
    cash_deposit_in_bank: float = 0
    bunk_expenses: float = 0
    bata: float = 0
    system_total_in_sheet: float = 0
    physically_counted_note: float = 0
    net_cash_for_the_day: float = 0


class DailyCashReconciliationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recon_date: dt_date
    opening_balance: float
    morning_collection: float
    oil_dw: float
    total_cash: float
    cash_for_card_swipe: float
    cash_deposit_in_bank: float
    bunk_expenses: float = 0
    bata: float = 0
    system_total_in_sheet: float
    physically_counted_note: float
    difference: float = 0   # computed in serializer: system_total - physically_counted
    net_cash_for_the_day: float
    created_at: Optional[dt_datetime] = None


# ──────────────────────────────────────────────────────────────────────
# BANK DEPOSITS
# ──────────────────────────────────────────────────────────────────────

class BankDepositCreate(BaseModel):
    deposit_date: Optional[dt_date] = None
    amount: float


class BankDepositOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    deposit_date: dt_date
    amount: float


# ──────────────────────────────────────────────────────────────────────
# DASHBOARD SUMMARY
# ──────────────────────────────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_sales_amount: float = 0
    total_litres_sold: float = 0
    total_cash_collected: float = 0
    total_expenses: float = 0
    net_cash_on_hand: float = 0
    total_credit_outstanding: float = 0
    total_bank_deposited: float = 0
    active_customers: int = 0
    total_pumps: int = 0
    total_operators: int = 0


# ──────────────────────────────────────────────────────────────────────
# TALLY — Live aggregation schemas
# ──────────────────────────────────────────────────────────────────────

class TallyTotals(BaseModel):
    """Aggregated payment totals — reused at daily, shift, and pump levels."""
    cash: float = 0
    card: float = 0
    gpay: float = 0
    phonepe: float = 0
    paytm: float = 0
    fleet: float = 0
    credit: float = 0
    grand_total: float = 0
    meter_total: float = 0
    meter_variance: float = 0
    expected_cash: float = 0
    actual_cash: float = 0
    cash_variance: float = 0


class OperatorSessionRow(BaseModel):
    """One row in the detailed operator tally table."""
    session_id: str
    operator_name: str
    pump_no: int
    pump_name: Optional[str] = None
    shift_type: Optional[str] = None
    time_in: Optional[str] = None
    time_out: Optional[str] = None
    cash: float = 0
    card: float = 0
    gpay: float = 0
    phonepe: float = 0
    paytm: float = 0
    fleet: float = 0
    credit: float = 0
    total_sales: float = 0
    meter_sales: Optional[float] = None
    meter_variance: Optional[float] = None
    advance_amount: float = 0
    expected_cash: Optional[float] = None
    actual_cash: Optional[float] = None
    cash_variance: Optional[float] = None
    status: str = 'DRAFT'


class ShiftTally(BaseModel):
    shift_type: str
    sessions: List[OperatorSessionRow]
    subtotals: TallyTotals


class PumpTally(BaseModel):
    pump_id: str
    pump_no: int
    pump_name: str
    sessions: List[OperatorSessionRow]
    subtotals: TallyTotals


class DailyTallyOut(BaseModel):
    business_date: dt_date
    totals: TallyTotals
    by_shift: List[ShiftTally]
    by_pump: List[PumpTally]
    sessions: List[OperatorSessionRow]


class CustomerCreditRow(BaseModel):
    customer_id: str
    customer_name: str
    new_credit: float = 0
    payments: float = 0
    closing_balance: float = 0


class CreditLedgerDayOut(BaseModel):
    business_date: dt_date
    opening_outstanding: float = 0
    new_credit_sales: float = 0
    credit_payments: float = 0
    closing_outstanding: float = 0
    customer_breakdown: List[CustomerCreditRow]


class MeterSectionOut(BaseModel):
    total_sales: float = 0
    variance: float = 0


class CashSectionOut(BaseModel):
    expected: float = 0
    actual: float = 0
    variance: float = 0


class BankSectionOut(BaseModel):
    expected: float = 0
    actual: float = 0
    variance: float = 0


class ExpensesSectionOut(BaseModel):
    total: float = 0


class ReconciliationOut(BaseModel):
    business_date: dt_date
    sales: TallyTotals
    meter: MeterSectionOut
    cash: CashSectionOut
    bank: BankSectionOut
    credit: CreditLedgerDayOut
    expenses: ExpensesSectionOut
    overall_status: str  # RECONCILED | NEEDS_REVIEW | MISMATCH


class SessionHandoverIn(BaseModel):
    actual_cash_handover: float


class CreditDailySummary(BaseModel):
    business_date: dt_date
    new_credit_sales: float = 0
    credit_payments: float = 0
    net_change: float = 0

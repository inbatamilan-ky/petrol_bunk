from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------
# AUTH / USERS
# ---------------------------------------------------------------------
class UserCreate(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: int = Field(default=2, ge=1, le=2)  # 1 = Owner, 2 = Manager


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: int
    is_active: bool
    created_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------
# PRODUCTS
# ---------------------------------------------------------------------
class ProductBase(BaseModel):
    code: str
    name: str
    category: str = Field(pattern="^(FUEL|LUBRICANT)$")
    unit: str
    color: str
    current_rate: float
    density_min: Optional[float] = None
    density_max: Optional[float] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    color: Optional[str] = None
    current_rate: Optional[float] = None
    density_min: Optional[float] = None
    density_max: Optional[float] = None


class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# TANKS
# ---------------------------------------------------------------------
class TankBase(BaseModel):
    name: str
    product_id: str
    capacity_litres: float
    current_stock_litres: float = 0
    diameter_cm: Optional[float] = None
    status: str = "NORMAL"


class TankCreate(TankBase):
    pass


class TankUpdate(BaseModel):
    name: Optional[str] = None
    product_id: Optional[str] = None
    capacity_litres: Optional[float] = None
    current_stock_litres: Optional[float] = None
    diameter_cm: Optional[float] = None
    status: Optional[str] = None


class TankOut(TankBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------------------------------------------------------------------
# PUMPS & NOZZLES
# ---------------------------------------------------------------------
class NozzleBase(BaseModel):
    pump_id: str
    nozzle_no: int
    product_id: str
    current_meter_reading: float = 0


class NozzleCreate(NozzleBase):
    pass


class NozzleUpdate(BaseModel):
    nozzle_no: Optional[int] = None
    product_id: Optional[str] = None
    current_meter_reading: Optional[float] = None


class NozzleOut(NozzleBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


class PumpBase(BaseModel):
    pump_no: int
    name: str
    status: str = "ACTIVE"


class PumpCreate(PumpBase):
    pass


class PumpUpdate(BaseModel):
    pump_no: Optional[int] = None
    name: Optional[str] = None
    status: Optional[str] = None


class PumpOut(PumpBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nozzles: List[NozzleOut] = []


# ---------------------------------------------------------------------
# OPERATORS
# ---------------------------------------------------------------------
class OperatorBase(BaseModel):
    name: str
    phone: Optional[str] = None
    daily_bata: float = 0
    active: bool = True


class OperatorCreate(OperatorBase):
    pass


class OperatorUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    daily_bata: Optional[float] = None
    active: Optional[bool] = None


class OperatorOut(OperatorBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------------------------------------------------------------------
# CUSTOMERS
# ---------------------------------------------------------------------
class CustomerBase(BaseModel):
    code: str
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    vehicle_numbers: List[str] = []
    credit_limit: float = 500000
    opening_balance: float = 0
    status: str = "ACTIVE"
    address: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    vehicle_numbers: Optional[List[str]] = None
    credit_limit: Optional[float] = None
    status: Optional[str] = None
    address: Optional[str] = None


class CustomerOut(CustomerBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    outstanding_balance: float
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# EXPENSE TYPES
# ---------------------------------------------------------------------
class ExpenseTypeBase(BaseModel):
    name: str
    category: str


class ExpenseTypeCreate(ExpenseTypeBase):
    pass


class ExpenseTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None


class ExpenseTypeOut(ExpenseTypeBase):
    model_config = ConfigDict(from_attributes=True)
    id: str


# ---------------------------------------------------------------------
# SHIFTS & METER READINGS
# ---------------------------------------------------------------------
class MeterReadingIn(BaseModel):
    nozzle_id: str
    closing_reading: float
    testing_litres: float = 0


class MeterReadingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    shift_id: str
    nozzle_id: str
    nozzle_no: int
    product_name: str
    fuel_code: str
    rate: float
    opening_reading: float
    closing_reading: float
    testing_litres: float
    litres_sold: float
    gross_amount: float


class ShiftOpen(BaseModel):
    shift_date: date
    shift_type: str = "Full Day"
    pump_id: str
    operator_id: str
    notes: Optional[str] = None


class ShiftClose(BaseModel):
    meter_readings: List[MeterReadingIn]
    cash_collected: float = 0
    upi_gpay_collected: float = 0
    card_collected: float = 0
    fleet_card_collected: float = 0
    credit_sales: float = 0
    cheque_collected: float = 0
    expenses_deducted: float = 0
    notes: Optional[str] = None


class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    shift_no: str
    shift_date: date
    shift_type: str
    pump_id: str
    pump_no: int
    operator_id: str
    operator_name: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    status: str
    total_litres_sold: float
    total_sales_amount: float
    expenses_deducted: float
    cash_collected: float
    upi_gpay_collected: float
    card_collected: float
    fleet_card_collected: float
    credit_sales: float
    cheque_collected: float
    total_collected: float
    shortage_or_excess: float
    notes: Optional[str] = None
    meter_readings: List[MeterReadingOut] = []


# ---------------------------------------------------------------------
# CREDIT TRANSACTIONS & PAYMENTS
# ---------------------------------------------------------------------
class CreditTransactionCreate(BaseModel):
    customer_id: str
    date: Optional[date] = None
    time: Optional[str] = None
    pump_id: Optional[str] = None
    pump_no: Optional[int] = None
    product_id: str
    vehicle_no: Optional[str] = ""
    driver_name: Optional[str] = None
    litres: float
    rate: Optional[float] = None
    amount: Optional[float] = None
    remarks: Optional[str] = None


class CreditTransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    slip_no: str
    customer_id: str
    date: date
    time: Optional[str] = None
    pump_id: Optional[str] = None
    pump_no: Optional[int] = None
    product_id: str
    vehicle_no: Optional[str] = None
    driver_name: Optional[str] = None
    litres: float
    rate: float
    amount: float
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


class CreditPaymentCreate(BaseModel):
    customer_id: str
    date: Optional[date] = None
    amount: float
    payment_mode: str = Field(pattern="^(Cash|Cheque|Bank Transfer|NEFT|UPI)$")
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[str] = None


class CreditPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    receipt_no: str
    customer_id: str
    date: date
    amount: float
    payment_mode: str
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    received_by: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# EXPENSES
# ---------------------------------------------------------------------
class ExpenseCreate(BaseModel):
    date: Optional[date] = None
    expense_type_id: str
    amount: float
    paid_to: Optional[str] = None
    paid_by: Optional[str] = None
    pump_id: Optional[str] = None
    is_credit_note: bool = False
    remarks: Optional[str] = None


class ExpenseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    voucher_no: str
    date: date
    expense_type_id: str
    expense_type_name: str
    amount: float
    paid_to: Optional[str] = None
    paid_by: Optional[str] = None
    pump_id: Optional[str] = None
    is_credit_note: bool
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# BANK DEPOSITS
# ---------------------------------------------------------------------
class BankDepositCreate(BaseModel):
    deposit_date: Optional[date] = None
    bank_name: str
    account_no: str
    amount: Optional[float] = None
    note_2000: int = 0
    note_500: int = 0
    note_200: int = 0
    note_100: int = 0
    note_50: int = 0
    note_20: int = 0
    note_10: int = 0
    coins: float = 0
    deposited_by: Optional[str] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None


class BankDepositOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    deposit_date: date
    bank_name: str
    account_no: str
    amount: float
    note_2000: int
    note_500: int
    note_200: int
    note_100: int
    note_50: int
    note_20: int
    note_10: int
    coins: float
    deposited_by: Optional[str] = None
    reference_no: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------
class DashboardSummary(BaseModel):
    total_sales_amount: float
    total_litres_sold: float
    total_cash_collected: float
    total_expenses: float
    net_cash_on_hand: float
    total_credit_outstanding: float
    total_bank_deposited: float
    active_customers: int
    customers_near_limit: int
    open_shifts: int
    closed_shifts: int


# ---------------------------------------------------------------------
# TANK DIPS
# ---------------------------------------------------------------------
class TankDipCreate(BaseModel):
    tank_id: str
    tank_name: str
    product_name: str
    dip_date: Optional[date] = None
    dip_type: str  # Morning, Evening, After Decantation
    fuel_dip_cm: float
    fuel_dip_litres: float
    water_dip_cm: float = 0
    observed_density: float = 0
    observed_temp: float = 0
    converted_density: float = 0
    book_stock_litres: float = 0
    variance: float = 0
    tested_by: str
    remarks: Optional[str] = None


class TankDipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    tank_id: str
    tank_name: str
    product_name: str
    dip_date: date
    dip_type: str
    fuel_dip_cm: float
    fuel_dip_litres: float
    water_dip_cm: float
    observed_density: float
    observed_temp: float
    converted_density: float
    book_stock_litres: float
    variance: float
    tested_by: str
    remarks: Optional[str] = None
    created_at: Optional[datetime] = None


# ---------------------------------------------------------------------
# SHIFT DRAFT (partial update without closing)
# ---------------------------------------------------------------------
class ShiftDraft(BaseModel):
    """Partial update to an open shift — saves meter readings and collections in-progress."""
    meter_readings: Optional[List[MeterReadingIn]] = None
    cash_collected: Optional[float] = None
    upi_gpay_collected: Optional[float] = None
    card_collected: Optional[float] = None
    fleet_card_collected: Optional[float] = None
    credit_sales: Optional[float] = None
    cheque_collected: Optional[float] = None
    expenses_deducted: Optional[float] = None
    notes: Optional[str] = None


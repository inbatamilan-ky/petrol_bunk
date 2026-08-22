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
    full_name = Column(String(150), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Integer, nullable=False, default=2)  # 1 = Owner, 2 = Manager
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("role IN (1, 2)", name="ck_users_role"),
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(String(20), primary_key=True)
    code = Column(String(20), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    category = Column(String(20), nullable=False)
    unit = Column(String(20), nullable=False)
    color = Column(String(10), nullable=False)
    current_rate = Column(Numeric(10, 2), nullable=False)
    density_min = Column(Numeric(6, 2))
    density_max = Column(Numeric(6, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("category IN ('FUEL','LUBRICANT')", name="ck_products_category"),
    )


class Tank(Base):
    __tablename__ = "tanks"

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

    id = Column(String(20), primary_key=True)
    pump_no = Column(Integer, nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="ACTIVE")

    nozzles = relationship("Nozzle", back_populates="pump")


class Nozzle(Base):
    __tablename__ = "nozzles"

    id = Column(String(20), primary_key=True)
    pump_id = Column(String(20), ForeignKey("pumps.id", ondelete="CASCADE"), nullable=False)
    nozzle_no = Column(Integer, nullable=False)
    product_id = Column(String(20), ForeignKey("products.id"), nullable=False)
    current_meter_reading = Column(Numeric(14, 2), nullable=False, default=0)

    pump = relationship("Pump", back_populates="nozzles")
    product = relationship("Product")

    __table_args__ = (UniqueConstraint("pump_id", "nozzle_no", name="uq_pump_nozzle"),)


class Operator(Base):
    __tablename__ = "operators"

    id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(30))
    daily_bata = Column(Numeric(10, 2), nullable=False, default=0)
    active = Column(Boolean, nullable=False, default=True)


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(20), primary_key=True)
    code = Column(String(20), nullable=False, unique=True)
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


class ExpenseType(Base):
    __tablename__ = "expense_types"

    id = Column(String(20), primary_key=True)
    name = Column(String(100), nullable=False)
    category = Column(String(30), nullable=False)


class Shift(Base):
    __tablename__ = "shifts"

    id = Column(String(20), primary_key=True)
    shift_no = Column(String(40), nullable=False, unique=True)
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

    id = Column(String(20), primary_key=True)
    slip_no = Column(String(40), nullable=False, unique=True)
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

    id = Column(String(20), primary_key=True)
    receipt_no = Column(String(40), nullable=False, unique=True)
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

    id = Column(String(20), primary_key=True)
    voucher_no = Column(String(40), nullable=False, unique=True)
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

    id = Column(String(20), primary_key=True)
    tank_id = Column(String(20), ForeignKey("tanks.id"), nullable=False)
    tank_name = Column(String(100), nullable=False)
    product_name = Column(String(100), nullable=False)
    dip_date = Column(Date, nullable=False)
    dip_type = Column(String(30), nullable=False)  # Morning, Evening, After Decantation
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

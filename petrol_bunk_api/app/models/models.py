from datetime import datetime
from app.extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    role = db.Column(db.String(20), nullable=False, default='Operator') # Owner, Manager, Operator
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Product(db.Model):
    __tablename__ = 'products'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(20), default='FUEL') # FUEL, LUBRICANT, GAS
    unit = db.Column(db.String(20), default='Litre')
    color = db.Column(db.String(20), default='#10B981')
    current_rate = db.Column(db.Float, nullable=False, default=90.0)

class FuelRate(db.Model):
    __tablename__ = 'fuel_rates'
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    rate = db.Column(db.Float, nullable=False)
    effective_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Pump(db.Model):
    __tablename__ = 'pumps'
    id = db.Column(db.Integer, primary_key=True)
    pump_no = db.Column(db.Integer, unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(20), default='ACTIVE')
    nozzles = db.relationship('Nozzle', backref='pump', lazy=True)

class Nozzle(db.Model):
    __tablename__ = 'nozzles'
    id = db.Column(db.Integer, primary_key=True)
    pump_id = db.Column(db.Integer, db.ForeignKey('pumps.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    nozzle_no = db.Column(db.Integer, nullable=False)
    current_meter_reading = db.Column(db.Float, default=0.0)
    product = db.relationship('Product', backref='nozzles')

class Operator(db.Model):
    __tablename__ = 'operators'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    daily_bata = db.Column(db.Float, default=150.0)
    active = db.Column(db.Boolean, default=True)

class Shift(db.Model):
    __tablename__ = 'shifts'
    id = db.Column(db.Integer, primary_key=True)
    shift_no = db.Column(db.String(50), unique=True, nullable=False)
    shift_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    shift_type = db.Column(db.String(20), default='Morning')
    pump_id = db.Column(db.Integer, db.ForeignKey('pumps.id'), nullable=False)
    operator_id = db.Column(db.Integer, db.ForeignKey('operators.id'), nullable=False)
    opened_at = db.Column(db.DateTime, default=datetime.utcnow)
    closed_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='IN_PROGRESS') # IN_PROGRESS, CLOSED
    total_litres_sold = db.Column(db.Float, default=0.0)
    total_sales_amount = db.Column(db.Float, default=0.0)
    expenses_deducted = db.Column(db.Float, default=0.0)
    total_collected = db.Column(db.Float, default=0.0)
    shortage_or_excess = db.Column(db.Float, default=0.0)
    notes = db.Column(db.Text, nullable=True)

class MeterReading(db.Model):
    __tablename__ = 'meter_readings'
    id = db.Column(db.Integer, primary_key=True)
    shift_id = db.Column(db.Integer, db.ForeignKey('shifts.id'), nullable=False)
    nozzle_id = db.Column(db.Integer, db.ForeignKey('nozzles.id'), nullable=False)
    opening_reading = db.Column(db.Float, nullable=False)
    closing_reading = db.Column(db.Float, nullable=True)
    testing_litres = db.Column(db.Float, default=0.0)
    litres_sold = db.Column(db.Float, default=0.0)
    rate = db.Column(db.Float, nullable=False)
    gross_amount = db.Column(db.Float, default=0.0)

class CreditCustomer(db.Model):
    __tablename__ = 'credit_customers'
    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(20), unique=True, nullable=False)
    name = db.Column(db.String(150), nullable=False)
    contact_person = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    credit_limit = db.Column(db.Float, default=500000.0)
    outstanding_balance = db.Column(db.Float, default=0.0)
    opening_balance = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='ACTIVE')

class CreditTransaction(db.Model):
    __tablename__ = 'credit_transactions'
    id = db.Column(db.Integer, primary_key=True)
    slip_no = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('credit_customers.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    time_str = db.Column(db.String(20))
    pump_id = db.Column(db.Integer, db.ForeignKey('pumps.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    vehicle_no = db.Column(db.String(30), nullable=False)
    litres = db.Column(db.Float, nullable=False)
    rate = db.Column(db.Float, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    driver_name = db.Column(db.String(100))
    remarks = db.Column(db.String(255))

class CreditPayment(db.Model):
    __tablename__ = 'credit_payments'
    id = db.Column(db.Integer, primary_key=True)
    receipt_no = db.Column(db.String(50), unique=True, nullable=False)
    customer_id = db.Column(db.Integer, db.ForeignKey('credit_customers.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    amount = db.Column(db.Float, nullable=False)
    payment_mode = db.Column(db.String(30), default='Bank Transfer')
    reference_no = db.Column(db.String(100))
    notes = db.Column(db.String(255))

class ExpenseType(db.Model):
    __tablename__ = 'expense_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(50), default='OPERATIONAL')

class Expense(db.Model):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    voucher_no = db.Column(db.String(50), unique=True, nullable=False)
    date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    expense_type_id = db.Column(db.Integer, db.ForeignKey('expense_types.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    paid_to = db.Column(db.String(100), nullable=False)
    paid_by = db.Column(db.String(100), default='Manager')
    is_credit_note = db.Column(db.Boolean, default=False)
    remarks = db.Column(db.String(255))

class BankDeposit(db.Model):
    __tablename__ = 'bank_deposits'
    id = db.Column(db.Integer, primary_key=True)
    deposit_date = db.Column(db.Date, nullable=False, default=datetime.utcnow().date)
    bank_name = db.Column(db.String(100), nullable=False)
    account_no = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    reference_no = db.Column(db.String(100))
    deposited_by = db.Column(db.String(100))
    notes = db.Column(db.String(255))

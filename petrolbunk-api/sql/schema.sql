-- =====================================================================
-- Petrol Bunk Management System — PostgreSQL Schema (API version)
-- This is the schema you supplied, plus a `users` table for JWT auth.
-- NOTE: You do not need to run this by hand — `python init_db.py`
-- creates the exact same tables from the SQLAlchemy models. This file
-- is kept for reference / manual psql use if you prefer.
-- =====================================================================

DROP TABLE IF EXISTS credit_payments CASCADE;
DROP TABLE IF EXISTS credit_transactions CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS bank_deposits CASCADE;
DROP TABLE IF EXISTS meter_readings CASCADE;
DROP TABLE IF EXISTS shifts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS expense_types CASCADE;
DROP TABLE IF EXISTS operators CASCADE;
DROP TABLE IF EXISTS nozzles CASCADE;
DROP TABLE IF EXISTS pumps CASCADE;
DROP TABLE IF EXISTS tanks CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------
-- USERS (JWT auth)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    username            VARCHAR(60) NOT NULL UNIQUE,
    email               VARCHAR(120) UNIQUE,
    full_name           VARCHAR(150),
    hashed_password     VARCHAR(255) NOT NULL,
    role                INT NOT NULL DEFAULT 2 CHECK (role IN (1, 2)), -- 1 = Owner, 2 = Manager
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- PRODUCTS (fuel & lubricant catalogue)
-- ---------------------------------------------------------------------
CREATE TABLE products (
    id                  VARCHAR(20) PRIMARY KEY,
    code                VARCHAR(20) NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    category            VARCHAR(20) NOT NULL CHECK (category IN ('FUEL','LUBRICANT')),
    unit                VARCHAR(20) NOT NULL,
    color               VARCHAR(10) NOT NULL,
    current_rate        NUMERIC(10,2) NOT NULL,
    density_min         NUMERIC(6,2),
    density_max         NUMERIC(6,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- TANKS
-- ---------------------------------------------------------------------
CREATE TABLE tanks (
    id                  VARCHAR(20) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    product_id          VARCHAR(20) NOT NULL REFERENCES products(id),
    capacity_litres     NUMERIC(12,2) NOT NULL,
    current_stock_litres NUMERIC(12,2) NOT NULL DEFAULT 0,
    diameter_cm         NUMERIC(8,2),
    status              VARCHAR(20) NOT NULL DEFAULT 'NORMAL'
);

-- ---------------------------------------------------------------------
-- PUMPS & NOZZLES
-- ---------------------------------------------------------------------
CREATE TABLE pumps (
    id                  VARCHAR(20) PRIMARY KEY,
    pump_no             INT NOT NULL UNIQUE,
    name                VARCHAR(100) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE nozzles (
    id                      VARCHAR(20) PRIMARY KEY,
    pump_id                 VARCHAR(20) NOT NULL REFERENCES pumps(id) ON DELETE CASCADE,
    nozzle_no               INT NOT NULL,
    product_id              VARCHAR(20) NOT NULL REFERENCES products(id),
    current_meter_reading   NUMERIC(14,2) NOT NULL DEFAULT 0,
    UNIQUE (pump_id, nozzle_no)
);

-- ---------------------------------------------------------------------
-- OPERATORS
-- ---------------------------------------------------------------------
CREATE TABLE operators (
    id                  VARCHAR(20) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    phone               VARCHAR(30),
    daily_bata          NUMERIC(10,2) NOT NULL DEFAULT 0,
    active              BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- CUSTOMERS (credit ledger accounts)
-- ---------------------------------------------------------------------
CREATE TABLE customers (
    id                    VARCHAR(20) PRIMARY KEY,
    code                  VARCHAR(20) NOT NULL UNIQUE,
    name                  VARCHAR(150) NOT NULL,
    contact_person        VARCHAR(150),
    phone                 VARCHAR(30),
    vehicle_numbers       TEXT[] NOT NULL DEFAULT '{}',
    credit_limit          NUMERIC(14,2) NOT NULL DEFAULT 500000,
    outstanding_balance   NUMERIC(14,2) NOT NULL DEFAULT 0,
    opening_balance       NUMERIC(14,2) NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    address               VARCHAR(255),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- EXPENSE TYPES
-- ---------------------------------------------------------------------
CREATE TABLE expense_types (
    id                  VARCHAR(20) PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    category            VARCHAR(30) NOT NULL
);

-- ---------------------------------------------------------------------
-- SHIFTS (header) + METER_READINGS (line items, one per nozzle used)
-- ---------------------------------------------------------------------
CREATE TABLE shifts (
    id                  VARCHAR(20) PRIMARY KEY,
    shift_no            VARCHAR(40) NOT NULL UNIQUE,
    shift_date          DATE NOT NULL,
    shift_type          VARCHAR(30) NOT NULL DEFAULT 'Full Day',
    pump_id             VARCHAR(20) NOT NULL REFERENCES pumps(id),
    pump_no             INT NOT NULL,
    operator_id         VARCHAR(20) NOT NULL REFERENCES operators(id),
    operator_name       VARCHAR(100) NOT NULL,
    opened_at           TIMESTAMPTZ NOT NULL,
    closed_at           TIMESTAMPTZ,
    status              VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','CLOSED')),
    total_litres_sold   NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_sales_amount  NUMERIC(14,2) NOT NULL DEFAULT 0,
    expenses_deducted   NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_collected      NUMERIC(14,2) NOT NULL DEFAULT 0,
    upi_gpay_collected  NUMERIC(14,2) NOT NULL DEFAULT 0,
    card_collected      NUMERIC(14,2) NOT NULL DEFAULT 0,
    fleet_card_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
    credit_sales        NUMERIC(14,2) NOT NULL DEFAULT 0,
    cheque_collected    NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_collected     NUMERIC(14,2) NOT NULL DEFAULT 0,
    shortage_or_excess  NUMERIC(14,2) NOT NULL DEFAULT 0,
    notes               TEXT
);

CREATE TABLE meter_readings (
    id                  SERIAL PRIMARY KEY,
    shift_id            VARCHAR(20) NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
    nozzle_id           VARCHAR(20) NOT NULL REFERENCES nozzles(id),
    nozzle_no           INT NOT NULL,
    product_name        VARCHAR(100) NOT NULL,
    fuel_code           VARCHAR(20) NOT NULL,
    rate                NUMERIC(10,2) NOT NULL,
    opening_reading     NUMERIC(14,2) NOT NULL,
    closing_reading     NUMERIC(14,2) NOT NULL,
    testing_litres      NUMERIC(10,2) NOT NULL DEFAULT 0,
    litres_sold         NUMERIC(14,2) NOT NULL DEFAULT 0,
    gross_amount        NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- CREDIT TRANSACTIONS (sales on credit) & CREDIT PAYMENTS (repayments)
-- ---------------------------------------------------------------------
CREATE TABLE credit_transactions (
    id                  VARCHAR(20) PRIMARY KEY,
    slip_no             VARCHAR(40) NOT NULL UNIQUE,
    customer_id         VARCHAR(20) NOT NULL REFERENCES customers(id),
    date                DATE NOT NULL,
    time                VARCHAR(20),
    pump_id             VARCHAR(20) REFERENCES pumps(id),
    pump_no             INT,
    product_id          VARCHAR(20) NOT NULL REFERENCES products(id),
    vehicle_no          VARCHAR(30) DEFAULT '',
    driver_name         VARCHAR(100),
    litres              NUMERIC(12,2) NOT NULL,
    rate                NUMERIC(10,2) NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credit_payments (
    id                  VARCHAR(20) PRIMARY KEY,
    receipt_no          VARCHAR(40) NOT NULL UNIQUE,
    customer_id         VARCHAR(20) NOT NULL REFERENCES customers(id),
    date                DATE NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    payment_mode        VARCHAR(30) NOT NULL CHECK (payment_mode IN ('Cash','Cheque','Bank Transfer','NEFT','UPI')),
    reference_no        VARCHAR(60),
    notes               TEXT,
    received_by         VARCHAR(100),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------
CREATE TABLE expenses (
    id                  VARCHAR(20) PRIMARY KEY,
    voucher_no          VARCHAR(40) NOT NULL UNIQUE,
    date                DATE NOT NULL,
    expense_type_id     VARCHAR(20) NOT NULL REFERENCES expense_types(id),
    expense_type_name   VARCHAR(100) NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    paid_to             VARCHAR(150),
    paid_by             VARCHAR(100),
    pump_id             VARCHAR(20) REFERENCES pumps(id),
    is_credit_note      BOOLEAN NOT NULL DEFAULT FALSE,
    remarks             TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- BANK DEPOSITS (with denomination breakdown)
-- ---------------------------------------------------------------------
CREATE TABLE bank_deposits (
    id                  VARCHAR(20) PRIMARY KEY,
    deposit_date        DATE NOT NULL,
    bank_name           VARCHAR(150) NOT NULL,
    account_no          VARCHAR(60) NOT NULL,
    amount              NUMERIC(14,2) NOT NULL,
    note_2000           INT NOT NULL DEFAULT 0,
    note_500            INT NOT NULL DEFAULT 0,
    note_200            INT NOT NULL DEFAULT 0,
    note_100            INT NOT NULL DEFAULT 0,
    note_50             INT NOT NULL DEFAULT 0,
    note_20             INT NOT NULL DEFAULT 0,
    note_10             INT NOT NULL DEFAULT 0,
    coins               NUMERIC(10,2) NOT NULL DEFAULT 0,
    deposited_by        VARCHAR(100),
    reference_no        VARCHAR(60),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------
CREATE INDEX idx_shifts_date ON shifts(shift_date);
CREATE INDEX idx_shifts_pump ON shifts(pump_id);
CREATE INDEX idx_credit_tx_customer ON credit_transactions(customer_id);
CREATE INDEX idx_credit_tx_date ON credit_transactions(date);
CREATE INDEX idx_credit_pay_customer ON credit_payments(customer_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_type ON expenses(expense_type_id);
CREATE INDEX idx_bank_deposits_date ON bank_deposits(deposit_date);

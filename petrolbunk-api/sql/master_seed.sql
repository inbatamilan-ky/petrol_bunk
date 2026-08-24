-- =====================================================================
-- Petrol Bunk Management System
-- MASTER TABLES  —  Schema + Full Seed Data
-- =====================================================================
-- Run this file against your PostgreSQL database:
--   psql -U <user> -d <dbname> -f master_seed.sql
--
-- The file is IDEMPOTENT:
--   • CREATE TABLE uses IF NOT EXISTS
--   • INSERT uses ON CONFLICT (code) DO NOTHING
--   so it is safe to re-run without losing any existing data.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. MASTER_SHIFT_TYPES
--    Replaces hard-coded ['Morning','Evening','Full Day'] in
--    ShiftOperationsScreen.tsx
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_shift_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    subtitle    VARCHAR(150),          -- e.g. "06:00 AM – 02:00 PM"
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_shift_types (code, label, subtitle, sort_order) VALUES
    ('Morning',  'Morning Shift',  '06:00 AM – 02:00 PM',      1),
    ('Evening',  'Evening Shift',  '02:00 PM – 10:00 PM',      2),
    ('Night',    'Night Shift',    '10:00 PM – 06:00 AM',      3),
    ('Full Day', 'Full Day Shift', '24 Hours / Extended Hours', 4)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 2. MASTER_PAYMENT_MODES
--    Replaces hard-coded ['Cash','Cheque','UPI','NEFT','Bank Transfer']
--    in CreditLedgerScreen and the CHECK constraint on credit_payments
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_payment_modes (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    icon        VARCHAR(50),           -- optional icon name for UI
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_payment_modes (code, label, icon, sort_order) VALUES
    ('Cash',          'Cash',                      'banknote',        1),
    ('Cheque',        'Cheque',                    'file-text',       2),
    ('UPI',           'UPI / GPay / PhonePe',      'smartphone',      3),
    ('NEFT',          'NEFT / Bank Transfer',      'arrow-right-left', 4),
    ('Bank Transfer', 'RTGS / Bank Transfer',      'building-2',      5),
    ('Fleet Card',    'Fleet Card / IOCL HP Card', 'credit-card',     6),
    ('POS Card',      'POS / Debit Card',          'credit-card',     7)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 3. MASTER_PRODUCT_CATEGORIES
--    Replaces hard-coded ['FUEL','LUBRICANT'] in MastersScreen and
--    products.category CHECK constraint
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_product_categories (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    color       VARCHAR(10)  DEFAULT '#6366F1',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_product_categories (code, label, description, color, sort_order) VALUES
    ('FUEL',      'Fuel',      'Petrol, Diesel, CNG, Premium fuels sold at the nozzle',         '#F59E0B', 1),
    ('LUBRICANT', 'Lubricant', 'Engine oils, gear oils, greases sold across the counter',        '#6366F1', 2)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 4. MASTER_EXPENSE_CATEGORIES
--    Replaces hard-coded ['OPERATIONAL','STAFF','FINANCIAL','MAINTENANCE']
--    in MastersScreen expense-type form
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_expense_categories (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    color       VARCHAR(10)  DEFAULT '#6366F1',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_expense_categories (code, label, description, color, sort_order) VALUES
    ('OPERATIONAL',  'Operational',  'Day-to-day running expenses — power, fuel, consumables',  '#3B82F6', 1),
    ('STAFF',        'Staff',        'Salaries, bata, ESI, PF, bonus and staff welfare',         '#8B5CF6', 2),
    ('FINANCIAL',    'Financial',    'Bank charges, interest, taxes, audit & legal fees',        '#10B981', 3),
    ('MAINTENANCE',  'Maintenance',  'Pump, nozzle, canopy, vehicle & equipment repairs',        '#F59E0B', 4),
    ('MISCELLANEOUS','Miscellaneous','One-off or uncategorised expenses',                         '#6B7280', 5)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 5. MASTER_PUMP_STATUSES
--    Replaces hard-coded ['ACTIVE','IDLE','MAINTENANCE','INACTIVE']
--    in MastersScreen pump status toggle cycle
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_pump_statuses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    color       VARCHAR(10)  DEFAULT '#6366F1',   -- badge colour
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_pump_statuses (code, label, color, sort_order) VALUES
    ('ACTIVE',      'Active',      '#22C55E', 1),
    ('IDLE',        'Idle',        '#F59E0B', 2),
    ('MAINTENANCE', 'Maintenance', '#EF4444', 3),
    ('INACTIVE',    'Inactive',    '#6B7280', 4)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 6. MASTER_CUSTOMER_STATUSES
--    Replaces hard-coded ['ACTIVE','HOLD','BLOCKED','INACTIVE']
--    in MastersScreen customer status cycle
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_customer_statuses (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    color       VARCHAR(10)  DEFAULT '#6366F1',
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_customer_statuses (code, label, description, color, sort_order) VALUES
    ('ACTIVE',   'Active',   'Account is active — credit sales allowed',                  '#22C55E', 1),
    ('HOLD',     'On Hold',  'Temporarily paused — no new credit, collections in progress', '#F59E0B', 2),
    ('BLOCKED',  'Blocked',  'Blocked — credit sales refused, dues overdue',               '#EF4444', 3),
    ('INACTIVE', 'Inactive', 'Account closed or deactivated',                              '#6B7280', 4)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 7. MASTER_OMC_BRANDS
--    Replaces hard-coded BPCL/IOCL/HPCL/NAYARA/RELIANCE in
--    RateManagementScreen and bunk_profile.py
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_omc_brands (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(30)  NOT NULL UNIQUE,
    label         VARCHAR(100) NOT NULL,        -- full name
    sms_number    VARCHAR(20),                  -- rate SMS number
    color         VARCHAR(10)  DEFAULT '#6366F1',
    sort_order    INT          NOT NULL DEFAULT 0,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Only BPCL is supported — system is locked to Bharat Petroleum
INSERT INTO master_omc_brands (code, label, sms_number, color, sort_order) VALUES
    ('BPCL', 'Bharat Petroleum (BPCL)', '9223112222', '#FFD700', 1)
ON CONFLICT (code) DO NOTHING;


-- NOTE: master_states table removed.
-- State is fixed to Tamil Nadu (BPCL Chennai) — no dropdown needed.


-- ─────────────────────────────────────────────────────────────────────
-- 9. MASTER_BANK_ACCOUNT_TYPES
--    Replaces hard-coded ['Current','Savings','CC/OD'] in
--    bank_accounts router seed and CashBankScreen
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_bank_account_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_bank_account_types (code, label, description, sort_order) VALUES
    ('Current',  'Current Account',    'Primary operating account for day-to-day transactions',          1),
    ('Savings',  'Savings Account',    'Interest-bearing savings account',                                2),
    ('CC/OD',    'CC / OD Account',    'Cash Credit or Overdraft limit account (OMC decantation credit)', 3),
    ('FCNR',     'FCNR / NRE Account', 'Foreign currency or NRE account',                                4)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- 10. MASTER_DIP_TYPES
--     Replaces hard-coded ['Morning','Evening','After Decantation']
--     in TankDipScreen
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS master_dip_types (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(60)  NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    sort_order  INT          NOT NULL DEFAULT 0,
    is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO master_dip_types (code, label, description, sort_order) VALUES
    ('Morning',           'Morning Dip',           'Opening dip taken at start of day before any sales',      1),
    ('Evening',           'Evening Dip',            'Closing dip taken at end of day after all sales',         2),
    ('After Decantation', 'After Decantation',      'Dip taken immediately after tanker delivery is complete', 3),
    ('Mid-Day',           'Mid-Day / Spot Check',   'Surprise or regulatory spot-check dip',                   4),
    ('Pre-Decantation',   'Before Decantation',     'Dip taken before tanker offloading begins',               5)
ON CONFLICT (code) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────
-- Helpful indexes on all master tables
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mst_shift_types_active  ON master_shift_types       (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_pay_modes_active    ON master_payment_modes      (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_prod_cat_active     ON master_product_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_exp_cat_active      ON master_expense_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_pump_stat_active    ON master_pump_statuses      (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_cust_stat_active    ON master_customer_statuses  (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_omc_brands_active   ON master_omc_brands         (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_bank_acc_t_active   ON master_bank_account_types (is_active);
CREATE INDEX IF NOT EXISTS idx_mst_dip_types_active    ON master_dip_types          (is_active);

-- =====================================================================
-- END OF master_seed.sql
-- To apply:
--   psql -U postgres -d petrolbunk_db -f petrolbunk-api/sql/master_seed.sql
-- =====================================================================

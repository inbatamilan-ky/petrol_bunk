-- ============================================================
-- FuelPulse v2 — Excel-Scope Schema Migration
-- Run once against the live database AFTER taking a backup.
-- Idempotent: uses IF EXISTS / IF NOT EXISTS throughout.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1 — DROP all invented tables (cascade kills FKs)
-- ============================================================
DROP TABLE IF EXISTS public.tank_dips         CASCADE;
DROP TABLE IF EXISTS public.tanks             CASCADE;
DROP TABLE IF EXISTS public.sms_rate_logs     CASCADE;
DROP TABLE IF EXISTS public.pos_settlements   CASCADE;
DROP TABLE IF EXISTS public.bank_accounts     CASCADE;
DROP TABLE IF EXISTS public.cash_safe_ledger  CASCADE;
DROP TABLE IF EXISTS public.shifts            CASCADE;
DROP TABLE IF EXISTS public.meter_readings    CASCADE;

-- Master lookup tables for removed features
DROP TABLE IF EXISTS public.master_shift_types          CASCADE;
DROP TABLE IF EXISTS public.master_dip_types            CASCADE;
DROP TABLE IF EXISTS public.master_omc_brands           CASCADE;
DROP TABLE IF EXISTS public.master_bank_account_types   CASCADE;
DROP TABLE IF EXISTS public.master_tank_statuses        CASCADE;
DROP TABLE IF EXISTS public.master_settlement_channels  CASCADE;
DROP TABLE IF EXISTS public.master_settlement_statuses  CASCADE;
DROP TABLE IF EXISTS public.master_bank_deposit_statuses CASCADE;
DROP TABLE IF EXISTS public.master_shift_statuses       CASCADE;
DROP TABLE IF EXISTS public.master_staff_statuses       CASCADE;
DROP TABLE IF EXISTS public.master_staff_roles          CASCADE;
DROP TABLE IF EXISTS public.master_expense_payment_methods CASCADE;
DROP TABLE IF EXISTS public.master_credit_payment_modes CASCADE;
DROP TABLE IF EXISTS public.master_rate_change_sources  CASCADE;
DROP TABLE IF EXISTS public.master_units_of_measure     CASCADE;
DROP TABLE IF EXISTS public.master_branch_statuses      CASCADE;
DROP TABLE IF EXISTS public.master_report_types         CASCADE;
DROP TABLE IF EXISTS public.master_product_statuses     CASCADE;
DROP TABLE IF EXISTS public.master_expense_statuses     CASCADE;
DROP TABLE IF EXISTS public.master_pump_statuses        CASCADE;
DROP TABLE IF EXISTS public.master_product_categories   CASCADE;
DROP TABLE IF EXISTS public.master_expense_categories   CASCADE;
DROP TABLE IF EXISTS public.master_payment_modes        CASCADE;
DROP TABLE IF EXISTS public.master_customer_statuses    CASCADE;

-- ============================================================
-- STEP 2 — Strip invented columns from kept tables
-- ============================================================

-- products: remove density columns, restrict category to FUEL only
ALTER TABLE public.products DROP COLUMN IF EXISTS density_min;
ALTER TABLE public.products DROP COLUMN IF EXISTS density_max;
ALTER TABLE public.products DROP COLUMN IF EXISTS color;
ALTER TABLE public.products DROP COLUMN IF EXISTS unit;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS ck_products_category;
ALTER TABLE public.products ADD CONSTRAINT ck_products_category CHECK (category = 'FUEL');
-- Keep: id, code, name, category, current_rate, active, branch_id, created_at

-- pumps: remove status column
ALTER TABLE public.pumps DROP COLUMN IF EXISTS status;

-- operators: remove daily_bata
ALTER TABLE public.operators DROP COLUMN IF EXISTS daily_bata;

-- customers: slim down to name + phone only
ALTER TABLE public.customers DROP COLUMN IF EXISTS code;
ALTER TABLE public.customers DROP COLUMN IF EXISTS contact_person;
ALTER TABLE public.customers DROP COLUMN IF EXISTS vehicle_numbers;
ALTER TABLE public.customers DROP COLUMN IF EXISTS credit_limit;
ALTER TABLE public.customers DROP COLUMN IF EXISTS outstanding_balance;
ALTER TABLE public.customers DROP COLUMN IF EXISTS opening_balance;
ALTER TABLE public.customers DROP COLUMN IF EXISTS status;
ALTER TABLE public.customers DROP COLUMN IF EXISTS address;
-- Keep: id, name, phone, branch_id, created_at
-- Add outstanding_balance back as computed view (below)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding_balance numeric(14,2) NOT NULL DEFAULT 0;

-- daily_nozzle_meters: remove testing_litres and recorded_by
ALTER TABLE public.daily_nozzle_meters DROP COLUMN IF EXISTS testing_litres;
ALTER TABLE public.daily_nozzle_meters DROP COLUMN IF EXISTS recorded_by;

-- credit_transactions: strip invented fields
ALTER TABLE public.credit_transactions DROP COLUMN IF EXISTS slip_no;
ALTER TABLE public.credit_transactions DROP COLUMN IF EXISTS time;
ALTER TABLE public.credit_transactions DROP COLUMN IF EXISTS vehicle_no;
ALTER TABLE public.credit_transactions DROP COLUMN IF EXISTS driver_name;
-- update check if amount is still computed right (pump_no kept for lookup)
ALTER TABLE public.credit_transactions DROP COLUMN IF EXISTS pump_no;
-- Keep: id, date, pump_id, customer_id, product_id, litres, rate, amount, branch_id

-- credit_payments: strip invented fields
ALTER TABLE public.credit_payments DROP COLUMN IF EXISTS receipt_no;
ALTER TABLE public.credit_payments DROP COLUMN IF EXISTS reference_no;
ALTER TABLE public.credit_payments DROP COLUMN IF EXISTS received_by;
ALTER TABLE public.credit_payments DROP COLUMN IF EXISTS notes;
-- Update payment_mode CHECK to Excel Block E modes
ALTER TABLE public.credit_payments DROP CONSTRAINT IF EXISTS ck_credit_payments_mode;
ALTER TABLE public.credit_payments ADD CONSTRAINT ck_credit_payments_mode
    CHECK (payment_mode = ANY (ARRAY[
        'Cash','Card','FC','Paytm','Cheque','Bank Transfer','Gpay'
    ]));
-- Keep: id, date, customer_id, amount, payment_mode, branch_id

-- expenses: strip invented fields
ALTER TABLE public.expenses DROP COLUMN IF EXISTS voucher_no;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS paid_to;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS paid_by;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS pump_id;
ALTER TABLE public.expenses DROP COLUMN IF EXISTS is_credit_note;
-- Keep: id, date, expense_type_id, expense_type_name, amount, remarks, branch_id

-- expense_types: drop category column
ALTER TABLE public.expense_types DROP COLUMN IF EXISTS category;

-- bank_deposits: slim to just date + amount
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS bank_name;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS account_no;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_2000;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_500;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_200;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_100;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_50;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_20;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS note_10;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS coins;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS deposited_by;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS reference_no;
ALTER TABLE public.bank_deposits DROP COLUMN IF EXISTS notes;
-- Keep: id, deposit_date, amount, branch_id

-- fuel_rate_history: strip old_rate, changed_by; restrict change_source
ALTER TABLE public.fuel_rate_history DROP COLUMN IF EXISTS old_rate;
ALTER TABLE public.fuel_rate_history DROP COLUMN IF EXISTS changed_by;
ALTER TABLE public.fuel_rate_history DROP COLUMN IF EXISTS product_code;
ALTER TABLE public.fuel_rate_history DROP COLUMN IF EXISTS product_name;
ALTER TABLE public.fuel_rate_history DROP COLUMN IF EXISTS change_source;
-- Keep: id, product_id, effective_date, new_rate → rename to rate
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fuel_rate_history' AND column_name='new_rate') THEN
        ALTER TABLE public.fuel_rate_history RENAME COLUMN new_rate TO rate;
    END IF;
END $$;
-- Clean up fuel_rate_history
DELETE FROM public.fuel_rate_history a USING public.fuel_rate_history b
WHERE a.ctid < b.ctid 
  AND a.product_id = b.product_id 
  AND a.effective_date = b.effective_date 
  AND (a.branch_id = b.branch_id OR (a.branch_id IS NULL AND b.branch_id IS NULL));

ALTER TABLE public.fuel_rate_history
    ADD COLUMN IF NOT EXISTS branch_id character varying(20) REFERENCES public.branches(id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_fuel_rate_hist') THEN
        ALTER TABLE public.fuel_rate_history ADD CONSTRAINT uq_fuel_rate_hist UNIQUE (product_id, effective_date, branch_id);
    END IF;
END $$;

-- ============================================================
-- STEP 3 — MASTER TABLES (normalised lookup tables, Excel-grounded)
-- ============================================================

-- Banks used for settlements (Block F)
CREATE TABLE IF NOT EXISTS public.master_banks (
    id   SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO public.master_banks (code, name, sort_order) VALUES
    ('ICICI', 'ICICI Bank', 1),
    ('SBI',   'State Bank of India', 2),
    ('HDFC',  'HDFC Bank', 3),
    ('Paytm', 'Paytm Payments Bank', 4)
ON CONFLICT (code) DO NOTHING;

-- Channels used for settlements (Block F)
CREATE TABLE IF NOT EXISTS public.master_channels (
    id   SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO public.master_channels (code, name, sort_order) VALUES
    ('Gpay',             'Google Pay / UPI',    1),
    ('Paytm',            'Paytm',               2),
    ('Swiping Machine',  'Swiping Machine (POS)',3),
    ('Fleet Card',       'Fleet Card',           4),
    ('Phone Pay',        'Phone Pay / UPI',      5)
ON CONFLICT (code) DO NOTHING;

-- Payment modes for credit collections (Block E)
CREATE TABLE IF NOT EXISTS public.master_payment_modes (
    id   SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO public.master_payment_modes (code, name, sort_order) VALUES
    ('Cash',          'Cash',                 1),
    ('Card',          'Card / Debit / Credit',2),
    ('FC',            'Fleet Card',           3),
    ('Paytm',         'Paytm',                4),
    ('Cheque',        'Cheque',               5),
    ('Bank Transfer', 'Bank Transfer / NEFT', 6),
    ('Gpay',          'Google Pay / UPI',     7)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- STEP 4 — NEW TABLES
-- ============================================================

-- Block F: Bank × Channel settlement matrix
CREATE TABLE IF NOT EXISTS public.settlements (
    id               VARCHAR(20) NOT NULL PRIMARY KEY,
    settlement_date  DATE NOT NULL,
    bank_code        VARCHAR(20) NOT NULL REFERENCES public.master_banks(code),
    channel_code     VARCHAR(30) NOT NULL REFERENCES public.master_channels(code),
    amount           NUMERIC(14,2) NOT NULL,
    branch_id        VARCHAR(20) NOT NULL REFERENCES public.branches(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (settlement_date, bank_code, channel_code, branch_id)
);

-- Block H: Pump-day attribution — ONE ROW per pump per operator session per day
-- Multiple operators per pump per day are supported (e.g. morning operator + evening operator)
CREATE TABLE IF NOT EXISTS public.pump_day_attribution (
    id               VARCHAR(20) NOT NULL PRIMARY KEY,
    attribution_date DATE NOT NULL,
    pump_id          VARCHAR(20) NOT NULL REFERENCES public.pumps(id),
    pump_no          INTEGER NOT NULL,
    operator_id      VARCHAR(20) NOT NULL REFERENCES public.operators(id),
    operator_name    VARCHAR(100) NOT NULL,
    -- Timestamp tracking: morning in / evening out
    time_in          TIME,          -- operator reports in (morning)
    time_out         TIME,          -- operator signs off (evening)
    -- Payment collected by this operator's session
    advance_payment  NUMERIC(14,2) NOT NULL DEFAULT 0,
    credit_acc       NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_collected   NUMERIC(14,2) NOT NULL DEFAULT 0,
    card_collected   NUMERIC(14,2) NOT NULL DEFAULT 0,
    fleet_card_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
    credit_sales     NUMERIC(14,2) NOT NULL DEFAULT 0,
    upi_gpay_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount     NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_payment      NUMERIC(14,2) NOT NULL DEFAULT 0,
    branch_id        VARCHAR(20) NOT NULL REFERENCES public.branches(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No UNIQUE on (attribution_date, pump_id) — multiple operators per pump per day allowed
);
CREATE INDEX IF NOT EXISTS idx_pda_date ON public.pump_day_attribution(attribution_date);
CREATE INDEX IF NOT EXISTS idx_pda_pump ON public.pump_day_attribution(pump_id);
CREATE INDEX IF NOT EXISTS idx_pda_operator ON public.pump_day_attribution(operator_id);

-- Block I: Daily cash reconciliation
CREATE TABLE IF NOT EXISTS public.daily_cash_reconciliation (
    id                       VARCHAR(20) NOT NULL PRIMARY KEY,
    recon_date               DATE NOT NULL,
    opening_balance          NUMERIC(14,2) NOT NULL DEFAULT 0,
    morning_collection       NUMERIC(14,2) NOT NULL DEFAULT 0,
    oil_dw                   NUMERIC(14,2) NOT NULL DEFAULT 0,   -- Oil / D.W line
    total_cash               NUMERIC(14,2) NOT NULL DEFAULT 0,   -- sum of above, but stored because user may enter manually
    cash_for_card_swipe      NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_deposit_in_bank     NUMERIC(14,2) NOT NULL DEFAULT 0,
    system_total_in_sheet    NUMERIC(14,2) NOT NULL DEFAULT 0,   -- "In Excel Sheet"
    physically_counted_note  NUMERIC(14,2) NOT NULL DEFAULT 0,   -- "In Note"
    -- difference is computed: system_total_in_sheet - physically_counted_note
    net_cash_for_the_day     NUMERIC(14,2) NOT NULL DEFAULT 0,
    branch_id                VARCHAR(20) NOT NULL REFERENCES public.branches(id),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (recon_date, branch_id)
);

-- Ensure branch B-01 exists
INSERT INTO public.branches (id, name, location, dealer_code, omc_brand, is_active)
VALUES ('B-01', 'BPCL Chennai Central Auto Fuel', 'Chennai (Tamil Nadu)', '184920', 'BPCL', true)
ON CONFLICT (id) DO NOTHING;

-- Clear old mock data
DELETE FROM public.fuel_rate_history;
DELETE FROM public.daily_nozzle_meters;
DELETE FROM public.credit_transactions;
DELETE FROM public.credit_payments;
DELETE FROM public.expenses;
DELETE FROM public.nozzles;
DELETE FROM public.products;
DELETE FROM public.pumps;

-- Insert exact 3 Excel products
INSERT INTO public.products (id, code, name, category, current_rate, active, branch_id)
VALUES
    ('prod-hsd', 'HSD',  'HSD(Diesel)',    'FUEL', 92.71,  TRUE, 'B-01'),
    ('prod-ms',  'MS',   'MS(Petrol)',     'FUEL', 101.08, TRUE, 'B-01'),
    ('prod-ms2', 'MS2',  'MS(Petrol)-II', 'FUEL', 101.08, TRUE, 'B-01')
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    current_rate = EXCLUDED.current_rate;

-- Insert exact 3 pumps
INSERT INTO public.pumps (id, pump_no, name, branch_id)
VALUES
    ('pump-1', 1, 'Pump 1', 'B-01'),
    ('pump-2', 2, 'Pump 2', 'B-01'),
    ('pump-3', 3, 'Pump 3', 'B-01')
ON CONFLICT (id) DO UPDATE SET pump_no = EXCLUDED.pump_no, name = EXCLUDED.name;

-- Insert 2 nozzles per pump (Nozzle 1 for HSD, Nozzle 2 for MS)
INSERT INTO public.nozzles (id, pump_id, nozzle_no, product_id, current_meter_reading, branch_id)
VALUES
    ('noz-1', 'pump-1', 1, 'prod-hsd', 0, 'B-01'),
    ('noz-2', 'pump-1', 2, 'prod-ms',  0, 'B-01'),
    ('noz-3', 'pump-2', 1, 'prod-hsd', 0, 'B-01'),
    ('noz-4', 'pump-2', 2, 'prod-ms',  0, 'B-01'),
    ('noz-5', 'pump-3', 1, 'prod-hsd', 0, 'B-01'),
    ('noz-6', 'pump-3', 2, 'prod-ms',  0, 'B-01')
ON CONFLICT (id) DO NOTHING;

-- Fix expense types: all 33 heads (global, branch_id = NULL)
DELETE FROM public.expense_types WHERE branch_id IS NULL;
INSERT INTO public.expense_types (id, name, branch_id) VALUES
('exp-01', 'Salary',          NULL),
('exp-02', 'Bata',            NULL),
('exp-03', 'Tea',             NULL),
('exp-04', 'Pooja',           NULL),
('exp-05', 'Gokulam Chit',    NULL),
('exp-06', 'Density',         NULL),
('exp-07', 'Lorry Bata',      NULL),
('exp-08', 'Petrol',          NULL),
('exp-09', 'Bank Charges',    NULL),
('exp-10', 'Car Diesel',      NULL),
('exp-11', 'Police',          NULL),
('exp-12', 'Stationary',      NULL),
('exp-13', 'EB Bill',         NULL),
('exp-14', 'Net Bill',        NULL),
('exp-15', 'Guna',            NULL),
('exp-16', 'Akka',            NULL),
('exp-17', 'POS Rent',        NULL),
('exp-18', 'Donation',        NULL),
('exp-19', 'Rent',            NULL),
('exp-20', 'Temple',          NULL),
('exp-21', 'Auditor',         NULL),
('exp-22', 'Coupon',          NULL),
('exp-23', 'Cleaning Mat',    NULL),
('exp-24', 'Maintanance',     NULL),
('exp-25', 'Pump Main',       NULL),
('exp-26', 'Bank Interest',   NULL),
('exp-27', 'Bank Loan EMI',   NULL),
('exp-28', 'Advance',         NULL),
('exp-29', 'TCS/TDS/IT Tax',  NULL),
('exp-30', 'D. Water',        NULL),
('exp-31', 'Lube Discount',   NULL),
('exp-32', 'New Outlet',      NULL),
('exp-33', 'Others',          NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 6 — Indexes on new transaction tables
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_settlements_date    ON public.settlements(settlement_date);
CREATE INDEX IF NOT EXISTS idx_settlements_bank    ON public.settlements(bank_code);
CREATE INDEX IF NOT EXISTS idx_dcr_date            ON public.daily_cash_reconciliation(recon_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_type       ON public.expenses(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_dnm_date            ON public.daily_nozzle_meters(reading_date);
CREATE INDEX IF NOT EXISTS idx_dnm_pump            ON public.daily_nozzle_meters(pump_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_date      ON public.credit_transactions(date);
CREATE INDEX IF NOT EXISTS idx_credit_pay_date     ON public.credit_payments(date);
CREATE INDEX IF NOT EXISTS idx_bank_dep_date       ON public.bank_deposits(deposit_date);

COMMIT;

-- ============================================================
-- Migration: Add profile columns to users table
-- File:      migrations/add_user_profile_columns.sql
-- Run once against your PostgreSQL database
-- ============================================================

-- 1. Add first_name
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(80) DEFAULT NULL;

-- 2. Add last_name
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(80) DEFAULT NULL;

-- 3. Add date-of-birth
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS dob DATE DEFAULT NULL;

-- 4. Add employment_status as integer: 0 = Unemployed, 1 = Employed
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS employment_status INTEGER NOT NULL DEFAULT 1;

-- 5. Add CHECK constraint (only 0 or 1 allowed)
ALTER TABLE users
    DROP CONSTRAINT IF EXISTS ck_users_employment_status;

ALTER TABLE users
    ADD CONSTRAINT ck_users_employment_status
        CHECK (employment_status IN (0, 1));

-- ============================================================
-- Verify (optional)
-- ============================================================
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

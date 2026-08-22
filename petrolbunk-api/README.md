# Petrol Bunk Management System — FastAPI Backend

A JWT-secured REST API built with **FastAPI + SQLAlchemy + PostgreSQL**, connecting
**directly** to your database via `DATABASE_URL` — no seed/fixture data is bundled
or required. Tables are created straight from the SQLAlchemy models, matching
your original schema (`sql/schema.sql` is kept only as a reference copy).

## 1. Configure

`.env` (already set up for you):

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/petrolbunk

SECRET_KEY=petrolbunk
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30000
```

Point `DATABASE_URL` at your real Postgres instance. Make sure the `petrolbunk`
database already exists (`createdb petrolbunk` or via pgAdmin) — the app creates
the tables inside it, not the database itself.

## 2. Install

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 3. Create tables (direct DB connection, no seed data)

```bash
python init_db.py
```

This connects straight to `DATABASE_URL` and issues `CREATE TABLE` for every
model in `app/models.py` (products, tanks, pumps, nozzles, operators,
customers, expense_types, shifts, meter_readings, credit_transactions,
credit_payments, expenses, bank_deposits, plus `users` for auth). It's
idempotent — safe to re-run.

## 4. Create your first login

```bash
python create_admin.py admin YourStrongPassword "Bunk Owner"
```

Creates (or resets) an `ADMIN` user. Non-admin users can be self-registered
via `POST /api/auth/register` (defaults to role `MANAGER`).

## 5. Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive docs: `http://localhost:8000/docs`

## Auth flow

1. `POST /api/auth/login` — OAuth2 password form (`username`, `password`) → `access_token`
2. Send `Authorization: Bearer <access_token>` on every other request
3. `GET /api/auth/me` — check who you are

Roles: `ADMIN`, `MANAGER`, `OPERATOR`. All authenticated users can read/write
day-to-day records; only `ADMIN` can `DELETE`.

## Endpoint map

| Area | Base path | Notes |
|---|---|---|
| Auth | `/api/auth` | register, login, me |
| Products | `/api/products` | fuel/lubricant catalogue |
| Tanks | `/api/tanks` | |
| Pumps & Nozzles | `/api/pumps`, `/api/pumps/{id}/nozzles` | |
| Operators | `/api/operators` | |
| Customers | `/api/customers` | + `/api/customers/{id}/ledger` statement |
| Expense Types | `/api/expense-types` | |
| Shifts | `/api/shifts` | `POST /{id}/close` runs the settlement math |
| Credit Ledger | `/api/credit/transactions`, `/api/credit/payments` | auto-updates customer balance |
| Expenses | `/api/expenses` | auto voucher numbering |
| Cash & Bank | `/api/bank-deposits` | denomination-based amount calc |
| Dashboard | `/api/dashboard/summary` | KPI aggregates |

### Shift settlement logic (`POST /api/shifts/{id}/close`)

Given closing meter readings per nozzle (+ testing litres) and collection
totals by mode, the endpoint:

- computes `litres_sold = closing - opening - testing_litres` per nozzle
- computes `gross_amount = litres_sold * product.current_rate`
- rolls these up into `total_litres_sold` / `total_sales_amount`
- sums cash/UPI/card/fleet-card/credit/cheque into `total_collected`
- computes `shortage_or_excess = total_collected - (total_sales_amount - expenses_deducted)`
- advances each nozzle's `current_meter_reading` to the new closing value

### Credit ledger

- `POST /api/credit/transactions` (credit sale) → increases `customer.outstanding_balance`
- `POST /api/credit/payments` (repayment) → decreases it (floored at 0)
- Both auto-generate `slip_no` / `receipt_no`.

## Project layout

```
petrolbunk-api/
  .env
  requirements.txt
  init_db.py            # creates tables directly in DATABASE_URL
  create_admin.py        # bootstraps a login user
  sql/schema.sql          # reference copy of the raw SQL (not executed by the app)
  app/
    main.py               # FastAPI app + router wiring
    config.py             # loads .env via pydantic-settings
    database.py            # SQLAlchemy engine/session
    models.py              # ORM models (1:1 with your schema, + users)
    schemas.py              # Pydantic request/response models
    security.py              # password hashing + JWT
    deps.py                   # get_db / get_current_user / require_admin
    utils.py                   # id + voucher/slip number generators
    routers/
      auth.py, products.py, tanks.py, pumps.py, operators.py,
      customers.py, expense_types.py, shifts.py, credit.py,
      expenses.py, bank_deposits.py, dashboard.py
```

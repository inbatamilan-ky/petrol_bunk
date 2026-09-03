"""
FuelPulse API — v2 (strict Excel scope)
Removed: tanks, tank_dips, sms_logs, bank_accounts, cash_ledger, shifts
Added: pump_attribution, settlements, cash_reconciliation
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    bank_deposits,
    branches,
    cash_reconciliation,
    credit,
    customers,
    dashboard,
    expense_types,
    expenses,
    masters,
    nozzle_meters,
    operators,
    products,
    pump_attribution,
    pumps,
    rate_history,
    settlements,
    tally,
)

app = FastAPI(
    title="FuelPulse API",
    description="Excel-scope petrol bunk management — pumps, nozzles, meter readings, credit, expenses, settlements, reconciliation.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
        "http://localhost:19000",
        "http://localhost:19001",
        "http://localhost:19006",
    ],
    allow_origin_regex=r"^https?://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth.router)

# Masters
app.include_router(masters.router)
app.include_router(branches.router)
app.include_router(products.router)
app.include_router(pumps.router)
app.include_router(operators.router)
app.include_router(customers.router)
app.include_router(expense_types.router)
app.include_router(rate_history.router)

# Transactions
app.include_router(nozzle_meters.router)
app.include_router(credit.router)
app.include_router(expenses.router)
app.include_router(bank_deposits.router)
app.include_router(settlements.router)
app.include_router(pump_attribution.router)
app.include_router(cash_reconciliation.router)

# Reports / Dashboard
app.include_router(dashboard.router)
app.include_router(tally.router)


@app.on_event("startup")
def startup_db_sync():
    from sqlalchemy import text
    from app.database import engine
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE operators ADD COLUMN IF NOT EXISTS govt_id_doc_name VARCHAR(255);"))
            conn.execute(text("ALTER TABLE operators ADD COLUMN IF NOT EXISTS govt_id_doc_url VARCHAR(500);"))
            conn.commit()
    except Exception as e:
        print("Startup db sync info:", e)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "fuelpulse-api", "version": "2.0.0"}

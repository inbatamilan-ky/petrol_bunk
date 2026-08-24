from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    bank_deposits,
    credit,
    customers,
    dashboard,
    expense_types,
    expenses,
    masters,
    operators,
    products,
    pumps,
    shifts,
    tank_dips,
    tanks,
    bunk_profile,
    nozzle_meters,
    sms_logs,
    bank_accounts,
    cash_ledger,
    rate_history,
)

import asyncio
from datetime import datetime, time, timedelta

async def daily_rate_cron_worker():
    """Background in-process Python cron: triggers every day at 06:00 AM IST."""
    while True:
        try:
            now = datetime.now()
            # Calculate seconds until next 06:00 AM
            target = datetime.combine(now.date(), time(6, 0))
            if now >= target:
                target = target + timedelta(days=1)
            wait_seconds = (target - now).total_seconds()
            
            # Non-blocking wait until 06:00 AM
            await asyncio.sleep(min(wait_seconds, 3600))
            
            # Check if it's 06:00 AM window
            current = datetime.now()
            if current.hour == 6 and current.minute < 5:
                from app.database import SessionLocal
                from app.routers.bunk_profile import trigger_daily_cron
                db = SessionLocal()
                try:
                    trigger_daily_cron(db=db)
                finally:
                    db.close()
                await asyncio.sleep(300) # prevent double run in same minute
        except Exception:
            await asyncio.sleep(60)

app = FastAPI(
    title="Petrol Bunk Management System API",
    description="JWT-secured REST API for pumps, nozzles, shifts, credit ledger, expenses, and bank deposits.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8081", "http://localhost:8082", "http://127.0.0.1:8081", "http://127.0.0.1:8082"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(daily_rate_cron_worker())


app.include_router(auth.router)
app.include_router(products.router)
app.include_router(bunk_profile.router)
app.include_router(tanks.router)
app.include_router(pumps.router)
app.include_router(operators.router)
app.include_router(customers.router)
app.include_router(expense_types.router)
app.include_router(shifts.router)
app.include_router(credit.router)
app.include_router(expenses.router)
app.include_router(bank_deposits.router)
app.include_router(tank_dips.router)
app.include_router(dashboard.router)
app.include_router(nozzle_meters.router)
app.include_router(sms_logs.router)
app.include_router(bank_accounts.router)
app.include_router(cash_ledger.router)
app.include_router(rate_history.router)
app.include_router(masters.router)  # Master / lookup tables for all dropdowns



@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "petrolbunk-api"}

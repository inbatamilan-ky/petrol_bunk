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
    operators,
    products,
    pumps,
    shifts,
    tank_dips,
    tanks,
)

app = FastAPI(
    title="Petrol Bunk Management System API",
    description="JWT-secured REST API for pumps, nozzles, shifts, credit ledger, expenses, and bank deposits.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
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


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "petrolbunk-api"}

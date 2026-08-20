from flask import Blueprint, jsonify, request
from app.extensions import db
from app.models.models import (
    Product, Pump, Nozzle, Operator, Shift, MeterReading,
    CreditCustomer, CreditTransaction, CreditPayment,
    Expense, ExpenseType, BankDeposit, FuelRate
)

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'app': 'FuelPulse Petrol Bunk REST API',
        'version': '1.0.0'
    }), 200

# Products & Rates
@api_bp.route('/products', methods=['GET'])
def get_products():
    prods = Product.query.all()
    return jsonify([{
        'id': p.id,
        'code': p.code,
        'name': p.name,
        'category': p.category,
        'unit': p.unit,
        'color': p.color,
        'current_rate': p.current_rate
    } for p in prods])

@api_bp.route('/products/<int:prod_id>/rate', methods=['PUT'])
def update_product_rate(prod_id):
    data = request.get_json()
    new_rate = float(data.get('rate', 0.0))
    prod = Product.query.get_or_404(prod_id)
    prod.current_rate = new_rate
    
    # Add rate history
    rate_entry = FuelRate(product_id=prod.id, rate=new_rate)
    db.session.add(rate_entry)
    db.session.commit()
    return jsonify({'message': 'Rate updated successfully', 'current_rate': new_rate})

# Shifts
@api_bp.route('/shifts', methods=['GET'])
def get_shifts():
    shifts = Shift.query.order_by(Shift.opened_at.desc()).all()
    return jsonify([{
        'id': s.id,
        'shift_no': s.shift_no,
        'shift_date': str(s.shift_date),
        'shift_type': s.shift_type,
        'pump_id': s.pump_id,
        'operator_id': s.operator_id,
        'status': s.status,
        'total_litres_sold': s.total_litres_sold,
        'total_sales_amount': s.total_sales_amount,
        'total_collected': s.total_collected,
        'shortage_or_excess': s.shortage_or_excess
    } for s in shifts])

# Credit Customers
@api_bp.route('/credit-customers', methods=['GET'])
def get_credit_customers():
    customers = CreditCustomer.query.all()
    return jsonify([{
        'id': c.id,
        'code': c.code,
        'name': c.name,
        'contact_person': c.contact_person,
        'phone': c.phone,
        'credit_limit': c.credit_limit,
        'outstanding_balance': c.outstanding_balance,
        'status': c.status
    } for c in customers])

# Expenses
@api_bp.route('/expenses', methods=['GET'])
def get_expenses():
    expenses = Expense.query.order_by(Expense.date.desc()).all()
    return jsonify([{
        'id': e.id,
        'voucher_no': e.voucher_no,
        'date': str(e.date),
        'expense_type_id': e.expense_type_id,
        'amount': e.amount,
        'paid_to': e.paid_to,
        'paid_by': e.paid_by,
        'is_credit_note': e.is_credit_note,
        'remarks': e.remarks
    } for e in expenses])

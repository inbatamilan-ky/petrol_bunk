from flask import Blueprint, request, jsonify
import pandas as pd
from app.extensions import db
from app.models.models import (
    Product, Operator, CreditCustomer, ExpenseType
)
import os

excel_bp = Blueprint('excel', __name__, url_prefix='/api/excel')

@excel_bp.route('/upload', methods=['POST'])
def upload_excel():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if not file.filename.endswith(('.xls', '.xlsx')):
        return jsonify({'error': 'Invalid file format. Please upload an Excel file.'}), 400

    try:
        df = pd.read_excel(file)
        # Expecting a column 'Entity' to determine what to import
        # E.g., 'Product', 'Operator', 'CreditCustomer', 'ExpenseType'
        
        entities_processed = 0
        
        for index, row in df.iterrows():
            entity_type = str(row.get('Entity', '')).strip().lower()
            
            if entity_type == 'product':
                code = str(row.get('code', ''))
                name = str(row.get('name', ''))
                if code and name:
                    prod = Product.query.filter_by(code=code).first()
                    if not prod:
                        prod = Product(code=code, name=name)
                        db.session.add(prod)
                    prod.category = str(row.get('category', prod.category))
                    prod.unit = str(row.get('unit', prod.unit))
                    if 'current_rate' in row and pd.notna(row['current_rate']):
                        prod.current_rate = float(row['current_rate'])
                    entities_processed += 1
            
            elif entity_type == 'operator':
                phone = str(row.get('phone', ''))
                name = str(row.get('name', ''))
                if phone and name:
                    op = Operator.query.filter_by(phone=phone).first()
                    if not op:
                        op = Operator(phone=phone, name=name)
                        db.session.add(op)
                    if 'daily_bata' in row and pd.notna(row['daily_bata']):
                        op.daily_bata = float(row['daily_bata'])
                    entities_processed += 1
                    
            elif entity_type == 'creditcustomer':
                code = str(row.get('code', ''))
                name = str(row.get('name', ''))
                if code and name:
                    cust = CreditCustomer.query.filter_by(code=code).first()
                    if not cust:
                        cust = CreditCustomer(code=code, name=name)
                        db.session.add(cust)
                    if 'phone' in row and pd.notna(row['phone']):
                        cust.phone = str(row['phone'])
                    if 'credit_limit' in row and pd.notna(row['credit_limit']):
                        cust.credit_limit = float(row['credit_limit'])
                    entities_processed += 1
                    
            elif entity_type == 'expensetype':
                name = str(row.get('name', ''))
                if name:
                    etype = ExpenseType.query.filter_by(name=name).first()
                    if not etype:
                        etype = ExpenseType(name=name)
                        db.session.add(etype)
                    if 'category' in row and pd.notna(row['category']):
                        etype.category = str(row['category'])
                    entities_processed += 1
                    
        db.session.commit()
        return jsonify({'message': f'Successfully processed {entities_processed} records from Excel.'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

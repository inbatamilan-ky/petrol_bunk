import xlrd, json, re

def clean_str(val):
    v = str(val).strip()
    if v == '' or v.lower() == 'nan': return ''
    if v.endswith('.0') and v[:-2].isdigit(): return v[:-2]
    return v

def safe_float(val):
    try:
        f = float(val)
        return round(f, 2)
    except:
        return 0.0

# ============================================================
# 1. CREDIT CUSTOMERS from Credit Customer-2024.xls
# ============================================================
wb_credit = xlrd.open_workbook('data/Credit Customer-2024.xls')
sh = wb_credit.sheets()[0]  # First sheet has full customer list

customer_names = []
opening_balances = {}

# Row 0 = headers (customer names)
for c in range(1, sh.ncols):
    name = clean_str(sh.cell_value(0, c))
    if name and name not in ('Total', ''):
        customer_names.append(name)

# Row 1 = "Last Month Balance"
for c in range(1, sh.ncols):
    name = clean_str(sh.cell_value(0, c))
    if name and name not in ('Total', ''):
        val = safe_float(sh.cell_value(1, c))
        opening_balances[name] = val

# Build customer objects
customers = []
cust_codes = {
    'KPJ': 'KPJ', 'Coke': 'COKE', 'Gopi': 'GOPI', 'Highways': 'HWY',
    'VDS': 'VDS', 'GKS': 'GKS', 'KJF': 'KJF', 'Bdo TVR': 'BDO',
    'AD Panchyat': 'ADP', 'SHT': 'SHT', 'SBT': 'SBT', 'Shivashanker': 'SVK',
    'Glotex': 'GLX', 'SMA': 'SMA', 'Sathish(Jai)': 'STJ', 
    'Trigel(GUNASEKAR GS)': 'TRG', 'ABL': 'ABL', 'Sujaini': 'SUJ',
    'KCCB': 'KCB', 'Velmurugan': 'VLM', 'TI': 'TI', 
    'Sri Road Lines(Subbra)': 'SRL', 'JDB': 'JDB', 'Jak': 'JAK',
    'Aarthi Eng': 'ART', '3 Star': '3ST', 'Selvam': 'SLV',
    'Annai': 'ANN', 'Mass': 'MAS', 'Jancy': 'JNC', 'SST': 'SST',
    'Anbu': 'ANB', 'VKS': 'VKS', 'GMS': 'GMS', 'GSS': 'GSS',
    'Subrra': 'SUB', 'Paster': 'PST', 'Sundaraj': 'SND',
    'KPJ-Vinoth': 'KPJV', 'KPJ Cons': 'KPJC', 'Putlur Panch': 'PTP',
    'SBR': 'SBR',
}

for i, name in enumerate(customer_names):
    code = cust_codes.get(name, name[:4].upper().replace(' ', ''))
    ob = opening_balances.get(name, 0.0)
    credit_limit = max(ob * 1.2, 500000.0) if ob > 0 else 500000.0
    customers.append({
        'id': f'cust-{i+1:03d}',
        'code': code,
        'name': name,
        'contactPerson': name,
        'phone': '+91 98421 00000',
        'vehicleNumbers': [],
        'creditLimit': round(credit_limit, 2),
        'outstandingBalance': ob,
        'openingBalance': ob,
        'status': 'ACTIVE',
        'address': 'Tamil Nadu, India',
    })

print(f"Extracted {len(customers)} customers")

# ============================================================
# 2. PRODUCTS from Daily Accounts first sheet
# ============================================================
wb_accounts = xlrd.open_workbook('data/Daily Accounts April 2024.xls')
sh1 = wb_accounts.sheets()[0]

# Row 2-4: HSD @ 92.71, MS @ 101.08, MS-II @ 101.08
products = [
    {
        'id': 'prod-001', 'code': 'HSD', 'name': 'HSD (Diesel)',
        'category': 'FUEL', 'unit': 'Litre', 'color': '#F59E0B',
        'currentRate': 92.71,
        'standardDensityRange': {'min': 820, 'max': 845},
    },
    {
        'id': 'prod-002', 'code': 'MS', 'name': 'MS (Petrol)',
        'category': 'FUEL', 'unit': 'Litre', 'color': '#10B981',
        'currentRate': 101.08,
        'standardDensityRange': {'min': 720, 'max': 775},
    },
    {
        'id': 'prod-003', 'code': 'MS2', 'name': 'MS Power (Petrol II)',
        'category': 'FUEL', 'unit': 'Litre', 'color': '#8B5CF6',
        'currentRate': 101.08,
        'standardDensityRange': {'min': 720, 'max': 775},
    },
    {
        'id': 'prod-004', 'code': 'LUB', 'name': 'Lubricants',
        'category': 'LUBRICANT', 'unit': 'Can', 'color': '#6B7280',
        'currentRate': 450.00,
        'standardDensityRange': {'min': 850, 'max': 900},
    },
]

# ============================================================
# 3. PUMPS (3 pumps from Credit Pump 1/2/3 structure)
# ============================================================
pumps = [
    {
        'id': 'pump-001', 'pumpNo': 1, 'name': 'Pump 1 (Main Island)',
        'status': 'ACTIVE',
        'nozzles': [
            {'id': 'noz-001-1', 'pumpId': 'pump-001', 'nozzleNo': 1,
             'productId': 'prod-001', 'productName': 'HSD (Diesel)', 'fuelCode': 'HSD',
             'color': '#F59E0B', 'currentMeterReading': 25000.00},
            {'id': 'noz-001-2', 'pumpId': 'pump-001', 'nozzleNo': 2,
             'productId': 'prod-002', 'productName': 'MS (Petrol)', 'fuelCode': 'MS',
             'color': '#10B981', 'currentMeterReading': 18500.00},
        ]
    },
    {
        'id': 'pump-002', 'pumpNo': 2, 'name': 'Pump 2 (Side Island)',
        'status': 'ACTIVE',
        'nozzles': [
            {'id': 'noz-002-1', 'pumpId': 'pump-002', 'nozzleNo': 1,
             'productId': 'prod-001', 'productName': 'HSD (Diesel)', 'fuelCode': 'HSD',
             'color': '#F59E0B', 'currentMeterReading': 31200.00},
            {'id': 'noz-002-2', 'pumpId': 'pump-002', 'nozzleNo': 2,
             'productId': 'prod-003', 'productName': 'MS Power (Petrol II)', 'fuelCode': 'MS2',
             'color': '#8B5CF6', 'currentMeterReading': 9800.00},
        ]
    },
    {
        'id': 'pump-003', 'pumpNo': 3, 'name': 'Pump 3 (Back Island)',
        'status': 'ACTIVE',
        'nozzles': [
            {'id': 'noz-003-1', 'pumpId': 'pump-003', 'nozzleNo': 1,
             'productId': 'prod-001', 'productName': 'HSD (Diesel)', 'fuelCode': 'HSD',
             'color': '#F59E0B', 'currentMeterReading': 19750.00},
            {'id': 'noz-003-2', 'pumpId': 'pump-003', 'nozzleNo': 2,
             'productId': 'prod-002', 'productName': 'MS (Petrol)', 'fuelCode': 'MS',
             'color': '#10B981', 'currentMeterReading': 14320.00},
        ]
    },
]

# ============================================================
# 4. OPERATORS
# ============================================================
operators = [
    {'id': 'op-001', 'name': 'Murugan R', 'phone': '+91 98421 11001', 'dailyBata': 350, 'active': True},
    {'id': 'op-002', 'name': 'Selvam K', 'phone': '+91 98421 11002', 'dailyBata': 350, 'active': True},
    {'id': 'op-003', 'name': 'Ravi S', 'phone': '+91 98421 11003', 'dailyBata': 350, 'active': True},
    {'id': 'op-004', 'name': 'Kumar T', 'phone': '+91 98421 11004', 'dailyBata': 350, 'active': True},
    {'id': 'op-005', 'name': 'Venkat P', 'phone': '+91 98421 11005', 'dailyBata': 350, 'active': True},
]

# ============================================================
# 5. EXPENSE TYPES from expenses structure
# ============================================================
expense_types = [
    {'id': 'et-001', 'name': 'Operator Bata / Salary', 'category': 'STAFF'},
    {'id': 'et-002', 'name': 'Staff Tea & Snacks', 'category': 'STAFF'},
    {'id': 'et-003', 'name': 'Density Test Sample', 'category': 'OPERATIONAL'},
    {'id': 'et-004', 'name': 'Pump Maintenance', 'category': 'MAINTENANCE'},
    {'id': 'et-005', 'name': 'Electricity Bill', 'category': 'OPERATIONAL'},
    {'id': 'et-006', 'name': 'Cleaning Supplies', 'category': 'OPERATIONAL'},
    {'id': 'et-007', 'name': 'Nozzle / Meter Calibration', 'category': 'MAINTENANCE'},
    {'id': 'et-008', 'name': 'Generator Fuel', 'category': 'OPERATIONAL'},
    {'id': 'et-009', 'name': 'Bank Charges', 'category': 'FINANCIAL'},
    {'id': 'et-010', 'name': 'Office Supplies', 'category': 'OPERATIONAL'},
    {'id': 'et-011', 'name': 'Security Guard Bata', 'category': 'STAFF'},
    {'id': 'et-012', 'name': 'Vehicle Repair', 'category': 'MAINTENANCE'},
    {'id': 'et-013', 'name': 'Miscellaneous', 'category': 'OPERATIONAL'},
]

# ============================================================
# 6. SHIFTS from Daily Accounts (first 7 days of April 2024)
# ============================================================
def make_shift(date_str, pump_id, pump_no, op_id, op_name, shift_no, nozzles_data):
    """nozzles_data: list of (nozzle_id, nozzle_no, prod_name, fuel_code, rate, opening, closing)"""
    readings = []
    total_litres = 0
    total_amount = 0
    for nd in nozzles_data:
        noz_id, noz_no, prod_name, fuel_code, rate, opening, closing = nd
        sold = max(0, round(closing - opening, 2))
        amount = round(sold * rate, 2)
        total_litres += sold
        total_amount += amount
        readings.append({
            'nozzleId': noz_id,
            'nozzleNo': noz_no,
            'productName': prod_name,
            'fuelCode': fuel_code,
            'rate': rate,
            'openingReading': opening,
            'closingReading': closing,
            'testingLitres': 0,
            'litresSold': sold,
            'grossAmount': amount,
        })

    total_litres = round(total_litres, 2)
    total_amount = round(total_amount, 2)
    cash = round(total_amount * 0.55, 2)
    upi = round(total_amount * 0.25, 2)
    credit = round(total_amount * 0.15, 2)
    card = round(total_amount * 0.05, 2)
    total_coll = round(cash + upi + credit + card, 2)

    return {
        'id': f'shift-{shift_no:03d}',
        'shiftNo': f'SHT-{date_str.replace("-", "")}-{shift_no:02d}',
        'shiftDate': date_str,
        'shiftType': 'Full Day',
        'pumpId': pump_id,
        'pumpNo': pump_no,
        'operatorId': op_id,
        'operatorName': op_name,
        'openedAt': f'{date_str}T06:00:00.000Z',
        'closedAt': f'{date_str}T18:00:00.000Z',
        'status': 'CLOSED',
        'meterReadings': readings,
        'totalLitresSold': total_litres,
        'totalSalesAmount': total_amount,
        'expensesDeducted': 0,
        'collections': {
            'cash': cash,
            'upiGpay': upi,
            'card': card,
            'fleetCard': 0,
            'creditSales': credit,
            'cheque': 0,
        },
        'totalCollected': total_coll,
        'shortageOrExcess': round(total_coll - total_amount, 2),
        'notes': '',
    }

# Read actual meter readings from daily accounts sheets
shifts = []
shift_counter = 1

# Extract from first 7 sheets (01.04.2024 - 07.04.2024)
HSD_RATE = 92.71
MS_RATE = 101.08

# Track running meter readings
p1_hsd_open = 18078.93
p1_ms_open = 5000.00
p2_hsd_open = 22000.00
p2_ms2_open = 3500.00
p3_hsd_open = 16000.00
p3_ms_open = 11000.00

for i, sh in enumerate(wb_accounts.sheets()[:14]):
    if sh.nrows < 10: continue
    sheet_name = sh.name  # e.g. "01.04.2024"
    
    # Parse date
    try:
        parts = sheet_name.split('.')
        if len(parts) == 3:
            date_str = f'2024-{parts[1].zfill(2)}-{parts[0].zfill(2)}'
        else:
            continue
    except:
        continue

    # Get closing meter for Nozzle 1 HSD from pump 1 (row 9, col 2)
    try:
        p1_hsd_close = safe_float(sh.cell_value(9, 2))  # row 9 = Nozzle 1 Closing Meter
        if p1_hsd_close <= 0: p1_hsd_close = p1_hsd_open + 1800
    except:
        p1_hsd_close = p1_hsd_open + 1800

    # Try to get row 17-20 for MS
    p1_ms_close = p1_ms_open + 800
    p2_hsd_close = p2_hsd_open + 1200
    p2_ms2_close = p2_ms2_open + 400
    p3_hsd_close = p3_hsd_open + 900
    p3_ms_close = p3_ms_open + 600

    # Pump 1 shift
    shifts.append(make_shift(date_str, 'pump-001', 1, 'op-001', 'Murugan R', shift_counter,
        [
            ('noz-001-1', 1, 'HSD (Diesel)', 'HSD', HSD_RATE, p1_hsd_open, p1_hsd_close),
            ('noz-001-2', 2, 'MS (Petrol)', 'MS', MS_RATE, p1_ms_open, p1_ms_close),
        ]
    ))
    shift_counter += 1

    p1_hsd_open = p1_hsd_close
    p1_ms_open = p1_ms_close
    p2_hsd_open = p2_hsd_close
    p2_ms2_open = p2_ms2_close
    p3_hsd_open = p3_hsd_close
    p3_ms_open = p3_ms_close

print(f"Generated {len(shifts)} shifts")

# ============================================================
# 7. CREDIT TRANSACTIONS from accounts (first few days)
# ============================================================
credit_transactions = []
slip_counter = 1

# Use the customer data from account sheets' credit sections
# Row 5+ in daily accounts: customer, qty, rate, amount
for i, sh in enumerate(wb_accounts.sheets()[:7]):
    if sh.nrows < 10: continue
    sheet_name = sh.name
    try:
        parts = sheet_name.split('.')
        if len(parts) == 3:
            date_str = f'2024-{parts[1].zfill(2)}-{parts[0].zfill(2)}'
        else: continue
    except: continue

    for row in range(5, min(sh.nrows - 5, 25)):
        try:
            cust_name = clean_str(sh.cell_value(row, 7))
            qty = safe_float(sh.cell_value(row, 8))
            rate = safe_float(sh.cell_value(row, 9))
            amount = safe_float(sh.cell_value(row, 10))
            if not cust_name or qty <= 0 or amount <= 0: continue

            # Find matching customer
            cust = next((c for c in customers if c['name'].lower() == cust_name.lower()), None)
            if not cust:
                # Try partial match
                cust = next((c for c in customers if cust_name.lower() in c['name'].lower()), None)

            if cust:
                credit_transactions.append({
                    'id': f'ctx-{slip_counter:04d}',
                    'slipNo': f'SLIP-{date_str.replace("-", "")}-{slip_counter:03d}',
                    'customerId': cust['id'],
                    'customerName': cust['name'],
                    'customerCode': cust['code'],
                    'date': date_str,
                    'time': '10:30 AM',
                    'pumpId': 'pump-001',
                    'pumpNo': 1,
                    'productId': 'prod-001',
                    'productName': 'HSD (Diesel)',
                    'vehicleNo': '',
                    'litres': qty,
                    'rate': rate if rate > 0 else HSD_RATE,
                    'amount': amount,
                    'remarks': 'Credit sale',
                })
                slip_counter += 1
        except: continue

print(f"Generated {len(credit_transactions)} credit transactions")

# ============================================================
# 8. EXPENSES
# ============================================================
expenses_data = []

try:
    wb_exp = xlrd.open_workbook('data/Daily Expenses 2024.xls')
    sh_exp = wb_exp.sheets()[0]  # First sheet
    
    for row in range(1, min(sh_exp.nrows, 30)):
        try:
            date_val = clean_str(sh_exp.cell_value(row, 0))
            if not date_val or date_val == 'nan': continue
            
            for col in range(1, sh_exp.ncols - 1):
                amt = safe_float(sh_exp.cell_value(row, col))
                if amt > 0:
                    header = clean_str(sh_exp.cell_value(0, col))
                    if not header: continue
                    expenses_data.append({
                        'date_raw': date_val,
                        'paid_to': header,
                        'amount': amt,
                    })
        except: continue
except Exception as e:
    print(f"Expense parse error: {e}")

# Convert to Expense objects
exp_objects = []
for j, e in enumerate(expenses_data[:50]):
    # Try parse date
    dr = e['date_raw']
    try:
        parts = dr.split('.')
        if len(parts) == 3:
            date_str = f'2024-{parts[1].zfill(2)}-{parts[0].zfill(2)}'
        else:
            date_str = '2024-04-01'
    except:
        date_str = '2024-04-01'

    exp_objects.append({
        'id': f'exp-{j+1:04d}',
        'voucherNo': f'VCH-{date_str.replace("-","")}-{j+1:03d}',
        'date': date_str,
        'expenseTypeId': 'et-001',
        'expenseTypeName': 'Operator Bata / Salary',
        'amount': e['amount'],
        'paidTo': e['paid_to'],
        'paidBy': 'Manager',
        'remarks': '',
        'isCreditNote': False,
    })

print(f"Generated {len(exp_objects)} expenses")

# ============================================================
# 9. TANKS
# ============================================================
tanks = [
    {
        'id': 'tank-001', 'name': 'Tank 1 (HSD)', 'productId': 'prod-001',
        'productName': 'HSD (Diesel)', 'capacityLitres': 20000,
        'currentStockLitres': 12500, 'diameterCm': 250, 'status': 'NORMAL',
    },
    {
        'id': 'tank-002', 'name': 'Tank 2 (MS)', 'productId': 'prod-002',
        'productName': 'MS (Petrol)', 'capacityLitres': 15000,
        'currentStockLitres': 8200, 'diameterCm': 220, 'status': 'NORMAL',
    },
    {
        'id': 'tank-003', 'name': 'Tank 3 (MS Power)', 'productId': 'prod-003',
        'productName': 'MS Power (Petrol II)', 'capacityLitres': 10000,
        'currentStockLitres': 4100, 'diameterCm': 200, 'status': 'NORMAL',
    },
]

# ============================================================
# 10. BANK DEPOSITS
# ============================================================
bank_deposits = [
    {
        'id': 'dep-001',
        'depositDate': '2024-04-01',
        'bankName': 'State Bank of India',
        'accountNo': '30982245109',
        'amount': 150000,
        'denominations': {'note2000': 0, 'note500': 250, 'note200': 100, 'note100': 100, 'note50': 0, 'note20': 0, 'note10': 0, 'coins': 0},
        'depositedBy': 'Manager',
        'referenceNo': 'SBI-CHQ-001',
        'notes': 'Daily cash deposit',
    },
]

# ============================================================
# SAVE TO JSON
# ============================================================
seed_data = {
    'products': products,
    'pumps': pumps,
    'operators': operators,
    'customers': customers,
    'expenseTypes': expense_types,
    'shifts': shifts,
    'creditTransactions': credit_transactions,
    'creditPayments': [],
    'expenses': exp_objects,
    'bankDeposits': bank_deposits,
    'tanks': tanks,
}

with open('src/data/seedData.json', 'w', encoding='utf-8') as f:
    json.dump(seed_data, f, indent=2, ensure_ascii=False)

print(f"\nSaved seedData.json:")
print(f"  Products: {len(products)}")
print(f"  Pumps: {len(pumps)}")
print(f"  Operators: {len(operators)}")
print(f"  Customers: {len(customers)}")
print(f"  ExpenseTypes: {len(expense_types)}")
print(f"  Shifts: {len(shifts)}")
print(f"  CreditTransactions: {len(credit_transactions)}")
print(f"  Expenses: {len(exp_objects)}")
print(f"  Tanks: {len(tanks)}")

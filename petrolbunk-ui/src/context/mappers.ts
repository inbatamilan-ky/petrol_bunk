import {
  Product,
  Pump,
  Nozzle,
  Operator,
  CreditCustomer,
  ExpenseType,
  Shift,
  CreditTransaction,
  CreditPayment,
  Expense,
  BankDeposit,
  Tank,
  TankDip,
  MeterReadingEntry,
  SmsLogEntry,
  Branch,
  BankAccount,
  DailyNozzleMeter,
  FuelRateHistory,
} from '../types';

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-001',
    code: 'HSD',
    name: 'HSD (Diesel)',
    category: 'FUEL',
    unit: 'Litre',
    color: '#D97706',
    currentRate: 92,
    hsnCode: '2710',
    gstRate: 0,
    tankCapacity: 45000,
    densityStandardAt15C: 833,
    standardDensityRange: { min: 820, max: 845 },
    active: true,
  },
  {
    id: 'prod-002',
    code: 'MS',
    name: 'MS (Petrol)',
    category: 'FUEL',
    unit: 'Litre',
    color: '#059669',
    currentRate: 101,
    hsnCode: '2710',
    gstRate: 0,
    tankCapacity: 30000,
    densityStandardAt15C: 742,
    standardDensityRange: { min: 720, max: 775 },
    active: true,
  },
  {
    id: 'prod-003',
    code: 'MS2',
    name: 'Speed / XP95 (Premium)',
    category: 'FUEL',
    unit: 'Litre',
    color: '#3B82F6',
    currentRate: 105,
    hsnCode: '2710',
    gstRate: 0,
    tankCapacity: 20000,
    densityStandardAt15C: 746,
    standardDensityRange: { min: 720, max: 775 },
    active: true,
  },
  {
    id: 'prod-004',
    code: 'LUB',
    name: 'Engine Lubricants & 2T Oil',
    category: 'LUBRICANT',
    unit: 'Can',
    color: '#8B5CF6',
    currentRate: 450,
    hsnCode: '2710',
    gstRate: 18,
    tankCapacity: 500,
    densityStandardAt15C: 875,
    standardDensityRange: { min: 850, max: 900 },
    active: true,
  },
];

export const DEFAULT_PUMPS: Pump[] = [
  {
    id: 'pump-1',
    pumpNo: 1,
    name: 'Main Forecourt Pump 1',
    model: 'Midco MPD Duo Plus',
    serialNumber: 'MDC-2023-8821',
    makeModel: 'Midco',
    pesoSealNo: 'PESO-WM-TN-88219',
    installationDate: '2023-04-15',
    tankId: 'Tank 1 (HSD) / Tank 2 (MS)',
    side: 'Dual Side',
    status: 'ACTIVE',
    nozzles: [
      { id: 'noz-1', pumpId: 'pump-1', nozzleNo: 1, productId: 'prod-001', productName: 'HSD (Diesel)', fuelCode: 'HSD', color: '#D97706', currentMeterReading: 12450.5, status: 'ACTIVE' },
      { id: 'noz-2', pumpId: 'pump-1', nozzleNo: 2, productId: 'prod-002', productName: 'MS (Petrol)', fuelCode: 'MS', color: '#059669', currentMeterReading: 48920.0, status: 'ACTIVE' },
    ],
  },
  {
    id: 'pump-2',
    pumpNo: 2,
    name: 'Fast Lane Pump 2',
    model: 'Tokheim Quantium 510',
    serialNumber: 'TKH-2022-9014',
    makeModel: 'Tokheim',
    pesoSealNo: 'PESO-WM-TN-88220',
    installationDate: '2022-11-20',
    tankId: 'Tank 1 (HSD) / Tank 2 (MS)',
    side: 'Dual Side',
    status: 'ACTIVE',
    nozzles: [
      { id: 'noz-3', pumpId: 'pump-2', nozzleNo: 1, productId: 'prod-001', productName: 'HSD (Diesel)', fuelCode: 'HSD', color: '#D97706', currentMeterReading: 8930.2, status: 'ACTIVE' },
      { id: 'noz-4', pumpId: 'pump-2', nozzleNo: 2, productId: 'prod-002', productName: 'MS (Petrol)', fuelCode: 'MS', color: '#059669', currentMeterReading: 32150.8, status: 'ACTIVE' },
    ],
  },
  {
    id: 'pump-3',
    pumpNo: 3,
    name: 'Commercial Truck Pump 3',
    model: 'Gilbarco SK700-II Heavy Flow',
    serialNumber: 'GLB-2024-1102',
    makeModel: 'Gilbarco',
    pesoSealNo: 'PESO-WM-TN-88221',
    installationDate: '2024-01-10',
    tankId: 'Tank 1 (HSD) / Tank 3 (XP95)',
    side: 'Commercial Heavy Lane',
    status: 'ACTIVE',
    nozzles: [
      { id: 'noz-5', pumpId: 'pump-3', nozzleNo: 1, productId: 'prod-001', productName: 'HSD (Diesel)', fuelCode: 'HSD', color: '#D97706', currentMeterReading: 78910.4, status: 'ACTIVE' },
      { id: 'noz-6', pumpId: 'pump-3', nozzleNo: 2, productId: 'prod-003', productName: 'Speed / XP95 (Premium)', fuelCode: 'MS2', color: '#3B82F6', currentMeterReading: 4120.0, status: 'ACTIVE' },
    ],
  },
];

// ─── Field mappers: API (snake_case) ↔ Frontend (camelCase) ─────────────────

export function mapProduct(a: any): Product {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    category: a.category,
    unit: a.unit ?? 'Litre',
    color: a.color ?? '#3B82F6',
    currentRate: Number(a.current_rate ?? a.currentRate ?? 0),
    hsnCode: a.hsn_code ?? a.hsnCode ?? '2710',
    gstRate: Number(a.gst_rate ?? a.gstRate ?? 0),
    tankCapacity: Number(a.tank_capacity ?? a.tankCapacity ?? 20000),
    densityStandardAt15C: Number(a.density_std ?? a.densityStandardAt15C ?? 750),
    standardDensityRange: {
      min: Number(a.density_min ?? a.standardDensityRange?.min ?? 0),
      max: Number(a.density_max ?? a.standardDensityRange?.max ?? 0),
    },
    active: a.active !== false,
  };
}

export function mapNozzle(a: any): Nozzle {
  return {
    id: a.id,
    pumpId: a.pump_id,
    nozzleNo: a.nozzle_no,
    productId: a.product_id,
    productName: a.product_name ?? '',
    fuelCode: a.fuel_code ?? a.product_id,
    color: a.color ?? '#94A3B8',
    currentMeterReading: Number(a.current_meter_reading),
    status: a.status ?? 'ACTIVE',
  };
}

export function mapPump(a: any): Pump {
  return {
    id: a.id,
    pumpNo: a.pump_no,
    name: a.name,
    model: a.model ?? 'Midco MPD Multi-Product',
    serialNumber: a.serial_number ?? a.serialNumber ?? 'SN-PUMP-' + a.pump_no,
    makeModel: a.make_model ?? a.makeModel ?? 'Midco',
    pesoSealNo: a.peso_seal_no ?? a.pesoSealNo ?? 'PESO-CALIB-2024',
    installationDate: a.installation_date ?? a.installationDate ?? '2023-01-01',
    tankId: a.tank_id ?? a.tankId ?? 'Tank 1',
    side: a.side ?? 'Dual Side',
    status: a.status ?? 'ACTIVE',
    nozzles: (a.nozzles ?? []).map(mapNozzle),
  };
}

export function mapOperator(a: any): Operator {
  return {
    id: a.id,
    name: a.name,
    phone: a.phone ?? '',
    employeeCode: a.employee_code ?? a.employeeCode ?? 'EMP-' + a.id.slice(-3),
    aadhaarNo: a.aadhaar_no ?? a.aadhaarNo ?? 'XXXX-XXXX-8921',
    dailyBata: Number(a.daily_bata ?? 150),
    monthlySalary: Number(a.monthly_salary ?? a.monthlySalary ?? 18000),
    joiningDate: a.joining_date ?? a.joiningDate ?? '2023-06-01',
    emergencyContact: a.emergency_contact ?? a.emergencyContact ?? '',
    assignedShift: a.assigned_shift ?? a.assignedShift ?? 'Morning',
    status: a.status ?? (a.active !== false ? 'ACTIVE' : 'INACTIVE'),
    active: a.active !== false,
  };
}

export function mapCustomer(a: any): CreditCustomer {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    contactPerson: a.contact_person ?? a.contactPerson ?? '',
    phone: a.phone ?? '',
    email: a.email ?? '',
    gstin: a.gstin ?? '33AAAAA0000A1Z5',
    panNumber: a.pan_number ?? a.panNumber ?? 'AAAAA0000A',
    creditPeriodDays: Number(a.credit_period_days ?? a.creditPeriodDays ?? 15),
    discountPerLitre: Number(a.discount_per_litre ?? a.discountPerLitre ?? 0),
    maxVehiclesAllowed: Number(a.max_vehicles_allowed ?? a.maxVehiclesAllowed ?? 10),
    vehicleNumbers: a.vehicle_numbers ?? a.vehicleNumbers ?? [],
    creditLimit: Number(a.credit_limit ?? a.creditLimit ?? 0),
    outstandingBalance: Number(a.outstanding_balance ?? a.outstandingBalance ?? 0),
    openingBalance: Number(a.opening_balance ?? a.openingBalance ?? 0),
    status: a.status ?? 'ACTIVE',
    address: a.address ?? '',
    billingAddress: a.billing_address ?? a.billingAddress ?? a.address ?? '',
  };
}

export function mapExpenseType(a: any): ExpenseType {
  return { id: a.id, name: a.name, category: a.category, active: a.active !== false };
}

export function mapMeterReading(a: any): MeterReadingEntry {
  return {
    nozzleId: a.nozzle_id,
    nozzleNo: a.nozzle_no,
    productName: a.product_name,
    fuelCode: a.fuel_code,
    rate: Number(a.rate),
    openingReading: Number(a.opening_reading),
    closingReading: Number(a.closing_reading),
    testingLitres: Number(a.testing_litres),
    litresSold: Number(a.litres_sold),
    grossAmount: Number(a.gross_amount),
  };
}

export function mapShift(a: any): Shift {
  return {
    id: a.id,
    shiftNo: a.shift_no,
    shiftDate: typeof a.shift_date === 'string' ? a.shift_date : String(a.shift_date),
    shiftType: a.shift_type,
    pumpId: a.pump_id,
    pumpNo: a.pump_no,
    operatorId: a.operator_id,
    operatorName: a.operator_name,
    openedAt: a.opened_at,
    closedAt: a.closed_at ?? undefined,
    status: a.status,
    meterReadings: (a.meter_readings ?? []).map(mapMeterReading),
    totalLitresSold: Number(a.total_litres_sold),
    totalSalesAmount: Number(a.total_sales_amount),
    expensesDeducted: Number(a.expenses_deducted),
    collections: {
      cash: Number(a.cash_collected),
      upiGpay: Number(a.upi_gpay_collected),
      card: Number(a.card_collected),
      fleetCard: Number(a.fleet_card_collected),
      creditSales: Number(a.credit_sales),
      cheque: Number(a.cheque_collected),
    },
    totalCollected: Number(a.total_collected),
    shortageOrExcess: Number(a.shortage_or_excess),
    notes: a.notes ?? '',
  };
}

export function mapCreditTransaction(a: any): CreditTransaction {
  return {
    id: a.id,
    slipNo: a.slip_no,
    customerId: a.customer_id,
    customerName: a.customer_name ?? '',
    customerCode: a.customer_code ?? '',
    date: typeof a.date === 'string' ? a.date : String(a.date),
    time: a.time ?? '',
    pumpId: a.pump_id ?? '',
    pumpNo: a.pump_no ?? 0,
    productId: a.product_id,
    productName: a.product_name ?? '',
    vehicleNo: a.vehicle_no ?? '',
    litres: Number(a.litres),
    rate: Number(a.rate),
    amount: Number(a.amount),
    driverName: a.driver_name,
    remarks: a.remarks,
  };
}

export function mapCreditPayment(a: any): CreditPayment {
  return {
    id: a.id,
    receiptNo: a.receipt_no,
    customerId: a.customer_id,
    customerName: a.customer_name ?? '',
    customerCode: a.customer_code ?? '',
    date: typeof a.date === 'string' ? a.date : String(a.date),
    amount: Number(a.amount),
    paymentMode: a.payment_mode,
    referenceNo: a.reference_no,
    notes: a.notes,
    receivedBy: a.received_by ?? '',
  };
}

export function mapExpense(a: any): Expense {
  return {
    id: a.id,
    voucherNo: a.voucher_no,
    date: typeof a.date === 'string' ? a.date : String(a.date),
    expenseTypeId: a.expense_type_id,
    expenseTypeName: a.expense_type_name,
    amount: Number(a.amount),
    pumpId: a.pump_id,
    paidTo: a.paid_to ?? '',
    paidBy: a.paid_by ?? '',
    remarks: a.remarks,
    isCreditNote: a.is_credit_note,
  };
}

export function mapBankDeposit(a: any): BankDeposit {
  return {
    id: a.id,
    depositDate: typeof a.deposit_date === 'string' ? a.deposit_date : String(a.deposit_date),
    bankName: a.bank_name,
    accountNo: a.account_no,
    amount: Number(a.amount),
    denominations: {
      note2000: a.note_2000,
      note500: a.note_500,
      note200: a.note_200,
      note100: a.note_100,
      note50: a.note_50,
      note20: a.note_20,
      note10: a.note_10,
      coins: Number(a.coins),
    },
    depositedBy: a.deposited_by ?? '',
    referenceNo: a.reference_no ?? '',
    notes: a.notes,
  };
}

export function mapTank(a: any): Tank {
  return {
    id: a.id,
    name: a.name,
    productId: a.product_id,
    productName: a.product_name ?? '',
    capacityLitres: Number(a.capacity_litres),
    currentStockLitres: Number(a.current_stock_litres),
    diameterCm: Number(a.diameter_cm ?? 0),
    status: a.status,
  };
}

export function mapTankDip(a: any): TankDip {
  return {
    id: a.id,
    tankId: a.tank_id,
    tankName: a.tank_name,
    productName: a.product_name,
    dipDate: typeof a.dip_date === 'string' ? a.dip_date : String(a.dip_date),
    dipType: a.dip_type,
    fuelDipCm: Number(a.fuel_dip_cm),
    fuelDipLitres: Number(a.fuel_dip_litres),
    waterDipCm: Number(a.water_dip_cm),
    observedDensity: Number(a.observed_density),
    observedTemp: Number(a.observed_temp),
    convertedDensity: Number(a.converted_density),
    bookStockLitres: Number(a.book_stock_litres),
    variance: Number(a.variance),
    testedBy: a.tested_by,
    remarks: a.remarks,
  };
}

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'B-01',
    name: 'BPCL Chennai Central Auto Fuel',
    omc_brand: 'BPCL',
    dealer_code: '184920',
    location: 'Chennai (Tamil Nadu)',
    is_active: true,
    gstin: '33AABCB1849A1Z2',
    peso_license_no: 'PESO-EXP-TN-2023-9011',
    operating_hours: '24 Hours Open',
    contact_email: 'chennai.central@bpclfuels.in',
    address_street: 'No. 42, Anna Salai, Guindy',
    pincode: '600032',
    manager_name: 'Suresh Kumar',
    manager_phone: '+91 98401 23456',
    manager_email: 'suresh.bpcl@kypetrol.com',
    manager_access: 'Full Shift & Meter Entry',
    bunk_name: 'BPCL Chennai Central Auto Fuel',
    city: 'Chennai (Tamil Nadu)',
    auto_fetch_enabled: true,
    auto_apply_enabled: true,
  },
  {
    id: 'B-02',
    name: 'IOCL Madurai Bypass Station',
    omc_brand: 'IOCL',
    dealer_code: '294811',
    location: 'Madurai (Tamil Nadu)',
    is_active: true,
    gstin: '33AABCI2948A1Z5',
    peso_license_no: 'PESO-EXP-TN-2022-8114',
    operating_hours: '05:00 AM - 11:30 PM',
    contact_email: 'madurai.bypass@ioclfuels.in',
    address_street: 'NH 44 Ring Road Junction, Mattuthavani',
    pincode: '625020',
    manager_name: 'Ramesh Selvam',
    manager_phone: '+91 94432 87654',
    manager_email: 'ramesh.iocl@kypetrol.com',
    manager_access: 'Shift & Daybook Access',
    bunk_name: 'IOCL Madurai Bypass Station',
    city: 'Madurai (Tamil Nadu)',
    auto_fetch_enabled: true,
    auto_apply_enabled: true,
  },
  {
    id: 'B-03',
    name: 'HPCL Coimbatore Highway Express',
    omc_brand: 'HPCL',
    dealer_code: '319042',
    location: 'Coimbatore (Tamil Nadu)',
    is_active: true,
    gstin: '33AABCH3190A1Z9',
    peso_license_no: 'PESO-EXP-TN-2024-1120',
    operating_hours: '24 Hours Open',
    contact_email: 'cbe.highway@hpclfuels.in',
    address_street: 'Avinashi Road Express Corridor',
    pincode: '641014',
    manager_name: 'Karthik Raja',
    manager_phone: '+91 97890 54321',
    manager_email: 'karthik.hpcl@kypetrol.com',
    manager_access: 'Full Operational Access',
    bunk_name: 'HPCL Coimbatore Highway Express',
    city: 'Coimbatore (Tamil Nadu)',
    auto_fetch_enabled: true,
    auto_apply_enabled: true,
  },
  {
    id: 'B-04',
    name: 'Nayara Salem Ring Road Fuel',
    omc_brand: 'NAYARA',
    dealer_code: '450912',
    location: 'Salem (Tamil Nadu)',
    is_active: true,
    gstin: '33AABCN4509A1Z3',
    peso_license_no: 'PESO-EXP-TN-2023-7729',
    operating_hours: '06:00 AM - 11:00 PM',
    contact_email: 'salem.ringroad@nayaraenergy.in',
    address_street: 'Omalur Main Road Junction',
    pincode: '636004',
    manager_name: 'Manoj Prabhakar',
    manager_phone: '+91 96291 11223',
    manager_email: 'manoj.nayara@kypetrol.com',
    manager_access: 'Shift & Meter Entry Only',
    bunk_name: 'Nayara Salem Ring Road Fuel',
    city: 'Salem (Tamil Nadu)',
    auto_fetch_enabled: true,
    auto_apply_enabled: true,
  },
];

export function mapBranch(a: any): Branch {
  return {
    id: a?.id ?? 'B-01',
    name: a?.name ?? a?.bunk_name ?? 'KY Petrol Bunk',
    omc_brand: a?.omc_brand ?? 'IOCL',
    dealer_code: a?.dealer_code ?? '184920',
    location: a?.location ?? a?.city ?? a?.state ?? 'Chennai (Tamil Nadu)',
    is_active: a?.is_active !== false,
    gstin: a?.gstin ?? '33AABCB1849A1Z2',
    peso_license_no: a?.peso_license_no ?? a?.pesoLicenseNo ?? 'PESO-EXP-2024-9912',
    operating_hours: a?.operating_hours ?? a?.operatingHours ?? '24 Hours Open',
    contact_email: a?.contact_email ?? a?.contactEmail ?? '',
    address_street: a?.address_street ?? a?.addressStreet ?? '',
    pincode: a?.pincode ?? '600001',
    manager_name: a?.manager_name ?? a?.managerName ?? 'Assigned Manager',
    manager_phone: a?.manager_phone ?? a?.managerPhone ?? '',
    manager_email: a?.manager_email ?? a?.managerEmail ?? '',
    manager_access: a?.manager_access ?? a?.managerAccess ?? 'Full Operational Access',
    bunk_name: a?.bunk_name ?? a?.name ?? 'KY Petrol Bunk',
    city: a?.city ?? a?.location ?? 'Chennai (Tamil Nadu)',
    auto_fetch_enabled: a?.auto_fetch_enabled !== false,
    auto_apply_enabled: a?.auto_apply_enabled !== false,
  };
}

export function mapBankAccount(a: any): BankAccount {
  return {
    id: a.id,
    bankName: a.bank_name,
    accountNumber: a.account_number,
    accountType: a.account_type ?? 'Current',
    branchName: a.branch_name,
    ifscCode: a.ifsc_code,
    accountHolderName: a.account_holder_name ?? a.accountHolderName ?? 'KY Fuels Enterprise',
    branchAddress: a.branch_address ?? a.branchAddress ?? '',
    upiVpa: a.upi_vpa ?? a.upiVpa ?? 'kyfuels@sbi',
    posTerminalId: a.pos_terminal_id ?? a.posTerminalId ?? 'TID-982104',
    overdraftLimit: Number(a.overdraft_limit ?? a.overdraftLimit ?? 500000),
    openingBalance: Number(a.opening_balance ?? 0),
    currentBalance: Number(a.current_balance ?? a.opening_balance ?? 0),
    isPrimary: a.is_primary === true,
    isActive: a.is_active !== false,
  };
}

export function mapDailyNozzleMeter(a: any): DailyNozzleMeter {
  return {
    id: a.id,
    readingDate: typeof a.reading_date === 'string' ? a.reading_date : String(a.reading_date),
    pumpId: a.pump_id,
    nozzleId: a.nozzle_id,
    productId: a.product_id,
    openingMeter: Number(a.opening_meter ?? 0),
    closingMeter: Number(a.closing_meter ?? 0),
    testingLitres: Number(a.testing_litres ?? 0),
    litresSold: Number(a.litres_sold ?? 0),
    sellingRate: Number(a.selling_rate ?? 0),
    grossAmount: Number(a.gross_amount ?? 0),
    recordedBy: a.recorded_by,
  };
}

export function mapSmsLog(a: any): SmsLogEntry {
  return {
    id: a.id,
    sender: a.sender,
    receivedAt: a.received_at,
    rawText: a.raw_text,
    omc: a.omc ?? 'IOCL',
    effectiveDateTime: a.effective_datetime,
    parsedRates: Array.isArray(a.parsed_rates) ? a.parsed_rates : [],
    status: a.status ?? 'PENDING',
    appliedAt: a.applied_at,
    appliedBy: a.applied_by,
  };
}

export function mapFuelRateHistory(a: any): FuelRateHistory {
  return {
    id: a.id,
    productId: a.product_id,
    productCode: a.product_code,
    productName: a.product_name,
    effectiveDate: typeof a.effective_date === 'string' ? a.effective_date : String(a.effective_date),
    oldRate: Number(a.old_rate ?? 0),
    newRate: Number(a.new_rate ?? 0),
    changeSource: a.change_source ?? 'MANUAL_ENTRY',
    changedBy: a.changed_by ?? 'Manager',
    remarks: a.remarks,
    createdAt: a.created_at,
  };
}

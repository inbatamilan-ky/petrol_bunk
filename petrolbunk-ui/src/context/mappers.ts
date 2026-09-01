import {
  Product,
  Pump,
  Nozzle,
  Operator,
  CreditCustomer,
  ExpenseType,
  CreditTransaction,
  CreditPayment,
  Expense,
  BankDeposit,
  Settlement,
  PumpDayAttribution,
  DailyCashReconciliation,
  DailyNozzleMeter,
  FuelRateHistory,
  Branch,
  MasterBank,
  MasterChannel,
  MasterPaymentMode,
  DashboardSummary,
} from '../types';

// ─── The 33 Standard Expense Heads from Daily_Expenses.xls ───────────────
export const EXCEL_EXPENSE_HEADS: string[] = [
  'Salary', 'Bata', 'Tea', 'Pooja', 'Gokulam Chit', 'Density', 'Lorry Bata', 'Petrol',
  'Bank Charges', 'Car Diesel', 'Police', 'Stationary', 'EB Bill', 'Net Bill', 'Guna',
  'Akka', 'POS Rent', 'Donation', 'Rent', 'Temple', 'Auditor', 'Coupon', 'Cleaning Mat',
  'Maintanance', 'Pump Main', 'Bank Interest', 'Bank Loan EMI', 'Advance',
  'TCS/TDS/IT Tax', 'D. Water', 'Lube Discount', 'New Outlet', 'Others',
];

// ─── Field mappers: API (snake_case) ↔ Frontend (camelCase) ─────────────────

export function mapProduct(a: any): Product {
  return {
    id: String(a?.id ?? ''),
    code: String(a?.code ?? ''),
    name: String(a?.name ?? ''),
    category: a?.category ?? 'FUEL',
    currentRate: Number(a?.current_rate ?? a?.currentRate ?? 0),
    active: a?.active !== false,
    color: a?.color ?? '#3B82F6',
    unit: a?.unit ?? 'Litre',
    hsnCode: a?.hsn_code ?? a?.hsnCode ?? '2710',
    gstRate: Number(a?.gst_rate ?? a?.gstRate ?? 0),
    tankCapacity: Number(a?.tank_capacity ?? a?.tankCapacity ?? 20000),
    densityStandardAt15C: Number(a?.density_standard_at_15c ?? a?.densityStandardAt15C ?? 750),
    standardDensityRange: {
      min: Number(a?.density_min ?? a?.standardDensityRange?.min ?? 720),
      max: Number(a?.density_max ?? a?.standardDensityRange?.max ?? 775),
    },
    shortName: a?.short_name ?? a?.shortName ?? '',
  };
}

export function mapNozzle(a: any): Nozzle {
  return {
    id: String(a?.id ?? ''),
    pumpId: String(a?.pump_id ?? a?.pumpId ?? ''),
    nozzleNo: Number(a?.nozzle_no ?? a?.nozzleNo ?? 1),
    productId: String(a?.product_id ?? a?.productId ?? ''),
    productName: a?.product_name ?? a?.productName ?? '',
    currentMeterReading: Number(a?.current_meter_reading ?? a?.currentMeterReading ?? 0),
    color: a?.color ?? '#3B82F6',
    fuelCode: a?.fuel_code ?? a?.fuelCode ?? 'UNK',
  };
}

export function mapPump(a: any): Pump {
  return {
    id: String(a?.id ?? ''),
    pumpNo: Number(a?.pump_no ?? a?.pumpNo ?? 1),
    name: String(a?.name ?? `Pump ${a?.pump_no ?? 1}`),
    model: a?.model ?? 'Midco MPD Duo Plus',
    serialNumber: a?.serial_number ?? a?.serialNumber ?? 'SN-001',
    makeModel: a?.make_model ?? a?.makeModel ?? 'Midco',
    installationDate: a?.installation_date ?? a?.installationDate ?? '2023-01-15',
    tankId: a?.tank_id ?? a?.tankId ?? 'Tank 1',
    side: a?.side ?? 'Dual Side',
    status: a?.status ?? 'ACTIVE',
    nozzles: Array.isArray(a?.nozzles) ? a.nozzles.map(mapNozzle) : [],
  };
}

export function mapOperator(a: any): Operator {
  return {
    id: String(a?.id ?? ''),
    name: String(a?.name ?? ''),
    phone: a?.phone ?? '',
    active: a?.active !== false,
    status: a?.status ?? (a?.active !== false ? 'ACTIVE' : 'INACTIVE'),
    employeeCode: a?.employee_code ?? a?.employeeCode ?? '',
    aadhaarNo: a?.aadhaar_no ?? a?.aadhaarNo ?? '',
    monthlySalary: Number(a?.monthly_salary ?? a?.monthlySalary ?? 18000),
    joiningDate: a?.joining_date ?? a?.joiningDate ?? '2023-06-01',
    emergencyContact: a?.emergency_contact ?? a?.emergencyContact ?? '',
    assignedShift: a?.assigned_shift ?? a?.assignedShift ?? 'Morning',
  };
}

export function mapCustomer(a: any): CreditCustomer {
  const vNums = a?.vehicle_numbers ?? a?.vehicleNumbers;
  const vehicleList = Array.isArray(vNums)
    ? vNums
    : typeof vNums === 'string' && vNums.trim()
    ? vNums.split(',').map((s: string) => s.trim())
    : [];

  return {
    id: String(a?.id ?? ''),
    name: String(a?.name ?? ''),
    phone: a?.phone ?? '',
    outstandingBalance: Number(a?.outstanding_balance ?? a?.outstandingBalance ?? 0),
    code: a?.code ?? '',
    contactPerson: a?.contact_person ?? a?.contactPerson ?? a?.name ?? '',
    email: a?.email ?? '',
    gstin: a?.gstin ?? '',
    panNumber: a?.pan_number ?? a?.panNumber ?? '',
    creditLimit: Number(a?.credit_limit ?? a?.creditLimit ?? 500000),
    openingBalance: Number(a?.opening_balance ?? a?.openingBalance ?? 0),
    creditPeriodDays: Number(a?.credit_period_days ?? a?.creditPeriodDays ?? 15),
    discountPerLitre: Number(a?.discount_per_litre ?? a?.discountPerLitre ?? 0),
    maxVehiclesAllowed: Number(a?.max_vehicles_allowed ?? a?.maxVehiclesAllowed ?? 10),
    vehicleNumbers: vehicleList,
    address: a?.address ?? '',
    billingAddress: a?.billing_address ?? a?.billingAddress ?? '',
    status: a?.status ?? 'ACTIVE',
  };
}

export function mapExpenseType(a: any): ExpenseType {
  return {
    id: String(a?.id ?? ''),
    name: String(a?.name ?? ''),
    category: a?.category ?? 'OPERATIONAL',
    active: a?.active !== false,
    branchId: a?.branch_id ?? null,
  };
}

export function mapExpense(a: any): Expense {
  return {
    id: String(a?.id ?? ''),
    date: typeof a?.date === 'string' ? a.date : String(a?.date ?? ''),
    expenseTypeId: String(a?.expense_type_id ?? a?.expenseTypeId ?? ''),
    expenseTypeName: String(a?.expense_type_name ?? a?.expenseTypeName ?? ''),
    amount: Number(a?.amount ?? 0),
    remarks: a?.remarks ?? '',
  };
}

export function mapDailyNozzleMeter(a: any): DailyNozzleMeter {
  const opening = Number(a?.opening_meter ?? a?.openingMeter ?? 0);
  const closing = Number(a?.closing_meter ?? a?.closingMeter ?? 0);
  const rate = Number(a?.selling_rate ?? a?.sellingRate ?? 0);
  const litres = Number(a?.litres_sold ?? a?.litresSold ?? Math.max(0, closing - opening));
  const gross = Number(a?.gross_amount ?? a?.grossAmount ?? litres * rate);

  return {
    id: String(a?.id ?? ''),
    readingDate: typeof a?.reading_date === 'string' ? a.reading_date : String(a?.reading_date ?? ''),
    pumpId: String(a?.pump_id ?? a?.pumpId ?? ''),
    nozzleId: String(a?.nozzle_id ?? a?.nozzleId ?? ''),
    productId: String(a?.product_id ?? a?.productId ?? ''),
    openingMeter: opening,
    closingMeter: closing,
    litresSold: litres,
    sellingRate: rate,
    grossAmount: gross,
  };
}

export function mapCreditTransaction(a: any): CreditTransaction {
  return {
    id: String(a?.id ?? ''),
    date: typeof a?.date === 'string' ? a.date : String(a?.date ?? ''),
    pumpId: String(a?.pump_id ?? a?.pumpId ?? ''),
    customerId: String(a?.customer_id ?? a?.customerId ?? ''),
    customerName: a?.customer_name ?? a?.customerName ?? '',
    productId: String(a?.product_id ?? a?.productId ?? ''),
    productName: a?.product_name ?? a?.productName ?? '',
    litres: Number(a?.litres ?? 0),
    rate: Number(a?.rate ?? 0),
    amount: Number(a?.amount ?? 0),
    remarks: a?.remarks ?? '',
  };
}

export function mapCreditPayment(a: any): CreditPayment {
  return {
    id: String(a?.id ?? ''),
    date: typeof a?.date === 'string' ? a.date : String(a?.date ?? ''),
    customerId: String(a?.customer_id ?? a?.customerId ?? ''),
    customerName: a?.customer_name ?? a?.customerName ?? '',
    amount: Number(a?.amount ?? 0),
    paymentMode: a?.payment_mode ?? a?.paymentMode ?? 'Cash',
  };
}

export function mapSettlement(a: any): Settlement {
  return {
    id: String(a?.id ?? ''),
    settlementDate: typeof a?.settlement_date === 'string' ? a.settlement_date : String(a?.settlement_date ?? ''),
    bankCode: String(a?.bank_code ?? a?.bankCode ?? ''),
    channelCode: String(a?.channel_code ?? a?.channelCode ?? ''),
    amount: Number(a?.amount ?? 0),
  };
}

export function mapPumpDayAttribution(a: any): PumpDayAttribution {
  const gpay = Number(a?.gpay_collected ?? a?.gpayCollected ?? 0);
  const phonePay = Number(a?.phone_pay_collected ?? a?.phonePayCollected ?? 0);
  const paytm = Number(a?.paytm_collected ?? a?.paytmCollected ?? 0);
  const upiLegacy = Number(a?.upi_gpay_collected ?? a?.upiGpayCollected ?? 0);
  const upiTotal = (gpay + phonePay + paytm) || upiLegacy;

  return {
    id: String(a?.id ?? ''),
    attributionDate: typeof a?.attribution_date === 'string' ? a.attribution_date : String(a?.attribution_date ?? ''),
    pumpId: String(a?.pump_id ?? a?.pumpId ?? ''),
    pumpNo: Number(a?.pump_no ?? a?.pumpNo ?? 1),
    operatorId: String(a?.operator_id ?? a?.operatorId ?? ''),
    operatorName: String(a?.operator_name ?? a?.operatorName ?? ''),
    timeIn: a?.time_in ? String(a.time_in).slice(0, 5) : null,
    timeOut: a?.time_out ? String(a.time_out).slice(0, 5) : null,
    advancePayment: Number(a?.advance_payment ?? a?.advancePayment ?? 0),
    creditAcc: Number(a?.credit_acc ?? a?.creditAcc ?? 0),
    cashCollected: Number(a?.cash_collected ?? a?.cashCollected ?? 0),
    cardCollected: Number(a?.card_collected ?? a?.cardCollected ?? 0),
    fleetCardCollected: Number(a?.fleet_card_collected ?? a?.fleetCardCollected ?? 0),
    creditSales: Number(a?.credit_sales ?? a?.creditSales ?? 0),
    gpayCollected: gpay,
    phonePayCollected: phonePay,
    paytmCollected: paytm,
    upiGpayCollected: upiTotal,
    totalAmount: Number(a?.total_amount ?? a?.totalAmount ?? 0),
    netPayment: Number(a?.net_payment ?? a?.netPayment ?? 0),
  };
}

export function mapDailyCashReconciliation(a: any): DailyCashReconciliation {
  const sysTotal = Number(a?.system_total_in_sheet ?? a?.systemTotalInSheet ?? 0);
  const noteTotal = Number(a?.physically_counted_note ?? a?.physicallyCountedNote ?? 0);

  return {
    id: String(a?.id ?? ''),
    reconDate: typeof a?.recon_date === 'string' ? a.recon_date : String(a?.recon_date ?? ''),
    openingBalance: Number(a?.opening_balance ?? a?.openingBalance ?? 0),
    morningCollection: Number(a?.morning_collection ?? a?.morningCollection ?? 0),
    oilDw: Number(a?.oil_dw ?? a?.oilDw ?? 0),
    totalCash: Number(a?.total_cash ?? a?.totalCash ?? 0),
    cashForCardSwipe: Number(a?.cash_for_card_swipe ?? a?.cashForCardSwipe ?? 0),
    cashDepositInBank: Number(a?.cash_deposit_in_bank ?? a?.cashDepositInBank ?? 0),
    bunkExpenses: Number(a?.bunk_expenses ?? a?.bunkExpenses ?? 0),
    bata: Number(a?.bata ?? 0),
    systemTotalInSheet: sysTotal,
    physicallyCountedNote: noteTotal,
    difference: Number(a?.difference ?? sysTotal - noteTotal),
    netCashForTheDay: Number(a?.net_cash_for_the_day ?? a?.netCashForTheDay ?? 0),
  };
}

export function mapBankDeposit(a: any): BankDeposit {
  return {
    id: String(a?.id ?? ''),
    depositDate: typeof a?.deposit_date === 'string' ? a.deposit_date : String(a?.deposit_date ?? ''),
    amount: Number(a?.amount ?? 0),
  };
}

export function mapFuelRateHistory(a: any): FuelRateHistory {
  return {
    id: String(a?.id ?? ''),
    productId: String(a?.product_id ?? a?.productId ?? ''),
    effectiveDate: typeof a?.effective_date === 'string' ? a.effective_date : String(a?.effective_date ?? ''),
    rate: Number(a?.rate ?? a?.new_rate ?? a?.newRate ?? 0),
    remarks: a?.remarks ?? '',
    createdAt: a?.created_at ?? a?.createdAt,
  };
}

export function mapBranch(a: any): Branch {
  return {
    id: String(a?.id ?? 'B-01'),
    name: String(a?.name ?? 'BPCL Chennai Central Auto Fuel'),
    location: a?.location ?? '',
    dealer_code: a?.dealer_code ?? '',
    omc_brand: a?.omc_brand ?? 'BPCL',
    is_active: a?.is_active !== false,
    bunk_name: a?.bunk_name ?? a?.bunkName ?? a?.name ?? '',
    city: a?.city ?? '',
    manager_name: a?.manager_name ?? a?.managerName ?? '',
    manager_phone: a?.manager_phone ?? a?.managerPhone ?? '',
    manager_email: a?.manager_email ?? a?.managerEmail ?? '',
    manager_access: a?.manager_access ?? a?.managerAccess ?? 'ALL',
    auto_fetch_enabled: Boolean(a?.auto_fetch_enabled ?? a?.autoFetchEnabled),
    auto_apply_enabled: Boolean(a?.auto_apply_enabled ?? a?.autoApplyEnabled),
    gstin: a?.gstin ?? '',
    operating_hours: a?.operating_hours ?? a?.operatingHours ?? '24 Hours',
    created_at: a?.created_at,
  };
}

export function mapMasterBank(a: any): MasterBank {
  return {
    id: Number(a?.id ?? 0),
    code: String(a?.code ?? ''),
    name: String(a?.name ?? ''),
    sortOrder: Number(a?.sort_order ?? 0),
    isActive: a?.is_active !== false,
  };
}

export function mapMasterChannel(a: any): MasterChannel {
  return {
    id: Number(a?.id ?? 0),
    code: String(a?.code ?? ''),
    name: String(a?.name ?? ''),
    sortOrder: Number(a?.sort_order ?? 0),
    isActive: a?.is_active !== false,
  };
}

export function mapMasterPaymentMode(a: any): MasterPaymentMode {
  return {
    id: Number(a?.id ?? 0),
    code: String(a?.code ?? ''),
    name: String(a?.name ?? ''),
    sortOrder: Number(a?.sort_order ?? 0),
    isActive: a?.is_active !== false,
  };
}

export function mapDashboardSummary(a: any): DashboardSummary {
  return {
    totalSalesAmount: Number(a?.total_sales_amount ?? 0),
    totalLitresSold: Number(a?.total_litres_sold ?? 0),
    totalCashCollected: Number(a?.total_cash_collected ?? 0),
    totalExpenses: Number(a?.total_expenses ?? 0),
    netCashOnHand: Number(a?.net_cash_on_hand ?? 0),
    totalCreditOutstanding: Number(a?.total_credit_outstanding ?? 0),
    totalBankDeposited: Number(a?.total_bank_deposited ?? 0),
    activeCustomers: Number(a?.active_customers ?? 0),
    totalPumps: Number(a?.total_pumps ?? 0),
    totalOperators: Number(a?.total_operators ?? 0),
  };
}

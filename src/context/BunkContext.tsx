import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
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
  BunkProfile,
  BankAccount,
  DailyNozzleMeter,
  CashSafeLedger,
  PosSettlement,
  FuelRateHistory,
} from '../types';


import { apiFetch } from '../api/client';
import { AuthUser, getMe, logout as apiLogout } from '../api/auth';
import { getToken } from '../api/client';
import {
  INITIAL_PRODUCTS,
  INITIAL_PUMPS,
  INITIAL_OPERATORS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSE_TYPES,
  INITIAL_SHIFTS,
  INITIAL_CREDIT_TRANSACTIONS,
  INITIAL_CREDIT_PAYMENTS,
  INITIAL_EXPENSES,
  INITIAL_BANK_DEPOSITS,
  INITIAL_TANKS,
  INITIAL_DIPS,
} from '../data/initialSeedData';

// ─── Field mappers: API (snake_case) ↔ Frontend (camelCase) ─────────────────

function mapProduct(a: any): Product {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    category: a.category,
    unit: a.unit,
    color: a.color,
    currentRate: Number(a.current_rate),
    standardDensityRange: {
      min: Number(a.density_min ?? 0),
      max: Number(a.density_max ?? 0),
    },
    active: a.active !== false,
  };
}

function mapNozzle(a: any): Nozzle {
  return {
    id: a.id,
    pumpId: a.pump_id,
    nozzleNo: a.nozzle_no,
    productId: a.product_id,
    productName: a.product_name ?? '',
    fuelCode: a.fuel_code ?? a.product_id,
    color: a.color ?? '#94A3B8',
    currentMeterReading: Number(a.current_meter_reading),
  };
}

function mapPump(a: any): Pump {
  return {
    id: a.id,
    pumpNo: a.pump_no,
    name: a.name,
    status: a.status,
    nozzles: (a.nozzles ?? []).map(mapNozzle),
  };
}

function mapOperator(a: any): Operator {
  return {
    id: a.id,
    name: a.name,
    phone: a.phone ?? '',
    dailyBata: Number(a.daily_bata),
    active: a.active !== false,
  };
}

function mapCustomer(a: any): CreditCustomer {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    contactPerson: a.contact_person ?? '',
    phone: a.phone ?? '',
    vehicleNumbers: a.vehicle_numbers ?? [],
    creditLimit: Number(a.credit_limit),
    outstandingBalance: Number(a.outstanding_balance),
    openingBalance: Number(a.opening_balance),
    status: a.status ?? 'ACTIVE',
    address: a.address,
  };
}

function mapExpenseType(a: any): ExpenseType {
  return { id: a.id, name: a.name, category: a.category, active: a.active !== false };
}

function mapMeterReading(a: any): MeterReadingEntry {
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

function mapShift(a: any): Shift {
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

function mapCreditTransaction(a: any): CreditTransaction {
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

function mapCreditPayment(a: any): CreditPayment {
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

function mapExpense(a: any): Expense {
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

function mapBankDeposit(a: any): BankDeposit {
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

function mapTank(a: any): Tank {
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

function mapTankDip(a: any): TankDip {
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

function mapBunkProfile(a: any): BunkProfile {
  return {
    id: a?.id ?? 'profile_1',
    bunkName: a?.bunk_name ?? 'KY Petrol Bunk',
    omcBrand: a?.omc_brand ?? 'IOCL',
    dealerCode: a?.dealer_code ?? '184920',
    state: a?.state ?? 'Karnataka',
    city: a?.city ?? 'Bengaluru (Karnataka)',
    registeredPhone: a?.registered_phone ?? '',
    autoFetchEnabled: a?.auto_fetch_enabled !== false,
    autoApplyEnabled: a?.auto_apply_enabled !== false,
    lastSyncAt: a?.last_sync_at ?? undefined,
  };
}

function mapBankAccount(a: any): BankAccount {
  return {
    id: a.id,
    bankName: a.bank_name,
    accountNumber: a.account_number,
    accountType: a.account_type ?? 'Current',
    branchName: a.branch_name,
    ifscCode: a.ifsc_code,
    openingBalance: Number(a.opening_balance ?? 0),
    currentBalance: Number(a.current_balance ?? a.opening_balance ?? 0),
    isPrimary: a.is_primary === true,
    isActive: a.is_active !== false,
  };
}

function mapDailyNozzleMeter(a: any): DailyNozzleMeter {
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

function mapSmsLog(a: any): SmsLogEntry {
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

function mapFuelRateHistory(a: any): FuelRateHistory {
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

// ─── Context Type ────────────────────────────────────────────────────────────

interface BunkContextType {
  // Auth
  currentUser: AuthUser | null;
  isLoggedIn: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;

  role: UserRole;
  setRole: (role: UserRole) => void;
  isMobileView: boolean;
  setIsMobileView: (val: boolean) => void;
  toggleMobileView: () => void;

  // Data
  bunkProfile: BunkProfile | null;
  products: Product[];
  pumps: Pump[];
  operators: Operator[];
  customers: CreditCustomer[];
  expenseTypes: ExpenseType[];
  shifts: Shift[];
  creditTransactions: CreditTransaction[];
  creditPayments: CreditPayment[];
  expenses: Expense[];
  bankDeposits: BankDeposit[];
  bankAccounts: BankAccount[];
  dailyNozzleMeters: DailyNozzleMeter[];
  fuelRateHistory: FuelRateHistory[];
  tanks: Tank[];
  dips: TankDip[];
  activeShift: Shift | null;
  apiConnected: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  updateBunkProfile: (profile: Partial<BunkProfile>) => Promise<void>;
  triggerDailyCronSync: () => Promise<any>;
  updateFuelRate: (productId: string, newRate: number) => Promise<void>;
  updateBatchFuelRates: (
    updates: { productId: string; newRate: number }[],
    options?: { changed_by?: string; remarks?: string; change_source?: string }
  ) => Promise<void>;
  smsLogs: SmsLogEntry[];
  addSmsLog: (log: Omit<SmsLogEntry, 'id'>) => Promise<SmsLogEntry>;
  updateSmsLogStatus: (id: string, status: SmsLogEntry['status'], appliedBy?: string) => Promise<void>;
  clearSmsLogs: () => Promise<void>;
  autoListenEnabled: boolean;
  setAutoListenEnabled: (val: boolean) => void;
  autoApplySms: boolean;
  setAutoApplySms: (val: boolean) => void;
  openNewShift: (params: { pumpId: string; operatorId: string; shiftType: Shift['shiftType']; shiftDate: string }) => Promise<Shift>;
  saveShiftDraft: (shift: Shift) => Promise<Shift>;
  closeShift: (shiftId: string, shift: Shift, notes?: string) => Promise<Shift>;
  updateShift: (shiftId: string, updates: { operatorId?: string; shiftType?: Shift['shiftType']; shiftDate?: string; notes?: string }) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  addCreditSale: (sale: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>) => Promise<CreditTransaction>;
  recordCreditRepayment: (payment: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>) => Promise<CreditPayment>;
  addExpense: (expense: Omit<Expense, 'id' | 'voucherNo' | 'date'>) => Promise<Expense>;
  addExpenseType: (et: Omit<ExpenseType, 'id'>) => Promise<void>;
  recordBankDeposit: (deposit: Omit<BankDeposit, 'id' | 'depositDate'>) => Promise<BankDeposit>;
  addBankAccount: (acc: Omit<BankAccount, 'id'>) => Promise<void>;
  updateBankAccount: (acc: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  saveBatchNozzleMeters: (readings: Array<{ nozzleId: string; pumpId: string; productId: string; openingMeter: number; closingMeter: number; testingLitres: number; sellingRate: number }>, dateStr?: string) => Promise<void>;
  saveCashSafeLedger: (ledger: Omit<CashSafeLedger, 'id'>) => Promise<void>;
  addCustomer: (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => Promise<void>;
  updateCustomer: (cust: CreditCustomer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  addPump: (pump: Omit<Pump, 'id'>) => Promise<void>;
  updatePump: (pump: Pump) => Promise<void>;
  deletePump: (id: string) => Promise<void>;
  addOperator: (op: Omit<Operator, 'id'>) => Promise<void>;
  updateOperator: (op: Operator) => Promise<void>;
  deleteOperator: (id: string) => Promise<void>;
  addProduct: (prod: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (prod: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  updateExpenseType: (et: ExpenseType) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;
  recordTankDip: (dip: Omit<TankDip, 'id'>) => Promise<TankDip>;
  syncWithBackend: () => Promise<void>;
}

const BunkContext = createContext<BunkContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export const BunkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [role, setRole] = useState<UserRole>('Owner');
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [bunkProfile, setBunkProfile] = useState<BunkProfile | null>({
    id: 'profile_1',
    bunkName: 'BPCL Chennai Auto Fuel',
    omcBrand: 'BPCL',
    dealerCode: '184920',
    state: 'Tamil Nadu',
    city: 'Chennai (Tamil Nadu)',
    registeredPhone: '+919876543210',
    autoFetchEnabled: true,
    autoApplyEnabled: true,
    lastSyncAt: new Date().toISOString(),
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [dailyNozzleMeters, setDailyNozzleMeters] = useState<DailyNozzleMeter[]>([]);
  const [fuelRateHistory, setFuelRateHistory] = useState<FuelRateHistory[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dips, setDips] = useState<TankDip[]>([]);
  const [autoListenEnabled, setAutoListenEnabled] = useState<boolean>(true);

  const [autoApplySms, setAutoApplySms] = useState<boolean>(false);
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);

  // ── Login / Logout ───────────────────────────────────────────────────────

  const login = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
    // Map API role (1 = Owner, 2 = Manager) to frontend UserRole
    if (user.role === 1 || (user.role as any) === '1' || (user.role as any) === 'ADMIN' || (user.role as any) === 'OWNER') {
      setRole('Owner');
    } else {
      setRole('Manager');
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setCurrentUser(null);
    setIsLoggedIn(false);
    // Clear all data on logout
    setProducts([]);
    setPumps([]);
    setOperators([]);
    setCustomers([]);
    setExpenseTypes([]);
    setShifts([]);
    setCreditTransactions([]);
    setCreditPayments([]);
    setExpenses([]);
    setBankDeposits([]);
    setBankAccounts([]);
    setDailyNozzleMeters([]);
    setFuelRateHistory([]);
    setTanks([]);
    setDips([]);
    setSmsLogs([]);
  }, []);

  // ── Sync / Load All Data ─────────────────────────────────────────────────

  const syncWithBackend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        prodData, pumpData, opData, custData, etData,
        shiftData, ctData, cpData, expData, bdData, tankData, dipData,
        baData, dnmData, smsData, profData, rateHistData,
      ] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/pumps').catch(() => []),
        apiFetch('/api/operators').catch(() => []),
        apiFetch('/api/customers').catch(() => []),
        apiFetch('/api/expense-types').catch(() => []),
        apiFetch('/api/shifts').catch(() => []),
        apiFetch('/api/credit/transactions').catch(() => []),
        apiFetch('/api/credit/payments').catch(() => []),
        apiFetch('/api/expenses').catch(() => []),
        apiFetch('/api/bank-deposits').catch(() => []),
        apiFetch('/api/tanks').catch(() => []),
        apiFetch('/api/tank-dips').catch(() => []),
        apiFetch('/api/bank-accounts').catch(() => []),
        apiFetch('/api/nozzle-meters').catch(() => []),
        apiFetch('/api/sms-logs').catch(() => []),
        apiFetch('/api/bunk-profile').catch(() => null),
        apiFetch('/api/rate-history').catch(() => []),
      ]);

      // Enrich nozzles with product info (productName, fuelCode, color)
      const prodMap = new Map(((prodData as any[]) || []).map((p: any) => [p.id, p]));

      const enrichedPumps = ((pumpData as any[]) || []).map((pump: any) => ({
        ...pump,
        nozzles: (pump.nozzles ?? []).map((noz: any) => {
          const prod = prodMap.get(noz.product_id) as any;
          return {
            ...noz,
            product_name: prod?.name ?? '',
            fuel_code: prod?.code ?? noz.product_id,
            color: prod?.color ?? '#94A3B8',
          };
        }),
      }));

      // Enrich credit transactions with customer info
      const custMap = new Map(((custData as any[]) || []).map((c: any) => [c.id, c]));
      const enrichedTx = ((ctData as any[]) || []).map((tx: any) => {
        const cust = custMap.get(tx.customer_id) as any;
        return { ...tx, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });
      const enrichedPay = ((cpData as any[]) || []).map((p: any) => {
        const cust = custMap.get(p.customer_id) as any;
        return { ...p, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });

      // Enrich tanks with product name
      const enrichedTanks = ((tankData as any[]) || []).map((t: any) => {
        const prod = prodMap.get(t.product_id) as any;
        return { ...t, product_name: prod?.name ?? '' };
      });

      if (Array.isArray(prodData)) setProducts(prodData.map(mapProduct));
      if (Array.isArray(pumpData)) setPumps(enrichedPumps.map(mapPump));
      if (Array.isArray(opData)) setOperators(opData.map(mapOperator));
      if (Array.isArray(custData)) setCustomers(custData.map(mapCustomer));
      if (Array.isArray(etData)) setExpenseTypes(etData.map(mapExpenseType));
      if (Array.isArray(shiftData)) setShifts(shiftData.map(mapShift));
      if (Array.isArray(ctData)) setCreditTransactions(enrichedTx.map(mapCreditTransaction));
      if (Array.isArray(cpData)) setCreditPayments(enrichedPay.map(mapCreditPayment));
      if (Array.isArray(expData)) setExpenses(expData.map(mapExpense));
      if (Array.isArray(bdData)) setBankDeposits(bdData.map(mapBankDeposit));
      if (Array.isArray(tankData)) setTanks(enrichedTanks.map(mapTank));
      if (Array.isArray(dipData)) setDips(dipData.map(mapTankDip));
      if (Array.isArray(baData) && baData.length > 0) setBankAccounts(baData.map(mapBankAccount));
      if (Array.isArray(dnmData)) setDailyNozzleMeters(dnmData.map(mapDailyNozzleMeter));
      if (Array.isArray(smsData)) setSmsLogs(smsData.map(mapSmsLog));
      if (Array.isArray(rateHistData)) setFuelRateHistory(rateHistData.map(mapFuelRateHistory));
      if (profData) setBunkProfile(mapBunkProfile(profData));

      setApiConnected(true);
    } catch (e: any) {
      setApiConnected(false);
      setError(e.message || 'Failed to sync with backend');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── On mount: restore session if token exists ────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const user = await getMe();
          login(user);
        }
      } catch {
        // Token expired or invalid — stay logged out
        apiLogout();
      }
    })();
  }, [login]);

  // Load data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      syncWithBackend();
    }
  }, [isLoggedIn]);

  const activeShift = shifts.find((s) => s.status === 'IN_PROGRESS' || s.status === 'OPEN') || null;
  const toggleMobileView = () => setIsMobileView((prev) => !prev);

  // ── Actions ──────────────────────────────────────────────────────────────

  const updateFuelRate = async (productId: string, newRate: number) => {
    try {
      const updated = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ current_rate: newRate }),
      });
      setProducts((prev) => prev.map((p) => (p.id === productId ? mapProduct(updated) : p)));
    } catch {
      // Fallback local update
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, currentRate: newRate } : p))
      );
    }
  };

  const updateBatchFuelRates = async (
    updates: { productId: string; newRate: number }[],
    options?: { changed_by?: string; remarks?: string; change_source?: string }
  ) => {
    try {
      const payload = {
        rates: updates.map((u) => ({ product_id: u.productId, current_rate: u.newRate })),
        changed_by: options?.changed_by || 'Manager',
        remarks: options?.remarks,
        change_source: options?.change_source || 'MANUAL_ENTRY',
      };
      const result = await apiFetch('/api/products/batch-rates', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (Array.isArray(result)) {
        const updatedMap = new Map((result as any[]).map((r: any) => [r.id, mapProduct(r)]));
        setProducts((prev) => prev.map((p) => updatedMap.get(p.id) || p));
      }
      // Refresh fuel rate history audit table
      apiFetch('/api/rate-history')
        .then((frh) => {
          if (Array.isArray(frh)) setFuelRateHistory(frh.map(mapFuelRateHistory));
        })
        .catch(() => {});
    } catch {
      // Fallback if batch endpoint unavailable
      const map = new Map(updates.map((u) => [u.productId, u.newRate]));
      setProducts((prev) =>
        prev.map((p) => (map.has(p.id) ? { ...p, currentRate: map.get(p.id)! } : p))
      );
    }
  };

  const addSmsLog = useCallback(async (log: Omit<SmsLogEntry, 'id'>) => {
    try {
      const payload = {
        sender: log.sender,
        raw_text: log.rawText,
        omc: log.omc,
        effective_datetime: log.effectiveDateTime,
        parsed_rates: log.parsedRates,
        status: log.status,
        applied_by: log.appliedBy,
      };
      const created = await apiFetch('/api/sms-logs', { method: 'POST', body: JSON.stringify(payload) });
      const entry = mapSmsLog(created);
      setSmsLogs((prev) => [entry, ...prev]);
      return entry;
    } catch {
      const newEntry: SmsLogEntry = {
        ...log,
        id: `sms-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setSmsLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
      return newEntry;
    }
  }, []);

  const updateSmsLogStatus = useCallback(
    async (id: string, status: SmsLogEntry['status'], appliedBy?: string) => {
      try {
        await apiFetch(`/api/sms-logs/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status, applied_by: appliedBy }),
        });
      } catch {
        // local update
      }
      setSmsLogs((prev) =>
        prev.map((log) =>
          log.id === id
            ? {
                ...log,
                status,
                appliedAt: status === 'APPLIED' ? new Date().toISOString() : log.appliedAt,
                appliedBy: appliedBy || log.appliedBy,
              }
            : log
        )
      );
    },
    []
  );

  const clearSmsLogs = useCallback(async () => {
    try {
      await apiFetch('/api/sms-logs', { method: 'DELETE' });
    } catch {
      // local update
    }
    setSmsLogs([]);
  }, []);

  // ─── Bank Accounts CRUD ────────────────────────────────────────────────────

  const addBankAccount = async (accData: Omit<BankAccount, 'id'>) => {
    const payload = {
      bank_name: accData.bankName,
      account_number: accData.accountNumber,
      account_type: accData.accountType,
      branch_name: accData.branchName,
      ifsc_code: accData.ifscCode,
      opening_balance: accData.openingBalance,
      current_balance: accData.currentBalance,
      is_primary: accData.isPrimary,
      is_active: accData.isActive,
    };
    const created = await apiFetch('/api/bank-accounts', { method: 'POST', body: JSON.stringify(payload) });
    setBankAccounts((prev) => [...prev, mapBankAccount(created)]);
  };

  const updateBankAccount = async (acc: BankAccount) => {
    const payload = {
      bank_name: acc.bankName,
      account_number: acc.accountNumber,
      account_type: acc.accountType,
      branch_name: acc.branchName,
      ifsc_code: acc.ifscCode,
      opening_balance: acc.openingBalance,
      current_balance: acc.currentBalance,
      is_primary: acc.isPrimary,
      is_active: acc.isActive,
    };
    const updated = await apiFetch(`/api/bank-accounts/${acc.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setBankAccounts((prev) => prev.map((a) => (a.id === acc.id ? mapBankAccount(updated) : a)));
  };

  const deleteBankAccount = async (id: string) => {
    await apiFetch(`/api/bank-accounts/${id}`, { method: 'DELETE' });
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // ─── Daily Nozzle Totalizers Save ──────────────────────────────────────────

  const saveBatchNozzleMeters = async (
    readings: Array<{
      nozzleId: string;
      pumpId: string;
      productId: string;
      openingMeter: number;
      closingMeter: number;
      testingLitres: number;
      sellingRate: number;
    }>,
    dateStr?: string
  ) => {
    const today = dateStr || new Date().toISOString().split('T')[0];
    const displayName = currentUser
      ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.username
      : 'Manager';
    const payload = {
      reading_date: today,
      recorded_by: displayName,
      readings: readings.map((r) => ({
        nozzle_id: r.nozzleId,
        pump_id: r.pumpId,
        product_id: r.productId,
        opening_meter: r.openingMeter,
        closing_meter: r.closingMeter,
        testing_litres: r.testingLitres,
        selling_rate: r.sellingRate,
        recorded_by: displayName,
      })),
    };

    const saved = await apiFetch('/api/nozzle-meters/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (Array.isArray(saved)) {
      const mapped = saved.map(mapDailyNozzleMeter);
      setDailyNozzleMeters((prev) => {
        const otherDates = prev.filter((m) => m.readingDate !== today);
        return [...mapped, ...otherDates];
      });
    }
  };

  // ─── Cash Safe Day Book / Ledger Save ──────────────────────────────────────

  const saveCashSafeLedger = async (ledgerData: Omit<CashSafeLedger, 'id'>) => {
    const payload = {
      ledger_date: ledgerData.ledgerDate,
      opening_safe_cash: ledgerData.openingSafeCash,
      shift_cash_inflow: ledgerData.shiftCashInflow,
      credit_cash_recovered: ledgerData.creditCashRecovered,
      petty_cash_expenses: ledgerData.pettyCashExpenses,
      bank_deposits_dropped: ledgerData.bankDepositsDropped,
      expected_safe_cash: ledgerData.expectedSafeCash,
      physical_counted_cash: ledgerData.physicalCountedCash,
      cash_variance: ledgerData.cashVariance,
      denominations: ledgerData.denominations,
      audited_by: ledgerData.auditedBy,
      notes: ledgerData.notes,
    };
    await apiFetch('/api/cash-ledger', { method: 'POST', body: JSON.stringify(payload) });
  };


  const updateBunkProfile = async (profileUpdates: Partial<BunkProfile>) => {
    try {
      const payload: any = {};
      if (profileUpdates.bunkName !== undefined) payload.bunk_name = profileUpdates.bunkName;
      if (profileUpdates.omcBrand !== undefined) payload.omc_brand = profileUpdates.omcBrand;
      if (profileUpdates.dealerCode !== undefined) payload.dealer_code = profileUpdates.dealerCode;
      if (profileUpdates.state !== undefined) payload.state = profileUpdates.state;
      if (profileUpdates.city !== undefined) payload.city = profileUpdates.city;
      if (profileUpdates.registeredPhone !== undefined) payload.registered_phone = profileUpdates.registeredPhone;
      if (profileUpdates.autoFetchEnabled !== undefined) payload.auto_fetch_enabled = profileUpdates.autoFetchEnabled;
      if (profileUpdates.autoApplyEnabled !== undefined) payload.auto_apply_enabled = profileUpdates.autoApplyEnabled;

      const updated = await apiFetch('/api/bunk-profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setBunkProfile(mapBunkProfile(updated));
    } catch {
      setBunkProfile((prev) => (prev ? { ...prev, ...profileUpdates } : (profileUpdates as BunkProfile)));
    }
  };

  const triggerDailyCronSync = async () => {
    try {
      const result = await apiFetch('/api/bunk-profile/trigger-daily-cron', {
        method: 'POST',
      });
      // Refresh products from backend
      const prodData = await apiFetch('/api/products');
      if (Array.isArray(prodData)) {
        setProducts((prodData as any[]).map(mapProduct));
      }
      setBunkProfile((prev) => (prev ? { ...prev, lastSyncAt: new Date().toISOString() } : null));
      return result;
    } catch {
      // Fallback
      return { status: 'SUCCESS', message: '06:00 AM Cron triggered locally.' };
    }
  };



  const addProduct = async (prodData: Omit<Product, 'id'>) => {
    const payload = {
      code: prodData.code,
      name: prodData.name,
      category: prodData.category,
      unit: prodData.unit,
      color: prodData.color,
      current_rate: prodData.currentRate,
      density_min: prodData.standardDensityRange?.min ?? null,
      density_max: prodData.standardDensityRange?.max ?? null,
    };
    const created = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
    setProducts((prev) => [...prev, mapProduct(created)]);
  };

  const updateProduct = async (prod: Product) => {
    try {
      const payload = {
        code: prod.code,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        color: prod.color,
        current_rate: prod.currentRate,
        density_min: prod.standardDensityRange?.min ?? null,
        density_max: prod.standardDensityRange?.max ?? null,
      };
      await apiFetch(`/api/products/${prod.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch (e) {
      // Keep local state in sync
    }
    setProducts((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
  };

  const deleteProduct = async (id: string) => {
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const addPump = async (pumpData: Omit<Pump, 'id'>) => {
    const payload = { pump_no: pumpData.pumpNo, name: pumpData.name, status: pumpData.status };
    const created = await apiFetch('/api/pumps', { method: 'POST', body: JSON.stringify(payload) });
    setPumps((prev) => [...prev, mapPump({ ...created, nozzles: [] })]);
  };

  const updatePump = async (pump: Pump) => {
    try {
      const payload = {
        pump_no: pump.pumpNo,
        name: pump.name,
        status: pump.status,
      };
      await apiFetch(`/api/pumps/${pump.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch (e) {}
    setPumps((prev) => prev.map((p) => (p.id === pump.id ? pump : p)));
  };

  const deletePump = async (id: string) => {
    try {
      await apiFetch(`/api/pumps/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setPumps((prev) => prev.filter((p) => p.id !== id));
  };

  const addOperator = async (opData: Omit<Operator, 'id'>) => {
    const payload = { name: opData.name, phone: opData.phone, daily_bata: opData.dailyBata, active: opData.active };
    const created = await apiFetch('/api/operators', { method: 'POST', body: JSON.stringify(payload) });
    setOperators((prev) => [...prev, mapOperator(created)]);
  };

  const updateOperator = async (op: Operator) => {
    try {
      const payload = {
        name: op.name,
        phone: op.phone,
        daily_bata: op.dailyBata,
        active: op.active,
      };
      await apiFetch(`/api/operators/${op.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch (e) {}
    setOperators((prev) => prev.map((o) => (o.id === op.id ? op : o)));
  };

  const deleteOperator = async (id: string) => {
    try {
      await apiFetch(`/api/operators/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setOperators((prev) => prev.filter((o) => o.id !== id));
  };

  const addCustomer = async (custData: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => {
    const payload = {
      code: custData.code,
      name: custData.name,
      contact_person: custData.contactPerson,
      phone: custData.phone,
      vehicle_numbers: custData.vehicleNumbers,
      credit_limit: custData.creditLimit,
      opening_balance: custData.openingBalance,
      status: custData.status,
      address: custData.address,
    };
    const created = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
    setCustomers((prev) => [...prev, mapCustomer(created)]);
  };

  const updateCustomer = async (cust: CreditCustomer) => {
    try {
      const payload = {
        code: cust.code,
        name: cust.name,
        contact_person: cust.contactPerson,
        phone: cust.phone,
        vehicle_numbers: cust.vehicleNumbers,
        credit_limit: cust.creditLimit,
        status: cust.status,
        address: cust.address,
      };
      const updated = await apiFetch(`/api/customers/${cust.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? mapCustomer(updated) : c)));
    } catch (e) {
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? cust : c)));
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  const addExpenseType = async (et: Omit<ExpenseType, 'id'>) => {
    const created = await apiFetch('/api/expense-types', {
      method: 'POST',
      body: JSON.stringify({ name: et.name, category: et.category }),
    });
    setExpenseTypes((prev) => [...prev, mapExpenseType(created)]);
  };

  const updateExpenseType = async (et: ExpenseType) => {
    try {
      await apiFetch(`/api/expense-types/${et.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: et.name, category: et.category }),
      });
    } catch (e) {}
    setExpenseTypes((prev) => prev.map((item) => (item.id === et.id ? et : item)));
  };

  const deleteExpenseType = async (id: string) => {
    try {
      await apiFetch(`/api/expense-types/${id}`, { method: 'DELETE' });
    } catch (e) {}
    setExpenseTypes((prev) => prev.filter((item) => item.id !== id));
  };

  const openNewShift = async ({
    pumpId,
    operatorId,
    shiftType,
    shiftDate,
  }: {
    pumpId: string;
    operatorId: string;
    shiftType: Shift['shiftType'];
    shiftDate: string;
  }): Promise<Shift> => {
    const payload = {
      shift_date: shiftDate,
      shift_type: shiftType,
      pump_id: pumpId,
      operator_id: operatorId,
    };
    const created = await apiFetch('/api/shifts', { method: 'POST', body: JSON.stringify(payload) });
    const newShift = mapShift(created);
    
    // If backend didn't populate meterReadings, populate from pump nozzles
    if (newShift.meterReadings.length === 0) {
      const pump = pumps.find((p) => p.id === pumpId);
      if (pump && pump.nozzles.length > 0) {
        newShift.meterReadings = pump.nozzles.map((noz) => {
          const prod = products.find((p) => p.id === noz.productId);
          return {
            nozzleId: noz.id,
            nozzleNo: noz.nozzleNo,
            productName: noz.productName || prod?.name || 'Fuel',
            fuelCode: noz.fuelCode || prod?.code || 'HSD',
            rate: prod?.currentRate || 94.5,
            openingReading: noz.currentMeterReading || 0,
            closingReading: noz.currentMeterReading || 0,
            testingLitres: 0,
            litresSold: 0,
            grossAmount: 0,
          };
        });
      }
    }

    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  };

  const saveShiftDraft = async (shift: Shift) => {
    // Recalculate totals locally
    const collections = shift.collections;
    const totalCollected =
      (collections.cash || 0) + (collections.upiGpay || 0) + (collections.card || 0) +
      (collections.fleetCard || 0) + (collections.creditSales || 0) + (collections.cheque || 0);

    const payload: any = {
      cash_collected: collections.cash,
      upi_gpay_collected: collections.upiGpay,
      card_collected: collections.card,
      fleet_card_collected: collections.fleetCard,
      credit_sales: collections.creditSales,
      cheque_collected: collections.cheque,
      expenses_deducted: shift.expensesDeducted,
      notes: shift.notes,
    };

    if (shift.meterReadings && shift.meterReadings.length > 0) {
      payload.meter_readings = shift.meterReadings.map((r) => ({
        nozzle_id: r.nozzleId,
        closing_reading: r.closingReading ?? r.openingReading,
        testing_litres: r.testingLitres || 0,
      }));
    }

    const updated = await apiFetch(`/api/shifts/${shift.id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const mapped = mapShift(updated);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? mapped : s)));
    return mapped;
  };

  const updateShift = async (shiftId: string, updates: { operatorId?: string; shiftType?: Shift['shiftType']; shiftDate?: string; notes?: string }) => {
  const payload: any = {};
  if (updates.operatorId !== undefined) payload.operator_id = updates.operatorId;
  if (updates.shiftType !== undefined) payload.shift_type = updates.shiftType;
  if (updates.shiftDate !== undefined) payload.shift_date = updates.shiftDate;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const updated = await apiFetch(`/api/shifts/${shiftId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  setShifts((prev) => prev.map((s) => (s.id === shiftId ? mapShift(updated) : s)));
};

const deleteShift = async (shiftId: string) => {
  await apiFetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
  setShifts((prev) => prev.filter((s) => s.id !== shiftId));
};

  const closeShift = async (shiftId: string, shift: Shift, notes?: string) => {
    const collections = shift.collections;
    const payload = {
      meter_readings: shift.meterReadings.map((r) => ({
        nozzle_id: r.nozzleId,
        closing_reading: r.closingReading ?? r.openingReading,
        testing_litres: r.testingLitres || 0,
      })),
      cash_collected: collections.cash,
      upi_gpay_collected: collections.upiGpay,
      card_collected: collections.card,
      fleet_card_collected: collections.fleetCard,
      credit_sales: collections.creditSales,
      cheque_collected: collections.cheque,
      expenses_deducted: shift.expensesDeducted,
      notes: notes ?? shift.notes,
    };
    const closed = await apiFetch(`/api/shifts/${shiftId}/close`, { method: 'POST', body: JSON.stringify(payload) });
    const mapped = mapShift(closed);
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? mapped : s)));

    // Refresh pump nozzle meter readings & daily nozzle meters
    try {
      const updatedPumps = await apiFetch('/api/pumps');
      const prodMap = new Map(products.map((p) => [p.id, p]));
      const enrichedPumps = (updatedPumps as any[]).map((pump: any) => ({
        ...pump,
        nozzles: (pump.nozzles ?? []).map((noz: any) => {
          const prod = prodMap.get(noz.product_id) as any;
          return { ...noz, product_name: prod?.name ?? '', fuel_code: prod?.code ?? noz.product_id, color: prod?.color ?? '#94A3B8' };
        }),
      }));
      setPumps(enrichedPumps.map(mapPump));

      const dnm = await apiFetch('/api/nozzle-meters');
      setDailyNozzleMeters((dnm as any[]).map(mapDailyNozzleMeter));
    } catch {}
    return mapped;
  };

  const addCreditSale = async (saleData: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>): Promise<CreditTransaction> => {
    const payload = {
      customer_id: saleData.customerId,
      pump_id: saleData.pumpId || null,
      pump_no: saleData.pumpNo || null,
      product_id: saleData.productId,
      vehicle_no: saleData.vehicleNo || '',
      driver_name: saleData.driverName,
      litres: saleData.litres,
      rate: saleData.rate,
      amount: saleData.amount,
      remarks: saleData.remarks,
    };
    const created = await apiFetch('/api/credit/transactions', { method: 'POST', body: JSON.stringify(payload) });
    const cust = customers.find((c) => c.id === created.customer_id);
    const enriched = { ...created, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
    const newSale = mapCreditTransaction(enriched);
    setCreditTransactions((prev) => [newSale, ...prev]);
    // Update customer outstanding balance in local state
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === newSale.customerId
          ? { ...c, outstandingBalance: Math.round((c.outstandingBalance + newSale.amount) * 100) / 100 }
          : c
      )
    );
    return newSale;
  };

  const recordCreditRepayment = async (paymentData: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>): Promise<CreditPayment> => {
    const payload = {
      customer_id: paymentData.customerId,
      amount: paymentData.amount,
      payment_mode: paymentData.paymentMode,
      reference_no: paymentData.referenceNo,
      notes: paymentData.notes,
      received_by: paymentData.receivedBy,
    };
    const created = await apiFetch('/api/credit/payments', { method: 'POST', body: JSON.stringify(payload) });
    const cust = customers.find((c) => c.id === created.customer_id);
    const enriched = { ...created, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
    const newPayment = mapCreditPayment(enriched);
    setCreditPayments((prev) => [newPayment, ...prev]);
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === newPayment.customerId
          ? { ...c, outstandingBalance: Math.max(0, Math.round((c.outstandingBalance - newPayment.amount) * 100) / 100) }
          : c
      )
    );
    return newPayment;
  };

  const addExpense = async (expenseData: Omit<Expense, 'id' | 'voucherNo' | 'date'>): Promise<Expense> => {
    const payload = {
      expense_type_id: expenseData.expenseTypeId,
      amount: expenseData.amount,
      paid_to: expenseData.paidTo,
      paid_by: expenseData.paidBy,
      pump_id: expenseData.pumpId || null,
      is_credit_note: expenseData.isCreditNote,
      remarks: expenseData.remarks,
    };
    const created = await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(payload) });
    const newExpense = mapExpense(created);
    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  };

  const recordBankDeposit = async (depositData: Omit<BankDeposit, 'id' | 'depositDate'>): Promise<BankDeposit> => {
    const d = depositData.denominations;
    const payload = {
      bank_name: depositData.bankName,
      account_no: depositData.accountNo,
      amount: depositData.amount,
      note_2000: d?.note2000 ?? 0,
      note_500: d?.note500 ?? 0,
      note_200: d?.note200 ?? 0,
      note_100: d?.note100 ?? 0,
      note_50: d?.note50 ?? 0,
      note_20: d?.note20 ?? 0,
      note_10: d?.note10 ?? 0,
      coins: d?.coins ?? 0,
      deposited_by: depositData.depositedBy,
      reference_no: depositData.referenceNo,
      notes: depositData.notes,
    };
    const created = await apiFetch('/api/bank-deposits', { method: 'POST', body: JSON.stringify(payload) });
    const newDeposit = mapBankDeposit(created);
    setBankDeposits((prev) => [newDeposit, ...prev]);
    return newDeposit;
  };

  const recordTankDip = async (dipData: Omit<TankDip, 'id'>): Promise<TankDip> => {
    const payload = {
      tank_id: dipData.tankId,
      tank_name: dipData.tankName,
      product_name: dipData.productName,
      dip_date: dipData.dipDate,
      dip_type: dipData.dipType,
      fuel_dip_cm: dipData.fuelDipCm,
      fuel_dip_litres: dipData.fuelDipLitres,
      water_dip_cm: dipData.waterDipCm,
      observed_density: dipData.observedDensity,
      observed_temp: dipData.observedTemp,
      converted_density: dipData.convertedDensity,
      book_stock_litres: dipData.bookStockLitres,
      variance: dipData.variance,
      tested_by: dipData.testedBy,
      remarks: dipData.remarks,
    };
    const created = await apiFetch('/api/tank-dips', { method: 'POST', body: JSON.stringify(payload) });
    const newDip = mapTankDip(created);
    setDips((prev) => [newDip, ...prev]);
    // Update local tank stock
    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === newDip.tankId) {
          const stock = newDip.fuelDipLitres;
          let status: Tank['status'] = 'NORMAL';
          if (stock < t.capacityLitres * 0.1) status = 'CRITICAL';
          else if (stock < t.capacityLitres * 0.2) status = 'LOW';
          else if (stock > t.capacityLitres * 0.95) status = 'OVERFILL';
          return { ...t, currentStockLitres: stock, status };
        }
        return t;
      })
    );
    return newDip;
  };

  return (
    <BunkContext.Provider
      value={{
        currentUser, isLoggedIn, login, logout,
        role, setRole,
        isMobileView, setIsMobileView, toggleMobileView,
        bunkProfile, updateBunkProfile, triggerDailyCronSync,
        products, pumps, operators, customers, expenseTypes,
        shifts, creditTransactions, creditPayments, expenses,
        bankDeposits, bankAccounts, dailyNozzleMeters, fuelRateHistory, tanks, dips,
        activeShift, apiConnected, loading, error,
        updateFuelRate, updateBatchFuelRates,
        smsLogs, addSmsLog, updateSmsLogStatus, clearSmsLogs,
        autoListenEnabled, setAutoListenEnabled, autoApplySms, setAutoApplySms,
        openNewShift, saveShiftDraft, closeShift,updateShift, deleteShift,

        addCreditSale, recordCreditRepayment,
        addExpense, addExpenseType, updateExpenseType, deleteExpenseType,
        recordBankDeposit,
        addBankAccount, updateBankAccount, deleteBankAccount,
        saveBatchNozzleMeters, saveCashSafeLedger,
        addCustomer, updateCustomer, deleteCustomer,
        addPump, updatePump, deletePump,
        addOperator, updateOperator, deleteOperator,
        addProduct, updateProduct, deleteProduct,
        recordTankDip,
        syncWithBackend,
      }}
    >
      {children}
    </BunkContext.Provider>
  );
};

export const useBunk = () => {
  const context = useContext(BunkContext);
  if (!context) {
    throw new Error('useBunk must be used within a BunkProvider');
  }
  return context;
};

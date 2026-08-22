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
  tanks: Tank[];
  dips: TankDip[];
  activeShift: Shift | null;
  apiConnected: boolean;
  loading: boolean;
  error: string | null;

  // Actions
  updateFuelRate: (productId: string, newRate: number) => Promise<void>;
  openNewShift: (params: { pumpId: string; operatorId: string; shiftType: Shift['shiftType']; shiftDate: string }) => Promise<Shift>;
  saveShiftDraft: (shift: Shift) => Promise<void>;
  closeShift: (shiftId: string, shift: Shift, notes?: string) => Promise<void>;
  addCreditSale: (sale: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>) => Promise<CreditTransaction>;
  recordCreditRepayment: (payment: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>) => Promise<CreditPayment>;
  addExpense: (expense: Omit<Expense, 'id' | 'voucherNo' | 'date'>) => Promise<Expense>;
  addExpenseType: (et: Omit<ExpenseType, 'id'>) => Promise<void>;
  recordBankDeposit: (deposit: Omit<BankDeposit, 'id' | 'depositDate'>) => Promise<BankDeposit>;
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
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dips, setDips] = useState<TankDip[]>([]);

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
    setTanks([]);
    setDips([]);
  }, []);

  // ── Sync / Load All Data ─────────────────────────────────────────────────

  const syncWithBackend = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        prodData, pumpData, opData, custData, etData,
        shiftData, ctData, cpData, expData, bdData, tankData, dipData,
      ] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/pumps'),
        apiFetch('/api/operators'),
        apiFetch('/api/customers'),
        apiFetch('/api/expense-types'),
        apiFetch('/api/shifts'),
        apiFetch('/api/credit/transactions'),
        apiFetch('/api/credit/payments'),
        apiFetch('/api/expenses'),
        apiFetch('/api/bank-deposits'),
        apiFetch('/api/tanks'),
        apiFetch('/api/tank-dips'),
      ]);

      // Enrich nozzles with product info (productName, fuelCode, color)
      const prodMap = new Map((prodData as any[]).map((p: any) => [p.id, p]));

      const enrichedPumps = (pumpData as any[]).map((pump: any) => ({
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
      const custMap = new Map((custData as any[]).map((c: any) => [c.id, c]));
      const enrichedTx = (ctData as any[]).map((tx: any) => {
        const cust = custMap.get(tx.customer_id) as any;
        return { ...tx, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });
      const enrichedPay = (cpData as any[]).map((p: any) => {
        const cust = custMap.get(p.customer_id) as any;
        return { ...p, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });

      // Enrich tanks with product name
      const enrichedTanks = (tankData as any[]).map((t: any) => {
        const prod = prodMap.get(t.product_id) as any;
        return { ...t, product_name: prod?.name ?? '' };
      });

      setProducts((prodData as any[]).map(mapProduct));
      setPumps(enrichedPumps.map(mapPump));
      setOperators((opData as any[]).map(mapOperator));
      setCustomers((custData as any[]).map(mapCustomer));
      setExpenseTypes((etData as any[]).map(mapExpenseType));
      setShifts((shiftData as any[]).map(mapShift));
      setCreditTransactions(enrichedTx.map(mapCreditTransaction));
      setCreditPayments(enrichedPay.map(mapCreditPayment));
      setExpenses((expData as any[]).map(mapExpense));
      setBankDeposits((bdData as any[]).map(mapBankDeposit));
      setTanks(enrichedTanks.map(mapTank));
      setDips((dipData as any[]).map(mapTankDip));

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
    const updated = await apiFetch(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ current_rate: newRate }),
    });
    setProducts((prev) => prev.map((p) => (p.id === productId ? mapProduct(updated) : p)));
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

    // Include meter readings if any have closing readings set
    const readingsWithClosing = shift.meterReadings.filter(
      (r) => r.closingReading !== undefined && r.closingReading !== r.openingReading
    );
    if (readingsWithClosing.length > 0) {
      payload.meter_readings = readingsWithClosing.map((r) => ({
        nozzle_id: r.nozzleId,
        closing_reading: r.closingReading,
        testing_litres: r.testingLitres || 0,
      }));
    }

    const updated = await apiFetch(`/api/shifts/${shift.id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? mapShift(updated) : s)));
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
    setShifts((prev) => prev.map((s) => (s.id === shiftId ? mapShift(closed) : s)));
    // Refresh pump nozzle meter readings
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
        products, pumps, operators, customers, expenseTypes,
        shifts, creditTransactions, creditPayments, expenses,
        bankDeposits, tanks, dips,
        activeShift, apiConnected, loading, error,
        updateFuelRate, openNewShift, saveShiftDraft, closeShift,
        addCreditSale, recordCreditRepayment,
        addExpense, addExpenseType, updateExpenseType, deleteExpenseType,
        recordBankDeposit,
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

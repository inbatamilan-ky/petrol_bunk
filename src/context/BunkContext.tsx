import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Product,
  Pump,
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
  PaymentCollectionBreakdown,
} from '../types';
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
import { getTodayDateString } from '../utils/formatters';

const API_BASE_URL = 'http://localhost:5000/api';

interface BunkContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  isMobileView: boolean;
  setIsMobileView: (val: boolean) => void;
  toggleMobileView: () => void;

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

  // Actions
  updateFuelRate: (productId: string, newRate: number) => void;
  openNewShift: (params: { pumpId: string; operatorId: string; shiftType: Shift['shiftType'] }) => Shift;
  saveShiftDraft: (shift: Shift) => void;
  closeShift: (shiftId: string, notes?: string) => void;
  addCreditSale: (sale: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>) => CreditTransaction;
  recordCreditRepayment: (payment: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>) => CreditPayment;
  addExpense: (expense: Omit<Expense, 'id' | 'voucherNo' | 'date'>) => Expense;
  addExpenseType: (et: Omit<ExpenseType, 'id'>) => void;
  recordBankDeposit: (deposit: Omit<BankDeposit, 'id' | 'depositDate'>) => BankDeposit;
  addCustomer: (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => void;
  updateCustomer: (cust: CreditCustomer) => void;
  addPump: (pump: Omit<Pump, 'id'>) => void;
  addOperator: (op: Omit<Operator, 'id'>) => void;
  addProduct: (prod: Omit<Product, 'id'>) => void;
  recordTankDip: (dip: Omit<TankDip, 'id'>) => TankDip;
  resetAllData: () => void;
  syncWithBackend: () => Promise<void>;
}

const BunkContext = createContext<BunkContextType | undefined>(undefined);

const STORAGE_KEY = 'fuelpulse_bunk_v4_dynamic';

export const BunkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('Owner');
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [pumps, setPumps] = useState<Pump[]>(INITIAL_PUMPS);
  const [operators, setOperators] = useState<Operator[]>(INITIAL_OPERATORS);
  const [customers, setCustomers] = useState<CreditCustomer[]>(INITIAL_CUSTOMERS);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(INITIAL_EXPENSE_TYPES);
  const [shifts, setShifts] = useState<Shift[]>(INITIAL_SHIFTS);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>(INITIAL_CREDIT_TRANSACTIONS);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>(INITIAL_CREDIT_PAYMENTS);
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>(INITIAL_BANK_DEPOSITS);
  const [tanks, setTanks] = useState<Tank[]>(INITIAL_TANKS);
  const [dips, setDips] = useState<TankDip[]>(INITIAL_DIPS);

  // Sync with Flask API
  const syncWithBackend = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (res.ok) {
        setApiConnected(true);
        const prodRes = await fetch(`${API_BASE_URL}/products`);
        if (prodRes.ok) {
          const apiProds = await prodRes.json();
          if (apiProds && apiProds.length > 0) {
            setProducts((prev) =>
              prev.map((p) => {
                const match = apiProds.find((ap: any) => ap.code === p.code || ap.id === p.id);
                return match ? { ...p, currentRate: match.current_rate } : p;
              })
            );
          }
        }
      }
    } catch {
      setApiConnected(false);
    }
  };

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.products?.length) setProducts(parsed.products);
        if (parsed.pumps?.length) setPumps(parsed.pumps);
        if (parsed.operators?.length) setOperators(parsed.operators);
        if (parsed.customers?.length) setCustomers(parsed.customers);
        if (parsed.expenseTypes?.length) setExpenseTypes(parsed.expenseTypes);
        if (parsed.shifts?.length) setShifts(parsed.shifts);
        if (parsed.creditTransactions?.length) setCreditTransactions(parsed.creditTransactions);
        if (parsed.creditPayments?.length) setCreditPayments(parsed.creditPayments);
        if (parsed.expenses?.length) setExpenses(parsed.expenses);
        if (parsed.bankDeposits?.length) setBankDeposits(parsed.bankDeposits);
        if (parsed.tanks?.length) setTanks(parsed.tanks);
        if (parsed.dips?.length) setDips(parsed.dips);
      }
    } catch (e) {
      console.error('Error loading saved state:', e);
    }
    syncWithBackend();
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    try {
      const stateToSave = {
        products, pumps, operators, customers, expenseTypes,
        shifts, creditTransactions, creditPayments, expenses,
        bankDeposits, tanks, dips,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
    }
  }, [products, pumps, operators, customers, expenseTypes, shifts, creditTransactions, creditPayments, expenses, bankDeposits, tanks, dips]);

  const activeShift = shifts.find((s) => s.status === 'IN_PROGRESS' || s.status === 'OPEN') || null;

  const toggleMobileView = () => setIsMobileView((prev) => !prev);

  // Update Fuel Rate
  const updateFuelRate = async (productId: string, newRate: number) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, currentRate: newRate } : p))
    );
    try {
      await fetch(`${API_BASE_URL}/products/1/rate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: newRate }),
      });
    } catch {
      // Offline fallback
    }
  };

  // Open New Shift
  const openNewShift = ({
    pumpId,
    operatorId,
    shiftType,
  }: {
    pumpId: string;
    operatorId: string;
    shiftType: Shift['shiftType'];
  }): Shift => {
    const pump = pumps.find((p) => p.id === pumpId);
    const operator = operators.find((o) => o.id === operatorId);
    const dateStr = getTodayDateString();
    const timeStr = new Date().toISOString();

    const meterReadings: MeterReadingEntry[] = (pump?.nozzles || []).map((noz) => {
      const prod = products.find((p) => p.id === noz.productId);
      return {
        nozzleId: noz.id,
        nozzleNo: noz.nozzleNo,
        productName: noz.productName,
        fuelCode: noz.fuelCode,
        rate: prod?.currentRate || 95.0,
        openingReading: noz.currentMeterReading,
        closingReading: noz.currentMeterReading,
        testingLitres: 0,
        litresSold: 0,
        grossAmount: 0,
      };
    });

    const newShift: Shift = {
      id: `shift-${Date.now()}`,
      shiftNo: `SHT-${dateStr.replace(/-/g, '')}-${String(shifts.length + 1).padStart(2, '0')}`,
      shiftDate: dateStr,
      shiftType,
      pumpId,
      pumpNo: pump?.pumpNo || 1,
      operatorId,
      operatorName: operator?.name || 'Operator',
      openedAt: timeStr,
      status: 'IN_PROGRESS',
      meterReadings,
      totalLitresSold: 0,
      totalSalesAmount: 0,
      expensesDeducted: 0,
      collections: {
        cash: 0,
        upiGpay: 0,
        card: 0,
        fleetCard: 0,
        creditSales: 0,
        cheque: 0,
      },
      totalCollected: 0,
      shortageOrExcess: 0,
      notes: '',
    };

    setShifts((prev) => [newShift, ...prev]);
    return newShift;
  };

  // Save Shift Draft
  const saveShiftDraft = (updatedShift: Shift) => {
    let totalLitres = 0;
    let totalAmount = 0;

    const recalculatedReadings = updatedShift.meterReadings.map((reading) => {
      const closing = reading.closingReading ?? reading.openingReading;
      const testing = reading.testingLitres || 0;
      const sold = Math.max(0, closing - reading.openingReading - testing);
      const gross = sold * reading.rate;

      totalLitres += sold;
      totalAmount += gross;

      return {
        ...reading,
        litresSold: Math.round(sold * 100) / 100,
        grossAmount: Math.round(gross * 100) / 100,
      };
    });

    const collections = updatedShift.collections;
    const totalCollected =
      (collections.cash || 0) +
      (collections.upiGpay || 0) +
      (collections.card || 0) +
      (collections.fleetCard || 0) +
      (collections.creditSales || 0) +
      (collections.cheque || 0);

    const netExpected = totalAmount - (updatedShift.expensesDeducted || 0);
    const shortageOrExcess = totalCollected - netExpected;

    const finalShift: Shift = {
      ...updatedShift,
      meterReadings: recalculatedReadings,
      totalLitresSold: Math.round(totalLitres * 100) / 100,
      totalSalesAmount: Math.round(totalAmount * 100) / 100,
      totalCollected: Math.round(totalCollected * 100) / 100,
      shortageOrExcess: Math.round(shortageOrExcess * 100) / 100,
    };

    setShifts((prev) => prev.map((s) => (s.id === finalShift.id ? finalShift : s)));

    // Update pump nozzle current meter readings
    setPumps((prevPumps) =>
      prevPumps.map((pump) => {
        if (pump.id === finalShift.pumpId) {
          const updatedNozzles = pump.nozzles.map((noz) => {
            const matchReading = finalShift.meterReadings.find((r) => r.nozzleId === noz.id);
            if (matchReading && matchReading.closingReading !== undefined) {
              return { ...noz, currentMeterReading: matchReading.closingReading };
            }
            return noz;
          });
          return { ...pump, nozzles: updatedNozzles };
        }
        return pump;
      })
    );
  };

  // Close Shift
  const closeShift = (shiftId: string, notes?: string) => {
    setShifts((prev) =>
      prev.map((s) => {
        if (s.id === shiftId) {
          return { ...s, status: 'CLOSED', closedAt: new Date().toISOString(), notes: notes || s.notes };
        }
        return s;
      })
    );
  };

  // Add Credit Sale
  const addCreditSale = (saleData: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>): CreditTransaction => {
    const now = new Date();
    const dateStr = getTodayDateString();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newSale: CreditTransaction = {
      ...saleData,
      id: `ctx-${Date.now()}`,
      slipNo: `SLIP-${dateStr.replace(/-/g, '')}-${String(creditTransactions.length + 1).padStart(3, '0')}`,
      date: dateStr,
      time: timeStr,
    };

    setCreditTransactions((prev) => [newSale, ...prev]);

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === newSale.customerId
          ? { ...c, outstandingBalance: Math.round((c.outstandingBalance + newSale.amount) * 100) / 100 }
          : c
      )
    );

    if (activeShift) {
      saveShiftDraft({
        ...activeShift,
        collections: {
          ...activeShift.collections,
          creditSales: activeShift.collections.creditSales + newSale.amount,
        },
      });
    }

    return newSale;
  };

  // Record Credit Repayment
  const recordCreditRepayment = (paymentData: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>): CreditPayment => {
    const dateStr = getTodayDateString();
    const newPayment: CreditPayment = {
      ...paymentData,
      id: `cpay-${Date.now()}`,
      receiptNo: `RCPT-${dateStr.replace(/-/g, '')}-${String(creditPayments.length + 1).padStart(3, '0')}`,
      date: dateStr,
    };

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

  // Add Expense
  const addExpense = (expenseData: Omit<Expense, 'id' | 'voucherNo' | 'date'>): Expense => {
    const dateStr = getTodayDateString();
    const newExpense: Expense = {
      ...expenseData,
      id: `exp-${Date.now()}`,
      voucherNo: `VCH-${dateStr.replace(/-/g, '')}-${String(expenses.length + 1).padStart(3, '0')}`,
      date: dateStr,
    };

    setExpenses((prev) => [newExpense, ...prev]);

    if (activeShift && !newExpense.isCreditNote) {
      saveShiftDraft({
        ...activeShift,
        expensesDeducted: (activeShift.expensesDeducted || 0) + newExpense.amount,
      });
    }

    return newExpense;
  };

  // Add Expense Type
  const addExpenseType = (et: Omit<ExpenseType, 'id'>) => {
    const newEt: ExpenseType = { ...et, id: `et-${Date.now()}` };
    setExpenseTypes((prev) => [...prev, newEt]);
  };

  // Record Bank Deposit
  const recordBankDeposit = (depositData: Omit<BankDeposit, 'id' | 'depositDate'>): BankDeposit => {
    const dateStr = getTodayDateString();
    const newDeposit: BankDeposit = {
      ...depositData,
      id: `dep-${Date.now()}`,
      depositDate: dateStr,
    };
    setBankDeposits((prev) => [newDeposit, ...prev]);
    return newDeposit;
  };

  const addCustomer = (custData: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => {
    const newCust: CreditCustomer = {
      ...custData,
      id: `cust-${Date.now()}`,
      outstandingBalance: custData.openingBalance || 0,
    };
    setCustomers((prev) => [...prev, newCust]);
  };

  const updateCustomer = (cust: CreditCustomer) => {
    setCustomers((prev) => prev.map((c) => (c.id === cust.id ? cust : c)));
  };

  const addPump = (pumpData: Omit<Pump, 'id'>) => {
    const newPump: Pump = { ...pumpData, id: `pump-${Date.now()}` };
    setPumps((prev) => [...prev, newPump]);
  };

  const addOperator = (opData: Omit<Operator, 'id'>) => {
    const newOp: Operator = { ...opData, id: `op-${Date.now()}` };
    setOperators((prev) => [...prev, newOp]);
  };

  const addProduct = (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = { ...prodData, id: `prod-${Date.now()}` };
    setProducts((prev) => [...prev, newProd]);
  };

  // Record Tank Dip
  const recordTankDip = (dipData: Omit<TankDip, 'id'>): TankDip => {
    const newDip: TankDip = { ...dipData, id: `dip-${Date.now()}` };
    setDips((prev) => [newDip, ...prev]);

    // Update tank stock
    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === newDip.tankId) {
          const stockLitres = newDip.fuelDipLitres;
          let status: Tank['status'] = 'NORMAL';
          if (stockLitres < t.capacityLitres * 0.1) status = 'CRITICAL';
          else if (stockLitres < t.capacityLitres * 0.2) status = 'LOW';
          else if (stockLitres > t.capacityLitres * 0.95) status = 'OVERFILL';
          return { ...t, currentStockLitres: stockLitres, status };
        }
        return t;
      })
    );

    return newDip;
  };

  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProducts(INITIAL_PRODUCTS);
    setPumps(INITIAL_PUMPS);
    setOperators(INITIAL_OPERATORS);
    setCustomers(INITIAL_CUSTOMERS);
    setExpenseTypes(INITIAL_EXPENSE_TYPES);
    setShifts(INITIAL_SHIFTS);
    setCreditTransactions(INITIAL_CREDIT_TRANSACTIONS);
    setCreditPayments(INITIAL_CREDIT_PAYMENTS);
    setExpenses(INITIAL_EXPENSES);
    setBankDeposits(INITIAL_BANK_DEPOSITS);
    setTanks(INITIAL_TANKS);
    setDips(INITIAL_DIPS);
  };

  return (
    <BunkContext.Provider
      value={{
        role, setRole,
        isMobileView, setIsMobileView, toggleMobileView,
        products, pumps, operators, customers, expenseTypes,
        shifts, creditTransactions, creditPayments, expenses,
        bankDeposits, tanks, dips,
        activeShift, apiConnected,
        updateFuelRate, openNewShift, saveShiftDraft, closeShift,
        addCreditSale, recordCreditRepayment,
        addExpense, addExpenseType,
        recordBankDeposit,
        addCustomer, updateCustomer,
        addPump, addOperator, addProduct,
        recordTankDip,
        resetAllData, syncWithBackend,
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

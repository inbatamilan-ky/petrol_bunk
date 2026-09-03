// Domain Types for FuelPulse — Strict Excel Scope
// All models match the Daily Accounts & Daily Expenses Excel files.

export type UserRole = 'Owner' | 'Manager' | 'Attendant';
export type UserRoleNum = 1 | 2 | 3;
export const ROLE_OWNER: UserRoleNum = 1;
export const ROLE_MANAGER: UserRoleNum = 2;
export const ROLE_ATTENDANT: UserRoleNum = 3;

export interface User {
  id: string | number;
  name?: string;
  username: string;
  phone?: string;
  email?: string;
  role: UserRoleNum;
  roleName?: UserRole;
  avatarUrl?: string;
}

export interface Branch {
  id: string;
  name: string;
  location?: string;
  dealer_code?: string;
  omc_brand: string;
  is_active: boolean;
  bunk_name?: string;
  city?: string;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  manager_access?: string;
  auto_fetch_enabled?: boolean;
  auto_apply_enabled?: boolean;
  gstin?: string;
  operating_hours?: string;
  created_at?: string;
}

// ── Rate Master Block (§1.1-A) ───────────────────────────────────────
export interface Product {
  id: string;
  code: string; // "HSD" | "MS" | "MS2"
  name: string; // "HSD(Diesel)" | "MS(Petrol)" | "MS(Petrol)-II"
  category: 'FUEL' | 'LUBRICANT' | string;
  currentRate: number; // ₹ per unit
  active: boolean;
  color?: string;
  unit?: string;
  hsnCode?: string;
  gstRate?: number;
  tankCapacity?: number;
  densityStandardAt15C?: number;
  standardDensityRange?: { min: number; max: number };
  shortName?: string;
}

export interface FuelRateHistory {
  id: string;
  productId: string;
  effectiveDate: string; // YYYY-MM-DD
  rate: number;
  remarks?: string;
  createdAt?: string;
}

// ── Pump & Nozzle Master Block (§1.1-B) ──────────────────────────────
export interface Nozzle {
  id: string;
  pumpId: string;
  nozzleNo: number; // 1 | 2
  productId: string;
  productName?: string;
  currentMeterReading: number;
  color?: string;
  fuelCode?: string;
}

export interface Pump {
  id: string;
  pumpNo: number; // 1, 2, 3
  name: string; // "Pump 1", "Pump 2", "Pump 3"
  nozzles: Nozzle[];
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'IDLE';
  model?: string;
  serialNumber?: string;
  makeModel?: string;
  installationDate?: string;
  tankId?: string;
  side?: string;
}

export interface Operator {
  id: string;
  name: string;
  phone?: string;
  active: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  employeeCode?: string;
  aadhaarNo?: string;
  monthlySalary?: number;
  joiningDate?: string;
  emergencyContact?: string;
  assignedShift?: string;
  govtIdDocName?: string;
  govtIdDocUrl?: string;
}

// ── Customer Block (§1.1-C) ──────────────────────────────────────────
export interface CreditCustomer {
  id: string;
  name: string; // Customer name (e.g. sathish, kpj, kjf, etc.)
  phone?: string;
  outstandingBalance: number;
  code?: string;
  contactPerson?: string;
  email?: string;
  gstin?: string;
  panNumber?: string;
  creditLimit?: number;
  openingBalance?: number;
  creditPeriodDays?: number;
  discountPerLitre?: number;
  maxVehiclesAllowed?: number;
  vehicleNumbers?: string[];
  address?: string;
  billingAddress?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'SUSPENDED';
}

// ── 33 Fixed Expense Heads (§1.2) ────────────────────────────────────
export interface ExpenseType {
  id: string;
  name: string; // One of the 33 fixed heads
  branchId?: string | null;
  category?: string;
  active?: boolean;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  expenseTypeId: string;
  expenseTypeName: string;
  amount: number;
  remarks?: string;
}

// ── Daily Meter Readings (§1.1-B) ────────────────────────────────────
export interface DailyNozzleMeter {
  id: string;
  readingDate: string; // YYYY-MM-DD
  pumpId: string;
  nozzleId: string;
  productId: string;
  openingMeter: number;
  closingMeter: number;
  litresSold: number; // computed: closing - opening
  sellingRate: number;
  grossAmount: number; // computed: litresSold * sellingRate
}

// ── Credit Sales (§1.1-C) & Collections (§1.1-E) ──────────────────────
export interface CreditTransaction {
  id: string;
  date: string;
  pumpId: string;
  customerId: string;
  customerName?: string;
  productId: string;
  productName?: string;
  litres: number;
  rate: number;
  amount: number; // litres * rate
  remarks?: string;
}

export type CreditPaymentMode =
  | 'Cash'
  | 'Card'
  | 'FC'
  | 'Paytm'
  | 'Cheque'
  | 'Bank Transfer'
  | 'Gpay';

export interface CreditPayment {
  id: string;
  date: string;
  customerId: string;
  customerName?: string;
  amount: number;
  paymentMode: CreditPaymentMode;
}

// ── Settlements Block (§1.1-F) ───────────────────────────────────────
export type SettlementBankCode = 'ICICI' | 'SBI' | 'HDFC' | 'Paytm';
export type SettlementChannelCode =
  | 'Gpay'
  | 'Paytm'
  | 'Swiping Machine'
  | 'Fleet Card'
  | 'Phone Pay';

export interface Settlement {
  id: string;
  settlementDate: string; // YYYY-MM-DD
  bankCode: string;
  channelCode: string;
  amount: number;
}

// ── Operator Pump-Day Attribution (§1.1-H) ───────────────────────────
export type SessionStatus = 'DRAFT' | 'OPEN' | 'SUBMITTED' | 'CLOSED' | 'LOCKED' | 'RECONCILED';

export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT';

export interface PumpDayAttribution {
  id: string;
  attributionDate: string; // YYYY-MM-DD
  pumpId: string;
  pumpNo: number;
  operatorId: string;
  operatorName: string;
  nozzleIds?: string[];
  nozzleNames?: string[];
  shiftType?: ShiftType | null;
  timeIn?: string | null;   // e.g. "06:00"
  timeOut?: string | null;  // e.g. "14:00"
  // Type A — manually entered
  cashCollected: number;
  cardCollected: number;         // Swiping Machine
  gpayCollected?: number;        // GPay
  phonePayCollected?: number;    // PhonePe
  paytmCollected?: number;       // Paytm
  fleetCardCollected: number;    // Fleet Card
  advanceAmount?: number;        // Advance given this session
  actualCashHandover?: number | null;
  // Type B — auto-fetched
  creditSales: number;
  meterSalesAmount?: number | null;
  // Type C — auto-calculated
  upiGpayCollected: number;
  totalAmount: number;
  expectedCashHandover?: number | null;
  cashVariance?: number | null;
  meterVariance?: number | null;
  // Status
  status?: SessionStatus;
  notes?: string | null;
  // Legacy
  advancePayment: number;
  creditAcc: number;
  netPayment: number;
}

// ── Daily Cash Reconciliation (§1.1-I) ────────────────────────────────
export interface DailyCashReconciliation {
  id: string;
  reconDate: string; // YYYY-MM-DD
  openingBalance: number;
  morningCollection: number;
  oilDw: number;
  totalCash: number;
  cashForCardSwipe: number;
  cashDepositInBank: number;
  bunkExpenses?: number;
  bata?: number;
  systemTotalInSheet: number; // "In Excel Sheet"
  physicallyCountedNote: number; // "In Note"
  difference: number; // systemTotalInSheet - physicallyCountedNote
  netCashForTheDay: number;
}

// ── Bank Deposits ─────────────────────────────────────────────────────
export interface BankDeposit {
  id: string;
  depositDate: string;
  amount: number;
}

// ── Master Lookup Tables ──────────────────────────────────────────────
export interface MasterBank {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MasterChannel {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface MasterPaymentMode {
  id: number;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

// ── Dashboard Summary ─────────────────────────────────────────────────
export interface DashboardSummary {
  totalSalesAmount: number;
  totalLitresSold: number;
  totalCashCollected: number;
  totalExpenses: number;
  netCashOnHand: number;
  totalCreditOutstanding: number;
  totalBankDeposited: number;
  activeCustomers: number;
  totalPumps: number;
  totalOperators: number;
}

// ── Tally System Types ──────────────────────────────────────────────────

export interface TallyTotals {
  cash: number;
  card: number;
  gpay: number;
  phonepe: number;
  paytm: number;
  fleet: number;
  credit: number;
  grandTotal: number;
  meterTotal: number;
  meterVariance: number;
  expectedCash: number;
  actualCash: number;
  cashVariance: number;
}

export interface OperatorSessionRow {
  sessionId: string;
  operatorName: string;
  pumpNo: number;
  pumpName: string;
  shiftType: ShiftType | string | null;
  timeIn: string | null;
  timeOut: string | null;
  cash: number;
  card: number;
  gpay: number;
  phonepe: number;
  paytm: number;
  fleet: number;
  credit: number;
  totalSales: number;
  meterSales: number | null;
  meterVariance: number | null;
  advanceAmount: number;
  expectedCash: number | null;
  actualCash: number | null;
  cashVariance: number | null;
  status: SessionStatus;
}

export interface ShiftTally {
  shiftType: ShiftType | string;
  sessions: OperatorSessionRow[];
  subtotals: TallyTotals;
}

export interface PumpTally {
  pumpId: string;
  pumpNo: number;
  pumpName: string;
  sessions: OperatorSessionRow[];
  subtotals: TallyTotals;
}

export interface DailyTally {
  businessDate: string;
  totals: TallyTotals;
  byShift: ShiftTally[];
  byPump: PumpTally[];
  sessions: OperatorSessionRow[];
}

export interface CustomerCreditRow {
  customerId: string;
  customerName: string;
  newCredit: number;
  payments: number;
  closingBalance: number;
}

export interface CreditLedgerDay {
  businessDate: string;
  openingOutstanding: number;
  newCreditSales: number;
  creditPayments: number;
  closingOutstanding: number;
  customerBreakdown: CustomerCreditRow[];
}

export interface ReconciliationOut {
  businessDate: string;
  sales: TallyTotals;
  meter: { totalSales: number; variance: number };
  cash: { expected: number; actual: number; variance: number };
  bank: { expected: number; actual: number; variance: number };
  credit: CreditLedgerDay;
  expenses: { total: number };
  overallStatus: 'RECONCILED' | 'NEEDS_REVIEW' | 'MISMATCH';
}

// ── Page-Wise Access Control Types ────────────────────────────────────
export type PageId =
  | 'dashboard'
  | 'shifts'
  | 'tanks'
  | 'credit'
  | 'expenses'
  | 'rates'
  | 'cashbank'
  | 'reports'
  | 'masters'
  | 'permissions';

export interface PagePermissionConfig {
  id: PageId;
  title: string;
  category: 'Operations' | 'Finance & Sales' | 'Inventory' | 'Administration';
  description: string;
  defaultManagerAccess: boolean;
  ownerOnly?: boolean;
}


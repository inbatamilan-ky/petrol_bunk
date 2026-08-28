// Domain Types for Petrol Pump Management Application (KY Technologies Scope)

export type UserRole = 'Owner' | 'Manager';
export type UserRoleNum = 1 | 2;
export const ROLE_OWNER: UserRoleNum = 1;
export const ROLE_MANAGER: UserRoleNum = 2;

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
}

export type FuelType = 'DIESEL' | 'PETROL' | 'PETROL_II' | 'LUBRICANT';

export interface DensityRange {
  min: number;
  max: number;
}

export interface Product {
  id: string;
  code: string; // "HSD", "MS", "MS2", "LUB"
  name: string; // "HSD (Diesel)", "MS (Petrol)", etc.
  category: 'FUEL' | 'LUBRICANT';
  unit: 'Litre' | 'Can' | 'Kg' | 'Piece';
  color: string;
  currentRate: number; // ₹ per unit
  hsnCode?: string; // HSN Code (e.g. 2710)
  gstRate?: number; // GST % (e.g. 18)
  tankCapacity?: number; // Total capacity in litres
  densityStandardAt15C?: number; // Standard density kg/m³
  standardDensityRange: DensityRange;
  active?: boolean;
}

export interface Nozzle {
  id: string;
  pumpId: string;
  nozzleNo: number;
  productId: string;
  productName: string;
  fuelCode: string;
  color: string;
  currentMeterReading: number;
  status?: 'ACTIVE' | 'INACTIVE';
}

export interface Pump {
  id: string;
  pumpNo: number;
  name: string; // e.g. "Pump 1", "Pump 2"
  model?: string; // e.g. "Midco MPD Duo"
  serialNumber?: string; // Manufacturer Serial ID
  makeModel?: string; // e.g. "Midco", "Gilbarco", "Tokheim"
  pesoSealNo?: string; // W&M Stamping / PESO Seal Number
  installationDate?: string; // Calibration Date
  tankId?: string; // Assigned Tank Link
  side?: string; // Dual Side / Lane 1
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'INACTIVE';
  nozzles: Nozzle[];
}

export interface Operator {
  id: string;
  name: string;
  phone: string;
  employeeCode?: string; // EMP-101
  aadhaarNo?: string; // Aadhaar / Gov ID
  dailyBata?: number;
  monthlySalary?: number; // Base monthly compensation
  joiningDate?: string; // YYYY-MM-DD
  emergencyContact?: string; // Contact phone
  assignedShift?: string; // 'Morning' | 'Night' | 'Rotating'
  status?: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';
  active: boolean;
}

export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Full Day';
export type ShiftStatus = 'OPEN' | 'IN_PROGRESS' | 'RECONCILED' | 'CLOSED';

export interface MeterReadingEntry {
  nozzleId: string;
  nozzleNo: number;
  productName: string;
  fuelCode: string;
  rate: number;
  openingReading: number;
  closingReading?: number;
  testingLitres: number;
  litresSold?: number; // (closing - opening - testing)
  grossAmount?: number; // litresSold * rate
}

export interface PaymentCollectionBreakdown {
  cash: number;
  upiGpay: number;
  card: number;
  fleetCard: number;
  creditSales: number;
  cheque: number;
}

export interface Shift {
  id: string;
  shiftNo: string;
  shiftDate: string; // YYYY-MM-DD
  shiftType: ShiftType;
  pumpId: string;
  pumpNo: number;
  operatorId: string;
  operatorName: string;
  openedAt: string;
  closedAt?: string;
  status: ShiftStatus;
  meterReadings: MeterReadingEntry[];
  totalLitresSold: number;
  totalSalesAmount: number;
  expensesDeducted: number;
  collections: PaymentCollectionBreakdown;
  totalCollected: number;
  shortageOrExcess: number; // positive = excess, negative = shortage
  verifiedBy?: string;
  notes?: string;
}

export interface CreditCustomer {
  id: string;
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstin?: string; // GST Number
  panNumber?: string; // PAN
  creditPeriodDays?: number; // Credit term (e.g. 15, 30 days)
  discountPerLitre?: number; // Special concession ₹/L
  maxVehiclesAllowed?: number;
  vehicleNumbers: string[];
  creditLimit: number;
  outstandingBalance: number;
  openingBalance: number;
  status: 'ACTIVE' | 'HOLD' | 'BLOCKED' | 'INACTIVE';
  address?: string;
  billingAddress?: string;
}

export interface CreditTransaction {
  id: string;
  slipNo: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  date: string;
  time: string;
  pumpId: string;
  pumpNo: number;
  productId: string;
  productName: string;
  vehicleNo: string;
  litres: number;
  rate: number;
  amount: number;
  driverName?: string;
  attachmentName?: string;
  shiftId?: string;
  operatorName?: string;
  remarks?: string;
}

export interface CreditPayment {
  id: string;
  receiptNo: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  date: string;
  amount: number;
  paymentMode: 'Cash' | 'Cheque' | 'Bank Transfer' | 'NEFT' | 'UPI';
  referenceNo?: string;
  attachmentName?: string;
  notes?: string;
  receivedBy: string;
}

export interface ExpenseType {
  id: string;
  name: string;
  category: 'OPERATIONAL' | 'STAFF' | 'FINANCIAL' | 'MAINTENANCE';
  active?: boolean;
}

export interface Expense {
  id: string;
  voucherNo: string;
  date: string;
  expenseTypeId: string;
  expenseTypeName: string;
  amount: number;
  pumpId?: string;
  pumpNo?: number;
  paidTo: string;
  paidBy: string;
  remarks?: string;
  isCreditNote: boolean; // True for expense return / partial reversal
  attachmentName?: string;
}

export interface CashDenomination {
  note2000: number;
  note500: number;
  note200: number;
  note100: number;
  note50: number;
  note20: number;
  note10: number;
  coins: number;
}

export interface BankDeposit {
  id: string;
  depositDate: string;
  bankName: string;
  accountNo: string;
  amount: number;
  denominations: CashDenomination;
  depositedBy: string;
  referenceNo: string;
  attachmentName?: string;
  notes?: string;
}

// ─── Tank & Dip Types ───────────────────────────────────────────────────────

export interface Tank {
  id: string;
  name: string;
  productId: string;
  productName: string;
  capacityLitres: number;
  currentStockLitres: number;
  diameterCm: number;
  status: 'NORMAL' | 'LOW' | 'CRITICAL' | 'OVERFILL';
}

export interface TankDip {
  id: string;
  tankId: string;
  tankName: string;
  productName: string;
  dipDate: string;
  dipType: 'Morning' | 'Evening' | 'After Decantation';
  fuelDipCm: number;
  fuelDipLitres: number;
  waterDipCm: number;
  observedDensity: number;
  observedTemp: number;
  convertedDensity: number;
  bookStockLitres: number;
  variance: number;
  testedBy: string;
  remarks?: string;
}

export interface SmsLogEntry {
  id: string;
  sender: string; // e.g. 'VK-BPCLTD', 'AX-IOCLTD', 'VM-HPCLLTD', 'Manual Import'
  receivedAt: string; // ISO string
  rawText: string;
  omc: 'IOCL' | 'BPCL' | 'HPCL' | 'NAYARA' | 'RELIANCE' | 'GENERIC';
  effectiveDateTime?: string;
  parsedRates: {
    fuelKey: string;
    rate: number;
    matchedProductName?: string;
    matchedProductId?: string;
  }[];
  status: 'APPLIED' | 'PENDING' | 'DISMISSED';
  appliedAt?: string;
  appliedBy?: string;
}

export interface Branch {
  id: string;
  name: string;
  omc_brand: 'IOCL' | 'BPCL' | 'HPCL' | 'NAYARA' | 'RELIANCE';
  dealer_code: string;
  location: string;
  is_active: boolean;
  created_at?: string;

  // Station Physical & Regulatory Details
  gstin?: string; // GST Number
  peso_license_no?: string; // Explosives/PESO License
  operating_hours?: string; // e.g. "24 Hours" or "06:00 AM - 11:00 PM"
  contact_email?: string;
  address_street?: string;
  pincode?: string;
  
  // Manager Access Configuration
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  manager_access?: string; // e.g. "Full Operational Access", "Shift & Daybook Only", "Read Only"

  // Backwards compatibility mappings for UI
  bunk_name?: string;
  city?: string;
  auto_fetch_enabled?: boolean;
  auto_apply_enabled?: boolean;
}

export interface DailyNozzleMeter {
  id: string;
  readingDate: string;
  pumpId: string;
  nozzleId: string;
  productId: string;
  openingMeter: number;
  closingMeter: number;
  testingLitres: number;
  litresSold: number;
  sellingRate: number;
  grossAmount: number;
  recordedBy?: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: 'Current' | 'CC/OD' | 'Savings';
  branchName?: string;
  ifscCode?: string;
  accountHolderName?: string; // Entity legal name
  branchAddress?: string; // Branch physical address
  upiVpa?: string; // Station merchant UPI ID / VPA
  posTerminalId?: string; // Linked EDC TID
  overdraftLimit?: number; // Sanctioned OD/CC limit
  openingBalance: number;
  currentBalance: number;
  isPrimary: boolean;
  isActive: boolean;
}

export interface PosSettlement {
  id: string;
  settlementDate: string;
  channelType: 'UPI' | 'POS_CARD' | 'FLEET_CARD' | 'NEFT';
  terminalId?: string;
  batchNo?: string;
  grossAmount: number;
  mdrFee: number;
  netSettledAmount: number;
  bankAccountId?: string;
  status: 'SETTLED' | 'PENDING';
}

export interface CashSafeLedger {
  id: string;
  ledgerDate: string;
  openingSafeCash: number;
  shiftCashInflow: number;
  creditCashRecovered: number;
  pettyCashExpenses: number;
  bankDepositsDropped: number;
  expectedSafeCash: number;
  physicalCountedCash: number;
  cashVariance: number;
  denominations: CashDenomination;
  auditedBy: string;
  notes?: string;
}

export type RateChangeSource = 'MANUAL_ENTRY' | 'MANUAL_UPLOAD' | 'SMS_AUTO' | 'SMS_MANUAL_APPLY' | 'BATCH_IMPORT';

export interface FuelRateHistory {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  effectiveDate: string;   // ISO date YYYY-MM-DD
  oldRate: number;
  newRate: number;
  changeSource: RateChangeSource;
  changedBy: string;
  remarks?: string;
  createdAt?: string;
}

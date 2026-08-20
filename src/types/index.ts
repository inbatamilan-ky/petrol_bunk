// Domain Types for Petrol Pump Management Application (KY Technologies Scope)

export type UserRole = 'Operator' | 'Manager' | 'Owner' | 'Admin';

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
  unit: 'Litre' | 'Can';
  color: string;
  currentRate: number; // ₹ per unit
  standardDensityRange: DensityRange;
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
}

export interface Pump {
  id: string;
  pumpNo: number;
  name: string; // e.g. "Pump 1", "Pump 2"
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE';
  nozzles: Nozzle[];
}

export interface Operator {
  id: string;
  name: string;
  phone: string;
  dailyBata: number;
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
  vehicleNumbers: string[];
  creditLimit: number;
  outstandingBalance: number;
  openingBalance: number;
  status: 'ACTIVE' | 'HOLD' | 'BLOCKED';
  address?: string;
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

import {
  Product,
  Pump,
  Operator,
  CreditCustomer,
  ExpenseType,
  CreditTransaction,
  CreditPayment,
  Expense,
  BankDeposit,
  DailyNozzleMeter,
  PumpDayAttribution,
  Settlement,
  DailyCashReconciliation,
} from '../types';

export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_PUMPS: Pump[] = [];
export const INITIAL_OPERATORS: Operator[] = [];
export const INITIAL_CUSTOMERS: CreditCustomer[] = [];
export const INITIAL_EXPENSE_TYPES: ExpenseType[] = [];
export const INITIAL_CREDIT_TRANSACTIONS: CreditTransaction[] = [];
export const INITIAL_CREDIT_PAYMENTS: CreditPayment[] = [];
export const INITIAL_EXPENSES: Expense[] = [];
export const INITIAL_BANK_DEPOSITS: BankDeposit[] = [];
export const INITIAL_DAILY_NOZZLE_METERS: DailyNozzleMeter[] = [];
export const INITIAL_PUMP_DAY_ATTRIBUTIONS: PumpDayAttribution[] = [];
export const INITIAL_SETTLEMENTS: Settlement[] = [];
export const INITIAL_RECONCILIATION: DailyCashReconciliation | null = null;

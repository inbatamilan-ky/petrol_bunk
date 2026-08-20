import seedRaw from './seedData.json';
import {
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
} from '../types';

const seed = seedRaw as any;

export const INITIAL_PRODUCTS: Product[] = seed.products || [];
export const INITIAL_PUMPS: Pump[] = seed.pumps || [];
export const INITIAL_OPERATORS: Operator[] = seed.operators || [];
export const INITIAL_CUSTOMERS: CreditCustomer[] = seed.customers || [];
export const INITIAL_EXPENSE_TYPES: ExpenseType[] = seed.expenseTypes || [];
export const INITIAL_SHIFTS: Shift[] = seed.shifts || [];
export const INITIAL_CREDIT_TRANSACTIONS: CreditTransaction[] = seed.creditTransactions || [];
export const INITIAL_CREDIT_PAYMENTS: CreditPayment[] = seed.creditPayments || [];
export const INITIAL_EXPENSES: Expense[] = seed.expenses || [];
export const INITIAL_BANK_DEPOSITS: BankDeposit[] = seed.bankDeposits || [];
export const INITIAL_TANKS: Tank[] = seed.tanks || [];
export const INITIAL_DIPS: TankDip[] = [];

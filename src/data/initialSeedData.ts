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
export const INITIAL_DIPS: TankDip[] = [
  {
    id: 'dip-1',
    tankId: 'tank-1',
    tankName: 'Tank 1 (HSD Diesel)',
    productName: 'HSD (Diesel)',
    dipDate: '2026-08-21',
    dipType: 'Morning',
    fuelDipCm: 185.0,
    fuelDipLitres: 16250.0,
    waterDipCm: 0.0,
    observedDensity: 830.0,
    observedTemp: 29.5,
    convertedDensity: 839.2,
    bookStockLitres: 16250.0,
    variance: 0.0,
    testedBy: 'Manager',
  },
  {
    id: 'dip-2',
    tankId: 'tank-2',
    tankName: 'Tank 2 (MS Petrol)',
    productName: 'MS (Petrol)',
    dipDate: '2026-08-21',
    dipType: 'Morning',
    fuelDipCm: 142.5,
    fuelDipLitres: 11840.0,
    waterDipCm: 0.0,
    observedDensity: 742.0,
    observedTemp: 29.0,
    convertedDensity: 752.4,
    bookStockLitres: 11840.0,
    variance: 0.0,
    testedBy: 'Manager',
  },
  {
    id: 'dip-3',
    tankId: 'tank-3',
    tankName: 'Tank 3 (XP95 Premium)',
    productName: 'XP95 (Speed Petrol)',
    dipDate: '2026-08-21',
    dipType: 'Morning',
    fuelDipCm: 98.0,
    fuelDipLitres: 7850.0,
    waterDipCm: 0.0,
    observedDensity: 745.0,
    observedTemp: 29.0,
    convertedDensity: 755.1,
    bookStockLitres: 7850.0,
    variance: 0.0,
    testedBy: 'Manager',
  },
];

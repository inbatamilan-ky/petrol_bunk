import React, { createContext, useContext, useMemo } from 'react';
import { Product, Pump, Shift, CreditCustomer, Expense, UserRole } from '../types';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { useExpensesContext } from './ExpensesContext';

export interface DashboardContextType {
  products: Product[];
  pumps: Pump[];
  shifts: Shift[];
  customers: CreditCustomer[];
  expenses: Expense[];
  activeShift: Shift | null;
  role: UserRole;

  totalSalesToday: number;
  totalLitresToday: number;
  totalCashCollected: number;
  totalExpenses: number;
  totalCreditOutstanding: number;
  netCashOnHand: number;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuthContext();
  const { products, pumps, customers } = useMastersContext();
  const { shifts, activeShift } = useShiftOperationsContext();
  const { expenses } = useExpensesContext();

  const totalSalesToday = useMemo(
    () => shifts.reduce((sum: number, s) => sum + s.totalSalesAmount, 0),
    [shifts]
  );
  const totalLitresToday = useMemo(
    () => shifts.reduce((sum, s) => sum + s.totalLitresSold, 0),
    [shifts]
  );
  const totalCashCollected = useMemo(
    () => shifts.reduce((sum, s) => sum + s.collections.cash, 0),
    [shifts]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => (e.isCreditNote ? sum - e.amount : sum + e.amount), 0),
    [expenses]
  );
  const totalCreditOutstanding = useMemo(
    () => customers.reduce((sum, c) => sum + c.outstandingBalance, 0),
    [customers]
  );
  const netCashOnHand = useMemo(
    () => Math.max(0, totalCashCollected - totalExpenses),
    [totalCashCollected, totalExpenses]
  );

  return (
    <DashboardContext.Provider
      value={{
        products,
        pumps,
        shifts,
        customers,
        expenses,
        activeShift,
        role,
        totalSalesToday,
        totalLitresToday,
        totalCashCollected,
        totalExpenses,
        totalCreditOutstanding,
        netCashOnHand,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};

export { DashboardContext };

import React, { createContext, useContext, useMemo } from 'react';
import { Product, Pump, CreditCustomer, Expense, UserRole } from '../types';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { useExpensesContext } from './ExpensesContext';

export interface DashboardContextType {
  products: Product[];
  pumps: Pump[];
  customers: CreditCustomer[];
  expenses: Expense[];
  role: UserRole;

  totalSalesToday: number;
  totalLitresToday: number;
  totalCashCollected: number;
  totalExpenses: number;
  totalCreditOutstanding: number;
  netCashOnHand: number;
  shifts: any[];
  activeShift: any;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role } = useAuthContext();
  const { products, pumps, customers } = useMasters();
  const { attributions, nozzleMeters } = useShiftOperationsContext();
  const { expenses } = useExpensesContext();

  const totalSalesToday = useMemo(
    () => nozzleMeters.reduce((sum, m) => sum + m.grossAmount, 0),
    [nozzleMeters]
  );
  const totalLitresToday = useMemo(
    () => nozzleMeters.reduce((sum, m) => sum + m.litresSold, 0),
    [nozzleMeters]
  );
  const totalCashCollected = useMemo(
    () => attributions.reduce((sum, a) => sum + a.cashCollected, 0),
    [attributions]
  );
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
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
        customers,
        expenses,
        role,
        totalSalesToday,
        totalLitresToday,
        totalCashCollected,
        totalExpenses,
        totalCreditOutstanding,
        netCashOnHand,
        shifts: attributions,
        activeShift: attributions[0] || null,
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

export const useDashboard = useDashboardContext;
export { DashboardContext };

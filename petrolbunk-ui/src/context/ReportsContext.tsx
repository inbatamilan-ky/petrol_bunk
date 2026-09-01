import React, { createContext, useContext } from 'react';
import { CreditCustomer, Expense, Product, CreditTransaction, CreditPayment } from '../types';
import { useMasters } from './MastersContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { useExpensesContext } from './ExpensesContext';
import { useCreditLedgerContext } from './CreditLedgerContext';

export interface ReportsContextType {
  shifts: any[];
  customers: CreditCustomer[];
  expenses: Expense[];
  products: Product[];
  creditTransactions: CreditTransaction[];
  creditPayments: CreditPayment[];
  generateReport: () => void;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { products, customers } = useMasters();
  const { shifts } = useShiftOperationsContext();
  const { expenses } = useExpensesContext();
  const { creditTransactions, creditPayments } = useCreditLedgerContext();

  return (
    <ReportsContext.Provider
      value={{
        shifts,
        customers,
        expenses,
        products,
        creditTransactions,
        creditPayments,
        generateReport: () => {},
      }}
    >
      {children}
    </ReportsContext.Provider>
  );
};

export const useReportsContext = () => {
  const context = useContext(ReportsContext);
  if (!context) {
    throw new Error('useReportsContext must be used within a ReportsProvider');
  }
  return context;
};

export { ReportsContext };

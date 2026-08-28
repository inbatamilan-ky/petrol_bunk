import React, { createContext, useContext } from 'react';
import { Shift, CreditCustomer, Expense, Product, CreditTransaction, CreditPayment } from '../types';
import { useMastersContext } from './MastersContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { useExpensesContext } from './ExpensesContext';
import { useCreditLedgerContext } from './CreditLedgerContext';

export interface ReportsContextType {
  shifts: Shift[];
  customers: CreditCustomer[];
  expenses: Expense[];
  products: Product[];
  creditTransactions: CreditTransaction[];
  creditPayments: CreditPayment[];
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { products, customers } = useMastersContext();
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

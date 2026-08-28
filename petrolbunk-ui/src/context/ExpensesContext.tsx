import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseType, Pump, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
import { mapExpense } from './mappers';

export interface ExpensesContextType {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  expenseTypes: ExpenseType[];
  pumps: Pump[];
  role: UserRole;

  addExpense: (expense: Omit<Expense, 'id' | 'voucherNo' | 'date'>) => Promise<Expense>;
  addExpenseType: (et: Omit<ExpenseType, 'id'>) => Promise<void>;
  updateExpenseType: (et: ExpenseType) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;
  syncExpenses: () => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { expenseTypes, pumps, addExpenseType, updateExpenseType, deleteExpenseType } = useMastersContext();

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const syncExpenses = useCallback(async () => {
    try {
      const expData = await apiFetch('/api/expenses').catch(() => []);
      if (Array.isArray(expData)) {
        setExpenses(expData.map(mapExpense));
      }
    } catch (e) {
      console.error('syncExpenses error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncExpenses();
    } else {
      setExpenses([]);
    }
  }, [isLoggedIn, activeBranchId, syncExpenses]);

  const addExpense = useCallback(
    async (expenseData: Omit<Expense, 'id' | 'voucherNo' | 'date'>): Promise<Expense> => {
      const payload = {
        expense_type_id: expenseData.expenseTypeId,
        amount: expenseData.amount,
        paid_to: expenseData.paidTo,
        paid_by: expenseData.paidBy,
        pump_id: expenseData.pumpId || null,
        is_credit_note: expenseData.isCreditNote,
        remarks: expenseData.remarks,
      };
      const created = await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(payload) });
      const newExpense = mapExpense(created);
      setExpenses((prev) => [newExpense, ...prev]);
      return newExpense;
    },
    []
  );

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        setExpenses,
        expenseTypes,
        pumps,
        role,
        addExpense,
        addExpenseType,
        updateExpenseType,
        deleteExpenseType,
        syncExpenses,
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};

export const useExpensesContext = () => {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error('useExpensesContext must be used within an ExpensesProvider');
  }
  return context;
};

export { ExpensesContext };

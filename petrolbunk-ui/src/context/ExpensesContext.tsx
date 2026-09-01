import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseType, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { mapExpense } from './mappers';

export interface ExpensesContextType {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  expenseTypes: ExpenseType[];
  role: UserRole;

  addExpense: (expense: {
    date?: string;
    expenseTypeId: string;
    amount: number;
    remarks?: string;
  }) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  addExpenseType: (et: Omit<ExpenseType, 'id'>) => Promise<void>;
  updateExpenseType: (et: ExpenseType) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;
  syncExpenses: () => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextType | undefined>(undefined);

export const ExpensesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { expenseTypes, addExpenseType, updateExpenseType, deleteExpenseType } = useMasters();

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
    async (expenseData: {
      date?: string;
      expenseTypeId: string;
      amount: number;
      remarks?: string;
    }): Promise<Expense> => {
      const payload = {
        date: expenseData.date || new Date().toISOString().split('T')[0],
        expense_type_id: expenseData.expenseTypeId,
        amount: expenseData.amount,
        remarks: expenseData.remarks || '',
      };
      const created = await apiFetch('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const newExpense = mapExpense(created);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    },
    []
  );

  const deleteExpense = useCallback(async (id: string) => {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setExpenses(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <ExpensesContext.Provider
      value={{
        expenses,
        setExpenses,
        expenseTypes,
        role,
        addExpense,
        deleteExpense,
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

export const useExpenses = useExpensesContext;
export { ExpensesContext };

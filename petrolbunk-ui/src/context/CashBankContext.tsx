import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BankDeposit,
  BankAccount,
  CashSafeLedger,
  Shift,
  Expense,
  CreditPayment,
  Branch,
  UserRole,
} from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { useExpensesContext } from './ExpensesContext';
import { useCreditLedgerContext } from './CreditLedgerContext';
import { mapBankAccount, mapBankDeposit } from './mappers';

export interface CashBankContextType {
  bankDeposits: BankDeposit[];
  setBankDeposits: React.Dispatch<React.SetStateAction<BankDeposit[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  shifts: Shift[];
  expenses: Expense[];
  creditPayments: CreditPayment[];
  bunkProfile: Branch | null;
  role: UserRole;

  recordBankDeposit: (deposit: Omit<BankDeposit, 'id' | 'depositDate'>) => Promise<BankDeposit>;
  addBankAccount: (acc: Omit<BankAccount, 'id'>) => Promise<void>;
  updateBankAccount: (acc: BankAccount) => Promise<void>;
  deleteBankAccount: (id: string) => Promise<void>;
  saveCashSafeLedger: (ledger: Omit<CashSafeLedger, 'id'>) => Promise<void>;
  syncCashBank: () => Promise<void>;
}

const CashBankContext = createContext<CashBankContextType | undefined>(undefined);

export const CashBankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, bunkProfile, activeBranchId } = useAuthContext();
  const { shifts } = useShiftOperationsContext();
  const { expenses } = useExpensesContext();
  const { creditPayments } = useCreditLedgerContext();

  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const syncCashBank = useCallback(async () => {
    try {
      const [bdData, baData] = await Promise.all([
        apiFetch('/api/bank-deposits').catch(() => []),
        apiFetch('/api/bank-accounts').catch(() => []),
      ]);

      if (Array.isArray(bdData)) setBankDeposits(bdData.map(mapBankDeposit));
      if (Array.isArray(baData)) setBankAccounts(baData.map(mapBankAccount));
    } catch (e) {
      console.error('syncCashBank error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncCashBank();
    } else {
      setBankDeposits([]);
      setBankAccounts([]);
    }
  }, [isLoggedIn, activeBranchId, syncCashBank]);

  const recordBankDeposit = useCallback(
    async (depositData: Omit<BankDeposit, 'id' | 'depositDate'>): Promise<BankDeposit> => {
      const d = depositData.denominations;
      const payload = {
        bank_name: depositData.bankName,
        account_no: depositData.accountNo,
        amount: depositData.amount,
        note_2000: d?.note2000 ?? 0,
        note_500: d?.note500 ?? 0,
        note_200: d?.note200 ?? 0,
        note_100: d?.note100 ?? 0,
        note_50: d?.note50 ?? 0,
        note_20: d?.note20 ?? 0,
        note_10: d?.note10 ?? 0,
        coins: d?.coins ?? 0,
        deposited_by: depositData.depositedBy,
        reference_no: depositData.referenceNo,
        notes: depositData.notes,
      };
      const created = await apiFetch('/api/bank-deposits', { method: 'POST', body: JSON.stringify(payload) });
      const newDeposit = mapBankDeposit(created);
      setBankDeposits((prev) => [newDeposit, ...prev]);
      return newDeposit;
    },
    []
  );

  const addBankAccount = useCallback(async (accData: Omit<BankAccount, 'id'>) => {
    const payload = {
      bank_name: accData.bankName,
      account_number: accData.accountNumber,
      account_type: accData.accountType,
      branch_name: accData.branchName,
      ifsc_code: accData.ifscCode,
      opening_balance: accData.openingBalance,
      current_balance: accData.currentBalance,
      is_primary: accData.isPrimary,
      is_active: accData.isActive,
    };
    const created = await apiFetch('/api/bank-accounts', { method: 'POST', body: JSON.stringify(payload) });
    setBankAccounts((prev) => [...prev, mapBankAccount(created)]);
  }, []);

  const updateBankAccount = useCallback(async (acc: BankAccount) => {
    const payload = {
      bank_name: acc.bankName,
      account_number: acc.accountNumber,
      account_type: acc.accountType,
      branch_name: acc.branchName,
      ifsc_code: acc.ifscCode,
      opening_balance: acc.openingBalance,
      current_balance: acc.currentBalance,
      is_primary: acc.isPrimary,
      is_active: acc.isActive,
    };
    const updated = await apiFetch(`/api/bank-accounts/${acc.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    setBankAccounts((prev) => prev.map((a) => (a.id === acc.id ? mapBankAccount(updated) : a)));
  }, []);

  const deleteBankAccount = useCallback(async (id: string) => {
    await apiFetch(`/api/bank-accounts/${id}`, { method: 'DELETE' });
    setBankAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const saveCashSafeLedger = useCallback(async (ledgerData: Omit<CashSafeLedger, 'id'>) => {
    const payload = {
      ledger_date: ledgerData.ledgerDate,
      opening_safe_cash: ledgerData.openingSafeCash,
      shift_cash_inflow: ledgerData.shiftCashInflow,
      credit_cash_recovered: ledgerData.creditCashRecovered,
      petty_cash_expenses: ledgerData.pettyCashExpenses,
      bank_deposits_dropped: ledgerData.bankDepositsDropped,
      expected_safe_cash: ledgerData.expectedSafeCash,
      physical_counted_cash: ledgerData.physicalCountedCash,
      cash_variance: ledgerData.cashVariance,
      denominations: ledgerData.denominations,
      audited_by: ledgerData.auditedBy,
      notes: ledgerData.notes,
    };
    await apiFetch('/api/cash-ledger', { method: 'POST', body: JSON.stringify(payload) });
  }, []);

  return (
    <CashBankContext.Provider
      value={{
        bankDeposits,
        setBankDeposits,
        bankAccounts,
        setBankAccounts,
        shifts,
        expenses,
        creditPayments,
        bunkProfile,
        role,
        recordBankDeposit,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        saveCashSafeLedger,
        syncCashBank,
      }}
    >
      {children}
    </CashBankContext.Provider>
  );
};

export const useCashBankContext = () => {
  const context = useContext(CashBankContext);
  if (!context) {
    throw new Error('useCashBankContext must be used within a CashBankProvider');
  }
  return context;
};

export { CashBankContext };

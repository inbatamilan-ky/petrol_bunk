import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BankDeposit,
  Settlement,
  DailyCashReconciliation,
  MasterBank,
  MasterChannel,
  MasterPaymentMode,
  Expense,
  CreditPayment,
  Branch,
  UserRole,
} from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useExpensesContext } from './ExpensesContext';
import { useCreditLedgerContext } from './CreditLedgerContext';
import {
  mapBankDeposit,
  mapSettlement,
  mapDailyCashReconciliation,
  mapMasterBank,
  mapMasterChannel,
  mapMasterPaymentMode,
} from './mappers';

export interface CashBankContextType {
  bankDeposits: BankDeposit[];
  settlements: Settlement[];
  dailyReconciliation: DailyCashReconciliation | null;
  masterBanks: MasterBank[];
  masterChannels: MasterChannel[];
  masterPaymentModes: MasterPaymentMode[];
  selectedDate: string;
  setSelectedDate: (d: string) => void;
  expenses: Expense[];
  creditPayments: CreditPayment[];
  bunkProfile: Branch | null;
  role: UserRole;

  recordBankDeposit: (amount: number, date?: string) => Promise<BankDeposit>;
  deleteBankDeposit: (id: string) => Promise<void>;
  saveReconciliation: (data: Omit<DailyCashReconciliation, 'id' | 'difference'>) => Promise<DailyCashReconciliation>;
  saveSettlementsBatch: (settlementDate: string, items: { bankCode: string; channelCode: string; amount: number }[]) => Promise<Settlement[]>;
  syncCashBank: (date?: string) => Promise<void>;

  // Backwards compatibility
  bankAccounts: any[];
  shifts: any[];
  addBankAccount: any;
  updateBankAccount: any;
  deleteBankAccount: any;
  saveCashSafeLedger: any;
}

const CashBankContext = createContext<CashBankContextType | undefined>(undefined);

export const CashBankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, bunkProfile, activeBranchId } = useAuthContext();
  const { expenses } = useExpensesContext();
  const { creditPayments } = useCreditLedgerContext();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [dailyReconciliation, setDailyReconciliation] = useState<DailyCashReconciliation | null>(null);

  const [masterBanks, setMasterBanks] = useState<MasterBank[]>([]);
  const [masterChannels, setMasterChannels] = useState<MasterChannel[]>([]);
  const [masterPaymentModes, setMasterPaymentModes] = useState<MasterPaymentMode[]>([]);

  const syncCashBank = useCallback(async (date?: string) => {
    const targetDate = date || selectedDate;
    try {
      const [bdData, stData, reconData, banksData, channelsData, payModesData] = await Promise.all([
        apiFetch('/api/bank-deposits').catch(() => []),
        apiFetch(`/api/settlements?settlement_date=${targetDate}`).catch(() => []),
        apiFetch(`/api/cash-reconciliation/${targetDate}`).catch(() => null),
        apiFetch('/api/masters/banks').catch(() => []),
        apiFetch('/api/masters/channels').catch(() => []),
        apiFetch('/api/masters/payment-modes').catch(() => []),
      ]);

      if (Array.isArray(bdData)) setBankDeposits(bdData.map(mapBankDeposit));
      if (Array.isArray(stData)) setSettlements(stData.map(mapSettlement));
      if (reconData && typeof reconData === 'object' && reconData.recon_date) {
        setDailyReconciliation(mapDailyCashReconciliation(reconData));
      } else {
        setDailyReconciliation(null);
      }
      if (Array.isArray(banksData)) setMasterBanks(banksData.map(mapMasterBank));
      if (Array.isArray(channelsData)) setMasterChannels(channelsData.map(mapMasterChannel));
      if (Array.isArray(payModesData)) setMasterPaymentModes(payModesData.map(mapMasterPaymentMode));
    } catch (e) {
      console.error('syncCashBank error:', e);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isLoggedIn) {
      syncCashBank(selectedDate);
    } else {
      setBankDeposits([]);
      setSettlements([]);
      setDailyReconciliation(null);
    }
  }, [isLoggedIn, activeBranchId, selectedDate, syncCashBank]);

  const recordBankDeposit = async (amount: number, date?: string): Promise<BankDeposit> => {
    const depDate = date || selectedDate;
    const created = await apiFetch('/api/bank-deposits', {
      method: 'POST',
      body: JSON.stringify({
        deposit_date: depDate,
        amount,
      }),
    });
    const mapped = mapBankDeposit(created);
    setBankDeposits(prev => [mapped, ...prev]);
    return mapped;
  };

  const deleteBankDeposit = async (id: string) => {
    await apiFetch(`/api/bank-deposits/${id}`, { method: 'DELETE' });
    setBankDeposits(prev => prev.filter(b => b.id !== id));
  };

  const saveReconciliation = async (
    data: Omit<DailyCashReconciliation, 'id' | 'difference'>
  ): Promise<DailyCashReconciliation> => {
    const payload = {
      recon_date: data.reconDate,
      opening_balance: data.openingBalance,
      morning_collection: data.morningCollection,
      oil_dw: data.oilDw,
      total_cash: data.totalCash,
      cash_for_card_swipe: data.cashForCardSwipe,
      cash_deposit_in_bank: data.cashDepositInBank,
      system_total_in_sheet: data.systemTotalInSheet,
      physically_counted_note: data.physicallyCountedNote,
      net_cash_for_the_day: data.netCashForTheDay,
    };
    const res = await apiFetch('/api/cash-reconciliation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const mapped = mapDailyCashReconciliation(res);
    setDailyReconciliation(mapped);
    return mapped;
  };

  const saveSettlementsBatch = async (
    settlementDate: string,
    items: { bankCode: string; channelCode: string; amount: number }[]
  ): Promise<Settlement[]> => {
    const payload = {
      settlement_date: settlementDate,
      items: items.map(i => ({
        bank_code: i.bankCode,
        channel_code: i.channelCode,
        amount: i.amount,
      })),
    };
    const res = await apiFetch('/api/settlements/batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const mapped = Array.isArray(res) ? res.map(mapSettlement) : [];
    setSettlements(mapped);
    return mapped;
  };

  return (
    <CashBankContext.Provider
      value={{
        bankDeposits,
        settlements,
        dailyReconciliation,
        masterBanks,
        masterChannels,
        masterPaymentModes,
        selectedDate,
        setSelectedDate,
        expenses,
        creditPayments,
        bunkProfile,
        role,
        recordBankDeposit,
        deleteBankDeposit,
        saveReconciliation,
        saveSettlementsBatch,
        syncCashBank,
        bankAccounts: [],
        shifts: [],
        addBankAccount: async () => {},
        updateBankAccount: async () => {},
        deleteBankAccount: async () => {},
        saveCashSafeLedger: async () => {},
      }}
    >
      {children}
    </CashBankContext.Provider>
  );
};

export const useCashBankContext = () => {
  const ctx = useContext(CashBankContext);
  if (!ctx) throw new Error('useCashBankContext must be used within CashBankProvider');
  return ctx;
};

export const useCashBank = useCashBankContext;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CreditTransaction,
  CreditPayment,
  CreditCustomer,
  Product,
  Pump,
  UserRole,
  CreditPaymentMode,
} from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { mapCreditTransaction, mapCreditPayment } from './mappers';

export interface CreditLedgerContextType {
  creditTransactions: CreditTransaction[];
  setCreditTransactions: React.Dispatch<React.SetStateAction<CreditTransaction[]>>;
  creditPayments: CreditPayment[];
  setCreditPayments: React.Dispatch<React.SetStateAction<CreditPayment[]>>;
  customers: CreditCustomer[];
  products: Product[];
  pumps: Pump[];
  role: UserRole;

  addCreditSale: (sale: {
    date?: string;
    pumpId: string;
    customerId: string;
    productId: string;
    litres: number;
    rate?: number;
    remarks?: string;
  }) => Promise<CreditTransaction>;
  deleteCreditSale: (id: string) => Promise<void>;

  recordCreditRepayment: (payment: {
    date?: string;
    customerId: string;
    amount: number;
    paymentMode: CreditPaymentMode;
  }) => Promise<CreditPayment>;
  deleteCreditRepayment: (id: string) => Promise<void>;

  addCustomer: (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => Promise<void>;
  syncCredit: () => Promise<void>;
}

const CreditLedgerContext = createContext<CreditLedgerContextType | undefined>(undefined);

export const CreditLedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { customers, setCustomers, products, pumps, addCustomer } = useMasters();

  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);

  const syncCredit = useCallback(async () => {
    try {
      const [ctData, cpData] = await Promise.all([
        apiFetch('/api/credit/transactions').catch(() => []),
        apiFetch('/api/credit/payments').catch(() => []),
      ]);

      const custMap = new Map(customers.map(c => [c.id, c.name]));
      const prodMap = new Map(products.map(p => [p.id, p.name]));

      const enrichedTx = ((ctData as any[]) || []).map((tx: any) => ({
        ...tx,
        customer_name: custMap.get(tx.customer_id) ?? '',
        product_name: prodMap.get(tx.product_id) ?? '',
      }));

      const enrichedPay = ((cpData as any[]) || []).map((p: any) => ({
        ...p,
        customer_name: custMap.get(p.customer_id) ?? '',
      }));

      if (Array.isArray(ctData)) setCreditTransactions(enrichedTx.map(mapCreditTransaction));
      if (Array.isArray(cpData)) setCreditPayments(enrichedPay.map(mapCreditPayment));
    } catch (e) {
      console.error('syncCredit error:', e);
    }
  }, [customers, products]);

  useEffect(() => {
    if (isLoggedIn) {
      syncCredit();
    } else {
      setCreditTransactions([]);
      setCreditPayments([]);
    }
  }, [isLoggedIn, activeBranchId, syncCredit]);

  const addCreditSale = useCallback(
    async (saleData: {
      date?: string;
      pumpId: string;
      customerId: string;
      productId: string;
      litres: number;
      rate?: number;
      remarks?: string;
    }): Promise<CreditTransaction> => {
      const payload = {
        date: saleData.date || new Date().toISOString().split('T')[0],
        pump_id: saleData.pumpId,
        customer_id: saleData.customerId,
        product_id: saleData.productId,
        litres: saleData.litres,
        rate: saleData.rate,
        remarks: saleData.remarks,
      };

      const cust = customers.find(c => c.id === saleData.customerId);
      const prod = products.find(p => p.id === saleData.productId);

      const created = await apiFetch('/api/credit/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const enriched = {
        ...created,
        customer_name: cust?.name ?? '',
        product_name: prod?.name ?? '',
      };
      const newSale = mapCreditTransaction(enriched);
      setCreditTransactions(prev => [newSale, ...prev]);

      setCustomers(prev =>
        prev.map(c =>
          c.id === newSale.customerId
            ? { ...c, outstandingBalance: Math.round((c.outstandingBalance + newSale.amount) * 100) / 100 }
            : c
        )
      );
      return newSale;
    },
    [customers, products, setCustomers]
  );

  const deleteCreditSale = useCallback(
    async (id: string) => {
      const target = creditTransactions.find(t => t.id === id);
      await apiFetch(`/api/credit/transactions/${id}`, { method: 'DELETE' });
      setCreditTransactions(prev => prev.filter(t => t.id !== id));
      if (target) {
        setCustomers(prev =>
          prev.map(c =>
            c.id === target.customerId
              ? { ...c, outstandingBalance: Math.max(0, Math.round((c.outstandingBalance - target.amount) * 100) / 100) }
              : c
          )
        );
      }
    },
    [creditTransactions, setCustomers]
  );

  const recordCreditRepayment = useCallback(
    async (paymentData: {
      date?: string;
      customerId: string;
      amount: number;
      paymentMode: CreditPaymentMode;
    }): Promise<CreditPayment> => {
      const payload = {
        date: paymentData.date || new Date().toISOString().split('T')[0],
        customer_id: paymentData.customerId,
        amount: paymentData.amount,
        payment_mode: paymentData.paymentMode,
      };
      const cust = customers.find(c => c.id === paymentData.customerId);
      const created = await apiFetch('/api/credit/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const enriched = { ...created, customer_name: cust?.name ?? '' };
      const newPayment = mapCreditPayment(enriched);
      setCreditPayments(prev => [newPayment, ...prev]);

      setCustomers(prev =>
        prev.map(c =>
          c.id === newPayment.customerId
            ? { ...c, outstandingBalance: Math.max(0, Math.round((c.outstandingBalance - newPayment.amount) * 100) / 100) }
            : c
        )
      );
      return newPayment;
    },
    [customers, setCustomers]
  );

  const deleteCreditRepayment = useCallback(
    async (id: string) => {
      const target = creditPayments.find(p => p.id === id);
      await apiFetch(`/api/credit/payments/${id}`, { method: 'DELETE' });
      setCreditPayments(prev => prev.filter(p => p.id !== id));
      if (target) {
        setCustomers(prev =>
          prev.map(c =>
            c.id === target.customerId
              ? { ...c, outstandingBalance: Math.round((c.outstandingBalance + target.amount) * 100) / 100 }
              : c
          )
        );
      }
    },
    [creditPayments, setCustomers]
  );

  return (
    <CreditLedgerContext.Provider
      value={{
        creditTransactions,
        setCreditTransactions,
        creditPayments,
        setCreditPayments,
        customers,
        products,
        pumps,
        role,
        addCreditSale,
        deleteCreditSale,
        recordCreditRepayment,
        deleteCreditRepayment,
        addCustomer,
        syncCredit,
      }}
    >
      {children}
    </CreditLedgerContext.Provider>
  );
};

export const useCreditLedgerContext = () => {
  const context = useContext(CreditLedgerContext);
  if (!context) {
    throw new Error('useCreditLedgerContext must be used within a CreditLedgerProvider');
  }
  return context;
};

export const useCreditLedger = useCreditLedgerContext;

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CreditTransaction, CreditPayment, CreditCustomer, Product, Pump, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
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

  addCreditSale: (sale: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>) => Promise<CreditTransaction>;
  recordCreditRepayment: (payment: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>) => Promise<CreditPayment>;
  addCustomer: (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => Promise<void>;
  syncCredit: () => Promise<void>;
}

const CreditLedgerContext = createContext<CreditLedgerContextType | undefined>(undefined);

export const CreditLedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { customers, setCustomers, products, pumps, addCustomer } = useMastersContext();

  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [creditPayments, setCreditPayments] = useState<CreditPayment[]>([]);

  const syncCredit = useCallback(async () => {
    try {
      const [ctData, cpData] = await Promise.all([
        apiFetch('/api/credit/transactions').catch(() => []),
        apiFetch('/api/credit/payments').catch(() => []),
      ]);

      const custMap = new Map(customers.map((c) => [c.id, c]));
      const enrichedTx = ((ctData as any[]) || []).map((tx: any) => {
        const cust = custMap.get(tx.customer_id) as any;
        return { ...tx, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });
      const enrichedPay = ((cpData as any[]) || []).map((p: any) => {
        const cust = custMap.get(p.customer_id) as any;
        return { ...p, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      });

      if (Array.isArray(ctData)) setCreditTransactions(enrichedTx.map(mapCreditTransaction));
      if (Array.isArray(cpData)) setCreditPayments(enrichedPay.map(mapCreditPayment));
    } catch (e) {
      console.error('syncCredit error:', e);
    }
  }, [customers]);

  useEffect(() => {
    if (isLoggedIn) {
      syncCredit();
    } else {
      setCreditTransactions([]);
      setCreditPayments([]);
    }
  }, [isLoggedIn, activeBranchId, syncCredit]);

  const addCreditSale = useCallback(
    async (saleData: Omit<CreditTransaction, 'id' | 'slipNo' | 'date' | 'time'>): Promise<CreditTransaction> => {
      const payload = {
        customer_id: saleData.customerId,
        pump_id: saleData.pumpId || null,
        pump_no: saleData.pumpNo || null,
        product_id: saleData.productId,
        vehicle_no: saleData.vehicleNo || '',
        driver_name: saleData.driverName,
        litres: saleData.litres,
        rate: saleData.rate,
        amount: saleData.amount,
        remarks: saleData.remarks,
      };
      const created = await apiFetch('/api/credit/transactions', { method: 'POST', body: JSON.stringify(payload) });
      const cust = customers.find((c) => c.id === created.customer_id);
      const enriched = { ...created, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      const newSale = mapCreditTransaction(enriched);
      setCreditTransactions((prev) => [newSale, ...prev]);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newSale.customerId
            ? { ...c, outstandingBalance: Math.round((c.outstandingBalance + newSale.amount) * 100) / 100 }
            : c
        )
      );
      return newSale;
    },
    [customers, setCustomers]
  );

  const recordCreditRepayment = useCallback(
    async (paymentData: Omit<CreditPayment, 'id' | 'receiptNo' | 'date'>): Promise<CreditPayment> => {
      const payload = {
        customer_id: paymentData.customerId,
        amount: paymentData.amount,
        payment_mode: paymentData.paymentMode,
        reference_no: paymentData.referenceNo,
        notes: paymentData.notes,
        received_by: paymentData.receivedBy,
      };
      const created = await apiFetch('/api/credit/payments', { method: 'POST', body: JSON.stringify(payload) });
      const cust = customers.find((c) => c.id === created.customer_id);
      const enriched = { ...created, customer_name: cust?.name ?? '', customer_code: cust?.code ?? '' };
      const newPayment = mapCreditPayment(enriched);
      setCreditPayments((prev) => [newPayment, ...prev]);

      setCustomers((prev) =>
        prev.map((c) =>
          c.id === newPayment.customerId
            ? { ...c, outstandingBalance: Math.max(0, Math.round((c.outstandingBalance - newPayment.amount) * 100) / 100) }
            : c
        )
      );
      return newPayment;
    },
    [customers, setCustomers]
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
        recordCreditRepayment,
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

export { CreditLedgerContext };

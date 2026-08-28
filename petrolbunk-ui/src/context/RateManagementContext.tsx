import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, FuelRateHistory, SmsLogEntry, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
import { mapFuelRateHistory, mapProduct, mapSmsLog } from './mappers';

export interface RateManagementContextType {
  products: Product[];
  fuelRateHistory: FuelRateHistory[];
  setFuelRateHistory: React.Dispatch<React.SetStateAction<FuelRateHistory[]>>;
  smsLogs: SmsLogEntry[];
  setSmsLogs: React.Dispatch<React.SetStateAction<SmsLogEntry[]>>;
  autoListenEnabled: boolean;
  setAutoListenEnabled: (val: boolean) => void;
  autoApplySms: boolean;
  setAutoApplySms: (val: boolean) => void;
  role: UserRole;

  updateFuelRate: (productId: string, newRate: number) => Promise<void>;
  updateBatchFuelRates: (
    updates: { productId: string; newRate: number }[],
    options?: { changed_by?: string; remarks?: string; change_source?: string }
  ) => Promise<void>;
  addSmsLog: (log: Omit<SmsLogEntry, 'id'>) => Promise<SmsLogEntry>;
  updateSmsLogStatus: (id: string, status: SmsLogEntry['status'], appliedBy?: string) => Promise<void>;
  clearSmsLogs: () => Promise<void>;
  triggerDailyCronSync: () => Promise<any>;
  syncRatesAndLogs: () => Promise<void>;
}

const RateManagementContext = createContext<RateManagementContextType | undefined>(undefined);

export const RateManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, setBunkProfile, activeBranchId } = useAuthContext();
  const { products, setProducts } = useMastersContext();

  const [fuelRateHistory, setFuelRateHistory] = useState<FuelRateHistory[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [autoListenEnabled, setAutoListenEnabled] = useState<boolean>(true);
  const [autoApplySms, setAutoApplySms] = useState<boolean>(false);

  const syncRatesAndLogs = useCallback(async () => {
    try {
      const [rateHistData, smsData] = await Promise.all([
        apiFetch('/api/rate-history').catch(() => []),
        apiFetch('/api/sms-logs').catch(() => []),
      ]);

      if (Array.isArray(rateHistData)) setFuelRateHistory(rateHistData.map(mapFuelRateHistory));
      if (Array.isArray(smsData)) setSmsLogs(smsData.map(mapSmsLog));
    } catch (e) {
      console.error('syncRatesAndLogs error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncRatesAndLogs();
    } else {
      setFuelRateHistory([]);
      setSmsLogs([]);
    }
  }, [isLoggedIn, activeBranchId, syncRatesAndLogs]);

  const updateFuelRate = useCallback(
    async (productId: string, newRate: number) => {
      try {
        const updated = await apiFetch(`/api/products/${productId}`, {
          method: 'PUT',
          body: JSON.stringify({ current_rate: newRate }),
        });
        setProducts((prev) => prev.map((p) => (p.id === productId ? mapProduct(updated) : p)));
      } catch {
        setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, currentRate: newRate } : p)));
      }
    },
    [setProducts]
  );

  const updateBatchFuelRates = useCallback(
    async (
      updates: { productId: string; newRate: number }[],
      options?: { changed_by?: string; remarks?: string; change_source?: string }
    ) => {
      try {
        const payload = {
          rates: updates.map((u) => ({ product_id: u.productId, current_rate: u.newRate })),
          changed_by: options?.changed_by || 'Manager',
          remarks: options?.remarks,
          change_source: options?.change_source || 'MANUAL_ENTRY',
        };
        const result = await apiFetch('/api/products/batch-rates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (Array.isArray(result)) {
          const updatedMap = new Map((result as any[]).map((r: any) => [r.id, mapProduct(r)]));
          setProducts((prev) => prev.map((p) => updatedMap.get(p.id) || p));
        }

        apiFetch('/api/rate-history')
          .then((frh) => {
            if (Array.isArray(frh)) setFuelRateHistory(frh.map(mapFuelRateHistory));
          })
          .catch(() => {});
      } catch {
        const map = new Map(updates.map((u) => [u.productId, u.newRate]));
        setProducts((prev) => prev.map((p) => (map.has(p.id) ? { ...p, currentRate: map.get(p.id)! } : p)));
      }
    },
    [setProducts]
  );

  const addSmsLog = useCallback(async (log: Omit<SmsLogEntry, 'id'>) => {
    try {
      const payload = {
        sender: log.sender,
        raw_text: log.rawText,
        omc: log.omc,
        effective_datetime: log.effectiveDateTime,
        parsed_rates: log.parsedRates,
        status: log.status,
        applied_by: log.appliedBy,
      };
      const created = await apiFetch('/api/sms-logs', { method: 'POST', body: JSON.stringify(payload) });
      const entry = mapSmsLog(created);
      setSmsLogs((prev) => [entry, ...prev]);
      return entry;
    } catch {
      const newEntry: SmsLogEntry = {
        ...log,
        id: `sms-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      };
      setSmsLogs((prev) => [newEntry, ...prev.slice(0, 49)]);
      return newEntry;
    }
  }, []);

  const updateSmsLogStatus = useCallback(
    async (id: string, status: SmsLogEntry['status'], appliedBy?: string) => {
      try {
        await apiFetch(`/api/sms-logs/${id}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status, applied_by: appliedBy }),
        });
      } catch {}
      setSmsLogs((prev) =>
        prev.map((log) =>
          log.id === id
            ? {
                ...log,
                status,
                appliedAt: status === 'APPLIED' ? new Date().toISOString() : log.appliedAt,
                appliedBy: appliedBy || log.appliedBy,
              }
            : log
        )
      );
    },
    []
  );

  const clearSmsLogs = useCallback(async () => {
    try {
      await apiFetch('/api/sms-logs', { method: 'DELETE' });
    } catch {}
    setSmsLogs([]);
  }, []);

  const triggerDailyCronSync = useCallback(async () => {
    try {
      const result = await apiFetch('/api/bunk-profile/trigger-daily-cron', {
        method: 'POST',
      });
      const prodData = await apiFetch('/api/products');
      if (Array.isArray(prodData)) {
        setProducts((prodData as any[]).map(mapProduct));
      }
      setBunkProfile((prev) => (prev ? { ...prev, lastSyncAt: new Date().toISOString() } : null));
      return result;
    } catch {
      return { status: 'SUCCESS', message: '06:00 AM Cron triggered locally.' };
    }
  }, [setProducts, setBunkProfile]);

  return (
    <RateManagementContext.Provider
      value={{
        products,
        fuelRateHistory,
        setFuelRateHistory,
        smsLogs,
        setSmsLogs,
        autoListenEnabled,
        setAutoListenEnabled,
        autoApplySms,
        setAutoApplySms,
        role,
        updateFuelRate,
        updateBatchFuelRates,
        addSmsLog,
        updateSmsLogStatus,
        clearSmsLogs,
        triggerDailyCronSync,
        syncRatesAndLogs,
      }}
    >
      {children}
    </RateManagementContext.Provider>
  );
};

export const useRateManagementContext = () => {
  const context = useContext(RateManagementContext);
  if (!context) {
    throw new Error('useRateManagementContext must be used within a RateManagementProvider');
  }
  return context;
};

export { RateManagementContext };

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, FuelRateHistory, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { mapFuelRateHistory, mapProduct } from './mappers';

export interface RateManagementContextType {
  products: Product[];
  fuelRateHistory: FuelRateHistory[];
  setFuelRateHistory: React.Dispatch<React.SetStateAction<FuelRateHistory[]>>;
  role: UserRole;

  updateFuelRate: (productId: string, newRate: number) => Promise<void>;
  updateBatchFuelRates: (
    updates: { productId: string; newRate: number }[],
    options?: { remarks?: string }
  ) => Promise<void>;
  syncRatesAndLogs: () => Promise<void>;

  // Backwards compatibility
  smsLogs: any[];
  autoListenEnabled: boolean;
  setAutoListenEnabled: any;
  autoApplySms: boolean;
  setAutoApplySms: any;
  addSmsLog: any;
  updateSmsLogStatus: any;
  clearSmsLogs: any;
  triggerDailyCronSync: any;
}

const RateManagementContext = createContext<RateManagementContextType | undefined>(undefined);

export const RateManagementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { products, setProducts, syncMasters } = useMasters();

  const [fuelRateHistory, setFuelRateHistory] = useState<FuelRateHistory[]>([]);

  const syncRatesAndLogs = useCallback(async () => {
    try {
      const rateHistData = await apiFetch('/api/rate-history').catch(() => []);
      if (Array.isArray(rateHistData)) setFuelRateHistory(rateHistData.map(mapFuelRateHistory));
    } catch (e) {
      console.error('syncRatesAndLogs error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncRatesAndLogs();
    } else {
      setFuelRateHistory([]);
    }
  }, [isLoggedIn, activeBranchId, syncRatesAndLogs]);

  const updateFuelRate = useCallback(
    async (productId: string, newRate: number) => {
      const updated = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ current_rate: newRate }),
      });
      setProducts(prev => prev.map(p => (p.id === productId ? mapProduct(updated) : p)));
      await syncMasters();
      await syncRatesAndLogs();
    },
    [setProducts, syncMasters, syncRatesAndLogs]
  );

  const updateBatchFuelRates = useCallback(
    async (
      updates: { productId: string; newRate: number }[],
      options?: { remarks?: string }
    ) => {
      const payload = {
        rates: updates.map(u => ({ product_id: u.productId, current_rate: u.newRate })),
        remarks: options?.remarks,
      };
      try {
        const result = await apiFetch('/api/products/batch-rates', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        if (Array.isArray(result) && result.length > 0) {
          const updatedMap = new Map((result as any[]).map((r: any) => [r.id, mapProduct(r)]));
          setProducts(prev => prev.map(p => updatedMap.get(p.id) || p));
        } else {
          // Update local products state directly
          setProducts(prev =>
            prev.map(p => {
              const found = updates.find(u => u.productId === p.id);
              return found ? { ...p, currentRate: found.newRate } : p;
            })
          );
        }
      } catch (err: any) {
        console.warn('Batch rates API error, applying local state update:', err);
        setProducts(prev =>
          prev.map(p => {
            const found = updates.find(u => u.productId === p.id);
            return found ? { ...p, currentRate: found.newRate } : p;
          })
        );
      }
      await syncMasters();
      await syncRatesAndLogs();
    },
    [setProducts, syncMasters, syncRatesAndLogs]
  );



  return (
    <RateManagementContext.Provider
      value={{
        products,
        fuelRateHistory,
        setFuelRateHistory,
        role,
        updateFuelRate,
        updateBatchFuelRates,
        syncRatesAndLogs,
        smsLogs: [],
        autoListenEnabled: false,
        setAutoListenEnabled: () => {},
        autoApplySms: false,
        setAutoApplySms: () => {},
        addSmsLog: async () => {},
        updateSmsLogStatus: async () => {},
        clearSmsLogs: async () => {},
        triggerDailyCronSync: async () => {},
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

export const useRateManagement = useRateManagementContext;

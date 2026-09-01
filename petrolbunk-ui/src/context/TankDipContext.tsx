import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DailyNozzleMeter, Product, Pump, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { mapDailyNozzleMeter } from './mappers';

export interface TankDipContextType {
  dailyNozzleMeters: DailyNozzleMeter[];
  setDailyNozzleMeters: React.Dispatch<React.SetStateAction<DailyNozzleMeter[]>>;
  products: Product[];
  pumps: Pump[];
  role: UserRole;

  saveBatchNozzleMeters: (
    readings: Array<{
      nozzleId: string;
      pumpId: string;
      productId: string;
      openingMeter: number;
      closingMeter: number;
      sellingRate: number;
    }>,
    dateStr?: string
  ) => Promise<void>;
  syncDailyNozzleMeters: (dateStr?: string) => Promise<void>;

  // Backwards compatibility
  tanks: any[];
  setTanks: any;
  dips: any[];
  setDips: any;
  shifts: any[];
  recordTankDip: any;
  syncTankDips: any;
}

const TankDipContext = createContext<TankDipContextType | undefined>(undefined);

export const TankDipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { products, pumps } = useMasters();

  const [dailyNozzleMeters, setDailyNozzleMeters] = useState<DailyNozzleMeter[]>([]);

  const syncDailyNozzleMeters = useCallback(async (dateStr?: string) => {
    try {
      const url = dateStr ? `/api/nozzle-meters?reading_date=${dateStr}` : '/api/nozzle-meters';
      const dnmData = await apiFetch(url).catch(() => []);
      if (Array.isArray(dnmData)) setDailyNozzleMeters(dnmData.map(mapDailyNozzleMeter));
    } catch (e) {
      console.error('syncDailyNozzleMeters error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncDailyNozzleMeters();
    } else {
      setDailyNozzleMeters([]);
    }
  }, [isLoggedIn, activeBranchId, syncDailyNozzleMeters]);

  const saveBatchNozzleMeters = useCallback(
    async (
      readings: Array<{
        nozzleId: string;
        pumpId: string;
        productId: string;
        openingMeter: number;
        closingMeter: number;
        sellingRate: number;
      }>,
      dateStr?: string
    ) => {
      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const payload = {
        reading_date: targetDate,
        readings: readings.map(r => ({
          pump_id: r.pumpId,
          nozzle_id: r.nozzleId,
          product_id: r.productId,
          opening_meter: r.openingMeter,
          closing_meter: r.closingMeter,
          selling_rate: r.sellingRate,
        })),
      };
      const res = await apiFetch('/api/nozzle-meters/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (Array.isArray(res)) {
        setDailyNozzleMeters(res.map(mapDailyNozzleMeter));
      }
    },
    []
  );

  return (
    <TankDipContext.Provider
      value={{
        dailyNozzleMeters,
        setDailyNozzleMeters,
        products,
        pumps,
        role,
        saveBatchNozzleMeters,
        syncDailyNozzleMeters,
        tanks: [],
        setTanks: () => {},
        dips: [],
        setDips: () => {},
        shifts: [],
        recordTankDip: async () => {},
        syncTankDips: syncDailyNozzleMeters,
      }}
    >
      {children}
    </TankDipContext.Provider>
  );
};

export const useTankDipContext = () => {
  const context = useContext(TankDipContext);
  if (!context) {
    throw new Error('useTankDipContext must be used within a TankDipProvider');
  }
  return context;
};

export const useTankDip = useTankDipContext;

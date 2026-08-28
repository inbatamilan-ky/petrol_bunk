import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Tank, TankDip, DailyNozzleMeter, Product, Pump, Shift, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
import { useShiftOperationsContext } from './ShiftOperationsContext';
import { mapTank, mapTankDip, mapDailyNozzleMeter } from './mappers';

export interface TankDipContextType {
  tanks: Tank[];
  setTanks: React.Dispatch<React.SetStateAction<Tank[]>>;
  dips: TankDip[];
  setDips: React.Dispatch<React.SetStateAction<TankDip[]>>;
  dailyNozzleMeters: DailyNozzleMeter[];
  setDailyNozzleMeters: React.Dispatch<React.SetStateAction<DailyNozzleMeter[]>>;
  products: Product[];
  pumps: Pump[];
  shifts: Shift[];
  role: UserRole;

  saveBatchNozzleMeters: (
    readings: Array<{
      nozzleId: string;
      pumpId: string;
      productId: string;
      openingMeter: number;
      closingMeter: number;
      testingLitres: number;
      sellingRate: number;
    }>,
    dateStr?: string
  ) => Promise<void>;
  recordTankDip: (dip: Omit<TankDip, 'id'>) => Promise<TankDip>;
  syncTankDips: () => Promise<void>;
}

const TankDipContext = createContext<TankDipContextType | undefined>(undefined);

export const TankDipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, currentUser, activeBranchId } = useAuthContext();
  const { products, pumps } = useMastersContext();
  const { shifts } = useShiftOperationsContext();

  const [tanks, setTanks] = useState<Tank[]>([]);
  const [dips, setDips] = useState<TankDip[]>([]);
  const [dailyNozzleMeters, setDailyNozzleMeters] = useState<DailyNozzleMeter[]>([]);

  const syncTankDips = useCallback(async () => {
    try {
      const [tankData, dipData, dnmData] = await Promise.all([
        apiFetch('/api/tanks').catch(() => []),
        apiFetch('/api/tank-dips').catch(() => []),
        apiFetch('/api/nozzle-meters').catch(() => []),
      ]);

      const prodMap = new Map(products.map((p) => [p.id, p]));
      const enrichedTanks = ((tankData as any[]) || []).map((t: any) => {
        const prod = prodMap.get(t.product_id);
        return { ...t, product_name: prod?.name ?? '' };
      });

      if (Array.isArray(tankData)) setTanks(enrichedTanks.map(mapTank));
      if (Array.isArray(dipData)) setDips(dipData.map(mapTankDip));
      if (Array.isArray(dnmData)) setDailyNozzleMeters(dnmData.map(mapDailyNozzleMeter));
    } catch (e) {
      console.error('syncTankDips error:', e);
    }
  }, [products]);

  useEffect(() => {
    if (isLoggedIn) {
      syncTankDips();
    } else {
      setTanks([]);
      setDips([]);
      setDailyNozzleMeters([]);
    }
  }, [isLoggedIn, activeBranchId, syncTankDips]);

  const saveBatchNozzleMeters = useCallback(
    async (
      readings: Array<{
        nozzleId: string;
        pumpId: string;
        productId: string;
        openingMeter: number;
        closingMeter: number;
        testingLitres: number;
        sellingRate: number;
      }>,
      dateStr?: string
    ) => {
      const today = dateStr || new Date().toISOString().split('T')[0];
      const displayName = currentUser
        ? [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || currentUser.username
        : 'Manager';
      const payload = {
        reading_date: today,
        recorded_by: displayName,
        readings: readings.map((r) => ({
          nozzle_id: r.nozzleId,
          pump_id: r.pumpId,
          product_id: r.productId,
          opening_meter: r.openingMeter,
          closing_meter: r.closingMeter,
          testing_litres: r.testingLitres,
          selling_rate: r.sellingRate,
          recorded_by: displayName,
        })),
      };

      const saved = await apiFetch('/api/nozzle-meters/batch', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (Array.isArray(saved)) {
        const mapped = saved.map(mapDailyNozzleMeter);
        setDailyNozzleMeters((prev) => {
          const otherDates = prev.filter((m) => m.readingDate !== today);
          return [...mapped, ...otherDates];
        });
      }
    },
    [currentUser]
  );

  const recordTankDip = useCallback(async (dipData: Omit<TankDip, 'id'>): Promise<TankDip> => {
    const payload = {
      tank_id: dipData.tankId,
      tank_name: dipData.tankName,
      product_name: dipData.productName,
      dip_date: dipData.dipDate,
      dip_type: dipData.dipType,
      fuel_dip_cm: dipData.fuelDipCm,
      fuel_dip_litres: dipData.fuelDipLitres,
      water_dip_cm: dipData.waterDipCm,
      observed_density: dipData.observedDensity,
      observed_temp: dipData.observedTemp,
      converted_density: dipData.convertedDensity,
      book_stock_litres: dipData.bookStockLitres,
      variance: dipData.variance,
      tested_by: dipData.testedBy,
      remarks: dipData.remarks,
    };
    const created = await apiFetch('/api/tank-dips', { method: 'POST', body: JSON.stringify(payload) });
    const newDip = mapTankDip(created);
    setDips((prev) => [newDip, ...prev]);

    setTanks((prev) =>
      prev.map((t) => {
        if (t.id === newDip.tankId) {
          const stock = newDip.fuelDipLitres;
          let status: Tank['status'] = 'NORMAL';
          if (stock < t.capacityLitres * 0.1) status = 'CRITICAL';
          else if (stock < t.capacityLitres * 0.2) status = 'LOW';
          else if (stock > t.capacityLitres * 0.95) status = 'OVERFILL';
          return { ...t, currentStockLitres: stock, status };
        }
        return t;
      })
    );
    return newDip;
  }, []);

  return (
    <TankDipContext.Provider
      value={{
        tanks,
        setTanks,
        dips,
        setDips,
        dailyNozzleMeters,
        setDailyNozzleMeters,
        products,
        pumps,
        shifts,
        role,
        saveBatchNozzleMeters,
        recordTankDip,
        syncTankDips,
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

export { TankDipContext };

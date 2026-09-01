import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  PumpDayAttribution,
  DailyNozzleMeter,
  UserRole,
  Pump,
  Operator,
  Product,
} from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMasters } from './MastersContext';
import { mapPumpDayAttribution, mapDailyNozzleMeter } from './mappers';

export interface ShiftOperationsContextType {
  attributions: PumpDayAttribution[];
  setAttributions: React.Dispatch<React.SetStateAction<PumpDayAttribution[]>>;
  nozzleMeters: DailyNozzleMeter[];
  setNozzleMeters: React.Dispatch<React.SetStateAction<DailyNozzleMeter[]>>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  pumps: Pump[];
  operators: Operator[];
  products: Product[];
  role: UserRole;

  // Pump-day attribution operations (Block H)
  saveAttribution: (params: {
    id?: string;
    attributionDate: string;
    pumpId: string;
    operatorId: string;
    timeIn?: string | null;
    timeOut?: string | null;
    advancePayment?: number;
    creditAcc?: number;
    cashCollected?: number;
    cardCollected?: number;
    fleetCardCollected?: number;
    creditSales?: number;
    gpayCollected?: number;
    phonePayCollected?: number;
    paytmCollected?: number;
    upiGpayCollected?: number;
    totalAmount?: number;
    netPayment?: number;
  }) => Promise<PumpDayAttribution>;
  deleteAttribution: (id: string) => Promise<void>;

  // Daily nozzle meter readings operations (Block B)
  saveNozzleMetersBatch: (
    readingDate: string,
    readings: {
      pumpId: string;
      nozzleId: string;
      productId: string;
      openingMeter: number;
      closingMeter: number;
      sellingRate: number;
    }[]
  ) => Promise<DailyNozzleMeter[]>;

  syncOperationsData: (date?: string) => Promise<void>;

  // Backwards-compatible aliases
  shifts: any[];
  activeShift: any;
}

const ShiftOperationsContext = createContext<ShiftOperationsContextType | undefined>(undefined);

export const ShiftOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { pumps, operators, products } = useMasters();

  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [attributions, setAttributions] = useState<PumpDayAttribution[]>([]);
  const [nozzleMeters, setNozzleMeters] = useState<DailyNozzleMeter[]>([]);

  const syncOperationsData = useCallback(async (date?: string) => {
    const targetDate = date || selectedDate;
    try {
      const [attrData, meterData] = await Promise.all([
        apiFetch(`/api/pump-attribution?attribution_date=${targetDate}`).catch(() => []),
        apiFetch(`/api/nozzle-meters?reading_date=${targetDate}`).catch(() => []),
      ]);

      setAttributions(Array.isArray(attrData) ? attrData.map(mapPumpDayAttribution) : []);
      setNozzleMeters(Array.isArray(meterData) ? meterData.map(mapDailyNozzleMeter) : []);
    } catch (e) {
      console.error('syncOperationsData error:', e);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isLoggedIn) {
      syncOperationsData(selectedDate);
    } else {
      setAttributions([]);
      setNozzleMeters([]);
    }
  }, [isLoggedIn, activeBranchId, selectedDate, syncOperationsData]);

  const saveAttribution = async (params: {
    id?: string;
    attributionDate: string;
    pumpId: string;
    operatorId: string;
    timeIn?: string | null;
    timeOut?: string | null;
    advancePayment?: number;
    creditAcc?: number;
    cashCollected?: number;
    cardCollected?: number;
    fleetCardCollected?: number;
    creditSales?: number;
    gpayCollected?: number;
    phonePayCollected?: number;
    paytmCollected?: number;
    upiGpayCollected?: number;
    totalAmount?: number;
    netPayment?: number;
  }): Promise<PumpDayAttribution> => {
    const gpay = params.gpayCollected ?? 0;
    const phonePay = params.phonePayCollected ?? 0;
    const paytm = params.paytmCollected ?? 0;
    const upiLegacy = params.upiGpayCollected ?? (gpay + phonePay + paytm);

    if (params.id) {
      const updated = await apiFetch(`/api/pump-attribution/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          time_in: params.timeIn,
          time_out: params.timeOut,
          advance_payment: params.advancePayment,
          credit_acc: params.creditAcc,
          cash_collected: params.cashCollected,
          card_collected: params.cardCollected,
          fleet_card_collected: params.fleetCardCollected,
          credit_sales: params.creditSales,
          gpay_collected: gpay,
          phone_pay_collected: phonePay,
          paytm_collected: paytm,
          upi_gpay_collected: upiLegacy,
          total_amount: params.totalAmount,
          net_payment: params.netPayment,
        }),
      });
      const mapped = mapPumpDayAttribution(updated);
      setAttributions(prev => prev.map(a => (a.id === mapped.id ? mapped : a)));
      return mapped;
    } else {
      const created = await apiFetch('/api/pump-attribution', {
        method: 'POST',
        body: JSON.stringify({
          attribution_date: params.attributionDate,
          pump_id: params.pumpId,
          operator_id: params.operatorId,
          time_in: params.timeIn,
          time_out: params.timeOut,
          advance_payment: params.advancePayment || 0,
          credit_acc: params.creditAcc || 0,
          cash_collected: params.cashCollected || 0,
          card_collected: params.cardCollected || 0,
          fleet_card_collected: params.fleetCardCollected || 0,
          credit_sales: params.creditSales || 0,
          gpay_collected: gpay,
          phone_pay_collected: phonePay,
          paytm_collected: paytm,
          upi_gpay_collected: upiLegacy,
          total_amount: params.totalAmount || 0,
          net_payment: params.netPayment || 0,
        }),
      });
      const mapped = mapPumpDayAttribution(created);
      setAttributions(prev => [...prev, mapped]);
      return mapped;
    }
  };

  const deleteAttribution = async (id: string) => {
    await apiFetch(`/api/pump-attribution/${id}`, { method: 'DELETE' });
    setAttributions(prev => prev.filter(a => a.id !== id));
  };

  const saveNozzleMetersBatch = async (
    readingDate: string,
    readings: {
      pumpId: string;
      nozzleId: string;
      productId: string;
      openingMeter: number;
      closingMeter: number;
      sellingRate: number;
    }[]
  ): Promise<DailyNozzleMeter[]> => {
    const payload = {
      reading_date: readingDate,
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
    const mapped = Array.isArray(res) ? res.map(mapDailyNozzleMeter) : [];
    setNozzleMeters(mapped);
    return mapped;
  };

  return (
    <ShiftOperationsContext.Provider
      value={{
        attributions,
        setAttributions,
        nozzleMeters,
        setNozzleMeters,
        selectedDate,
        setSelectedDate,
        pumps,
        operators,
        products,
        role,
        saveAttribution,
        deleteAttribution,
        saveNozzleMetersBatch,
        syncOperationsData,
        shifts: attributions,
        activeShift: attributions[0] || null,
      }}
    >
      {children}
    </ShiftOperationsContext.Provider>
  );
};

export const useShiftOperationsContext = () => {
  const ctx = useContext(ShiftOperationsContext);
  if (!ctx) throw new Error('useShiftOperationsContext must be used within ShiftOperationsProvider');
  return ctx;
};

export const useShiftOperations = useShiftOperationsContext;

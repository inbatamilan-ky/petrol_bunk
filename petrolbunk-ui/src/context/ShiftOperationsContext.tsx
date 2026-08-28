import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Shift, UserRole, Pump, Operator, Product } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import { useMastersContext } from './MastersContext';
import { mapShift } from './mappers';

export interface ShiftOperationsContextType {
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
  activeShift: Shift | null;
  pumps: Pump[];
  operators: Operator[];
  products: Product[];
  role: UserRole;

  openNewShift: (params: {
    pumpId: string;
    operatorId: string;
    shiftType: Shift['shiftType'];
    shiftDate: string;
  }) => Promise<Shift>;
  saveShiftDraft: (shift: Shift) => Promise<Shift>;
  closeShift: (shiftId: string, shift: Shift, notes?: string) => Promise<Shift>;
  updateShift: (
    shiftId: string,
    updates: { operatorId?: string; shiftType?: Shift['shiftType']; shiftDate?: string; notes?: string; status?: Shift['status'] }
  ) => Promise<void>;
  deleteShift: (shiftId: string) => Promise<void>;
  syncShifts: () => Promise<void>;
}

const ShiftOperationsContext = createContext<ShiftOperationsContextType | undefined>(undefined);

export const ShiftOperationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, activeBranchId } = useAuthContext();
  const { pumps, operators, products, syncMasters } = useMastersContext();

  const [shifts, setShifts] = useState<Shift[]>([]);

  const syncShifts = useCallback(async () => {
    try {
      const shiftData = await apiFetch('/api/shifts').catch(() => []);
      if (Array.isArray(shiftData)) {
        setShifts(shiftData.map(mapShift));
      }
    } catch (e) {
      console.error('syncShifts error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncShifts();
    } else {
      setShifts([]);
    }
  }, [isLoggedIn, activeBranchId, syncShifts]);

  const activeShift = useMemo(() => {
    return shifts.find((s) => s.status === 'IN_PROGRESS' || s.status === 'OPEN') || null;
  }, [shifts]);

  const openNewShift = useCallback(
    async ({
      pumpId,
      operatorId,
      shiftType,
      shiftDate,
    }: {
      pumpId: string;
      operatorId: string;
      shiftType: Shift['shiftType'];
      shiftDate: string;
    }): Promise<Shift> => {
      const pump = pumps.find((p) => p.id === pumpId);
      const operator = operators.find((o) => o.id === operatorId);
      const nowIso = new Date().toISOString();

      let newShift: Shift;
      try {
        const payload = {
          shift_date: shiftDate,
          shift_type: shiftType,
          pump_id: pumpId,
          operator_id: operatorId,
        };
        const created = await apiFetch('/api/shifts', { method: 'POST', body: JSON.stringify(payload) });
        newShift = mapShift(created);
      } catch {
        newShift = {
          id: `shift-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          shiftNo: `SH-${shiftDate.replace(/-/g, '')}-P${pump?.pumpNo || 1}-${shiftType.toUpperCase()}`,
          shiftDate,
          shiftType,
          pumpId,
          pumpNo: pump?.pumpNo || 1,
          operatorId,
          operatorName: operator?.name || 'Operator',
          openedAt: nowIso,
          status: 'IN_PROGRESS',
          meterReadings: [],
          totalLitresSold: 0,
          totalSalesAmount: 0,
          expensesDeducted: 0,
          collections: { cash: 0, upiGpay: 0, card: 0, fleetCard: 0, creditSales: 0, cheque: 0 },
          totalCollected: 0,
          shortageOrExcess: 0,
          notes: '',
        };
      }

      if (!newShift.openedAt) {
        newShift.openedAt = nowIso;
      }

      if (newShift.meterReadings.length === 0 && pump && pump.nozzles.length > 0) {
        newShift.meterReadings = pump.nozzles.map((noz) => {
          const prod = products.find((p) => p.id === noz.productId);
          return {
            nozzleId: noz.id,
            nozzleNo: noz.nozzleNo,
            productName: noz.productName || prod?.name || 'Fuel',
            fuelCode: noz.fuelCode || prod?.code || 'HSD',
            rate: prod?.currentRate || 94.5,
            openingReading: noz.currentMeterReading || 0,
            closingReading: noz.currentMeterReading || 0,
            testingLitres: 0,
            litresSold: 0,
            grossAmount: 0,
          };
        });
      }

      setShifts((prev) => [newShift, ...prev]);
      return newShift;
    },
    [pumps, operators, products]
  );

  const saveShiftDraft = useCallback(async (shift: Shift) => {
    const collections = shift.collections;
    const payload: any = {
      cash_collected: collections.cash,
      upi_gpay_collected: collections.upiGpay,
      card_collected: collections.card,
      fleet_card_collected: collections.fleetCard,
      credit_sales: collections.creditSales,
      cheque_collected: collections.cheque,
      expenses_deducted: shift.expensesDeducted,
      notes: shift.notes,
    };

    if (shift.meterReadings && shift.meterReadings.length > 0) {
      payload.meter_readings = shift.meterReadings.map((r) => ({
        nozzle_id: r.nozzleId,
        closing_reading: r.closingReading ?? r.openingReading,
        testing_litres: r.testingLitres || 0,
      }));
    }

    const updated = await apiFetch(`/api/shifts/${shift.id}/draft`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    const mapped = mapShift(updated);
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? mapped : s)));
    return mapped;
  }, []);

  const updateShift = useCallback(
    async (
      shiftId: string,
      updates: { operatorId?: string; shiftType?: Shift['shiftType']; shiftDate?: string; notes?: string; status?: Shift['status'] }
    ) => {
      const payload: any = {};
      if (updates.operatorId !== undefined) payload.operator_id = updates.operatorId;
      if (updates.shiftType !== undefined) payload.shift_type = updates.shiftType;
      if (updates.shiftDate !== undefined) payload.shift_date = updates.shiftDate;
      if (updates.notes !== undefined) payload.notes = updates.notes;
      if (updates.status !== undefined) payload.status = updates.status;

      const updated = await apiFetch(`/api/shifts/${shiftId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setShifts((prev) => prev.map((s) => (s.id === shiftId ? mapShift(updated) : s)));
    },
    []
  );

  const deleteShift = useCallback(async (shiftId: string) => {
    await apiFetch(`/api/shifts/${shiftId}`, { method: 'DELETE' });
    setShifts((prev) => prev.filter((s) => s.id !== shiftId));
  }, []);

  const closeShift = useCallback(
    async (shiftId: string, shift: Shift, notes?: string) => {
      const collections = shift.collections;
      const payload = {
        meter_readings: shift.meterReadings.map((r) => ({
          nozzle_id: r.nozzleId,
          closing_reading: r.closingReading ?? r.openingReading,
          testing_litres: r.testingLitres || 0,
        })),
        cash_collected: collections.cash,
        upi_gpay_collected: collections.upiGpay,
        card_collected: collections.card,
        fleet_card_collected: collections.fleetCard,
        credit_sales: collections.creditSales,
        cheque_collected: collections.cheque,
        expenses_deducted: shift.expensesDeducted,
        notes: notes ?? shift.notes,
      };
      const closed = await apiFetch(`/api/shifts/${shiftId}/close`, { method: 'POST', body: JSON.stringify(payload) });
      const mapped = mapShift(closed);
      setShifts((prev) => prev.map((s) => (s.id === shiftId ? mapped : s)));
      await syncMasters();
      return mapped;
    },
    [syncMasters]
  );

  return (
    <ShiftOperationsContext.Provider
      value={{
        shifts,
        setShifts,
        activeShift,
        pumps,
        operators,
        products,
        role,
        openNewShift,
        saveShiftDraft,
        closeShift,
        updateShift,
        deleteShift,
        syncShifts,
      }}
    >
      {children}
    </ShiftOperationsContext.Provider>
  );
};

export const useShiftOperationsContext = () => {
  const context = useContext(ShiftOperationsContext);
  if (!context) {
    throw new Error('useShiftOperationsContext must be used within a ShiftOperationsProvider');
  }
  return context;
};

export { ShiftOperationsContext };

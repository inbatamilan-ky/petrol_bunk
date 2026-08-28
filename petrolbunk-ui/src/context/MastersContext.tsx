import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Pump, Operator, CreditCustomer, ExpenseType, Branch, UserRole } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_PUMPS,
  mapProduct,
  mapPump,
  mapOperator,
  mapCustomer,
  mapExpenseType,
} from './mappers';

export interface MastersContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  pumps: Pump[];
  setPumps: React.Dispatch<React.SetStateAction<Pump[]>>;
  operators: Operator[];
  setOperators: React.Dispatch<React.SetStateAction<Operator[]>>;
  customers: CreditCustomer[];
  setCustomers: React.Dispatch<React.SetStateAction<CreditCustomer[]>>;
  expenseTypes: ExpenseType[];
  setExpenseTypes: React.Dispatch<React.SetStateAction<ExpenseType[]>>;
  branches: Branch[];
  addBranch: (b: Partial<Branch>) => Promise<void>;
  updateBranch: (profile: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
  role: UserRole;

  addProduct: (prod: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (prod: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  addPump: (pump: Omit<Pump, 'id'>) => Promise<void>;
  updatePump: (pump: Pump) => Promise<void>;
  deletePump: (id: string) => Promise<void>;

  addOperator: (op: Omit<Operator, 'id'>) => Promise<void>;
  updateOperator: (op: Operator) => Promise<void>;
  deleteOperator: (id: string) => Promise<void>;

  addCustomer: (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => Promise<void>;
  updateCustomer: (cust: CreditCustomer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addExpenseType: (et: Omit<ExpenseType, 'id'>) => Promise<void>;
  updateExpenseType: (et: ExpenseType) => Promise<void>;
  deleteExpenseType: (id: string) => Promise<void>;

  syncMasters: () => Promise<void>;
}

const MastersContext = createContext<MastersContextType | undefined>(undefined);

export const MastersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, role, branches, addBranch, updateBranch, deleteBranch, activeBranchId } = useAuthContext();

  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [pumps, setPumps] = useState<Pump[]>(DEFAULT_PUMPS);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);

  const syncMasters = useCallback(async () => {
    try {
      const [prodData, pumpData, opData, custData, etData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/pumps').catch(() => []),
        apiFetch('/api/operators').catch(() => []),
        apiFetch('/api/customers').catch(() => []),
        apiFetch('/api/expense-types').catch(() => []),
      ]);

      const prodMap = new Map(((prodData as any[]) || []).map((p: any) => [p.id, p]));
      const enrichedPumps = ((pumpData as any[]) || []).map((pump: any) => ({
        ...pump,
        nozzles: (pump.nozzles ?? []).map((noz: any) => {
          const prod = prodMap.get(noz.product_id) as any;
          return {
            ...noz,
            product_name: prod?.name ?? '',
            fuel_code: prod?.code ?? noz.product_id,
            color: prod?.color ?? '#94A3B8',
          };
        }),
      }));

      if (Array.isArray(prodData)) setProducts(prodData.map(mapProduct));
      if (Array.isArray(pumpData)) setPumps(enrichedPumps.map(mapPump));
      if (Array.isArray(opData)) setOperators(opData.map(mapOperator));
      if (Array.isArray(custData)) setCustomers(custData.map(mapCustomer));
      if (Array.isArray(etData)) setExpenseTypes(etData.map(mapExpenseType));
    } catch (e) {
      console.error('syncMasters error:', e);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncMasters();
    } else {
      setProducts([]);
      setPumps([]);
      setOperators([]);
      setCustomers([]);
      setExpenseTypes([]);
    }
  }, [isLoggedIn, activeBranchId, syncMasters]);

  const addProduct = useCallback(async (prodData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...prodData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      active: prodData.active !== false,
    };
    try {
      const payload = {
        code: prodData.code,
        name: prodData.name,
        category: prodData.category,
        unit: prodData.unit,
        color: prodData.color,
        current_rate: prodData.currentRate,
        density_min: prodData.standardDensityRange?.min ?? null,
        density_max: prodData.standardDensityRange?.max ?? null,
        active: prodData.active !== false,
      };
      const created = await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      setProducts((prev) => [...prev, mapProduct(created)]);
    } catch {
      setProducts((prev) => [...prev, newProd]);
    }
  }, []);

  const updateProduct = useCallback(async (prod: Product) => {
    try {
      const payload = {
        code: prod.code,
        name: prod.name,
        category: prod.category,
        unit: prod.unit,
        color: prod.color,
        current_rate: prod.currentRate,
        density_min: prod.standardDensityRange?.min ?? null,
        density_max: prod.standardDensityRange?.max ?? null,
        active: prod.active !== false,
      };
      await apiFetch(`/api/products/${prod.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch {}

    setProducts((prev) => prev.map((p) => (p.id === prod.id ? prod : p)));
    setPumps((prevPumps) =>
      prevPumps.map((pump) => ({
        ...pump,
        nozzles: pump.nozzles.map((noz) =>
          noz.productId === prod.id
            ? {
                ...noz,
                productName: prod.name,
                fuelCode: prod.code,
                color: prod.color,
              }
            : noz
        ),
      }))
    );
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    } catch {}
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addPump = useCallback(async (pumpData: Omit<Pump, 'id'>) => {
    try {
      const payload = {
        pump_no: pumpData.pumpNo,
        name: pumpData.name,
        status: pumpData.status,
      };
      const created = await apiFetch('/api/pumps', { method: 'POST', body: JSON.stringify(payload) });
      for (const n of pumpData.nozzles || []) {
        const nozPayload = {
          pump_id: created.id,
          nozzle_no: n.nozzleNo,
          product_id: n.productId,
          current_meter_reading: n.currentMeterReading,
        };
        await apiFetch(`/api/pumps/${created.id}/nozzles`, { method: 'POST', body: JSON.stringify(nozPayload) });
      }
      await syncMasters();
    } catch (e) {
      console.error('addPump error:', e);
    }
  }, [syncMasters]);

  const updatePump = useCallback(async (pump: Pump) => {
    try {
      const payload = {
        pump_no: pump.pumpNo,
        name: pump.name,
        status: pump.status,
        nozzles: (pump.nozzles || []).map((n) => ({
          id: n.id,
          nozzle_no: n.nozzleNo,
          product_id: n.productId,
          current_meter_reading: n.currentMeterReading,
        })),
      };
      await apiFetch(`/api/pumps/${pump.id}`, { method: 'PUT', body: JSON.stringify(payload) });

      const existingPump = pumps.find((p) => p.id === pump.id);
      const existingNozzles = existingPump ? existingPump.nozzles : [];

      for (const n of pump.nozzles || []) {
        const isNew = !existingNozzles.some((en) => en.id === n.id);
        const nozPayload = {
          pump_id: pump.id,
          nozzle_no: n.nozzleNo,
          product_id: n.productId,
          current_meter_reading: n.currentMeterReading,
        };
        if (isNew) {
          await apiFetch(`/api/pumps/${pump.id}/nozzles`, { method: 'POST', body: JSON.stringify(nozPayload) });
        } else {
          await apiFetch(`/api/pumps/nozzles/${n.id}`, { method: 'PUT', body: JSON.stringify(nozPayload) });
        }
      }

      const keepIds = pump.nozzles.map((n) => n.id);
      for (const old of existingNozzles) {
        if (!keepIds.includes(old.id)) {
          await apiFetch(`/api/pumps/nozzles/${old.id}`, { method: 'DELETE' }).catch(() => {});
        }
      }

      await syncMasters();
    } catch (e) {
      console.error('updatePump error:', e);
    }
  }, [pumps, syncMasters]);

  const deletePump = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/pumps/${id}`, { method: 'DELETE' });
    } catch {}
    setPumps((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addOperator = useCallback(async (opData: Omit<Operator, 'id'>) => {
    const payload = { name: opData.name, phone: opData.phone, daily_bata: opData.dailyBata, active: opData.active };
    const created = await apiFetch('/api/operators', { method: 'POST', body: JSON.stringify(payload) });
    setOperators((prev) => [...prev, mapOperator(created)]);
  }, []);

  const updateOperator = useCallback(async (op: Operator) => {
    try {
      const payload = {
        name: op.name,
        phone: op.phone,
        daily_bata: op.dailyBata,
        active: op.active,
      };
      await apiFetch(`/api/operators/${op.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    } catch {}
    setOperators((prev) => prev.map((o) => (o.id === op.id ? op : o)));
  }, []);

  const deleteOperator = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/operators/${id}`, { method: 'DELETE' });
    } catch {}
    setOperators((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const addCustomer = useCallback(async (custData: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => {
    const payload = {
      code: custData.code,
      name: custData.name,
      contact_person: custData.contactPerson,
      phone: custData.phone,
      vehicle_numbers: custData.vehicleNumbers,
      credit_limit: custData.creditLimit,
      opening_balance: custData.openingBalance,
      status: custData.status,
      address: custData.address,
    };
    const created = await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
    setCustomers((prev) => [...prev, mapCustomer(created)]);
  }, []);

  const updateCustomer = useCallback(async (cust: CreditCustomer) => {
    try {
      const payload = {
        code: cust.code,
        name: cust.name,
        contact_person: cust.contactPerson,
        phone: cust.phone,
        vehicle_numbers: cust.vehicleNumbers,
        credit_limit: cust.creditLimit,
        status: cust.status,
        address: cust.address,
      };
      const updated = await apiFetch(`/api/customers/${cust.id}`, { method: 'PUT', body: JSON.stringify(payload) });
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? mapCustomer(updated) : c)));
    } catch {
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? cust : c)));
    }
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch {}
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const addExpenseType = useCallback(async (et: Omit<ExpenseType, 'id'>) => {
    const created = await apiFetch('/api/expense-types', {
      method: 'POST',
      body: JSON.stringify({ name: et.name, category: et.category, active: et.active !== false }),
    });
    setExpenseTypes((prev) => [...prev, mapExpenseType(created)]);
  }, []);

  const updateExpenseType = useCallback(async (et: ExpenseType) => {
    try {
      await apiFetch(`/api/expense-types/${et.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: et.name, category: et.category, active: et.active !== false }),
      });
    } catch {}
    setExpenseTypes((prev) => prev.map((item) => (item.id === et.id ? et : item)));
  }, []);

  const deleteExpenseType = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/expense-types/${id}`, { method: 'DELETE' });
    } catch {}
    setExpenseTypes((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <MastersContext.Provider
      value={{
        products,
        setProducts,
        pumps,
        setPumps,
        operators,
        setOperators,
        customers,
        setCustomers,
        expenseTypes,
        setExpenseTypes,
        branches,
        addBranch,
        updateBranch,
        deleteBranch,
        role,
        addProduct,
        updateProduct,
        deleteProduct,
        addPump,
        updatePump,
        deletePump,
        addOperator,
        updateOperator,
        deleteOperator,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addExpenseType,
        updateExpenseType,
        deleteExpenseType,
        syncMasters,
      }}
    >
      {children}
    </MastersContext.Provider>
  );
};

export const useMastersContext = () => {
  const context = useContext(MastersContext);
  if (!context) {
    throw new Error('useMastersContext must be used within a MastersProvider');
  }
  return context;
};

export { MastersContext };

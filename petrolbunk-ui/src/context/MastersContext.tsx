import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product, Pump, Operator, CreditCustomer, ExpenseType, Branch, UserRole, MasterChannel } from '../types';
import { apiFetch } from '../api/client';
import { useAuthContext } from './AuthContext';
import {
  mapProduct,
  mapPump,
  mapOperator,
  mapCustomer,
  mapExpenseType,
  mapMasterChannel,
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
  masterChannels: MasterChannel[];
  branches: Branch[];
  bunks: Branch[];
  bunkProfile: Branch | null;
  addBranch: (b: Partial<Branch>) => Promise<void>;
  updateBranch: (profile: Partial<Branch>) => Promise<void>;
  updateBunkProfile: (profile: Partial<Branch>) => Promise<void>;
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
  const { isLoggedIn, role, branches, bunkProfile, addBranch, updateBranch, deleteBranch, activeBranchId } = useAuthContext();

  const [products, setProducts] = useState<Product[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [masterChannels, setMasterChannels] = useState<MasterChannel[]>([]);

  const syncMasters = useCallback(async () => {
    try {
      const [prodData, pumpData, opData, custData, etData, channelsData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/pumps').catch(() => []),
        apiFetch('/api/operators').catch(() => []),
        apiFetch('/api/customers').catch(() => []),
        apiFetch('/api/masters/expense-types').catch(() => []),
        apiFetch('/api/masters/channels').catch(() => []),
      ]);

      const prodMap = new Map(((prodData as any[]) || []).map((p: any) => [p.id, p]));
      const enrichedPumps = ((pumpData as any[]) || []).map((pump: any) => ({
        ...pump,
        nozzles: (pump.nozzles ?? []).map((noz: any) => {
          const prod = prodMap.get(noz.product_id) as any;
          return {
            ...noz,
            product_name: prod?.name ?? '',
          };
        }),
      }));

      setProducts(Array.isArray(prodData) ? prodData.map(mapProduct) : []);
      setPumps(Array.isArray(pumpData) ? enrichedPumps.map(mapPump) : []);
      setOperators(Array.isArray(opData) ? (opData as any[]).map(mapOperator) : []);
      setCustomers(Array.isArray(custData) ? (custData as any[]).map(mapCustomer) : []);
      setExpenseTypes(Array.isArray(etData) ? (etData as any[]).map(mapExpenseType) : []);
      setMasterChannels(Array.isArray(channelsData) ? (channelsData as any[]).map(mapMasterChannel) : []);
    } catch {
      // Offline / error state
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      syncMasters();
    }
  }, [isLoggedIn, activeBranchId, syncMasters]);

  const addProduct = async (prod: Omit<Product, 'id'>) => {
    const created = await apiFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        code: prod.code,
        name: prod.name,
        category: prod.category || 'FUEL',
        current_rate: prod.currentRate,
        active: prod.active !== false,
        color: prod.color,
        unit: prod.unit,
        hsn_code: prod.hsnCode,
        gst_rate: prod.gstRate,
        tank_capacity: prod.tankCapacity,
        density_standard_at_15c: prod.densityStandardAt15C,
        density_min: prod.standardDensityRange?.min,
        density_max: prod.standardDensityRange?.max,
        short_name: prod.shortName,
      }),
    });
    setProducts(prev => [...prev, mapProduct(created)]);
  };

  const updateProduct = async (prod: Product) => {
    const updated = await apiFetch(`/api/products/${prod.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: prod.name,
        category: prod.category,
        current_rate: prod.currentRate,
        active: prod.active,
        color: prod.color,
        unit: prod.unit,
        hsn_code: prod.hsnCode,
        gst_rate: prod.gstRate,
        tank_capacity: prod.tankCapacity,
        density_standard_at_15c: prod.densityStandardAt15C,
        density_min: prod.standardDensityRange?.min,
        density_max: prod.standardDensityRange?.max,
        short_name: prod.shortName,
      }),
    });
    setProducts(prev => prev.map(p => (p.id === prod.id ? mapProduct(updated) : p)));
  };

  const deleteProduct = async (id: string) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addPump = async (pump: Omit<Pump, 'id'>) => {
    await apiFetch('/api/pumps', {
      method: 'POST',
      body: JSON.stringify({
        pump_no: pump.pumpNo,
        name: pump.name,
        model: pump.model,
        serial_number: pump.serialNumber,
        make_model: pump.makeModel,
        installation_date: pump.installationDate,
        tank_id: pump.tankId,
        side: pump.side,
        status: pump.status || 'ACTIVE',
        nozzles: (pump.nozzles || []).map(n => ({
          nozzle_no: n.nozzleNo,
          product_id: n.productId,
          current_meter_reading: n.currentMeterReading || 0,
          color: n.color,
          fuel_code: n.fuelCode,
        })),
      }),
    });
    await syncMasters();
  };

  const updatePump = async (pump: Pump) => {
    await apiFetch(`/api/pumps/${pump.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        pump_no: pump.pumpNo,
        name: pump.name,
        model: pump.model,
        serial_number: pump.serialNumber,
        make_model: pump.makeModel,
        installation_date: pump.installationDate,
        tank_id: pump.tankId,
        side: pump.side,
        status: pump.status,
        nozzles: (pump.nozzles || []).map(n => ({
          nozzle_no: n.nozzleNo,
          product_id: n.productId,
          current_meter_reading: n.currentMeterReading || 0,
          color: n.color,
          fuel_code: n.fuelCode,
        })),
      }),
    });
    await syncMasters();
  };

  const deletePump = async (id: string) => {
    try {
      await apiFetch(`/api/pumps/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (!err?.message?.includes('404')) {
        console.warn('deletePump warning:', err);
      }
    }
    setPumps(prev => prev.filter(p => p.id !== id));
  };

  const addOperator = async (op: Omit<Operator, 'id'>) => {
    const created = await apiFetch('/api/operators', {
      method: 'POST',
      body: JSON.stringify({
        name: op.name,
        phone: op.phone,
        active: op.active !== false,
        employee_code: op.employeeCode,
        aadhaar_no: op.aadhaarNo,
        monthly_salary: op.monthlySalary,
        joining_date: op.joiningDate,
        emergency_contact: op.emergencyContact,
        assigned_shift: op.assignedShift,
        govt_id_doc_name: op.govtIdDocName,
        govt_id_doc_url: op.govtIdDocUrl,
        status: op.status || 'ACTIVE',
      }),
    });
    setOperators(prev => [...prev, mapOperator(created)]);
  };

  const updateOperator = async (op: Operator) => {
    const updated = await apiFetch(`/api/operators/${op.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: op.name,
        phone: op.phone,
        active: op.active,
        employee_code: op.employeeCode,
        aadhaar_no: op.aadhaarNo,
        monthly_salary: op.monthlySalary,
        joining_date: op.joiningDate,
        emergency_contact: op.emergencyContact,
        assigned_shift: op.assignedShift,
        govt_id_doc_name: op.govtIdDocName,
        govt_id_doc_url: op.govtIdDocUrl,
        status: op.status,
      }),
    });
    setOperators(prev => prev.map(o => (o.id === op.id ? mapOperator(updated) : o)));
  };

  const deleteOperator = async (id: string) => {
    try {
      await apiFetch(`/api/operators/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (!err?.message?.includes('404')) {
        console.warn('deleteOperator warning:', err);
      }
    }
    setOperators(prev => prev.filter(o => o.id !== id));
  };

  const addCustomer = async (cust: Omit<CreditCustomer, 'id' | 'outstandingBalance'>) => {
    const created = await apiFetch('/api/customers', {
      method: 'POST',
      body: JSON.stringify({
        name: cust.name,
        phone: cust.phone,
        code: cust.code,
        contact_person: cust.contactPerson,
        email: cust.email,
        gstin: cust.gstin,
        pan_number: cust.panNumber,
        credit_limit: cust.creditLimit,
        opening_balance: cust.openingBalance,
        credit_period_days: cust.creditPeriodDays,
        discount_per_litre: cust.discountPerLitre,
        max_vehicles_allowed: cust.maxVehiclesAllowed,
        vehicle_numbers: Array.isArray(cust.vehicleNumbers) ? cust.vehicleNumbers.join(', ') : cust.vehicleNumbers,
        address: cust.address,
        billing_address: cust.billingAddress,
        status: cust.status || 'ACTIVE',
      }),
    });
    setCustomers(prev => [...prev, mapCustomer(created)]);
  };

  const updateCustomer = async (cust: CreditCustomer) => {
    const updated = await apiFetch(`/api/customers/${cust.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: cust.name,
        phone: cust.phone,
        code: cust.code,
        contact_person: cust.contactPerson,
        email: cust.email,
        gstin: cust.gstin,
        pan_number: cust.panNumber,
        credit_limit: cust.creditLimit,
        opening_balance: cust.openingBalance,
        credit_period_days: cust.creditPeriodDays,
        discount_per_litre: cust.discountPerLitre,
        max_vehicles_allowed: cust.maxVehiclesAllowed,
        vehicle_numbers: Array.isArray(cust.vehicleNumbers) ? cust.vehicleNumbers.join(', ') : cust.vehicleNumbers,
        address: cust.address,
        billing_address: cust.billingAddress,
        status: cust.status,
      }),
    });
    setCustomers(prev => prev.map(c => (c.id === cust.id ? mapCustomer(updated) : c)));
  };

  const deleteCustomer = async (id: string) => {
    try {
      await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (!err?.message?.includes('404')) {
        console.warn('deleteCustomer warning:', err);
      }
    }
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  const addExpenseType = async (et: Omit<ExpenseType, 'id'>) => {
    const created = await apiFetch('/api/masters/expense-types', {
      method: 'POST',
      body: JSON.stringify({
        name: et.name,
        category: et.category || 'OPERATIONAL',
        active: et.active !== false,
      }),
    });
    setExpenseTypes(prev => [...prev, mapExpenseType(created)]);
  };

  const updateExpenseType = async (et: ExpenseType) => {
    const updated = await apiFetch(`/api/masters/expense-types/${et.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: et.name,
        category: et.category,
        active: et.active,
      }),
    });
    setExpenseTypes(prev => prev.map(e => (e.id === et.id ? mapExpenseType(updated) : e)));
  };

  const deleteExpenseType = async (id: string) => {
    try {
      await apiFetch(`/api/masters/expense-types/${id}`, { method: 'DELETE' });
    } catch (err: any) {
      if (!err?.message?.includes('404')) {
        console.warn('deleteExpenseType warning:', err);
      }
    }
    setExpenseTypes(prev => prev.filter(e => e.id !== id));
  };


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
        masterChannels,
        branches,
        bunks: branches,
        bunkProfile,
        addBranch,
        updateBranch,
        updateBunkProfile: updateBranch,
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

export const useMasters = () => {
  const ctx = useContext(MastersContext);
  if (!ctx) throw new Error('useMasters must be used within MastersProvider');
  return ctx;
};

export const useMastersContext = useMasters;


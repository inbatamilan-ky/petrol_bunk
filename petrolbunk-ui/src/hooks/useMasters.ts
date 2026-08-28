/**
 * src/hooks/useMasters.ts
 *
 * React hook that fetches and caches master / lookup table data from
 * GET /api/masters/{table}.
 *
 * Usage example:
 *
 *   const { options, items, loading, error, refetch } = useMasters('shift-types');
 *
 *   // In JSX:
 *   <UniversalDropdown
 *     label="Shift Type"
 *     options={options}         // DropdownOption[]  { label, value, subtitle? }
 *     value={selectedShiftType}
 *     onChange={(v) => setSelectedShiftType(v)}
 *   />
 *
 * The result is cached in module-level memory for the lifetime of the app
 * session to avoid hammering the API on every re-render.
 */
import { useState, useEffect, useCallback } from 'react';
import { logWarning } from '../services/errorLogger';
import {
  MasterItem,
  DropdownOption,
  fetchMasterItems,
  toDropdownOptions,
} from '../api/masters';

// ─── In-memory session cache ───────────────────────────────────────────────────
const _cache: Map<string, MasterItem[]> = new Map();

const DEFAULT_MASTER_ITEMS: Record<string, MasterItem[]> = {
  'branch-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
    { id: 3, code: 'MAINTENANCE', label: 'Maintenance', color: '#F59E0B', is_active: true, sort_order: 3 },
  ],
  'product-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
    { id: 3, code: 'OUT_OF_STOCK', label: 'Out of Stock', color: '#F59E0B', is_active: true, sort_order: 3 },
  ],
  'pump-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
    { id: 3, code: 'IDLE', label: 'Idle', color: '#F59E0B', is_active: true, sort_order: 3 },
    { id: 4, code: 'MAINTENANCE', label: 'Maintenance', color: '#EF4444', is_active: true, sort_order: 4 },
  ],
  'customer-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
    { id: 3, code: 'HOLD', label: 'Hold', color: '#F59E0B', is_active: true, sort_order: 3 },
    { id: 4, code: 'BLOCKED', label: 'Blocked', color: '#EF4444', is_active: true, sort_order: 4 },
  ],
  'staff-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
    { id: 3, code: 'ON_LEAVE', label: 'On Leave', color: '#F59E0B', is_active: true, sort_order: 3 },
    { id: 4, code: 'SUSPENDED', label: 'Suspended', color: '#EF4444', is_active: true, sort_order: 4 },
  ],
  'expense-statuses': [
    { id: 1, code: 'ACTIVE', label: 'Active', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'INACTIVE', label: 'Inactive', color: '#64748B', is_active: true, sort_order: 2 },
  ],
  'shift-statuses': [
    { id: 1, code: 'OPEN', label: 'In Progress (Open)', color: '#3B82F6', is_active: true, sort_order: 1 },
    { id: 2, code: 'COMPLETED', label: 'Closed & Audited', color: '#10B981', is_active: true, sort_order: 2 },
  ],
  'tank-statuses': [
    { id: 1, code: 'NORMAL', label: 'Normal Level', color: '#10B981', is_active: true, sort_order: 1 },
    { id: 2, code: 'LOW_STOCK', label: 'Low Stock', color: '#F59E0B', is_active: true, sort_order: 2 },
    { id: 3, code: 'CRITICAL', label: 'Critical Low', color: '#EF4444', is_active: true, sort_order: 3 },
    { id: 4, code: 'MAINTENANCE', label: 'Maintenance', color: '#64748B', is_active: true, sort_order: 4 },
  ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseMastersResult {
  /** DropdownOption[] ready for UniversalDropdown */
  options: DropdownOption[];
  /** Raw MasterItem[] with full fields (color, icon, etc.) */
  items: MasterItem[];
  loading: boolean;
  error: string | null;
  /** Force a fresh fetch from the server */
  refetch: () => void;
}

export function useMasters(table: string): UseMastersResult {
  const [items, setItems] = useState<MasterItem[]>(
    () => _cache.get(table) ?? DEFAULT_MASTER_ITEMS[table] ?? []
  );
  const [loading, setLoading] = useState<boolean>(!_cache.has(table));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      if (!force && _cache.has(table)) {
        setItems(_cache.get(table)!);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMasterItems(table);
        _cache.set(table, data);
        setItems(data);
      } catch (e: any) {
        logWarning(`MasterTable: ${table}`, e?.message ?? `Failed to load ${table}`);
        setError(e?.message ?? `Failed to load ${table}`);
      } finally {
        setLoading(false);
      }
    },
    [table]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => {
    _cache.delete(table);
    load(true);
  }, [table, load]);

  return {
    options: toDropdownOptions(items),
    items,
    loading,
    error,
    refetch,
  };
}

// ─── Convenience named hooks (alias for each table) ───────────────────────────

/** Shift types — Morning, Evening, Night, Full Day */
export const useShiftTypes       = () => useMasters('shift-types');

/** Payment modes — Cash, Cheque, UPI, NEFT, Bank Transfer … */
export const usePaymentModes     = () => useMasters('payment-modes');

/** Product categories — FUEL, LUBRICANT */
export const useProductCategories = () => useMasters('product-categories');

/** Expense categories — OPERATIONAL, STAFF, FINANCIAL, MAINTENANCE … */
export const useExpenseCategories = () => useMasters('expense-categories');

/** Pump statuses — ACTIVE, IDLE, MAINTENANCE, INACTIVE */
export const usePumpStatuses     = () => useMasters('pump-statuses');

/** Customer statuses — ACTIVE, HOLD, BLOCKED, INACTIVE */
export const useCustomerStatuses = () => useMasters('customer-statuses');

/** OMC brands — BPCL (locked) */
export const useOmcBrands        = () => useMasters('omc-brands');

// NOTE: useStates removed — state is fixed to Tamil Nadu (BPCL Chennai).

/** Bank account types — Current, Savings, CC/OD, FCNR */
export const useBankAccountTypes = () => useMasters('bank-account-types');

/** Tank dip types — Morning, Evening, After Decantation … */
export const useDipTypes         = () => useMasters('dip-types');

/** Shift statuses — In Progress, Closed & Audited, Pending Audit, Voided */
export const useShiftStatuses    = () => useMasters('shift-statuses');

/** Staff statuses — Active on Duty, On Leave, Suspended, Inactive */
export const useStaffStatuses    = () => useMasters('staff-statuses');

/** Staff roles — Operator, Cashier, Supervisor, Manager, Accountant */
export const useStaffRoles       = () => useMasters('staff-roles');

/** Expense payment methods — Petty Cash, Bank Transfer, UPI QR, Cheque */
export const useExpensePaymentMethods = () => useMasters('expense-payment-methods');

/** Credit payment modes — Cash, NEFT/RTGS, Cheque, UPI */
export const useCreditPaymentModes = () => useMasters('credit-payment-modes');

/** Rate change sources — Manual, SMS Auto, Batch Import, HO Push */
export const useRateChangeSources = () => useMasters('rate-change-sources');

/** Tank statuses — Normal, Low Stock, Critical Low, Calibration */
export const useTankStatuses     = () => useMasters('tank-statuses');

/** Digital settlement channels — UPI, POS Card, Fleet Card, Fastag */
export const useSettlementChannels = () => useMasters('settlement-channels');

/** Digital settlement statuses — Settled, Batch Pending, Failed, Refunded */
export const useSettlementStatuses = () => useMasters('settlement-statuses');

/** Bank deposit statuses — Credited, In Transit, Rejected */
export const useBankDepositStatuses = () => useMasters('bank-deposit-statuses');

/** Units of measure — Litre, Can, Kg, Piece, Barrel */
export const useUnitsOfMeasure   = () => useMasters('units-of-measure');

/** Branch statuses — Fully Operational, Maintenance, Temporarily Closed, Decommissioned */
export const useBranchStatuses   = () => useMasters('branch-statuses');

/** Report types — Sales Summary, Shift Register, Density Register, etc. */
export const useReportTypes        = () => useMasters('report-types');

/** Product operational statuses — Active & Selling, Out of Stock, Discontinued, Inactive */
export const useProductStatuses    = () => useMasters('product-statuses');

/** Expense head statuses — Active, Inactive, Archived */
export const useExpenseStatuses    = () => useMasters('expense-statuses');

// ─── Utility: look up a single item by code from cached data ─────────────────

/**
 * Get the color badge hex for a given code in a master table.
 * Falls back to the provided defaultColor if not found or cache is empty.
 *
 * Example:
 *   const color = getMasterColor('pump-statuses', pump.status, '#6B7280');
 */
export function getMasterColor(
  table: string,
  code: string,
  defaultColor = '#6B7280'
): string {
  const cached = _cache.get(table);
  if (!cached) return defaultColor;
  const found = cached.find((item) => item.code === code);
  return found?.color ?? defaultColor;
}

/**
 * Get the display label for a given code in a master table.
 * Falls back to the raw code if not found.
 *
 * Example:
 *   const label = getMasterLabel('customer-statuses', customer.status);
 */
export function getMasterLabel(table: string, code: string): string {
  const cached = _cache.get(table);
  if (!cached) return code;
  const found = cached.find((item) => item.code === code);
  return found?.label ?? code;
}

/**
 * Invalidate all master table caches.
 * Call this after login / logout or when admin changes master data.
 */
export function clearMasterCache(): void {
  _cache.clear();
}

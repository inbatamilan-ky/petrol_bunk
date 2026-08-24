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
import {
  MasterItem,
  DropdownOption,
  fetchMasterItems,
  toDropdownOptions,
} from '../api/masters';

// ─── In-memory session cache ───────────────────────────────────────────────────
const _cache: Map<string, MasterItem[]> = new Map();

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
  const [items, setItems] = useState<MasterItem[]>(_cache.get(table) ?? []);
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

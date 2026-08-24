/**
 * src/api/masters.ts
 *
 * API helpers for all 10 master / lookup tables.
 * Every function returns an array of { label, value } objects that are
 * directly compatible with the existing UniversalDropdown / SmartDropdown
 * components used throughout the app.
 */
import { apiFetch } from './client';


// ─── Types ────────────────────────────────────────────────────────────────────

export interface MasterItem {
  id: number;
  code: string;
  label: string;
  subtitle?: string;       // shift_types — e.g. "06:00 AM – 02:00 PM"
  description?: string;
  color?: string;          // hex badge colour
  icon?: string;
  sms_number?: string;     // omc_brands
  type?: string;           // states: "STATE" | "UT"
  sort_order: number;
  is_active: boolean;
}

/** The shape expected by UniversalDropdown / SmartDropdown. */
export interface DropdownOption {
  label: string;
  value: string;
  subtitle?: string;
  color?: string;
}

// ─── Core fetch function ──────────────────────────────────────────────────────

/**
 * Fetch all active rows from a master table.
 * @param table  URL slug, e.g. "shift-types", "payment-modes"
 */
export async function fetchMasterItems(table: string): Promise<MasterItem[]> {
  return apiFetch(`/api/masters/${table}`);
}

/**
 * Convert master items to { label, value, subtitle?, color? } for dropdowns.
 */
export function toDropdownOptions(items: MasterItem[]): DropdownOption[] {
  return items.map((item) => ({
    label: item.label,
    value: item.code,
    subtitle: item.subtitle,
    color: item.color,
  }));
}

// ─── Per-table convenience functions ─────────────────────────────────────────

/** 1. Shift types — Morning, Evening, Night, Full Day */
export async function fetchShiftTypes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('shift-types');
  return toDropdownOptions(items);
}

/** 2. Payment modes — Cash, Cheque, UPI, NEFT, Bank Transfer … */
export async function fetchPaymentModes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('payment-modes');
  return toDropdownOptions(items);
}

/** 3. Product categories — FUEL, LUBRICANT */
export async function fetchProductCategories(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('product-categories');
  return toDropdownOptions(items);
}

/** 4. Expense categories — OPERATIONAL, STAFF, FINANCIAL, MAINTENANCE … */
export async function fetchExpenseCategories(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('expense-categories');
  return toDropdownOptions(items);
}

/** 5. Pump statuses — ACTIVE, IDLE, MAINTENANCE, INACTIVE */
export async function fetchPumpStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('pump-statuses');
  return toDropdownOptions(items);
}

/** 6. Customer statuses — ACTIVE, HOLD, BLOCKED, INACTIVE */
export async function fetchCustomerStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('customer-statuses');
  return toDropdownOptions(items);
}

/**
 * 7. OMC brands — BPCL only (system is locked to Bharat Petroleum).
 *    Returned as a single-item list so the UI can still render the selector.
 */
export async function fetchOmcBrands(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('omc-brands');
  return toDropdownOptions(items);
}

/** 9. Bank account types — Current, Savings, CC/OD, FCNR */
export async function fetchBankAccountTypes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('bank-account-types');
  return toDropdownOptions(items);
}

/** 10. Tank dip types — Morning, Evening, After Decantation … */
export async function fetchDipTypes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('dip-types');
  return toDropdownOptions(items);
}

// ─── Master raw-item helpers (for badge colours etc.) ────────────────────────

/** Returns the full MasterItem list for pump statuses (need .color for badges). */
export async function fetchPumpStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('pump-statuses');
}

/** Returns the full MasterItem list for customer statuses. */
export async function fetchCustomerStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('customer-statuses');
}

/** Returns the full MasterItem list for expense categories (need .color for tags). */
export async function fetchExpenseCategoryItems(): Promise<MasterItem[]> {
  return fetchMasterItems('expense-categories');
}

// ─── Admin mutation helpers (owner only) ─────────────────────────────────────

export interface MasterItemCreate {
  code: string;
  label: string;
  subtitle?: string;
  description?: string;
  color?: string;
  icon?: string;
  sms_number?: string;
  type?: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function createMasterItem(
  table: string,
  data: MasterItemCreate
): Promise<MasterItem> {
  return apiFetch(`/api/masters/${table}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMasterItem(
  table: string,
  id: number,
  data: Partial<MasterItemCreate>
): Promise<MasterItem> {
  return apiFetch(`/api/masters/${table}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/** Soft-deletes an item (sets is_active = false). */
export async function deleteMasterItem(table: string, id: number): Promise<void> {
  await apiFetch(`/api/masters/${table}/${id}`, { method: 'DELETE' });
}


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

export async function fetchMasterItems(table: string): Promise<MasterItem[]> {
  try {
    const res = await apiFetch(`/api/masters/${table}`);
    if (Array.isArray(res)) return res;
    return [];
  } catch {
    return [];
  }
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

/** 11. Shift statuses — In Progress, Closed & Audited, Pending Audit, Voided */
export async function fetchShiftStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('shift-statuses');
  return toDropdownOptions(items);
}

/** 12. Staff statuses — Active on Duty, On Leave, Suspended, Inactive */
export async function fetchStaffStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('staff-statuses');
  return toDropdownOptions(items);
}

/** 13. Staff roles — Operator, Cashier, Supervisor, Manager, Accountant */
export async function fetchStaffRoles(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('staff-roles');
  return toDropdownOptions(items);
}

/** 14. Expense payment methods — Petty Cash, Bank Transfer, UPI QR, Cheque */
export async function fetchExpensePaymentMethods(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('expense-payment-methods');
  return toDropdownOptions(items);
}

/** 15. Credit payment modes — Cash, NEFT/RTGS, Cheque, UPI */
export async function fetchCreditPaymentModes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('credit-payment-modes');
  return toDropdownOptions(items);
}

/** 16. Rate change sources — Manual, SMS Auto, Batch Import, HO Push */
export async function fetchRateChangeSources(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('rate-change-sources');
  return toDropdownOptions(items);
}

/** 17. Tank statuses — Normal, Low Stock, Critical Low, Calibration */
export async function fetchTankStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('tank-statuses');
  return toDropdownOptions(items);
}

/** 18. Digital settlement channels — UPI, POS Card, Fleet Card, Fastag */
export async function fetchSettlementChannels(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('settlement-channels');
  return toDropdownOptions(items);
}

/** 19. Digital settlement statuses — Settled, Batch Pending, Failed, Refunded */
export async function fetchSettlementStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('settlement-statuses');
  return toDropdownOptions(items);
}

/** 20. Bank deposit statuses — Credited, In Transit, Rejected */
export async function fetchBankDepositStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('bank-deposit-statuses');
  return toDropdownOptions(items);
}

/** 21. Units of measure — Litre, Can, Kg, Piece, Barrel */
export async function fetchUnitsOfMeasure(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('units-of-measure');
  return toDropdownOptions(items);
}

/** 22. Branch statuses — Fully Operational, Maintenance, Temporarily Closed, Decommissioned */
export async function fetchBranchStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('branch-statuses');
  return toDropdownOptions(items);
}

/** 23. Report types — Sales Summary, Shift Register, Density Register, etc. */
export async function fetchReportTypes(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('report-types');
  return toDropdownOptions(items);
}

/** 24. Product statuses — Active & Selling, Out of Stock, Discontinued, Inactive */
export async function fetchProductStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('product-statuses');
  return toDropdownOptions(items);
}

/** 25. Expense statuses — Active, Inactive, Archived */
export async function fetchExpenseStatuses(): Promise<DropdownOption[]> {
  const items = await fetchMasterItems('expense-statuses');
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

/** Returns the full MasterItem list for shift statuses. */
export async function fetchShiftStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('shift-statuses');
}

/** Returns the full MasterItem list for staff statuses. */
export async function fetchStaffStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('staff-statuses');
}

/** Returns the full MasterItem list for tank statuses. */
export async function fetchTankStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('tank-statuses');
}

/** Returns the full MasterItem list for settlement statuses. */
export async function fetchSettlementStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('settlement-statuses');
}

/** Returns the full MasterItem list for bank deposit statuses. */
export async function fetchBankDepositStatusItems(): Promise<MasterItem[]> {
  return fetchMasterItems('bank-deposit-statuses');
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


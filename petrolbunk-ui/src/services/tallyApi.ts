import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DailyTally,
  ReconciliationOut,
  CreditLedgerDay,
  TallyTotals,
  OperatorSessionRow,
  CustomerCreditRow,
} from "../types";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

import { getToken, getActiveBranch } from "../api/client";

async function getHeaders(branchId?: string): Promise<Record<string, string>> {
  const token = await getToken();
  const activeBranch = branchId || (await getActiveBranch()) || "B-01";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(activeBranch ? { "X-Branch-ID": activeBranch } : {}),
  };
}

async function apiFetch<T>(
  path: string,
  branchId?: string,
  options?: RequestInit
): Promise<T> {
  const headers = await getHeaders(branchId);
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}


// ── Mappers: snake_case → camelCase ──────────────────────────────────────

function mapTotals(t: any): TallyTotals {
  return {
    cash: t?.cash ?? 0,
    card: t?.card ?? 0,
    gpay: t?.gpay ?? 0,
    phonepe: t?.phonepe ?? 0,
    paytm: t?.paytm ?? 0,
    fleet: t?.fleet ?? 0,
    credit: t?.credit ?? 0,
    grandTotal: t?.grand_total ?? 0,
    meterTotal: t?.meter_total ?? 0,
    meterVariance: t?.meter_variance ?? 0,
    expectedCash: t?.expected_cash ?? 0,
    actualCash: t?.actual_cash ?? 0,
    cashVariance: t?.cash_variance ?? 0,
  };
}

function mapSessionRow(r: any): OperatorSessionRow {
  return {
    sessionId: r.session_id,
    operatorName: r.operator_name,
    pumpNo: r.pump_no,
    pumpName: r.pump_name ?? `Pump ${r.pump_no}`,
    shiftType: r.shift_type ?? null,
    timeIn: r.time_in ?? null,
    timeOut: r.time_out ?? null,
    cash: r.cash ?? 0,
    card: r.card ?? 0,
    gpay: r.gpay ?? 0,
    phonepe: r.phonepe ?? 0,
    paytm: r.paytm ?? 0,
    fleet: r.fleet ?? 0,
    credit: r.credit ?? 0,
    totalSales: r.total_sales ?? 0,
    meterSales: r.meter_sales ?? null,
    meterVariance: r.meter_variance ?? null,
    advanceAmount: r.advance_amount ?? 0,
    expectedCash: r.expected_cash ?? null,
    actualCash: r.actual_cash ?? null,
    cashVariance: r.cash_variance ?? null,
    status: r.status ?? "DRAFT",
  };
}

function mapCreditLedger(data: any): CreditLedgerDay {
  return {
    businessDate: data.business_date,
    openingOutstanding: data.opening_outstanding ?? 0,
    newCreditSales: data.new_credit_sales ?? 0,
    creditPayments: data.credit_payments ?? 0,
    closingOutstanding: data.closing_outstanding ?? 0,
    customerBreakdown: (data.customer_breakdown ?? []).map(
      (c: any): CustomerCreditRow => ({
        customerId: c.customer_id,
        customerName: c.customer_name,
        newCredit: c.new_credit ?? 0,
        payments: c.payments ?? 0,
        closingBalance: c.closing_balance ?? 0,
      })
    ),
  };
}

function mapDailyTally(data: any): DailyTally {
  return {
    businessDate: data.business_date,
    totals: mapTotals(data.totals),
    byShift: (data.by_shift ?? []).map((s: any) => ({
      shiftType: s.shift_type,
      sessions: (s.sessions ?? []).map(mapSessionRow),
      subtotals: mapTotals(s.subtotals),
    })),
    byPump: (data.by_pump ?? []).map((p: any) => ({
      pumpId: p.pump_id,
      pumpNo: p.pump_no,
      pumpName: p.pump_name,
      sessions: (p.sessions ?? []).map(mapSessionRow),
      subtotals: mapTotals(p.subtotals),
    })),
    sessions: (data.sessions ?? []).map(mapSessionRow),
  };
}

function mapReconciliation(data: any): ReconciliationOut {
  return {
    businessDate: data.business_date,
    sales: mapTotals(data.sales),
    meter: {
      totalSales: data.meter?.total_sales ?? 0,
      variance: data.meter?.variance ?? 0,
    },
    cash: {
      expected: data.cash?.expected ?? 0,
      actual: data.cash?.actual ?? 0,
      variance: data.cash?.variance ?? 0,
    },
    bank: {
      expected: data.bank?.expected ?? 0,
      actual: data.bank?.actual ?? 0,
      variance: data.bank?.variance ?? 0,
    },
    credit: mapCreditLedger(data.credit),
    expenses: { total: data.expenses?.total ?? 0 },
    overallStatus: data.overall_status ?? "NEEDS_REVIEW",
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export const tallyApi = {
  async getDaily(date: string, branchId: string): Promise<DailyTally> {
    const data = await apiFetch<any>(
      `/api/tally/daily?date=${date}`,
      branchId
    );
    return mapDailyTally(data);
  },

  async getReconciliation(
    date: string,
    branchId: string
  ): Promise<ReconciliationOut> {
    const data = await apiFetch<any>(
      `/api/tally/reconciliation?date=${date}`,
      branchId
    );
    return mapReconciliation(data);
  },

  async getCreditLedgerDay(
    date: string,
    branchId: string
  ): Promise<CreditLedgerDay> {
    const data = await apiFetch<any>(
      `/api/tally/credit-ledger?date=${date}`,
      branchId
    );
    return mapCreditLedger(data);
  },

  async recordHandover(
    sessionId: string,
    amount: number,
    branchId: string
  ): Promise<void> {
    await apiFetch<any>(
      `/api/tally/sessions/${sessionId}/handover`,
      branchId,
      {
        method: "PUT",
        body: JSON.stringify({ actual_cash_handover: amount }),
      }
    );
  },
};

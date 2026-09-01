import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import {
  BadgeDollarSign,
  Fuel,
  Banknote,
  Building2,
  Users,
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { ReconciliationOut } from "../../types";

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}`;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string }> = {
    RECONCILED: {
      icon: <CheckCircle2 size={13} color="#059669" />,
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
    },
    NEEDS_REVIEW: {
      icon: <AlertTriangle size={13} color="#D97706" />,
      color: "#D97706",
      bg: "#FFFBEB",
      border: "#FDE68A",
    },
    MISMATCH: {
      icon: <XCircle size={13} color="#DC2626" />,
      color: "#DC2626",
      bg: "#FEF2F2",
      border: "#FECACA",
    },

  };
  const c = config[status] ?? config.NEEDS_REVIEW;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      {c.icon}
      <Text style={[styles.badgeText, { color: c.color }]}>
        {status.replace("_", " ")}
      </Text>
    </View>
  );
}

function varianceColor(v: number): string {
  if (v === 0) return "#059669";
  if (Math.abs(v) <= 100) return "#D97706";
  return "#DC2626";
}

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.section}>
      <TouchableOpacity style={styles.sectionHeader} onPress={() => setOpen((o) => !o)} activeOpacity={0.7}>
        <View style={styles.sectionIcon}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {open ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
      </TouchableOpacity>
      {open && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

function ReconRow({
  label,
  value,
  isVariance,
  variance,
  isBold,
}: {
  label: string;
  value: string;
  isVariance?: boolean;
  variance?: number;
  isBold?: boolean;
}) {
  const color =
    isVariance && variance !== undefined ? varianceColor(variance) : isBold ? "#0F172A" : "#334155";
  return (
    <View style={styles.reconRow}>
      <Text style={[styles.reconLabel, isBold && { color: "#0F172A", fontWeight: "700" }]}>{label}</Text>
      <Text style={[styles.reconValue, { color }, isBold && { fontWeight: "800", fontSize: 14 }]}>{value}</Text>
    </View>
  );
}

interface Props {
  data: ReconciliationOut;
  compact?: boolean;
}

export default function ReconciliationCard({ data, compact = false }: Props) {
  return (
    <ScrollView style={styles.container} scrollEnabled={!compact}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Balance Sheet & Reconciliation</Text>
        <StatusBadge status={data.overallStatus} />
      </View>

      <Section icon={<BadgeDollarSign size={18} color="#2563EB" />} title="Sales Summary" defaultOpen={!compact}>
        <ReconRow label="Cash" value={fmt(data.sales.cash)} />
        <ReconRow label="Card POS" value={fmt(data.sales.card)} />
        <ReconRow label="Google Pay" value={fmt(data.sales.gpay)} />
        <ReconRow label="PhonePe" value={fmt(data.sales.phonepe)} />
        <ReconRow label="Paytm QR" value={fmt(data.sales.paytm)} />
        <ReconRow label="Fleet Cards" value={fmt(data.sales.fleet)} />
        <ReconRow label="Credit Sales" value={fmt(data.sales.credit)} />
        <View style={styles.divider} />
        <ReconRow label="TOTAL CALCULATED SALES" value={fmt(data.sales.grandTotal)} isBold />
      </Section>

      <Section icon={<Fuel size={18} color="#0284C7" />} title="Meter Sales Verification" defaultOpen>
        <ReconRow label="Physical Nozzle Meter Sales" value={fmt(data.meter.totalSales)} />
        <ReconRow label="System Attributed Sales" value={fmt(data.sales.grandTotal)} />
        <View style={styles.divider} />
        <ReconRow
          label="Meter vs System Variance"
          value={fmt(data.meter.variance)}
          isVariance
          variance={data.meter.variance}
          isBold
        />
      </Section>

      <Section icon={<Banknote size={18} color="#16A34A" />} title="Cash Handover & Drawer" defaultOpen>
        <ReconRow label="Expected Cash Handover (Sales - Advances)" value={fmt(data.cash.expected)} />
        <ReconRow label="Actual Physical Cash Handed Over" value={fmt(data.cash.actual)} />
        <View style={styles.divider} />
        <ReconRow
          label="Cash Shortage / Surplus"
          value={fmt(data.cash.variance)}
          isVariance
          variance={data.cash.variance}
          isBold
        />
      </Section>

      <Section icon={<Building2 size={18} color="#7C3AED" />} title="Bank & Digital Settlements" defaultOpen>
        <ReconRow label="Expected Bank Settlement (Card + UPI + Fleet)" value={fmt(data.bank.expected)} />
        <ReconRow label="Actual Settlement Received" value={fmt(data.bank.actual)} />
        <View style={styles.divider} />
        <ReconRow
          label="Settlement Variance"
          value={fmt(data.bank.variance)}
          isVariance
          variance={data.bank.variance}
          isBold
        />
      </Section>

      <Section icon={<Users size={18} color="#EA580C" />} title="Customer Credit Ledger" defaultOpen={!compact}>
        <ReconRow label="Opening Outstanding Balance" value={fmt(data.credit.openingOutstanding)} />
        <ReconRow label="+ Today's New Credit Sales" value={fmt(data.credit.newCreditSales)} />
        <ReconRow label="- Today's Credit Repayments" value={fmt(data.credit.creditPayments)} />
        <View style={styles.divider} />
        <ReconRow label="Closing Running Outstanding" value={fmt(data.credit.closingOutstanding)} isBold />
        {!compact && data.credit.customerBreakdown.length > 0 && (
          <View style={styles.custBreakdown}>
            <Text style={styles.custTitle}>CUSTOMER BREAKDOWN</Text>
            {data.credit.customerBreakdown.map((c) => (
              <View key={c.customerId} style={styles.custRow}>
                <Text style={styles.custName}>{c.customerName}</Text>
                <Text style={styles.custCredit}>+{fmt(c.newCredit)}</Text>
                <Text style={styles.custBalance}>Bal: {fmt(c.closingBalance)}</Text>
              </View>
            ))}
          </View>
        )}
      </Section>

      <Section icon={<Receipt size={18} color="#D97706" />} title="Daily Operational Expenses" defaultOpen>
        <ReconRow label="Total Bunk Expenses Logged" value={fmt(data.expenses.total)} isBold />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  headerTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  section: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 10, overflow: "hidden" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  sectionIcon: { alignItems: "center", justifyContent: "center" },
  sectionTitle: { flex: 1, color: "#0F172A", fontSize: 14, fontWeight: "700" },
  sectionBody: { padding: 14, gap: 8, backgroundColor: "#FFFFFF" },
  reconRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  reconLabel: { color: "#475569", fontSize: 13 },
  reconValue: { fontSize: 13, fontWeight: "600" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 6 },
  custBreakdown: { marginTop: 10, gap: 6, backgroundColor: "#F8FAFC", borderRadius: 8, padding: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  custTitle: { color: "#64748B", fontSize: 10, fontWeight: "800", letterSpacing: 0.5, marginBottom: 4 },
  custRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  custName: { flex: 2, color: "#0F172A", fontSize: 12, fontWeight: "600" },
  custCredit: { flex: 1, color: "#2563EB", fontSize: 12, textAlign: "right", fontWeight: "600" },
  custBalance: { flex: 1, color: "#475569", fontSize: 12, textAlign: "right", fontWeight: "700" },
});


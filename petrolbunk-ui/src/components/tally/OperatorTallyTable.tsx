import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { OperatorSessionRow } from "../../types";

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function StatusBadge({ v }: { v: number | null }) {
  if (v === null || v === undefined) return <Text style={styles.badge}>—</Text>;
  const isMatch = Math.abs(v) === 0;
  const isClose = Math.abs(v) <= 100;
  const color = isMatch ? "#10B981" : isClose ? "#F59E0B" : "#EF4444";
  return (
    <View style={[styles.badgePill, { backgroundColor: isMatch ? "#ECFDF5" : isClose ? "#FFFBEB" : "#FEF2F2" }]}>
      <Text style={[styles.badgeText, { color }]}>{fmt(v)}</Text>
    </View>
  );
}

interface RowProps {
  session: OperatorSessionRow;
}

function SessionRowItem({ session: s }: RowProps) {
  const [expanded, setExpanded] = useState(false);
  const digital = s.gpay + s.phonepe + s.paytm;
  return (
    <TouchableOpacity onPress={() => setExpanded((e) => !e)} activeOpacity={0.8}>
      <View style={[styles.row, expanded && styles.rowExpanded]}>
        <View style={styles.opCol}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {expanded ? <ChevronDown size={14} color="#64748B" /> : <ChevronRight size={14} color="#64748B" />}
            <Text style={styles.opName}>{s.operatorName}</Text>
          </View>
          <Text style={styles.opMeta}>P{s.pumpNo} · {s.shiftType ?? "No Shift"}</Text>
        </View>
        <Text style={styles.td}>{fmt(s.cash)}</Text>
        <Text style={styles.td}>{fmt(digital)}</Text>
        <Text style={styles.td}>{fmt(s.credit)}</Text>
        <Text style={styles.totalTd}>{fmt(s.totalSales)}</Text>
        <View style={{ flex: 1 }}>
          <StatusBadge v={s.meterVariance} />
        </View>
      </View>
      {expanded && (
        <View style={styles.expandedBox}>
          <Text style={styles.expandTitle}>PAYMENT BREAKDOWN</Text>
          <View style={styles.expandGrid}>
            {[
              ["Cash", s.cash],
              ["Card", s.card],
              ["GPay", s.gpay],
              ["PhonePe", s.phonepe],
              ["Paytm", s.paytm],
              ["Fleet", s.fleet],
              ["Credit", s.credit],
            ].map(([label, val]) => (
              <View key={label as string} style={styles.expandItem}>
                <Text style={styles.expandLabel}>{label as string}</Text>
                <Text style={styles.expandValue}>{fmt(val as number)}</Text>
              </View>
            ))}
          </View>
          <View style={styles.divider} />
          <Text style={styles.expandTitle}>CASH HANDOVER & RECONCILIATION</Text>
          <View style={styles.expandGrid}>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Advance Given</Text>
              <Text style={styles.expandValue}>{fmt(s.advanceAmount)}</Text>
            </View>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Expected Cash</Text>
              <Text style={styles.expandValue}>
                {s.expectedCash != null ? fmt(s.expectedCash) : "—"}
              </Text>
            </View>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Actual Handover</Text>
              <Text style={styles.expandValue}>
                {s.actualCash != null ? fmt(s.actualCash) : "—"}
              </Text>
            </View>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Cash Variance</Text>
              <Text style={[styles.expandValue, { color: s.cashVariance === 0 ? "#10B981" : "#EF4444" }]}>
                {s.cashVariance != null ? fmt(s.cashVariance) : "—"}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.expandGrid}>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Meter Sales</Text>
              <Text style={styles.expandValue}>
                {s.meterSales != null ? fmt(s.meterSales) : "—"}
              </Text>
            </View>
            <View style={styles.expandItem}>
              <Text style={styles.expandLabel}>Meter Variance</Text>
              <Text style={[styles.expandValue, { color: s.meterVariance === 0 ? "#10B981" : "#EF4444" }]}>
                {s.meterVariance != null ? fmt(s.meterVariance) : "—"}
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

interface Props {
  sessions: OperatorSessionRow[];
}

export default function OperatorTallyTable({ sessions }: Props) {
  if (sessions.length === 0) {
    return <Text style={styles.empty}>No operator sessions recorded for this date.</Text>;
  }
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.opCol, styles.th]}>Operator</Text>
        <Text style={styles.th}>Cash</Text>
        <Text style={styles.th}>Digital</Text>
        <Text style={styles.th}>Credit</Text>
        <Text style={styles.th}>Total</Text>
        <Text style={styles.th}>Var.</Text>
      </View>
      <FlatList
        data={sessions}
        keyExtractor={(s) => s.sessionId}
        renderItem={({ item }) => <SessionRowItem session={item} />}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  empty: { color: "#64748B", textAlign: "center", padding: 24, backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  headerRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F8FAFC", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  th: { flex: 1, color: "#475569", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  opCol: { flex: 2 },
  row: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 12, alignItems: "center", backgroundColor: "#FFFFFF" },
  rowExpanded: { backgroundColor: "#F8FAFC" },
  opName: { color: "#0F172A", fontSize: 13, fontWeight: "700" },
  opMeta: { color: "#64748B", fontSize: 11, marginTop: 2, paddingLeft: 20 },
  td: { flex: 1, color: "#334155", fontSize: 12 },
  totalTd: { flex: 1, color: "#0F172A", fontWeight: "800", fontSize: 12 },
  badge: { color: "#94A3B8", fontSize: 11 },
  badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  sep: { height: 1, backgroundColor: "#F1F5F9" },
  expandedBox: { backgroundColor: "#F8FAFC", padding: 14, gap: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#E2E8F0" },
  expandTitle: { color: "#2563EB", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  expandGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  expandItem: { width: "46%", flexDirection: "row", justifyContent: "space-between" },
  expandLabel: { color: "#64748B", fontSize: 12 },
  expandValue: { color: "#0F172A", fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 6 },
});


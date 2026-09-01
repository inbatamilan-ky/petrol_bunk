import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronRight, Fuel } from "lucide-react";
import { PumpTally } from "../../types";

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function VarianceBadge({ v }: { v: number | null }) {
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

function PumpGroup({ group }: { group: PumpTally }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <View style={styles.group}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setCollapsed((c) => !c)} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {collapsed ? <ChevronRight size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
          <Fuel size={16} color="#0284C7" />
          <Text style={styles.groupTitle}>{group.pumpName}</Text>
        </View>
        <Text style={styles.groupTotal}>{fmt(group.subtotals.grandTotal)}</Text>
      </TouchableOpacity>
      {!collapsed && (
        <>
          <View style={styles.sessionHeader}>
            {["Operator", "Shift", "Cash", "Digital", "Fleet", "Credit", "Total", "Var."].map((h) => (
              <Text key={h} style={styles.th}>{h}</Text>
            ))}
          </View>
          {group.sessions.map((s) => (
            <View key={s.sessionId} style={styles.sessionRow}>
              <Text style={styles.td}>{s.operatorName}</Text>
              <Text style={styles.td}>{s.shiftType ?? "—"}</Text>
              <Text style={styles.td}>{fmt(s.cash)}</Text>
              <Text style={styles.td}>{fmt(s.gpay + s.phonepe + s.paytm)}</Text>
              <Text style={styles.td}>{fmt(s.fleet)}</Text>
              <Text style={styles.td}>{fmt(s.credit)}</Text>
              <Text style={[styles.td, styles.boldTd]}>{fmt(s.totalSales)}</Text>
              <View style={{ flex: 1 }}>
                <VarianceBadge v={s.meterVariance} />
              </View>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Pump Total</Text>
            <Text style={styles.subtotalValue}>{fmt(group.subtotals.grandTotal)}</Text>
            <View style={{ flex: 1 }}>
              <VarianceBadge v={group.subtotals.meterVariance} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}

interface Props {
  pumps: PumpTally[];
  grandTotal: number;
}

export default function PumpTallyTable({ pumps, grandTotal }: Props) {
  return (
    <View style={styles.container}>
      {pumps.map((p) => (
        <PumpGroup key={p.pumpId} group={p} />
      ))}
      <View style={styles.dayTotal}>
        <Text style={styles.dayTotalLabel}>DAY TOTAL SALES</Text>
        <Text style={styles.dayTotalValue}>{fmt(grandTotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  group: { backgroundColor: "#FFFFFF", borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", overflow: "hidden" },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  groupTitle: { color: "#0F172A", fontWeight: "700", fontSize: 14 },
  groupTotal: { color: "#059669", fontWeight: "800", fontSize: 14 },
  sessionHeader: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#F1F5F9", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  th: { flex: 1, color: "#475569", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  sessionRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", alignItems: "center" },
  td: { flex: 1, color: "#334155", fontSize: 12 },
  boldTd: { fontWeight: "700", color: "#0F172A" },
  badge: { color: "#94A3B8", fontSize: 11 },
  badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  subtotalRow: { flexDirection: "row", padding: 12, backgroundColor: "#F8FAFC", alignItems: "center", borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  subtotalLabel: { flex: 3, color: "#475569", fontSize: 12, fontWeight: "700" },
  subtotalValue: { flex: 2, color: "#059669", fontWeight: "800", fontSize: 13 },
  dayTotal: { backgroundColor: "#ECFDF5", borderRadius: 12, borderWidth: 1, borderColor: "#A7F3D0", padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayTotalLabel: { color: "#047857", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  dayTotalValue: { color: "#065F46", fontSize: 20, fontWeight: "900" },
});


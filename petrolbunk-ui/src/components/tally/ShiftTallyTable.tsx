import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronDown, ChevronRight, Sunrise, Sunset, Moon, Clock } from "lucide-react";
import { ShiftTally } from "../../types";

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

function ShiftGroup({ group }: { group: ShiftTally }) {
  const [collapsed, setCollapsed] = useState(false);
  const isMorning = group.shiftType === "MORNING";
  const isEvening = group.shiftType === "EVENING";
  const isNight = group.shiftType === "NIGHT";

  const label =
    isMorning ? "Morning Shift"
    : isEvening ? "Evening Shift"
    : isNight ? "Night Shift"
    : `${group.shiftType} Shift`;

  return (
    <View style={styles.group}>
      <TouchableOpacity style={styles.groupHeader} onPress={() => setCollapsed((c) => !c)} activeOpacity={0.7}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {collapsed ? <ChevronRight size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
          {isMorning ? <Sunrise size={16} color="#D97706" /> : isEvening ? <Sunset size={16} color="#EA580C" /> : isNight ? <Moon size={16} color="#6366F1" /> : <Clock size={16} color="#64748B" />}
          <Text style={styles.groupTitle}>{label}</Text>
        </View>
        <Text style={styles.groupTotal}>{fmt(group.subtotals.grandTotal)}</Text>
      </TouchableOpacity>
      {!collapsed && (
        <>
          <View style={styles.sessionHeader}>
            {["Operator", "Pump", "Time", "Cash", "Digital", "Credit", "Total", "Var."].map((h) => (
              <Text key={h} style={styles.th}>{h}</Text>
            ))}
          </View>
          {group.sessions.map((s) => (
            <View key={s.sessionId} style={styles.sessionRow}>
              <Text style={styles.td}>{s.operatorName}</Text>
              <Text style={styles.td}>P{s.pumpNo}</Text>
              <Text style={styles.td}>{s.timeIn ?? "—"}</Text>
              <Text style={styles.td}>{fmt(s.cash)}</Text>
              <Text style={styles.td}>{fmt(s.gpay + s.phonepe + s.paytm)}</Text>
              <Text style={styles.td}>{fmt(s.credit)}</Text>
              <Text style={[styles.td, styles.boldTd]}>{fmt(s.totalSales)}</Text>
              <View style={{ flex: 1 }}>
                <VarianceBadge v={s.meterVariance} />
              </View>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Shift Total</Text>
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
  shifts: ShiftTally[];
  grandTotal: number;
}

export default function ShiftTallyTable({ shifts, grandTotal }: Props) {
  return (
    <View style={styles.container}>
      {shifts.map((s) => (
        <ShiftGroup key={s.shiftType as string} group={s} />
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
  groupTotal: { color: "#2563EB", fontWeight: "800", fontSize: 14 },
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
  subtotalValue: { flex: 2, color: "#2563EB", fontWeight: "800", fontSize: 13 },
  dayTotal: { backgroundColor: "#EFF6FF", borderRadius: 12, borderWidth: 1, borderColor: "#BFDBFE", padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayTotalLabel: { color: "#1E40AF", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  dayTotalValue: { color: "#1E3A8A", fontSize: 20, fontWeight: "900" },
});


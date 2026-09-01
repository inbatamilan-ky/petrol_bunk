import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Banknote, CreditCard, Smartphone, Users, Truck, Activity } from "lucide-react";
import { TallyTotals } from "../../types";

function fmt(n: number): string {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n.toFixed(0)}`;
}

function varianceColor(v: number) {
  if (v === 0) return "#10B981";
  if (Math.abs(v) <= 100) return "#F59E0B";
  return "#EF4444";
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  isVariance?: boolean;
  variance?: number;
  expandedContent?: React.ReactNode;
}

function KpiCard({ label, value, icon, isVariance, variance, expandedContent }: KpiCardProps) {
  const [expanded, setExpanded] = useState(false);
  const vColor = isVariance && variance !== undefined ? varianceColor(variance) : "#3B82F6";
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isVariance && { borderColor: vColor, borderWidth: 1.5, backgroundColor: variance === 0 ? "#ECFDF5" : "#FFFBEB" },
      ]}
      onPress={() => setExpanded((e) => !e)}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, isVariance && { color: vColor }]}>
        {value}
      </Text>
      {expanded && expandedContent}
    </TouchableOpacity>
  );
}

interface Props {
  totals: TallyTotals;
}

export default function DailyKpiStrip({ totals }: Props) {
  const digital = totals.gpay + totals.phonepe + totals.paytm;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
      contentContainerStyle={styles.stripContent}
    >
      <KpiCard
        icon={<Banknote size={20} color="#16A34A" />}
        label="CASH"
        value={fmt(totals.cash)}
      />
      <KpiCard
        icon={<CreditCard size={20} color="#2563EB" />}
        label="CARD"
        value={fmt(totals.card)}
      />
      <KpiCard
        icon={<Smartphone size={20} color="#7C3AED" />}
        label="DIGITAL"
        value={fmt(digital)}
        expandedContent={
          <View style={styles.expand}>
            <Text style={styles.expandRow}>GPay: {fmt(totals.gpay)}</Text>
            <Text style={styles.expandRow}>PhonePe: {fmt(totals.phonepe)}</Text>
            <Text style={styles.expandRow}>Paytm: {fmt(totals.paytm)}</Text>
          </View>
        }
      />
      <KpiCard
        icon={<Users size={20} color="#EA580C" />}
        label="CREDIT"
        value={fmt(totals.credit)}
      />
      <KpiCard
        icon={<Truck size={20} color="#0284C7" />}
        label="FLEET"
        value={fmt(totals.fleet)}
      />
      <KpiCard
        icon={<Activity size={20} color={varianceColor(totals.meterVariance)} />}
        label="VARIANCE"
        value={fmt(totals.meterVariance)}
        isVariance
        variance={totals.meterVariance}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: { maxHeight: 130 },
  stripContent: { paddingHorizontal: 4, gap: 8, paddingVertical: 6 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    minWidth: 104,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    marginBottom: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardLabel: { fontSize: 10, color: "#64748B", fontWeight: "700", letterSpacing: 0.5 },
  cardValue: { fontSize: 15, fontWeight: "800", color: "#0F172A" },
  expand: { marginTop: 6, gap: 2, width: "100%", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 4 },
  expandRow: { fontSize: 10, color: "#64748B", fontWeight: "500" },
});


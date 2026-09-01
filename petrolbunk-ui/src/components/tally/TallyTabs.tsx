import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { BarChart3, Sunrise, Fuel, User, CheckCircle2 } from "lucide-react";

export type TallyTab = "daily" | "shift" | "pump" | "operator" | "reconcile";

const TABS: { key: TallyTab; label: string; icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { key: "daily", label: "Daily", icon: BarChart3 },
  { key: "shift", label: "Shift", icon: Sunrise },
  { key: "pump", label: "Pump", icon: Fuel },
  { key: "operator", label: "Operator", icon: User },
  { key: "reconcile", label: "Reconcile", icon: CheckCircle2 },
];

interface Props {
  active: TallyTab;
  onChange: (tab: TallyTab) => void;
}

export default function TallyTabs({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.activeTab]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Icon size={15} color={isActive ? "#FFFFFF" : "#64748B"} />
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderBottomColor: "#EEF1F5", backgroundColor: "#FFFFFF" },
  content: { paddingHorizontal: 4, gap: 8, paddingVertical: 10 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF1F5",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  activeTab: {
    backgroundColor: "#6F7BF5",
    borderColor: "#6F7BF5",
    shadowColor: "#6F7BF5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: { fontSize: 13, color: "#4B5563", fontWeight: "600" },
  activeLabel: { color: "#FFFFFF", fontWeight: "700" },
});



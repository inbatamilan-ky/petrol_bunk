import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  LayoutDashboard,
  Fuel,
  CreditCard,
  Receipt,
  TrendingUp,
  Banknote,
  FileText,
  Settings,
} from 'lucide-react';
import { useBunk } from '../context/BunkContext';
import { colors } from '../theme/colors';

export type ScreenId =
  | 'dashboard'
  | 'shifts'
  | 'credit'
  | 'expenses'
  | 'rates'
  | 'cashbank'
  | 'reports'
  | 'masters';

interface NavigationBarProps {
  currentScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  isSidebar?: boolean;
}

interface NavItem {
  id: ScreenId;
  label: string;
  icon: any;
  roles: ('Owner' | 'Manager' | 'Operator')[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard, roles: ['Owner', 'Manager', 'Operator'] },
  { id: 'shifts',    label: 'Shift Ops',   icon: Fuel,            roles: ['Owner', 'Manager', 'Operator'] },
  { id: 'credit',    label: 'Credit Ledger', icon: CreditCard,    roles: ['Owner', 'Manager', 'Operator'] },
  { id: 'expenses',  label: 'Expenses',    icon: Receipt,         roles: ['Owner', 'Manager', 'Operator'] },
  { id: 'rates',     label: 'Daily Rates', icon: TrendingUp,      roles: ['Owner', 'Manager'] },
  { id: 'cashbank',  label: 'Cash & Bank', icon: Banknote,        roles: ['Owner', 'Manager'] },
  { id: 'reports',   label: 'Reports',     icon: FileText,        roles: ['Owner', 'Manager'] },
  { id: 'masters',   label: 'Masters',     icon: Settings,        roles: ['Owner'] },
];

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentScreen,
  onSelectScreen,
  isSidebar = false,
}) => {
  const { role, activeShift } = useBunk();
  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  if (isSidebar) {
    return (
      <View style={styles.sidebarContainer}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarSectionTitle}>NAVIGATION</Text>
        </View>
        <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => onSelectScreen(item.id)}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isActive ? '#FFFFFF' : colors.textSecondary} />
                <Text style={[styles.sidebarItemText, isActive && styles.sidebarItemTextActive]}>
                  {item.label}
                </Text>
                {item.id === 'shifts' && activeShift && <View style={styles.activeShiftDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // Bottom Navigation Bar (mobile)
  return (
    <View style={styles.bottomNavContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bottomNavScroll}
      >
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.bottomNavItem, isActive && styles.bottomNavItemActive]}
              onPress={() => onSelectScreen(item.id)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />
                {item.id === 'shifts' && activeShift && <View style={styles.bottomBadgeDot} />}
              </View>
              <Text style={[styles.bottomNavText, isActive && styles.bottomNavTextActive]} numberOfLines={1}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sidebarContainer: {
    width: 220,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingVertical: 16,
    height: '100%',
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sidebarSectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sidebarScroll: { flex: 1 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    borderRadius: 8,
    gap: 12,
    marginBottom: 2,
  },
  sidebarItemActive: { backgroundColor: colors.primary },
  sidebarItemText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sidebarItemTextActive: { color: '#FFFFFF', fontWeight: '700' },
  activeShiftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  bottomNavContainer: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 4,
    paddingBottom: 6,
  },
  bottomNavScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
  },
  bottomNavItemActive: { backgroundColor: colors.surfaceElevated },
  iconWrapper: { position: 'relative', marginBottom: 3 },
  bottomBadgeDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  bottomNavText: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  bottomNavTextActive: { color: colors.primary, fontWeight: '700' },
});
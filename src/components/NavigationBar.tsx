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
import { UserRole } from '../types';

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
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',   icon: LayoutDashboard, roles: ['Owner', 'Manager'] },
  { id: 'shifts',    label: 'Shift Ops',   icon: Fuel,            roles: ['Owner', 'Manager'] },
  { id: 'credit',    label: 'Credit Ledger', icon: CreditCard,    roles: ['Owner', 'Manager'] },
  { id: 'expenses',  label: 'Expenses',    icon: Receipt,         roles: ['Owner', 'Manager'] },
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
          <Text style={styles.sidebarSectionTitle}>MAIN MENU</Text>
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
                <Icon size={18} color={isActive ? '#FFFFFF' : '#64748B'} />
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
                <Icon size={18} color={isActive ? '#0284C7' : '#64748B'} />
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
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingVertical: 14,
    height: '100%',
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sidebarSectionTitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  sidebarScroll: { flex: 1 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginHorizontal: 8,
    borderRadius: 8,
    gap: 10,
    marginBottom: 3,
  },
  sidebarItemActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sidebarItemText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sidebarItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeShiftDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  bottomNavContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 4,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomNavScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  bottomNavItem: {
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 64,
  },
  bottomNavItemActive: {
    backgroundColor: '#F0F9FF',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 2,
  },
  bottomBadgeDot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  bottomNavText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomNavTextActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
});
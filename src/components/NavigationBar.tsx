import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import {
  LayoutDashboard,
  Fuel,
  CreditCard,
  Receipt,
  TrendingUp,
  Banknote,
  FileText,
  Settings,
  Search,
  Zap,
  Building2,
  ChevronRight,
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
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard',     icon: LayoutDashboard, roles: ['Owner', 'Manager'] },
  { id: 'shifts',    label: 'Shift Ops',     icon: Fuel,            roles: ['Owner', 'Manager'] },
  { id: 'credit',    label: 'Credit Ledger', icon: CreditCard,      roles: ['Owner', 'Manager'] },
  { id: 'expenses',  label: 'Expenses',      icon: Receipt,         roles: ['Owner', 'Manager'] },
  { id: 'rates',     label: 'Daily Rates',   icon: TrendingUp,      roles: ['Owner', 'Manager'] },
  { id: 'cashbank',  label: 'Cash & Bank',   icon: Banknote,        roles: ['Owner', 'Manager'] },
  { id: 'reports',   label: 'Reports',       icon: FileText,        roles: ['Owner', 'Manager'] },
  { id: 'masters',   label: 'Masters',       icon: Settings,        roles: ['Owner'] },
];

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentScreen,
  onSelectScreen,
  isSidebar = false,
}) => {
  const { role, activeShift } = useBunk();
  const [searchQuery, setSearchQuery] = useState('');

  const allowedItems = NAV_ITEMS.filter((item) => item.roles.includes(role)).filter((item) =>
    searchQuery ? item.label.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  if (isSidebar) {
    return (
      <View style={styles.sidebarContainer}>
        {/* Quick Search Box */}
        <View style={styles.searchBoxWrapper}>
          <View style={styles.searchPill}>
            <Search size={14} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search menu..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

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
                {isActive && <ChevronRight size={14} color="#FFDE00" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sidebar Footer Status Card */}
        <View style={styles.sidebarFooter}>
          <View style={styles.statusCard}>
            <View style={styles.statusCardTop}>
              <Zap size={14} color="#FFDE00" />
              <Text style={styles.statusCardTitle}>FuelPulse Pro</Text>
            </View>
            <Text style={styles.statusCardSub}>BP Ky Petrol Station</Text>
            <View style={styles.progressBarBg}>
              <View style={styles.progressBarFill} />
            </View>
          </View>

          <View style={styles.stationBadgeFooter}>
            <View style={styles.stationAvatar}>
              <Building2 size={13} color="#007DC6" />
            </View>
            <Text style={styles.stationFooterText} numberOfLines={1}>
              KY Petrol Bunk
            </Text>
          </View>
        </View>
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
                <Icon size={18} color={isActive ? '#007DC6' : '#64748B'} />
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
    paddingVertical: 12,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  searchBoxWrapper: {
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    outlineStyle: 'none' as any,
    padding: 0,
  },
  sidebarHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
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
    backgroundColor: '#007DC6', // Bharat Petroleum Primary Blue
    shadowColor: '#007DC6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sidebarItemText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  activeShiftDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFDE00', // BP Yellow
  },
  sidebarFooter: {
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  statusCard: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 10,
  },
  statusCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusCardTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  statusCardSub: {
    color: '#94A3B8',
    fontSize: 10,
    marginTop: 2,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '85%',
    height: '100%',
    backgroundColor: '#007DC6',
  },
  stationBadgeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stationAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationFooterText: {
    color: '#1E293B',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
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
    backgroundColor: '#FFDE00',
  },
  bottomNavText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
  },
  bottomNavTextActive: {
    color: '#007DC6',
    fontWeight: '700',
  },
});
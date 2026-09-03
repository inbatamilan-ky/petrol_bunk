import {
  Banknote,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Fuel,
  Gauge,
  LayoutDashboard,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  X
} from 'lucide-react';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useBunk } from '../context/BunkContext';
import { UserRole } from '../types';

export type ScreenId =
  | 'dashboard'
  | 'shifts'
  | 'tanks'
  | 'credit'
  | 'expenses'
  | 'rates'
  | 'cashbank'
  | 'reports'
  | 'masters'
  | 'permissions';

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
  { id: 'dashboard',   label: 'Dashboard',     icon: LayoutDashboard, roles: ['Owner', 'Manager'] },
  { id: 'shifts',      label: 'Shift Ops',     icon: Fuel,            roles: ['Owner', 'Manager'] },
  { id: 'tanks',       label: 'Nozzle Meters', icon: Gauge,           roles: ['Owner', 'Manager'] },
  { id: 'credit',      label: 'Credit Ledger', icon: CreditCard,      roles: ['Owner', 'Manager'] },
  { id: 'expenses',    label: 'Expenses',      icon: Receipt,         roles: ['Owner', 'Manager'] },
  { id: 'rates',       label: 'Daily Rates',   icon: TrendingUp,      roles: ['Owner', 'Manager'] },
  { id: 'cashbank',    label: 'Cash & Balance', icon: Banknote,       roles: ['Owner', 'Manager'] },
  { id: 'reports',     label: 'Reports',       icon: FileText,        roles: ['Owner'] },
  { id: 'masters',     label: 'Masters',       icon: Settings,        roles: ['Owner'] },
  { id: 'permissions', label: 'Role Access',   icon: ShieldCheck,     roles: ['Owner'] },
];

export const NavigationBar: React.FC<NavigationBarProps> = ({
  currentScreen,
  onSelectScreen,
  isSidebar = false,
}) => {
  const {
    role,
    activeShift,
    logout,
    branches,
    activeBranchId,
    switchBranch,
    returnToBunkSelection,
    isPageVisible,
  } = useBunk();
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const allowedItems = NAV_ITEMS.filter((item) =>
    isPageVisible(item.id, role, activeBranchId)
  ).filter((item) =>
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

        {/* <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarSectionTitle}>MAIN MENU</Text>
        </View> */}

        <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={true}>
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
                {item.id === 'shifts' }
                {isActive && <ChevronRight size={14} color="#FFFFFF" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        
        {/* Sidebar Footer Branch Selector */}
        {role === 'Owner' ? (
          <View style={styles.sidebarFooter}>
            <Text style={styles.sidebarSectionTitle}>ACTIVE BRANCH</Text>
            <TouchableOpacity
              style={styles.branchButton}
              onPress={() => setShowBranchModal(true)}
              activeOpacity={0.7}
            >
              <Building2 size={16} color="#475569" />
              <Text style={styles.branchButtonText} numberOfLines={1}>
                {branches?.find((b: any) => b.id === activeBranchId)?.name || 'Select Branch'}
              </Text>
              <ChevronDown size={16} color="#64748B" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.sidebarFooter}>
            <Text style={styles.sidebarSectionTitle}>ASSIGNED STATION</Text>
            <View style={[styles.branchButton, { backgroundColor: '#F1F5F9' }]}>
              <Building2 size={16} color="#3B82F6" />
              <Text style={[styles.branchButtonText, { fontWeight: '700', color: '#0F172A' }]} numberOfLines={1}>
                {branches?.find((b: any) => b.id === activeBranchId)?.name || 'My Station'}
              </Text>
            </View>
          </View>
        )}

        {/* Branch Selection Modal */}
        <Modal visible={showBranchModal} transparent animationType="fade" onRequestClose={() => setShowBranchModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Branch</Text>
                <TouchableOpacity onPress={() => setShowBranchModal(false)}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.branchList}>
                {branches?.map((b: any) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.branchItem, activeBranchId === b.id && styles.branchItemActive]}
                    onPress={() => {
                      switchBranch(b.id);
                      setShowBranchModal(false);
                    }}
                  >
                    <View>
                      <Text style={[styles.branchItemName, activeBranchId === b.id && styles.branchItemNameActive]}>{b.name}</Text>
                      <Text style={styles.branchItemCode}>{b.dealer_code} - {b.omc_brand}</Text>
                    </View>
                    {activeBranchId === b.id && <Check size={18} color="#3B82F6" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

          </View>
        </Modal>

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
                <Icon size={18} color={isActive ? '#3B82F6' : '#64748B'} />
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 10,
    borderRadius: 20,
    gap: 10,
    marginBottom: 4,
  },
  sidebarItemActive: {
    backgroundColor: '#6F7BF5',
    shadowColor: '#6F7BF5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sidebarItemText: {
    color: '#4B5563',
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  
  branchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  branchList: {
    maxHeight: 400,
  },
  branchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  branchItemActive: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  branchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  branchItemNameActive: {
    color: '#3B82F6',
  },
  branchItemCode: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
logoutText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
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
    color: '#3B82F6',
    fontWeight: '700',
  },
});
